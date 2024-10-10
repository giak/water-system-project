import { waterSystemConfig } from '@/config/waterSystemConfig';
import type {
  Alert,
  DataSources,
  SimulationControls,
  WaterSystemObservables,
  WaterSystemState,
  WeatherCondition,
} from '@/types/waterSystem';
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
import type { ComputedRef, Ref } from 'vue';
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

// Définition d'un type pour les erreurs
type WaterSystemError = Error | unknown;

// Modification de la fonction utilitaire pour la gestion des erreurs
function handleError(error: WaterSystemError, context: string): Observable<never> {
  console.error(`Erreur dans ${context}:`, error);
  // Vous pouvez ajouter ici une logique pour envoyer l'erreur à un service de monitoring
  return of(); // Retourne un Observable vide pour continuer le flux
}

export function useWaterSystem(): {
  state: ComputedRef<WaterSystemState>;
  observables: WaterSystemObservables;
  simulationControls: SimulationControls;
  resetSystem: () => void;
  setWaterLevel: (level: number) => void;
  toggleAutoMode: () => void;
  totalWaterProcessed: ComputedRef<number>;
  systemEfficiency: ComputedRef<number>;
  overallSystemStatus: ComputedRef<string>;
  alerts: Ref<Alert[]>;
  addAlert: (message: string, priority: Alert['priority']) => void;
  currentWaterLevel: ComputedRef<number>;
  toggleManualMode: () => void;
  isManualMode: ComputedRef<boolean>;
} {
  const destroy$ = new Subject<void>();
  const { alerts, addAlert } = useAlertSystem();

  // États réactifs
  const state = ref<WaterSystemState>({
    waterLevel: waterSystemConfig.INITIAL_WATER_LEVEL,
    isAutoMode: true,
    purifiedWater: waterSystemConfig.INITIAL_PURIFIED_WATER,
    powerGenerated: waterSystemConfig.INITIAL_POWER_GENERATED,
    waterDistributed: waterSystemConfig.INITIAL_WATER_DISTRIBUTED,
    weatherCondition: 'ensoleillé' as WeatherCondition,
    alerts: [],
    irrigationWater: waterSystemConfig.INITIAL_IRRIGATION_WATER,
    treatedWastewater: waterSystemConfig.INITIAL_TREATED_WASTEWATER,
    waterQuality: waterSystemConfig.INITIAL_WATER_QUALITY,
    floodRisk: waterSystemConfig.INITIAL_FLOOD_RISK,
    userConsumption: waterSystemConfig.INITIAL_USER_CONSUMPTION,
    glacierVolume: waterSystemConfig.INITIAL_GLACIER_VOLUME,
    meltRate: waterSystemConfig.INITIAL_MELT_RATE,
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

  const manualWaterLevel = ref(waterSystemConfig.INITIAL_WATER_LEVEL);
  const isManualMode = ref(false);

  const currentWaterLevel = computed(() => {
    return isManualMode.value ? manualWaterLevel.value : state.value.waterLevel;
  });

  const setWaterLevel = (level: number): void => {
    if (isManualMode.value) {
      manualWaterLevel.value = level;
      state.value.waterLevel = level;
    }
  };

  const toggleManualMode = (): void => {
    isManualMode.value = !isManualMode.value;
    if (isManualMode.value) {
      stopSimulation();
      manualWaterLevel.value = state.value.waterLevel;
    } else {
      startSimulation();
    }
    simulationToggleAutoMode();
  };

  function toggleAutoMode(): void {
    isManualMode.value = false;
  }

  // Optimisation des souscriptions
  const optimizedSubscribe = <T>(
    observable: Observable<T>,
    next: (value: T) => void,
    context: string,
  ): void => {
    observable
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
      if (distributedWater < waterSystemConfig.LOW_WATER_DISTRIBUTION) {
        addAlert("Distribution d'eau faible", 'medium');
      } else if (distributedWater > waterSystemConfig.HIGH_WATER_DISTRIBUTION) {
        addAlert("Distribution d'eau élevée", 'low');
      }
    },
    "Souscription à la distribution d'eau",
  );

  // Mise à jour de alertSystem$ pour utiliser les observables partagés
  const alertSystem$ = merge(
    sharedDam$.pipe(
      map((level) => {
        if (level >= waterSystemConfig.VERY_HIGH_WATER_LEVEL)
          return {
            message: 'Alerte : Niveau du barrage critique! (90%+)',
            priority: 'high' as const,
          };
        if (level >= waterSystemConfig.HIGH_WATER_LEVEL)
          return {
            message: 'Avertissement : Niveau du barrage élevé (80%+)',
            priority: 'medium' as const,
          };
        if (level <= waterSystemConfig.CRITICAL_WATER_LEVEL)
          return {
            message: 'Alerte : Niveau du barrage très bas! (20% ou moins)',
            priority: 'high' as const,
          };
        if (level <= waterSystemConfig.LOW_WATER_LEVEL)
          return {
            message: 'Avertissement : Niveau du barrage bas (30% ou moins)',
            priority: 'medium' as const,
          };
        return null;
      }),
      filter((alert): alert is Exclude<typeof alert, null> => alert !== null),
    ),
    sharedWaterQualityControl$.pipe(
      filter((quality) => quality < waterSystemConfig.LOW_WATER_QUALITY),
      map(() => ({
        message: "Alerte : Qualité de l'eau en dessous des normes!",
        priority: 'high' as const,
      })),
    ),
    sharedFloodPrediction$.pipe(
      filter((risk) => risk > waterSystemConfig.HIGH_FLOOD_RISK),
      map(() => ({ message: "Alerte : Risque élevé d'inondation!", priority: 'high' as const })),
    ),
    sharedWaterDistribution$.pipe(
      filter((water) => water < waterSystemConfig.LOW_WATER_DISTRIBUTION),
      map(() => ({ message: "Alerte : Distribution d'eau faible", priority: 'medium' as const })),
    ),
    sharedWaterDistribution$.pipe(
      filter((water) => water > waterSystemConfig.HIGH_WATER_DISTRIBUTION),
      map(() => ({ message: "Information : Distribution d'eau élevée", priority: 'low' as const })),
    ),
    sharedIrrigation$.pipe(
      filter((water) => water > waterSystemConfig.HIGH_IRRIGATION_WATER),
      map(() => ({
        message: "Alerte : Consommation d'eau pour l'irrigation élevée",
        priority: 'medium' as const,
      })),
    ),
    sharedPowerPlant$.pipe(
      filter((power) => power < waterSystemConfig.LOW_POWER_GENERATION),
      map(() => ({ message: "Alerte : Production d'énergie faible", priority: 'medium' as const })),
    ),
    sharedPowerPlant$.pipe(
      filter((power) => power > waterSystemConfig.HIGH_POWER_GENERATION),
      map(() => ({
        message: "Information : Production d'énergie exceptionnellement élevée",
        priority: 'low' as const,
      })),
    ),
    sharedUserWaterManagement$.pipe(
      filter((consumption) => consumption > waterSystemConfig.HIGH_USER_CONSUMPTION),
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
  function resetSystem(): void {
    // Arrêter toutes les simulations et souscriptions en cours
    stopSimulation();
    destroy$.next();
    destroy$.complete();

    // Réinitialiser tous les états réactifs à leurs valeurs initiales
    state.value = {
      waterLevel: waterSystemConfig.INITIAL_WATER_LEVEL,
      purifiedWater: waterSystemConfig.INITIAL_PURIFIED_WATER,
      powerGenerated: waterSystemConfig.INITIAL_POWER_GENERATED,
      waterDistributed: waterSystemConfig.INITIAL_WATER_DISTRIBUTED,
      weatherCondition: 'ensoleillé' as WeatherCondition,
      alerts: [],
      irrigationWater: waterSystemConfig.INITIAL_IRRIGATION_WATER,
      treatedWastewater: waterSystemConfig.INITIAL_TREATED_WASTEWATER,
      waterQuality: waterSystemConfig.INITIAL_WATER_QUALITY,
      floodRisk: waterSystemConfig.INITIAL_FLOOD_RISK,
      userConsumption: waterSystemConfig.INITIAL_USER_CONSUMPTION,
      glacierVolume: waterSystemConfig.INITIAL_GLACIER_VOLUME,
      meltRate: waterSystemConfig.INITIAL_MELT_RATE,
      isAutoMode: true,
    };

    // Réinitialiser toutes les sources de données
    dataSources.waterSource$.next(waterSystemConfig.INITIAL_WATER_LEVEL);
    dataSources.weatherSource$.next('ensoleillé');
    dataSources.wastewaterSource$.next(waterSystemConfig.INITIAL_TREATED_WASTEWATER);
    dataSources.userConsumptionSource$.next(waterSystemConfig.INITIAL_USER_CONSUMPTION);
    dataSources.glacierSource$.next(waterSystemConfig.INITIAL_GLACIER_VOLUME);

    // Forcer une mise à jour immédiate
    const baseWaterInput =
      waterSystemConfig.BASE_WATER_INPUT_MIN +
      Math.random() *
        (waterSystemConfig.BASE_WATER_INPUT_MAX - waterSystemConfig.BASE_WATER_INPUT_MIN);
    const seasonalFactor =
      1 +
      waterSystemConfig.SEASONAL_FACTOR_AMPLITUDE *
        Math.sin(Date.now() / waterSystemConfig.SEASONAL_FACTOR_PERIOD);
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

      sharedPurificationPlant$.pipe(takeUntil(destroy$)).subscribe((water) => {
        state.value.purifiedWater += water;
      }),

      sharedPowerPlant$.pipe(takeUntil(destroy$)).subscribe((power) => {
        state.value.powerGenerated += power;
      }),

      sharedIrrigation$.pipe(takeUntil(destroy$)).subscribe((water) => {
        state.value.irrigationWater = water;
      }),

      sharedWastewaterTreatment$.pipe(takeUntil(destroy$)).subscribe((water) => {
        state.value.treatedWastewater = water;
      }),

      sharedWaterQualityControl$.pipe(takeUntil(destroy$)).subscribe((quality) => {
        state.value.waterQuality = quality;
      }),

      sharedFloodPrediction$.pipe(takeUntil(destroy$)).subscribe((risk) => {
        state.value.floodRisk = risk;
      }),

      sharedUserWaterManagement$.pipe(takeUntil(destroy$)).subscribe((consumption) => {
        state.value.userConsumption = consumption;
      }),

      alertSystem$.pipe(takeUntil(destroy$)).subscribe(),

      sharedWeather$.pipe(takeUntil(destroy$)).subscribe((weather) => {
        state.value.weatherCondition = weather;
        dataSources.weatherSource$.next(weather);
      }),

      sharedWaterDistribution$.pipe(takeUntil(destroy$)).subscribe((water) => {
        state.value.waterDistributed = water;
      }),

      sharedGlacierMelt$.pipe(takeUntil(destroy$)).subscribe(({ volume, meltRate: rate }) => {
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

  // Optimisation des calculs coûteux avec memoization
  const memoizedTotalWaterProcessed = computed(() => {
    return state.value.purifiedWater + state.value.waterDistributed;
  });

  const throttledTotalWaterProcessed = throttle(() => {
    return memoizedTotalWaterProcessed.value;
  }, waterSystemConfig.THROTTLE_DELAY);

  const totalWaterProcessed = computed(() => {
    if (waterSystemConfig.enablePerformanceLogs) {
      console.time('totalWaterProcessed');
      const result = throttledTotalWaterProcessed();
      console.timeEnd('totalWaterProcessed');
      return result;
    }
    return throttledTotalWaterProcessed();
  });

  const memoizedSystemEfficiency = computed(() => {
    const processedWater = memoizedTotalWaterProcessed.value;
    if (processedWater === 0) return 0;
    return (state.value.purifiedWater / processedWater) * 100;
  });

  const throttledSystemEfficiency = throttle(() => {
    return memoizedSystemEfficiency.value;
  }, waterSystemConfig.THROTTLE_DELAY);

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
    if (
      state.value.waterLevel < waterSystemConfig.CRITICAL_WATER_LEVEL ||
      state.value.waterQuality < waterSystemConfig.CRITICAL_WATER_QUALITY
    ) {
      return 'Critique';
    }
    if (
      state.value.waterLevel < waterSystemConfig.LOW_WATER_LEVEL ||
      state.value.waterQuality < waterSystemConfig.MEDIUM_WATER_QUALITY
    ) {
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
