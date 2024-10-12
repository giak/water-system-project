/**
 * @file useWaterSystem.ts
 * @description Ce fichier contient le composable principal pour la gestion du système d'eau.
 * Il orchestre tous les sous-systèmes et fournit une interface unifiée pour interagir avec le système d'eau dans son ensemble.
 *
 * @module WaterSystem
 */

// Imports from external libraries
import { Observable, Subject } from 'rxjs';
import {
  catchError,
  distinctUntilChanged,
  map,
  shareReplay,
  take,
  takeUntil,
  tap,
} from 'rxjs/operators';
import type { ComputedRef, Ref } from 'vue';
import { computed, nextTick, onMounted, onUnmounted, reactive, ref, watch } from 'vue';

// Imports from local files
import { waterSystemConfig } from '@/config/waterSystemConfig';
import type {
  Alert,
  DataSources,
  SimulationControls,
  WaterSourceLogEntry,
  WaterSystemObservables,
  WaterSystemState,
  WeatherCondition,
} from '@/types/waterSystem';
import { handleError } from '@/utils/errorUtils';

// Imports of local composables
import {
  useAlertSystem,
  useDamManagement,
  useFloodPrediction,
  useGlacierMelt,
  useIrrigation,
  usePowerPlant,
  useSimulation,
  useUserWaterManagement,
  useWastewaterTreatment,
  useWaterDistribution,
  useWaterPurification,
  useWaterQualityControl,
  useWaterSourceLogging,
  useWeatherSimulation,
} from './';

