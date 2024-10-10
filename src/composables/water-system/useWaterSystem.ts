import { waterSystemConfig } from '@/config/waterSystemConfig';
import type {
  Alert,
  DataSources,
  SimulationControls,
  WaterSystemObservables,
  WaterSystemState,
  WeatherCondition,
} from '@/types/waterSystem';
import { PriorityQueue } from '@datastructures-js/priority-queue';
import { format } from 'date-fns';
import { throttle } from 'lodash-es';
import { Observable, Subject, merge, of } from 'rxjs';
import {
  catchError,
  distinctUntilChanged,
  filter,
  map,
  take,
  takeUntil,
  tap,
} from 'rxjs/operators';
import { v4 as uuidv4 } from 'uuid';
import type { Ref } from 'vue';
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import { useAlertSystem } from './useAlertSystem';
import { useDamManagement } from './useDamManagement';
import { useFloodPrediction } from './useFloodPrediction';
import { useGlacierMelt } from './useGlacierMelt';
import { useIrrigation } from './useIrrigation';
import { usePowerPlant } from './usePowerPlant';
import { useSimulation } from './useSimulation';
import { useUserWaterManagement } from './useUserWaterManagement';
import { useWastewaterTreatment } from './useWastewaterTreatment';
import { useWaterDistribution } from './useWaterDistribution';
import { useWaterPurification } from './useWaterPurification';
import { useWaterQualityControl } from './useWaterQualityControl';
import { useWeatherSimulation } from './useWeatherSimulation';

const MAX_ALERTS = 1000; // Nombre maximum d'alertes à conserver
const DAILY_RESET_VALUE = 1000; // Valeur arbitraire, à ajuster selon les besoins

// Définition d'un type pour les erreurs
type WaterSystemError = Error | unknown;

// Définissez alertQueue en dehors de la fonction useWaterSystem
const alertQueue = new PriorityQueue<Alert>((a, b) => {
  const priorityOrder = { high: 3, medium: 2, low: 1 };
  if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
    return priorityOrder[b.priority] - priorityOrder[a.priority];
  }
  return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
});

// Déplacez cette déclaration en dehors de useWaterSystem, juste après les imports
const alertsChanged = ref(0);

// Modification de la fonction utilitaire pour la gestion des erreurs
function handleError(error: WaterSystemError, context: string): Observable<never> {
  console.error(`Erreur dans ${context}:`, error);
  // Vous pouvez ajouter ici une logique pour enregistrer l'erreur ou notifier l'utilisateur
  return of(); // Retourne un Observable vide pour continuer le flux
}

// Ajout de ces fonctions au début du fichier
function getPerformanceNow(): number {
  return typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now();
}

// Modifiez les fonctions de mesure de performance pour utiliser la configuration
function measureObservablePerformance<T>(name: string) {
  return tap<T>({
    subscribe: () => {
      if (waterSystemConfig.enablePerformanceLogs) console.time(`Subscribe ${name}`);
    },
    next: (value) => {
      if (waterSystemConfig.enablePerformanceLogs) {
        const endTime = performance.now();
        logObservablePerformance(name, value, endTime - performance.now());
      }
    },
    complete: () => {
      if (waterSystemConfig.enablePerformanceLogs) console.timeEnd(`Subscribe ${name}`);
    },
  });
}

function logPerformance(name: string, startTime: number) {
  if (waterSystemConfig.enablePerformanceLogs) {
    const endTime = performance.now();
    console.log(`Performance de ${name}: ${endTime - startTime} ms`);
  }
}

// Ajout de cette fonction au début du fichier
function logObservablePerformance(name: string, value: unknown, time: number) {
  if (waterSystemConfig.enablePerformanceLogs) {
    console.log(
      `Observable ${name} - Temps: ${time.toFixed(2)}ms - Valeur: ${JSON.stringify(value)}`,
    );
  }
}

// Ajout de cette fonction au début du fichier
function measureReactivePerformance<T>(name: string, fn: () => T): () => T {
  return () => {
    const startTime = performance.now();
    const result = fn();
    if (waterSystemConfig.enablePerformanceLogs) {
      const endTime = performance.now();
      console.log(`Performance de ${name}: ${endTime - startTime} ms`);
    }
    return result;
  };
}

