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
  shareReplay,
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

// Définition d'un type pour les erreurs
type WaterSystemError = Error | unknown;

const alertQueue = new PriorityQueue<Alert>((a, b) => {
  const priorityOrder = { high: 3, medium: 2, low: 1 };
  if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
    return priorityOrder[b.priority] - priorityOrder[a.priority];
  }
  return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
});

const alertsChanged = ref(0);

// Modification de la fonction utilitaire pour la gestion des erreurs
function handleError(error: WaterSystemError, context: string): Observable<never> {
  console.error(`Erreur dans ${context}:`, error);
  return of(); // Retourne un Observable vide pour continuer le flux
}

function getPerformanceNow(): number {
  return typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now();
}

function logPerformance(name: string, startTime: number) {
  if (waterSystemConfig.enablePerformanceLogs) {
    const endTime = performance.now();
    console.log(`Performance de ${name}: ${endTime - startTime} ms`);
  }
}

function logObservablePerformance(name: string, value: unknown, time: number) {
  if (waterSystemConfig.enablePerformanceLogs) {
    console.log(
      `Observable ${name} - Temps: ${time.toFixed(2)}ms - Valeur: ${JSON.stringify(value)}`,
    );
  }
}

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
    toggleAutoMode: simulationToggleAutoMode,
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
    simulationToggleAutoMode();
  };

  function toggleAutoMode() {
    isManualMode.value = false;
  }

  // Optimisation des souscriptions
  const optimizedSubscribe = <T>(
    observable: Observable<T>,
    next: (value: T) => void,
    context: string,
  ) => {
    return observable
      .pipe(
        distinctUntilChanged(),
        takeUntil(destroy$),
        catchError((error) => handleError(error, context)),
      )
      .subscribe(next);
  };

  // Utilisation de l'opérateur shareReplay pour les observables fréquemment utilisés
  const sharedDam$ = dam$.pipe(shareReplay(1));
  const sharedWeather$ = weatherSimulation$.pipe(shareReplay(1));
  const sharedGlacierMelt$ = glacierMelt$.pipe(shareReplay(1));
  const sharedPurificationPlant$ = purificationPlant$.pipe(shareReplay(1));
  const sharedPowerPlant$ = powerPlant$.pipe(shareReplay(1));
  const sharedIrrigation$ = irrigation$.pipe(shareReplay(1));
  const sharedWastewaterTreatment$ = wastewaterTreatment$.pipe(shareReplay(1));
  const sharedWaterQualityControl$ = waterQualityControl$.pipe(shareReplay(1));
  const sharedFloodPrediction$ = floodPrediction$.pipe(shareReplay(1));
  const sharedUserWaterManagement$ = userWaterManagement$.pipe(shareReplay(1));
  const sharedWaterDistribution$ = waterDistribution$.pipe(shareReplay(1));

  // Mise à jour des souscriptions pour utiliser les observables partagés
  optimizedSubscribe(
    sharedDam$,
    (level) => {
      if (!isManualMode.value) {
        state.value.waterLevel = level;
      }
    },
    'Souscription au niveau du barrage',
  );

  optimizedSubscribe(
    sharedWeather$,
    (weather) => {
      state.value.weatherCondition = weather;
    },
    'Souscription aux conditions météorologiques',
  );

  optimizedSubscribe(
    sharedGlacierMelt$,
    ({ volume, meltRate }) => {
      state.value.glacierVolume = volume;
      state.value.meltRate = meltRate;
    },
    'Souscription à la fonte du glacier',
  );

  optimizedSubscribe(
    sharedPurificationPlant$,
    (water) => {
      state.value.purifiedWater = water;
    },
    "Souscription à la purification de l'eau",
  );

  optimizedSubscribe(
    sharedPowerPlant$,
    (power) => {
      state.value.powerGenerated = power;
    },
    "Souscription à la production d'énergie",
  );

  optimizedSubscribe(
    sharedIrrigation$,
    (water) => {
      state.value.irrigationWater = water;
    },
    "Souscription à l'irrigation",
  );

  optimizedSubscribe(
    sharedWastewaterTreatment$,
    (water) => {
      state.value.treatedWastewater = water;
    },
    'Souscription au traitement des eaux usées',
  );

  optimizedSubscribe(
    sharedWaterQualityControl$,
    (quality) => {
      state.value.waterQuality = quality;
    },
    "Souscription au contrôle de la qualité de l'eau",
  );

  optimizedSubscribe(
    sharedFloodPrediction$,
    (risk) => {
      state.value.floodRisk = risk;
    },
    'Souscription à la prédiction des inondations',
  );

  optimizedSubscribe(
    sharedUserWaterManagement$,
    (consumption) => {
      state.value.userConsumption = consumption;
    },
    "Souscription à la gestion de l'eau des utilisateurs",
  );

  optimizedSubscribe(
    sharedWaterDistribution$,
    (distributedWater) => {
      state.value.waterDistributed = distributedWater;

      // Ajoutez des alertes basées sur la distribution d'eau
      if (distributedWater < 50) {
        addAlert("Distribution d'eau faible", 'medium');
      } else if (distributedWater > 500) {
        addAlert("Distribution d'eau élevée", 'low');
      }
    },
    "Souscription à la distribution d'eau",
  );

  // Mise à jour de alertSystem$ pour utiliser les observables partagés
  const alertSystem$ = merge(
    sharedDam$.pipe(
      map((level) => {
        if (level >= 90)
          return {
            message: 'Alerte : Niveau du barrage critique! (90%+)',
            priority: 'high' as const,
          };
        if (level >= 80)
          return {
            message: 'Avertissement : Niveau du barrage élevé (80%+)',
            priority: 'medium' as const,
          };
        if (level <= 20)
          return {
            message: 'Alerte : Niveau du barrage très bas! (20% ou moins)',
            priority: 'high' as const,
          };
        if (level <= 30)
          return {
            message: 'Avertissement : Niveau du barrage bas (30% ou moins)',
            priority: 'medium' as const,
          };
        return null;
      }),
      filter((alert): alert is Exclude<typeof alert, null> => alert !== null),
    ),
    sharedWaterQualityControl$.pipe(
      filter((quality) => quality < 60),
      map(() => ({
        message: "Alerte : Qualité de l'eau en dessous des normes!",
        priority: 'high' as const,
      })),
    ),
    sharedFloodPrediction$.pipe(
      filter((risk) => risk > 80),
      map(() => ({ message: "Alerte : Risque élevé d'inondation!", priority: 'high' as const })),
    ),
    sharedWaterDistribution$.pipe(
      filter((water) => water < 50),
      map(() => ({ message: "Alerte : Distribution d'eau faible", priority: 'medium' as const })),
    ),
    sharedWaterDistribution$.pipe(
      filter((water) => water > 500),
      map(() => ({ message: "Information : Distribution d'eau élevée", priority: 'low' as const })),
    ),
    sharedIrrigation$.pipe(
      filter((water) => water > 1000),
      map(() => ({
        message: "Alerte : Consommation d'eau pour l'irrigation élevée",
        priority: 'medium' as const,
      })),
    ),
    sharedPowerPlant$.pipe(
      filter((power) => power < 100),
      map(() => ({ message: "Alerte : Production d'énergie faible", priority: 'medium' as const })),
    ),
    sharedPowerPlant$.pipe(
      filter((power) => power > 1000),
      map(() => ({
        message: "Information : Production d'énergie exceptionnellement élevée",
        priority: 'low' as const,
      })),
    ),
    sharedUserWaterManagement$.pipe(
      filter((consumption) => consumption > 500),
      map(() => ({
        message: "Alerte : Consommation d'eau des utilisateurs élevée",
        priority: 'medium' as const,
      })),
    ),
  ).pipe(
    tap(({ message, priority }) => addAlert(message, priority)),
    shareReplay(1),
  );

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

  const totalWaterProcessed = computed(() => {
    if (waterSystemConfig.enablePerformanceLogs) {
      console.time('totalWaterProcessed');
      const result = throttledTotalWaterProcessed();
      console.timeEnd('totalWaterProcessed');
      return result;
    }
    return throttledTotalWaterProcessed();
  });

  const throttledSystemEfficiency = throttle(() => {
    const processedWater = totalWaterProcessed.value;
    if (processedWater === 0) return 0;
    return (state.value.purifiedWater / processedWater) * 100;
  }, 1000);

  const systemEfficiency = computed(() => {
    if (waterSystemConfig.enablePerformanceLogs) {
      console.time('systemEfficiency');
      const result = throttledSystemEfficiency();
      console.timeEnd('systemEfficiency');
      return result;
    }
    return throttledSystemEfficiency();
  });

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
      waterLevel: sharedDam$,
      purifiedWater: sharedPurificationPlant$,
      powerGenerated: sharedPowerPlant$,
      waterDistributed: sharedWaterDistribution$,
      weatherCondition: sharedWeather$,
      alerts: alertsObservable$,
      irrigationWater: sharedIrrigation$,
      treatedWastewater: sharedWastewaterTreatment$,
      waterQuality: sharedWaterQualityControl$,
      floodRisk: sharedFloodPrediction$,
      userConsumption: sharedUserWaterManagement$,
      glacierVolume: sharedGlacierMelt$.pipe(map(({ volume }) => volume)),
      meltRate: sharedGlacierMelt$.pipe(map(({ meltRate }) => meltRate)),
      isAutoMode: isAutoMode as unknown as Observable<boolean>,
    },
    simulationControls: {
      isAutoMode: isAutoMode.value,
      startSimulation,
      stopSimulation,
      toggleAutoMode: simulationToggleAutoMode,
    },
    resetSystem,
    setWaterLevel,
    totalWaterProcessed,
    systemEfficiency,
    overallSystemStatus,
    alerts,
    addAlert,
    currentWaterLevel,
    isManualMode: computed(() => isManualMode.value),
    toggleManualMode,
    toggleAutoMode,
  };
}