/**
 * Composable principal pour la gestion du système d'eau.
 * 
 * @returns Un objet contenant l'état du système, les observables, les contrôles de simulation et diverses fonctions utilitaires.
 * 
 * @description
 * Ce composable est le cœur du système de gestion de l'eau. Il intègre et coordonne tous les sous-systèmes
 * pour fournir une interface unifiée et réactive du système d'eau dans son ensemble.
 * 
 * Fonctionnalités principales :
 * - Gestion de l'état global du système d'eau
 * - Coordination des différents sous-systèmes (barrage, purification, distribution, etc.)
 * - Gestion des modes automatique et manuel
 * - Système d'alertes en temps réel
 * - Calculs d'efficacité et de performance du système
 * 
 * @example
 * const {
 *   state,
 *   observables,
 *   simulationControls,
 *   resetSystem,
 *   setWaterLevel,
 *   // ... autres propriétés et méthodes
 * } = useWaterSystem();
 */
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
  waterSourceLogs: Ref<WaterSourceLogEntry[]>;
  waterSourceLog$: Observable<WaterSourceLogEntry>;
} {
  /**
   * Subject pour gérer la destruction du composable.
   * Utilisé pour nettoyer les souscriptions lors de la destruction du composable.
   *
   * @type {Subject<void>}
   */
  const destroy$ = new Subject<void>();

  /**
   * État réactif principal du système d'eau.
   * Contient toutes les métriques et états importants du système.
   *
   * @type {Ref<WaterSystemState>}
   *
   * @description
   * Cette constante est une référence à un objet qui représente l'état actuel du système d'eau.
   * Elle est initialisée avec les valeurs par défaut définies dans waterSystemConfig.
   *
   * Les propriétés de cet objet incluent :
   * - waterLevel : Le niveau actuel d'eau dans le système.
   * - isAutoMode : Un booléen indiquant si le système est en mode automatique.
   * - purifiedWater : La quantité d'eau purifiée produite.
   * - powerGenerated : La quantité d'énergie produite.
   * - waterDistributed : La quantité d'eau distribuée.
   * - weatherCondition : La condition météorologique actuelle.
   * - alerts : Un tableau d'alertes actuelles.
   * - irrigationWater : La quantité d'eau utilisée pour l'irrigation.
   * - treatedWastewater : La quantité d'eau traitée.
   * - waterQuality : La qualité de l'eau.
   * - floodRisk : Le risque d'inondation.
   * - userConsumption : La consommation d'eau des utilisateurs.
   * - glacierVolume : Le volume actuel du glacier.
   * - meltRate : Le taux de fonte du glacier.
   */
  const state = reactive<WaterSystemState>({
    waterLevel: waterSystemConfig.INITIAL_DAM_WATER_LEVEL,
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
    waterFlow: waterSystemConfig.INITIAL_WATER_FLOW,
    damWaterVolume: waterSystemConfig.INITIAL_DAM_WATER_VOLUME,
  });

  /**
   * Sources de données pour les différents aspects du système d'eau.
   * Utilisées pour injecter des données dans les sous-systèmes.
   *
   * @type {DataSources}
   *
   * @description
   * Cette constante contient des Subjects RxJS pour chaque source de données du système.
   * Ces Subjects permettent d'injecter des données simulées ou réelles dans les différents sous-systèmes.
   *
   * @property {Subject<number>} waterSource$ - Subject pour injecter le niveau d'eau simulé
   * @property {Subject<WeatherCondition>} weatherSource$ - Subject pour injecter les conditions météorologiques simulées
   * @property {Subject<number>} wastewaterSource$ - Subject pour injecter la quantité d'eaux usées simulées
   * @property {Subject<number>} userConsumptionSource$ - Subject pour injecter la consommation d'eau des utilisateurs simulée
   * @property {Subject<number>} glacierSource$ - Subject pour injecter le volume du glacier simulé
   */
  const dataSources: DataSources = {
    waterSource$: new Subject<number>(),
    weatherSource$: new Subject<WeatherCondition>(),
    wastewaterSource$: new Subject<number>(),
    userConsumptionSource$: new Subject<number>(),
    glacierSource$: new Subject<number>(),
  };

  /**
   * Simulation des conditions météorologiques.
   * Fournit un Observable des conditions météorologiques simulées.
   *
   * @type {Observable<WeatherCondition>}
   */
  const { weatherSimulation$ } = useWeatherSimulation();

  /**
   * Simulation de la fonte des glaciers.
   * Fournit un Observable des données de fonte des glaciers en fonction des conditions météorologiques.
   *
   * @type {Observable<{ volume: number; meltRate: number }>}
   */
  const { glacierMelt$ } = useGlacierMelt(dataSources.weatherSource$, dataSources.glacierSource$);

  /**
   * Gestion du barrage.
   * Fournit un Observable du niveau d'eau du barrage en fonction des entrées d'eau et des conditions météorologiques.
   *
   * @type {Observable<number>}
   *
   * @description
   * Cette constante est une référence à un objet qui représente l'état actuel du système d'eau.
   * Elle est initialisée avec les valeurs par défaut définies dans waterSystemConfig.
   */
  const { dam$, setInitialWaterLevel, damWaterVolume, updateDamWaterVolume } = useDamManagement(
    dataSources.waterSource$,
    dataSources.weatherSource$,
    glacierMelt$,
  );

  // Initialiser le niveau d'eau du barrage à 70%
  setInitialWaterLevel(waterSystemConfig.INITIAL_DAM_WATER_LEVEL);

  /**
   * Simulation de l'usine de purification de l'eau.
   * Fournit un Observable de la quantité d'eau purifiée en fonction du niveau d'eau du barrage.
   *
   * @type {Observable<number>}
   */
  const { purificationPlant$ } = useWaterPurification(dam$);

  /**
   * Simulation de la centrale électrique.
   * Fournit un Observable de la quantité d'énergie produite en fonction du niveau d'eau du barrage.
   *
   * @type {Observable<number>}
   */
  const { powerPlant$ } = usePowerPlant(dam$);

  /**
   * Simulation du système d'irrigation.
   * Fournit un Observable de la quantité d'eau utilisée pour l'irrigation en fonction de l'eau purifiée et des conditions météorologiques.
   *
   * @type {Observable<number>}
   */
  const { irrigation$ } = useIrrigation(purificationPlant$, dataSources.weatherSource$);

  /**
   * Simulation du traitement des eaux usées.
   * Fournit un Observable de la quantité d'eau traitée en fonction des eaux usées entrantes.
   *
   * @type {Observable<number>}
   */
  const { wastewaterTreatment$ } = useWastewaterTreatment(dataSources.wastewaterSource$);

  /**
   * Contrôle de la qualité de l'eau.
   * Fournit un Observable de la qualité de l'eau en fonction de l'eau purifiée, des eaux usées traitées et des conditions météorologiques.
   *
   * @type {Observable<number>}
   *
   * @description
   * Cette constante est une référence à un objet qui représente l'état actuel du système d'eau.
   * Elle est initialisée avec les valeurs par défaut définies dans waterSystemConfig.
   */
  const { waterQualityControl$ } = useWaterQualityControl(
    purificationPlant$,
    wastewaterTreatment$,
    dataSources.weatherSource$,
  );

  /**
   * Prédiction des inondations.
   * Fournit un Observable du risque d'inondation en fonction du niveau d'eau du barrage et des conditions météorologiques.
   *
   * @type {Observable<number>}
   */
  const { floodPrediction$ } = useFloodPrediction(dam$, dataSources.weatherSource$);

  /**
   * Gestion de la consommation d'eau des utilisateurs.
   * Fournit un Observable de la consommation d'eau des utilisateurs en fonction de divers facteurs.
   *
   * @type {Observable<number>}
   *
   * @description
   * Cette constante est une référence à un objet qui représente l'état actuel du système d'eau.
   * Elle est initialisée avec les valeurs par défaut définies dans waterSystemConfig.
   */
  const { userWaterManagement$ } = useUserWaterManagement(
    dataSources.userConsumptionSource$,
    waterQualityControl$,
    dataSources.weatherSource$,
  );

  /**
   * Distribution de l'eau.
   * Fournit un Observable de la quantité d'eau distribuée en fonction du niveau d'eau du barrage.
   *
   * @type {Observable<number>}
   */
  const { waterDistribution$ } = useWaterDistribution(dam$);

  /**
   * Contrôles de simulation et état du mode automatique.
   * Fournit des méthodes pour contrôler la simulation et l'état du mode automatique.
   *
   * @type {Object}
   * @property {Ref<boolean>} isAutoMode - Indique si le système est en mode automatique
   * @property {Function} startSimulation - Démarre la simulation
   * @property {Function} stopSimulation - Arrête la simulation
   * @property {Function} toggleAutoMode - Bascule entre le mode automatique et manuel
   *
   * @description
   * Cette constante est une référence à un objet qui représente l'état actuel du système d'eau.
   * Elle est initialisée avec les valeurs par défaut définies dans waterSystemConfig.
   */
  const {
    isAutoMode,
    startSimulation,
    stopSimulation,
    toggleAutoMode: simulationToggleAutoMode,
  } = useSimulation(dataSources, weatherSimulation$);

  /**
   * Niveau d'eau en mode manuel.
   * Utilisé lorsque le système est en mode manuel pour permettre le contrôle direct par l'utilisateur.
   *
   * @type {Ref<number>}
   */
  const manualWaterLevel = ref(waterSystemConfig.INITIAL_WATER_LEVEL);

  /**
   * Indique si le système est en mode manuel.
   * Lorsque true, le système utilise manualWaterLevel au lieu des valeurs simules.
   *
   * @type {Ref<boolean>}
   */
  const isManualMode = ref(false);

  /**
   * Calcule le niveau d'eau actuel en fonction du mode (manuel ou automatique).
   *
   * @type {ComputedRef<number>}
   */
  const currentWaterLevel = computed(() => {
    return isManualMode.value ? manualWaterLevel.value : state.waterLevel;
  });

  /**
   * Définit le niveau d'eau manuellement.
   * N'a d'effet que lorsque le système est en mode manuel.
   *
   * @param {number} level - Le nouveau niveau d'eau à définir
   */
  const setWaterLevel = (level: number): void => {
    if (isManualMode.value) {
      manualWaterLevel.value = level;
      state.waterLevel = level;
    }
  };

  /**
   * Bascule entre le mode manuel et automatique.
   * Arrête ou démarre la simulation en fonction du mode.   *
   */
  const toggleManualMode = (): void => {
    isManualMode.value = !isManualMode.value;
    if (isManualMode.value) {
      stopSimulation();
      manualWaterLevel.value = state.waterLevel;
    } else {
      startSimulation();
    }
    simulationToggleAutoMode();
  };

  /**
   * Désactive le mode manuel et revient au mode automatique.
   */
  function toggleAutoMode(): void {
    isManualMode.value = false;
  }

  /**
   * Optimise la souscription à un Observable en appliquant des opérateurs RxJS communs.
   *
   * @param {Observable<T>} observable - L'Observable à optimiser
   * @param {function} next - La fonction à exécuter pour chaque valeur mise
   * @param {string} context - Le contexte de la souscription pour la gestion des erreurs
   *
   * @description
   * Cette fonction applique plusieurs optimisations :
   * - distinctUntilChanged : évite les mises à jour inutiles si la valeur n'a pas changé
   * - takeUntil : assure que la souscription est correctement nettoyée lors de la destruction du composant
   * - catchError : gère les erreurs de manière centralisée
   *
   * Pourquoi c'est ainsi fait :
   * - Réduit la duplication de code en centralisant les optimisations communes
   * - Améliore les performances en évitant les mises  jour inutiles
   * - Assure une gestion cohérente des erreurs et du nettoyage des ressources
   */
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

  const { logs: waterSourceLogs, log$: waterSourceLog$, logWaterSource } = useWaterSourceLogging();

  // Utiliser logWaterSource pour chaque source d'eau
  const logDam = logWaterSource('Dam');
  const logGlacier = logWaterSource('Glacier');
  // ... (autres sources)

  /**
   * Observables partagés pour les différents aspects du système d'eau.
   * L'utilisation de shareReplay(1) permet d'optimiser les performances en évitant
   * les calculs redondants lorsque plusieurs composants s'abonnent au même Observable.
   */
  const sharedObservables = {
    dam$: dam$.pipe(
      tap((level) => {
        if (waterSystemConfig.enableWaterSystemLogs) {
          logDam(level, state.weatherCondition, state.waterFlow, state.waterQuality);
        }
      }),
      shareReplay(1),
    ),
    weather$: weatherSimulation$.pipe(shareReplay(1)),
    glacierMelt$: glacierMelt$.pipe(
      tap(({ waterFlow }) => {
        if (waterSystemConfig.enableWaterSystemLogs) {
          logGlacier(state.glacierVolume, state.weatherCondition, waterFlow);
        }
      }),
      shareReplay(1),
    ),
    purificationPlant$: purificationPlant$.pipe(shareReplay(1)),
    powerPlant$: powerPlant$.pipe(shareReplay(1)),
    irrigation$: irrigation$.pipe(shareReplay(1)),
    wastewaterTreatment$: wastewaterTreatment$.pipe(shareReplay(1)),
    waterQualityControl$: waterQualityControl$.pipe(shareReplay(1)),
    floodPrediction$: floodPrediction$.pipe(shareReplay(1)),
    userWaterManagement$: userWaterManagement$.pipe(shareReplay(1)),
    waterDistribution$: waterDistribution$.pipe(shareReplay(1)),
    damWaterVolume$: new Observable<number>((subscriber) => {
      const unwatch = watch(
        damWaterVolume,
        (newValue) => {
          subscriber.next(newValue);
        },
        { immediate: true },
      );
      return () => {
        unwatch();
      };
    }).pipe(shareReplay(1)),
  };

  const { alerts, addAlert, alertSystem$, alertsObservable$ } = useAlertSystem(sharedObservables);

  /**
   * Gère les souscriptions aux observables partagés.
   * 
   * @param observables - Un objet contenant les observables à souscrire
   * @param updateState - Une fonction pour mettre à jour l'état
   * 
   * @description
   * Cette fonction centralise la gestion des souscriptions aux observables partagés.
   * Elle utilise la fonction `optimizedSubscribe` pour chaque observable, ce qui permet
   * d'appliquer des optimisations communes (comme distinctUntilChanged et gestion des erreurs)
   * à toutes les souscriptions.
   */
  function manageSubscriptions(
    observables: Record<string, Observable<unknown>>,
    updateState: (key: string, value: unknown) => void,
  ) {
    for (const [key, observable] of Object.entries(observables)) {
      optimizedSubscribe(observable, (value) => updateState(key, value), `Souscription à ${key}`);
    }
  }

  // Utilisation de la nouvelle fonction manageSubscriptions
  manageSubscriptions(sharedObservables, (key, value) => {
    switch (key) {
      case 'dam$':
        if (!isManualMode.value) {
          state.waterLevel = value as number;
          updateDamWaterVolume(value as number);
        }
        break;
      case 'weather$':
        state.weatherCondition = value as WeatherCondition;
        break;
      case 'glacierMelt$': {
        const { volume, meltRate, waterFlow } = value as {
          volume: number;
          meltRate: number;
          waterFlow: number;
        };
        state.glacierVolume = volume;
        state.meltRate = meltRate;
        state.waterFlow = waterFlow;
        break;
      }
      case 'purificationPlant$':
        state.purifiedWater = value as number;
        break;
      case 'powerPlant$':
        state.powerGenerated = value as number;
        break;
      case 'irrigation$':
        state.irrigationWater = value as number;
        break;
      case 'wastewaterTreatment$':
        state.treatedWastewater = value as number;
        break;
      case 'waterQualityControl$':
        state.waterQuality = value as number;
        break;
      case 'floodPrediction$':
        state.floodRisk = value as number;
        break;
      case 'userWaterManagement$':
        state.userConsumption = value as number;
        break;
      case 'waterDistribution$': {
        const distributionValue = value as number;
        state.waterDistributed = distributionValue;
        if (distributionValue < waterSystemConfig.LOW_WATER_DISTRIBUTION) {
          addAlert("Distribution d'eau faible", 'medium');
        } else if (distributionValue > waterSystemConfig.HIGH_WATER_DISTRIBUTION) {
          addAlert("Distribution d'eau élevée", 'low');
        }
        break;
      }
    }
  });

  /**
   * Gestion des alertes.
   * Génère des alertes en fonction des conditions du système.
   *
   * @description
   * Ce système d'alerte utilise l'opérateur merge de RxJS pour combiner plusieurs sources d'alertes.
   * Chaque source d'alerte est basée sur un Observable partagé et génère des alertes
   * en fonction de conditions spécifiques.
   */
  alertSystem$.pipe(takeUntil(destroy$)).subscribe();

  /**
   * Réinitialise l'ensemble du système d'eau à son état initial.
   *
   * @description
   * Cette fonction effectue une réinitialisation complète et méthodique du système :
   * 1. Arrête toutes les simulations et souscriptions en cours.
   * 2. Réinitialise tous les états à leurs valeurs initiales.
   * 3. Réinitialise toutes les sources de données.
   * 4. Force une mise à jour immédiate de certaines valeurs.
   * 5. Recrée toutes les souscriptions.
   * 6. Redémarre la simulation.
   * 7. Forcer une mise à jour de tous les composants.
   *
   * Pourquoi c'est ainsi fait :
   * - Assure un état cohérent du système après la réinitialisation.
   * - Permet de recommencer la simulation depuis un état connu.
   * - Nettoie proprement toutes les ressources avant de les recréer.
   */
  function resetSystem(): void {
    // Arrêter toutes les simulations et souscriptions en cours
    stopSimulation();
    destroy$.next();
    destroy$.complete();

    // Réinitialiser tous les états réactifs à leurs valeurs initiales
    state.waterLevel = waterSystemConfig.INITIAL_DAM_WATER_LEVEL;
    state.isAutoMode = true;
    state.purifiedWater = waterSystemConfig.INITIAL_PURIFIED_WATER;
    state.powerGenerated = waterSystemConfig.INITIAL_POWER_GENERATED;
    state.waterDistributed = waterSystemConfig.INITIAL_WATER_DISTRIBUTED;
    state.weatherCondition = 'ensoleillé' as WeatherCondition;
    state.alerts = [];
    state.irrigationWater = waterSystemConfig.INITIAL_IRRIGATION_WATER;
    state.treatedWastewater = waterSystemConfig.INITIAL_TREATED_WASTEWATER;
    state.waterQuality = waterSystemConfig.INITIAL_WATER_QUALITY;
    state.floodRisk = waterSystemConfig.INITIAL_FLOOD_RISK;
    state.userConsumption = waterSystemConfig.INITIAL_USER_CONSUMPTION;
    state.glacierVolume = waterSystemConfig.INITIAL_GLACIER_VOLUME;
    state.meltRate = waterSystemConfig.INITIAL_MELT_RATE;
    state.waterFlow = waterSystemConfig.INITIAL_WATER_FLOW;
    state.damWaterVolume = waterSystemConfig.INITIAL_DAM_WATER_VOLUME;

    // Réinitialiser le niveau d'eau du barrage à 70%
    setInitialWaterLevel(waterSystemConfig.INITIAL_DAM_WATER_LEVEL);

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
    dataSources.glacierSource$.next(state.glacierVolume);
    weatherSimulation$.pipe(take(1)).subscribe((weather) => {
      state.weatherCondition = weather;
      dataSources.weatherSource$.next(weather);
    });

    // Recréer toutes les souscriptions
    const subscriptions = [
      sharedObservables.dam$
        .pipe(
          takeUntil(destroy$),
          catchError((error) => handleError(error, 'Souscription au niveau du barrage')),
        )
        .subscribe((level) => {
          state.waterLevel = level;
        }),

      sharedObservables.purificationPlant$.pipe(takeUntil(destroy$)).subscribe((water) => {
        state.purifiedWater += water;
      }),

      sharedObservables.powerPlant$.pipe(takeUntil(destroy$)).subscribe((power) => {
        state.powerGenerated += power;
      }),

      sharedObservables.irrigation$.pipe(takeUntil(destroy$)).subscribe((water) => {
        state.irrigationWater = water;
      }),

      sharedObservables.wastewaterTreatment$.pipe(takeUntil(destroy$)).subscribe((water) => {
        state.treatedWastewater = water;
      }),

      sharedObservables.waterQualityControl$.pipe(takeUntil(destroy$)).subscribe((quality) => {
        state.waterQuality = quality;
      }),

      sharedObservables.floodPrediction$.pipe(takeUntil(destroy$)).subscribe((risk) => {
        state.floodRisk = risk;
      }),

      sharedObservables.userWaterManagement$.pipe(takeUntil(destroy$)).subscribe((consumption) => {
        state.userConsumption = consumption;
      }),

      alertSystem$.pipe(takeUntil(destroy$)).subscribe(),

      sharedObservables.weather$.pipe(takeUntil(destroy$)).subscribe((weather) => {
        state.weatherCondition = weather;
        dataSources.weatherSource$.next(weather);
      }),

      sharedObservables.waterDistribution$.pipe(takeUntil(destroy$)).subscribe((water) => {
        state.waterDistributed = water;
      }),

      /**
       * Souscription au débit d'eau du glacier.
       * @param {number} volume - Le volume d'eau du glacier.
       * @param {number} meltRate - Le taux de fonte du glacier.
       * @param {number} waterFlow - Le débit d'eau du glacier.
       * @description
       * Cette fonction met à jour l'état du système avec les valeurs du débit d'eau du glacier.
       * Elle permet de suivre l'évolution du débit d'eau du glacier et de gérer les alertes en conséquence.
       */
      sharedObservables.glacierMelt$
        .pipe(takeUntil(destroy$))
        .subscribe(({ volume, meltRate: rate, waterFlow: flow }) => {
          state.glacierVolume = volume;
          state.meltRate = rate;
          state.waterFlow = flow;
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

  /**
   * Cache pour les calculs coûteux.
   * Utilise une Map pour stocker les résultats des calculs avec une durée de vie limitée.
   */
  const calculationCache = new Map<string, { value: unknown; timestamp: number }>();

  /**
   * Fonction pour obtenir une valeur du cache ou la calculer si elle n'existe pas.
   * 
   * @param key - La clé du calcul
   * @param calculationFn - La fonction de calcul
   * @param maxAge - La durée de vie maximale du résultat en millisecondes
   * @returns Le résultat du calcul, soit depuis le cache, soit nouvellement calculé
   * 
   * @description
   * Cette fonction implémente un mécanisme de cache simple pour les calculs coûteux.
   * Elle vérifie d'abord si un résultat valide existe dans le cache. Si c'est le cas,
   * elle retourne ce résultat. Sinon, elle exécute la fonction de calcul, stocke le
   * résultat dans le cache, et retourne le résultat.
   */
  function getCachedOrCalculate<T>(key: string, calculationFn: () => T, maxAge: number): T {
    const now = Date.now();
    const cached = calculationCache.get(key);
    if (cached && now - cached.timestamp < maxAge) {
      return cached.value as T;
    }
    const value = calculationFn();
    calculationCache.set(key, { value, timestamp: now });
    return value;
  }

  // Utilisation du cache pour totalWaterProcessed
  const totalWaterProcessed = computed(() =>
    getCachedOrCalculate(
      'totalWaterProcessed',
      () => state.purifiedWater + state.waterDistributed,
      1000, // Cache valide pendant 1 seconde
    ),
  );

  // Utilisation du cache pour systemEfficiency
  const systemEfficiency = computed(() =>
    getCachedOrCalculate(
      'systemEfficiency',
      () => {
        const processedWater = totalWaterProcessed.value;
        if (processedWater === 0) return 0;
        return (state.purifiedWater / processedWater) * 100;
      },
      1000, // Cache valide pendant 1 seconde
    ),
  );

  // Nettoyage du cache périodiquement
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, { timestamp }] of calculationCache.entries()) {
      if (now - timestamp > 5000) {
        // Supprimer les entrées de plus de 5 secondes
        calculationCache.delete(key);
      }
    }
  }, 10000); // Nettoyer toutes les 10 secondes

  // Nettoyage à la destruction du composant
  onUnmounted(() => {
    clearInterval(cleanupInterval);
    destroy$.next();
    destroy$.complete();
    stopSimulation();
    calculationCache.clear();
  });

  /**
   * Calcul du statut global du système.
   *
   * @description
   * Cette constante est une référence à un objet qui représente l'état actuel du système d'eau.
   * Elle est initialisée avec les valeurs par défaut définies dans waterSystemConfig.
   */
  const overallSystemStatus = computed(() => {
    if (
      state.waterLevel < waterSystemConfig.CRITICAL_WATER_LEVEL ||
      state.waterQuality < waterSystemConfig.CRITICAL_WATER_QUALITY
    ) {
      return 'Critique';
    }
    if (
      state.waterLevel < waterSystemConfig.LOW_WATER_LEVEL ||
      state.waterQuality < waterSystemConfig.MEDIUM_WATER_QUALITY
    ) {
      return 'Préoccupant';
    }
    return 'Normal';
  });

  // Mettez à jour le volume d'eau du barrage chaque fois que le niveau d'eau change
  watch(
    () => state.waterLevel,
    (newWaterLevel) => {
      state.damWaterVolume = (newWaterLevel / 100) * waterSystemConfig.INITIAL_DAM_WATER_VOLUME;
    },
  );

  /**
   * Retourner les données du système d'eau.
   *
   * @description
   * Cette constante est une référence à un objet qui représente l'état actuel du système d'eau.
   * Elle est initialisée avec les valeurs par défaut définies dans waterSystemConfig.
   *
   */
  return {
    state: computed(() => state),
    observables: {
      waterLevel: sharedObservables.dam$,
      purifiedWater: sharedObservables.purificationPlant$,
      powerGenerated: sharedObservables.powerPlant$,
      waterDistributed: sharedObservables.waterDistribution$,
      weatherCondition: sharedObservables.weather$,
      alerts: alertsObservable$,
      irrigationWater: sharedObservables.irrigation$,
      treatedWastewater: sharedObservables.wastewaterTreatment$,
      waterQuality: sharedObservables.waterQualityControl$,
      floodRisk: sharedObservables.floodPrediction$,
      userConsumption: sharedObservables.userWaterManagement$,
      glacierVolume: sharedObservables.glacierMelt$.pipe(map(({ volume }) => volume)),
      meltRate: sharedObservables.glacierMelt$.pipe(map(({ meltRate }) => meltRate)),
      waterFlow: sharedObservables.glacierMelt$.pipe(map(({ waterFlow }) => waterFlow)),
      isAutoMode: isAutoMode as unknown as Observable<boolean>,
      damWaterVolume: sharedObservables.dam$,
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
    waterSourceLogs,
    waterSourceLog$,
  };
}