// Modifiez la fonction groupSimilarAlerts pour utiliser le type Alert correctement
function groupSimilarAlerts(alert: Alert): Alert & { count?: number } {
  const existingAlert = Array.from(alertQueue.toArray()).find(
    (a) => a.priority === alert.priority && a.message === alert.message,
  ) as (Alert & { count?: number }) | undefined;

  if (existingAlert) {
    existingAlert.count = (existingAlert.count || 1) + 1;
    existingAlert.timestamp = alert.timestamp;
    return existingAlert;
  }

  return { ...alert, count: 1 };
}

// Modifiez la fonction addAlert pour utiliser alertsChanged
function addAlert(message: string, priority: Alert['priority']) {
  const startTime = getPerformanceNow();
  const timestamp = format(new Date(), 'yyyy-MM-dd HH:mm:ss');
  const newAlert: Alert = {
    id: uuidv4(),
    message,
    timestamp,
    priority,
  };

  const groupedAlert = groupSimilarAlerts(newAlert);

  if (groupedAlert.count === 1) {
    alertQueue.enqueue(groupedAlert);
    if (alertQueue.size() > MAX_ALERTS) {
      alertQueue.dequeue();
    }
  }

  // Émettre un événement pour signaler que les alertes ont changé
  alertsChanged.value += 1;

  logPerformance('addAlert', startTime);
}

