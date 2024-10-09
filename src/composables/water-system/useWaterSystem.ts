import type { Alert, DataSources, WaterSystemState, WeatherCondition } from '@/types/waterSystem';
import { PriorityQueue } from '@datastructures-js/priority-queue';
import { format } from 'date-fns';
import { throttle } from 'lodash-es';
import type { Observable } from 'rxjs';
import { Subject, combineLatest, interval, merge, of } from 'rxjs';
import {
  catchError,
  debounceTime,
  distinctUntilChanged,
  filter,
  map,
  mergeMap,
  scan,
  shareReplay,
  take,
  takeUntil,
  tap,
  throttleTime,
  withLatestFrom,
} from 'rxjs/operators';
import { v4 as uuidv4 } from 'uuid';
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue';
import { waterSystemConfig } from '@/config/waterSystemConfig';

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

export function useWaterSystem() {
  // États réactifs
  const state = ref<WaterSystemState>({
    waterLevel: 50,
    purifiedWater: 0,
    powerGenerated: 0,
    waterDistributed: 0,
    weatherCondition: 'ensoleillé',
    alerts: [],
    irrigationWater: 0,
    treatedWastewater: 0,
    waterQuality: 90,
    floodRisk: 10,
    userConsumption: 0,
    isAutoMode: true,
    glacierVolume: 1000000,
    meltRate: 0,
  });

  // Ajout de valeurs calculées
  const throttledTotalWaterProcessed = throttle(() => {
    return state.value.purifiedWater + state.value.waterDistributed;
  }, 1000); // Calcul au maximum une fois par seconde

  const totalWaterProcessed = computed(
    waterSystemConfig.enablePerformanceLogs
      ? measureReactivePerformance('totalWaterProcessed', throttledTotalWaterProcessed)
      : throttledTotalWaterProcessed
  );

  const throttledSystemEfficiency = throttle(() => {
    if (totalWaterProcessed.value === 0) return 0;
    return (state.value.purifiedWater / totalWaterProcessed.value) * 100;
  }, 1000);

  const systemEfficiency = computed(
    waterSystemConfig.enablePerformanceLogs
      ? measureReactivePerformance('systemEfficiency', throttledSystemEfficiency)
      : throttledSystemEfficiency
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

  // Sources de données
  const dataSources: DataSources = {
    waterSource$: new Subject<number>(),
    weatherSource$: new Subject<WeatherCondition>(),
    wastewaterSource$: new Subject<number>(),
    userConsumptionSource$: new Subject<number>(),
    glacierSource$: new Subject<number>(),
  };

  // Simulation des conditions météorologiques
  const weatherSimulation$: Observable<WeatherCondition> = interval(10000).pipe(
    map(() => {
      const conditions: WeatherCondition[] = ['ensoleillé', 'nuageux', 'pluvieux', 'orageux'];
      const randomIndex = Math.floor(Math.random() * conditions.length);
      return conditions[randomIndex];
    }),
  );

  // Modifions la simulation de la fonte du glacier
  const glacierMelt$ = combineLatest([interval(1000), dataSources.weatherSource$]).pipe(
    withLatestFrom(dataSources.glacierSource$),
    map(([[, weather], volume]) => {
      let meltRate = 0;
      switch (weather) {
        case 'ensoleillé':
          meltRate = volume * 0.0001; // 0.01% de fonte par heure
          break;
        case 'nuageux':
          meltRate = volume * 0.00005; // 0.005% de fonte par heure
          break;
        case 'pluvieux':
          meltRate = volume * 0.00015; // 0.015% de fonte par heure
          break;
        case 'orageux':
          meltRate = volume * 0.0002; // 0.02% de fonte par heure
          break;
      }
      const newVolume = Math.max(0, volume - meltRate);
      dataSources.glacierSource$.next(newVolume);
      return { volume: newVolume, meltRate };
    }),
    catchError((error) => handleError(error, 'Simulation de fonte du glacier')),
    shareReplay(1),
  );

  // Modifions le barrage pour permettre des niveaux d'eau plus bas
  const dam$ = combineLatest([
    dataSources.waterSource$,
    dataSources.weatherSource$,
    glacierMelt$,
  ]).pipe(
    map(([level, weather, glacier]) => {
      let adjustedLevel = level + glacier.meltRate;
      if (weather === 'pluvieux') adjustedLevel *= 1.1;
      if (weather === 'orageux') adjustedLevel *= 1.3;
      if (weather === 'ensoleillé') adjustedLevel *= 0.9;

      // Ajoutez une variation aléatoire
      const randomVariation = (Math.random() - 0.5) * 10; // Variation de ±5%
      adjustedLevel += randomVariation;

      return Math.max(0, Math.min(adjustedLevel, 100));
    }),
    catchError((error) => handleError(error, 'Calcul du niveau du barrage')),
    measureObservablePerformance('dam$'),
    shareReplay(1),
  );

  // Station de purification avec efficacité variable
  const purificationPlant$ = dam$.pipe(
    filter((level) => level > 20),
    map((water) => {
      const efficiency = 0.5 + Math.random() * 0.3; // Efficacité entre 50% et 80%
      return water * efficiency;
    }),
    mergeMap((water) =>
      interval(1000).pipe(
        take(5),
        map(() => water / 5),
      ),
    ),
  );

  // Centrale hydroélectrique avec rendement variable
  const powerPlant$ = dam$.pipe(
    filter((level) => level > 30),
    map((water) => {
      const efficiency = 0.7 + Math.random() * 0.2; // Rendement entre 70% et 90%
      return water * 0.4 * efficiency * 10;
    }),
  );

  // Système d'irrigation influencé par la météo
  const irrigation$ = combineLatest([purificationPlant$, dataSources.weatherSource$]).pipe(
    map(([water, weather]) => {
      let irrigationNeed = water * 0.3;
      if (weather === 'ensoleillé') irrigationNeed *= 1.2;
      if (weather === 'pluvieux') irrigationNeed *= 0.5;
      return irrigationNeed;
    }),
    scan((acc, value) => acc + value, 0),
  );

  // Traitement des eaux usées avec efficacité variable
  const wastewaterTreatment$ = dataSources.wastewaterSource$.pipe(
    map((wastewater) => {
      const efficiency = 0.6 + Math.random() * 0.3; // Efficacité entre 60% et 90%
      return wastewater * efficiency;
    }),
    scan((acc, value) => acc + value, 0),
  );

  // Contrôle de la qualité de l'eau
  const waterQualityControl$ = combineLatest([
    purificationPlant$,
    wastewaterTreatment$,
    dataSources.weatherSource$,
  ]).pipe(
    map(([purified, treated, weather]) => {
      let qualityScore = (purified / (purified + treated)) * 100;
      if (weather === 'orageux') qualityScore *= 0.9; // La qualité diminue lors des orages
      return Math.max(0, Math.min(100, qualityScore));
    }),
    measureObservablePerformance('waterQualityControl$'),
    shareReplay(1),
  );

  // Système de prévision des inondations
  const floodPrediction$ = combineLatest([dam$, dataSources.weatherSource$]).pipe(
    map(([waterLevel, weather]) => {
      let risk = 0;
      if (weather === 'pluvieux') risk += 20;
      if (weather === 'orageux') risk += 40;
      if (waterLevel > 80) risk += 30;
      if (waterLevel > 90) risk += 20;
      return Math.min(100, risk);
    }),
  );

  // Gestion de la consommation d'eau des utilisateurs
  const userWaterManagement$ = combineLatest([
    dataSources.userConsumptionSource$,
    waterQualityControl$,
    dataSources.weatherSource$,
  ]).pipe(
    map(([consumption, quality, weather]) => {
      let adjustedConsumption = consumption;
      if (quality < 50) adjustedConsumption *= 0.8;
      if (weather === 'ensoleillé') adjustedConsumption *= 1.2;
      return adjustedConsumption;
    }),
    scan((acc, value) => acc + value, 0),
    // Limitons l'accumulation à une période donnée (par exemple, les dernières 24 heures)
    map((total) => Math.max(0, total - DAILY_RESET_VALUE)),
    shareReplay(1),
  );

  // Ajustons la distribution d'eau en fonction du niveau d'eau
  const waterDistribution$ = dam$.pipe(
    map((level) => {
      if (level > 70) return level * 0.8;
      if (level > 30) return level * 0.5;
      return level * 0.2;
    }),
    scan((acc, value) => acc + value, 0),
    // Limitons également l'accumulation ici
    map((total) => Math.max(0, total - DAILY_RESET_VALUE)),
    shareReplay(1),
  );

  // Système de surveillance et d'alerte
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
    dataSources.weatherSource$.pipe(
      filter((condition) => condition === 'orageux'),
      map(() => ({
        message: 'Alerte : Conditions météorologiques dangereuses!',
        priority: 'medium' as const,
      })),
    ),
    purificationPlant$.pipe(
      scan((acc, value) => acc + value, 0),
      filter((total) => total < 100),
      debounceTime(5000),
      map(() => ({
        message: "Alerte : Production d'eau purifie faible!",
        priority: 'medium' as const,
      })),
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
    dam$.pipe(
      filter((level) => level < 30),
      map(() => ({
        message: "Alerte : Niveau d'eau critique, distribution limitée!",
        priority: 'high' as const,
      })),
    ),
    dam$.pipe(
      filter((level) => level > 70),
      map(() => ({
        message: "Information : Distribution d'eau effective.",
        priority: 'low' as const,
      })),
    ),
    dam$.pipe(
      filter((level) => level <= 70 && level > 30),
      map(() => ({ message: "Alerte : Distribution d'eau réduite.", priority: 'medium' as const })),
    ),
    dam$.pipe(
      filter((level) => level <= 30),
      map(() => ({ message: "Alerte : Distribution d'eau minimale !", priority: 'high' as const })),
    ),
  ).pipe(map(({ message, priority }) => addAlert(message, priority)));

  // Optimisation des observables fréquemment utilisés
  const throttleInterval = 2000; // 2 secondes

  const sharedDam$ = dam$.pipe(
    distinctUntilChanged(),
    throttleTime(throttleInterval),
    measureObservablePerformance('sharedDam$'),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  const throttleIntervalLong = 10000; // 10 secondes

  const sharedWaterQualityControl$ = waterQualityControl$.pipe(
    distinctUntilChanged(),
    throttleTime(throttleIntervalLong),
    measureObservablePerformance('sharedWaterQualityControl$'),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  const sharedFloodPrediction$ = floodPrediction$.pipe(
    distinctUntilChanged(),
    throttleTime(throttleInterval),
    measureObservablePerformance('sharedFloodPrediction$'),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  // Création d'un Subject pour la gestion du nettoyage
  const destroy$ = new Subject<void>();

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
      weatherCondition: 'ensoleillé',
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
      sharedDam$
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

      sharedWaterQualityControl$.pipe(takeUntil(destroy$)).subscribe((quality) => {
        state.value.waterQuality = quality;
      }),

      sharedFloodPrediction$.pipe(takeUntil(destroy$)).subscribe((risk) => {
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

  function setWaterLevel(level: number) {
    if (!state.value.isAutoMode) {
      state.value.waterLevel = level;
      dataSources.waterSource$.next(level);
    }
  }

  function toggleAutoMode() {
    state.value.isAutoMode = !state.value.isAutoMode;
    if (state.value.isAutoMode) {
      startSimulation();
    } else {
      stopSimulation();
    }
  }

  let simulationInterval: number | null = null;

  function startSimulation() {
    if (simulationInterval) return;
    simulationInterval = window.setInterval(() => {
      if (state.value.isAutoMode) {
        const baseWaterInput = 40 + (Math.random() * 60 - 30); // Plus grande plage de variation
        const seasonalFactor = 1 + 0.5 * Math.sin(Date.now() / (1000 * 60 * 60 * 24 * 30)); // Effet saisonnier plus prononcé
        dataSources.waterSource$.next(baseWaterInput * seasonalFactor);

        // Mise à jour du volume du glacier avec une fonte variable
        const glacierMeltRate = 0.00001 + Math.random() * 0.00009; // Taux de fonte variable
        state.value.glacierVolume = Math.max(0, state.value.glacierVolume * (1 - glacierMeltRate));
        dataSources.glacierSource$.next(state.value.glacierVolume);

        // Forcer une mise à jour des autres valeurs
        weatherSimulation$.pipe(take(1)).subscribe((weather) => {
          state.value.weatherCondition = weather;
          dataSources.weatherSource$.next(weather);
        });
      }
    }, 2000);
  }

  function stopSimulation() {
    if (simulationInterval) {
      window.clearInterval(simulationInterval);
      simulationInterval = null;
    }
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

  // Modifiez le computed pour les alertes
  const alerts = computed(() => {
    // Utilisez alertsChanged.value pour forcer la réévaluation
    alertsChanged.value;
    return Array.from(alertQueue.toArray());
  });

  return {
    state,
    resetSystem,
    setWaterLevel,
    toggleAutoMode,
    totalWaterProcessed,
    systemEfficiency,
    overallSystemStatus,
    alerts,
    addAlert,
  };
}