export function useWaterSystem(): {
  state: Ref<WaterSystemState>;
  observables: WaterSystemObservables;
  simulationControls: SimulationControls;
  resetSystem: () => void;
  setWaterLevel: (level: number) => void;
  toggleAutoMode: () => void;
  totalWaterProcessed: Ref<number>;
  systemEfficiency: Ref<number>;
  overallSystemStatus: Ref<string>;
  alerts: Ref<Alert[]>;
  addAlert: (message: string, priority: Alert['priority']) => void;
  currentWaterLevel: Ref<number>;
  toggleManualMode: () => void;
  isManualMode: Ref<boolean>; // Ajoutez cette ligne
} {
  const destroy$ = new Subject<void>();
  const { alerts, addAlert } = useAlertSystem();

  // États réactifs
  const state = ref<WaterSystemState>({
    waterLevel: 50,
    isAutoMode: true,
    purifiedWater: 0,
    powerGenerated: 0,
    waterDistributed: 0,
    weatherCondition: 'ensoleillé' as WeatherCondition, // Spécifiez le type ici
    alerts: [],
    irrigationWater: 0,
    treatedWastewater: 0,
    waterQuality: 90,
    floodRisk: 10,
    userConsumption: 0,
    glacierVolume: 1000000,
    meltRate: 0,
  });

  // Sources de données
  const dataSources: DataSources = {
    waterSource$: new Subject<number>(),
    weatherSource$: new Subject<WeatherCondition>(),
    wastewaterSource$: new Subject<number>(),
    userConsumptionSource$: new Subject<number>(),
    glacierSource$: new Subject<number>(),
  };

  // Déclaration des composables
  const { weatherSimulation$ } = useWeatherSimulation();
  const { glacierMelt$ } = useGlacierMelt(dataSources.weatherSource$, dataSources.glacierSource$);
  const { dam$ } = useDamManagement(
    dataSources.waterSource$,
    dataSources.weatherSource$,
    glacierMelt$,
  );
  const { purificationPlant$ } = useWaterPurification(dam$);
  const { powerPlant$ } = usePowerPlant(dam$);
  const { irrigation$ } = useIrrigation(purificationPlant$, dataSources.weatherSource$);
  const { wastewaterTreatment$ } = useWastewaterTreatment(dataSources.wastewaterSource$);
  const { waterQualityControl$ } = useWaterQualityControl(
    purificationPlant$,
    wastewaterTreatment$,
    dataSources.weatherSource$,
  );
  const { floodPrediction$ } = useFloodPrediction(dam$, dataSources.weatherSource$);
  const { userWaterManagement$ } = useUserWaterManagement(
    dataSources.userConsumptionSource$,
    waterQualityControl$,
    dataSources.weatherSource$,
  );
  const { waterDistribution$ } = useWaterDistribution(dam$);

  const {
    isAutoMode,
    startSimulation,
    stopSimulation,
    toggleAutoMode: simulationToggleAutoMode, // Renommez cette fonction
  } = useSimulation(dataSources, weatherSimulation$);

  const manualWaterLevel = ref(50);
  const isManualMode = ref(false);

  const currentWaterLevel = computed(() => {
    return isManualMode.value ? manualWaterLevel.value : state.value.waterLevel;
  });

  const setWaterLevel = (level: number) => {
    if (isManualMode.value) {
      manualWaterLevel.value = level;
      state.value.waterLevel = level;
    }
  };

  const toggleManualMode = () => {
    isManualMode.value = !isManualMode.value;
    if (isManualMode.value) {
      stopSimulation();
      manualWaterLevel.value = state.value.waterLevel;
    } else {
      startSimulation();
    }
    simulationToggleAutoMode(); // Utilisez la fonction renommée ici
  };

  // Modifier la souscription à dam$
  dam$.pipe(takeUntil(destroy$)).subscribe((level) => {
    if (!isManualMode.value) {
      state.value.waterLevel = level;
    }
  });

  // Souscriptions
  weatherSimulation$.pipe(takeUntil(destroy$)).subscribe((weather: WeatherCondition) => {
    state.value.weatherCondition = weather;
  });

  glacierMelt$.pipe(takeUntil(destroy$)).subscribe(({ volume, meltRate }) => {
    state.value.glacierVolume = volume;
    state.value.meltRate = meltRate;
  });

  purificationPlant$.pipe(takeUntil(destroy$)).subscribe((water) => {
    state.value.purifiedWater = water;
  });

  powerPlant$.pipe(takeUntil(destroy$)).subscribe((power) => {
    state.value.powerGenerated = power;
  });

  irrigation$.pipe(takeUntil(destroy$)).subscribe((water) => {
    state.value.irrigationWater = water;
  });

  wastewaterTreatment$.pipe(takeUntil(destroy$)).subscribe((water) => {
    state.value.treatedWastewater = water;
  });

  waterQualityControl$.pipe(takeUntil(destroy$)).subscribe((quality) => {
    state.value.waterQuality = quality;
  });

  floodPrediction$.pipe(takeUntil(destroy$)).subscribe((risk) => {
    state.value.floodRisk = risk;
  });

  userWaterManagement$.pipe(takeUntil(destroy$)).subscribe((consumption) => {
    state.value.userConsumption = consumption;
  });

  waterDistribution$.pipe(takeUntil(destroy$)).subscribe((distributedWater) => {
    state.value.waterDistributed = distributedWater;

    // Ajoutez des alertes basées sur la distribution d'eau
    if (distributedWater < 50) {
      addAlert("Distribution d'eau faible", 'medium');
    } else if (distributedWater > 500) {
      addAlert("Distribution d'eau élevée", 'low');
    }
  });

  // Ajoutez ces souscriptions
  irrigation$.pipe(takeUntil(destroy$)).subscribe((water) => {
    state.value.irrigationWater = water;
    if (water > 1000) {
      addAlert("Consommation d'eau pour l'irrigation élevée", 'medium');
    }
  });

  powerPlant$.pipe(takeUntil(destroy$)).subscribe((power) => {
    state.value.powerGenerated = power;
    if (power < 100) {
      addAlert("Production d'énergie faible", 'medium');
    } else if (power > 1000) {
      addAlert("Production d'énergie exceptionnellement élevée", 'low');
    }
  });

  userWaterManagement$.pipe(takeUntil(destroy$)).subscribe((consumption) => {
    state.value.userConsumption = consumption;
    if (consumption > 500) {
      addAlert("Consommation d'eau des utilisateurs élevée", 'medium');
    }
  });

  // Réintégrer alertSystem$
  const alertSystem$ = merge(
    dam$.pipe(
      distinctUntilChanged(),
      map((level) => {
        if (level >= 90) {
          return {
            message: 'Alerte : Niveau du barrage critique! (90%+)',
            priority: 'high' as const,
          };
        }
        if (level >= 80) {
          return {
            message: 'Avertissement : Niveau du barrage élevé (80%+)',
            priority: 'medium' as const,
          };
        }
        if (level <= 20) {
          return {
            message: 'Alerte : Niveau du barrage très bas! (20% ou moins)',
            priority: 'high' as const,
          };
        }
        if (level <= 30) {
          return {
            message: 'Avertissement : Niveau du barrage bas (30% ou moins)',
            priority: 'medium' as const,
          };
        }
        return null;
      }),
      filter((alert): alert is Exclude<typeof alert, null> => alert !== null),
    ),
    waterQualityControl$.pipe(
      filter((quality) => quality < 60),
      map(() => ({
        message: "Alerte : Qualité de l'eau en dessous des normes!",
        priority: 'high' as const,
      })),
    ),
    floodPrediction$.pipe(
      filter((risk) => risk > 80),
      map(() => ({ message: "Alerte : Risque élevé d'inondation!", priority: 'high' as const })),
    ),
    waterDistribution$.pipe(
      filter((water) => water < 50),
      map(() => ({
        message: "Alerte : Distribution d'eau faible",
        priority: 'medium' as const,
      })),
    ),
    waterDistribution$.pipe(
      filter((water) => water > 500),
      map(() => ({
        message: "Information : Distribution d'eau élevée",
        priority: 'low' as const,
      })),
    ),
    irrigation$.pipe(
      filter((water) => water > 1000),
      map(() => ({
        message: "Alerte : Consommation d'eau pour l'irrigation élevée",
        priority: 'medium' as const,
      })),
    ),
    powerPlant$.pipe(
      filter((power) => power < 100),
      map(() => ({
        message: "Alerte : Production d'énergie faible",
        priority: 'medium' as const,
      })),
    ),
    powerPlant$.pipe(
      filter((power) => power > 1000),
      map(() => ({
        message: "Information : Production d'énergie exceptionnellement élevée",
        priority: 'low' as const,
      })),
    ),
    userWaterManagement$.pipe(
      filter((consumption) => consumption > 500),
      map(() => ({
        message: "Alerte : Consommation d'eau des utilisateurs élevée",
        priority: 'medium' as const,
      })),
    ),
  ).pipe(map(({ message, priority }) => addAlert(message, priority)));

  // S'abonner à alertSystem$
  alertSystem$.pipe(takeUntil(destroy$)).subscribe();

  // Modification de la fonction resetSystem pour utiliser les observables partagés
  function resetSystem() {
    // Arrêter toutes les simulations et souscriptions en cours
    stopSimulation();
    destroy$.next();
    destroy$.complete();

    // Réinitialiser tous les états réactifs à leurs valeurs initiales
    state.value = {
      waterLevel: 50,
      purifiedWater: 0,
      powerGenerated: 0,
      waterDistributed: 0,
      weatherCondition: 'ensoleillé' as WeatherCondition,
      alerts: [],
      irrigationWater: 0,
      treatedWastewater: 0,
      waterQuality: 90,
      floodRisk: 10,
      userConsumption: 0,
      glacierVolume: 1000000,
      meltRate: 0,
      isAutoMode: true,
    };

    // Réinitialiser toutes les sources de données
    dataSources.waterSource$.next(50);
    dataSources.weatherSource$.next('ensoleillé');
    dataSources.wastewaterSource$.next(0);
    dataSources.userConsumptionSource$.next(0);
    dataSources.glacierSource$.next(1000000);

    // Forcer une mise à jour immédiate
    const baseWaterInput = 40 + (Math.random() * 40 - 20);
    const seasonalFactor = 1 + 0.3 * Math.sin(Date.now() / (1000 * 60 * 60 * 24 * 30));
    dataSources.waterSource$.next(baseWaterInput * seasonalFactor);
    dataSources.glacierSource$.next(state.value.glacierVolume);
    weatherSimulation$.pipe(take(1)).subscribe((weather) => {
      state.value.weatherCondition = weather;
      dataSources.weatherSource$.next(weather);
    });

    // Recréer toutes les souscriptions
    const subscriptions = [
      dam$ // Remplacer sharedDam$ par dam$
        .pipe(
          takeUntil(destroy$),
          catchError((error) => handleError(error, 'Souscription au niveau du barrage')),
        )
        .subscribe((level) => {
          state.value.waterLevel = level;
        }),

      purificationPlant$.pipe(takeUntil(destroy$)).subscribe((water) => {
        state.value.purifiedWater += water;
      }),

      powerPlant$.pipe(takeUntil(destroy$)).subscribe((power) => {
        state.value.powerGenerated += power;
      }),

      irrigation$.pipe(takeUntil(destroy$)).subscribe((water) => {
        state.value.irrigationWater = water;
      }),

      wastewaterTreatment$.pipe(takeUntil(destroy$)).subscribe((water) => {
        state.value.treatedWastewater = water;
      }),

      waterQualityControl$.pipe(takeUntil(destroy$)).subscribe((quality) => {
        state.value.waterQuality = quality;
      }),

      floodPrediction$.pipe(takeUntil(destroy$)).subscribe((risk) => {
        state.value.floodRisk = risk;
      }),

      userWaterManagement$.pipe(takeUntil(destroy$)).subscribe((consumption) => {
        state.value.userConsumption = consumption;
      }),

      alertSystem$.pipe(takeUntil(destroy$)).subscribe(),

      weatherSimulation$.pipe(takeUntil(destroy$)).subscribe((weather) => {
        state.value.weatherCondition = weather;
        dataSources.weatherSource$.next(weather);
      }),

      waterDistribution$.pipe(takeUntil(destroy$)).subscribe((water) => {
        state.value.waterDistributed = water;
      }),

      glacierMelt$.pipe(takeUntil(destroy$)).subscribe(({ volume, meltRate: rate }) => {
        state.value.glacierVolume = volume;
        state.value.meltRate = rate;
      }),
    ];

    // Redémarrer la simulation
    startSimulation();

    // Forcer une mise à jour de tous les composants
    nextTick(() => {
      console.log('Système entièrement réinitialisé');
    });
  }

  onMounted(() => {
    resetSystem(); // Initialiser le système au montage
  });

  // Modification de la fonction onUnmounted pour utiliser le Subject destroy$
  onUnmounted(() => {
    destroy$.next();
    destroy$.complete();
    stopSimulation();
  });

  // Ajout de ces fonctions au début du fichier
  const throttledTotalWaterProcessed = throttle(() => {
    return state.value.purifiedWater + state.value.waterDistributed;
  }, 1000); // Calcul au maximum une fois par seconde

  const totalWaterProcessed = computed(
    waterSystemConfig.enablePerformanceLogs
      ? measureReactivePerformance('totalWaterProcessed', throttledTotalWaterProcessed)
      : throttledTotalWaterProcessed,
  );

  const throttledSystemEfficiency = throttle(() => {
    const processedWater = totalWaterProcessed.value;
    if (processedWater === undefined || processedWater === 0) return 0;
    return (state.value.purifiedWater / processedWater) * 100;
  }, 1000);

  const systemEfficiency = computed(
    waterSystemConfig.enablePerformanceLogs
      ? measureReactivePerformance('systemEfficiency', throttledSystemEfficiency)
      : throttledSystemEfficiency,
  );

  const overallSystemStatus = computed(() => {
    if (state.value.waterLevel < 20 || state.value.waterQuality < 50) {
      return 'Critique';
    }
    if (state.value.waterLevel < 40 || state.value.waterQuality < 70) {
      return 'Préoccupant';
    }
    return 'Normal';
  });

  // Convertir le ComputedRef<Alert[]> en Observable<Alert[]>
  const alertsObservable$ = new Observable<Alert[]>((subscriber) => {
    const unwatch = watch(
      alerts,
      (newAlerts) => {
        subscriber.next(newAlerts);
      },
      { immediate: true, deep: true },
    );

    return () => {
      unwatch();
    };
  });

  return {
    state: computed(() => state.value),
    observables: {
      waterLevel: dam$,
      purifiedWater: purificationPlant$,
      powerGenerated: powerPlant$,
      waterDistributed: waterDistribution$,
      weatherCondition: weatherSimulation$,
      alerts: alertsObservable$,
      irrigationWater: irrigation$,
      treatedWastewater: wastewaterTreatment$,
      waterQuality: waterQualityControl$,
      floodRisk: floodPrediction$,
      userConsumption: userWaterManagement$,
      glacierVolume: glacierMelt$.pipe(map(({ volume }) => volume)),
      meltRate: glacierMelt$.pipe(map(({ meltRate }) => meltRate)),
      isAutoMode: isAutoMode as unknown as Observable<boolean>, // Cast isAutoMode to Observable<boolean>
    },
    simulationControls: {
      isAutoMode: isAutoMode.value, // Retourner la valeur booléenne directement
      startSimulation,
      stopSimulation,
      toggleAutoMode: simulationToggleAutoMode, // Utilisez la fonction renommée ici
    },
    resetSystem,
    setWaterLevel,
    toggleManualMode, // Ajout de toggleManualMode ici
    totalWaterProcessed: totalWaterProcessed as Ref<number>,
    systemEfficiency: systemEfficiency as Ref<number>,
    overallSystemStatus,
    alerts,
    addAlert,
    currentWaterLevel,
    isManualMode: computed(() => isManualMode.value),
    toggleManualMode, // Ajoutez cette ligne
  };
}