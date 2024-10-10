/**
 * @file useWaterSystem.ts
 * @description Ce fichier contient le composable principal pour la gestion du système d'eau.
 * Il orchestre tous les sous-systèmes et fournit une interface unifiée pour interagir avec le système d'eau dans son ensemble.
 *
 * @module WaterSystem
 */

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

/**
 * Type représentant une erreur potentielle dans le système d'eau.
 * Peut être une instance d'Error ou un type inconnu pour couvrir tous les cas possibles.
 */
type WaterSystemError = Error | unknown;

/**
 * Gère les erreurs survenant dans le système d'eau.
 *
 * @param {WaterSystemError} error - L'erreur à gérer
 * @param {string} context - Le contexte dans lequel l'erreur s'est produite
 * @returns {Observable<never>} Un Observable vide pour continuer le flux
 *
 * @description
 * Cette fonction est cruciale pour la robustesse du système. Elle centralise la gestion des erreurs,
 * permettant une approche cohérente et extensible pour traiter les problèmes.
 *
 * Fonctionnement :
 * 1. Log l'erreur dans la console avec le contexte pour faciliter le débogage.
 * 2. Pourrait être étendue pour envoyer l'erreur à un service de monitoring externe.
 * 3. Retourne un Observable vide pour ne pas interrompre le flux de données.
 *
 * Pourquoi c'est ainsi fait :
 * - Centralisation : Facilite la maintenance et l'évolution de la gestion des erreurs.
 * - Contextualisation : Le paramètre 'context' aide à identifier rapidement la source de l'erreur.
 * - Continuité : Le retour d'un Observable vide permet au système de continuer à fonctionner malgré l'erreur.
 */
function handleError(error: WaterSystemError, context: string): Observable<never> {
  console.error(`Erreur dans ${context}:`, error);
  // TODO : Vous pouvez ajouter ici une logique pour envoyer l'erreur à un service de monitoring
  return of(); // Retourne un Observable vide pour continuer le flux
}

/**
 * Composable principal pour la gestion du système d'eau.
 *
 * @returns {Object} Un objet contenant l'état du système, les observables, les contrôles de simulation et diverses fonctions utilitaires
 *
 * @description
 * Ce composable est le cœur du système de gestion de l'eau. Il intègre et coordonne tous les sous-systèmes
 * pour fournir une interface unifiée et réactive du système d'eau dans son ensemble.
 *
 * Fonctionnement détaillé :
 * 1. Initialisation :
 *    - Crée un Subject 'destroy$' pour gérer le cycle de vie du composable.
 *    - Initialise le système d'alerte avec useAlertSystem().
 *    - Crée un état réactif (state) contenant toutes les métriques du système.
 *    - Initialise les sources de données (dataSources) pour chaque aspect du système.
 *
 * 2. Intégration des sous-systèmes :
 *    - Utilise des composables spécialisés (useDamManagement, useWaterPurification, etc.) pour gérer chaque aspect du système.
 *    - Crée des Observables partagés (sharedDam$, sharedWeather$, etc.) pour optimiser les performances.
 *
 * 3. Gestion des modes de fonctionnement :
 *    - Implémente un mode automatique et un mode manuel.
 *    - Fournit des fonctions pour basculer entre ces modes et contrôler manuellement le niveau d'eau.
 *
 * 4. Optimisations :
 *    - Utilise 'optimizedSubscribe' pour standardiser et optimiser les souscriptions aux Observables.
 *    - Applique 'shareReplay' sur les Observables fréquemment utilisés pour éviter les calculs redondants.
 *
 * 5. Calculs dérivés :
 *    - Fournit des computed properties pour des métriques complexes comme l'efficacité du système.
 *    - Utilise la mémoïsation et le throttling pour optimiser les calculs coûteux.
 *
 * 6. Gestion des alertes :
 *    - Intègre un système d'alerte réactif basé sur divers seuils et conditions.
 *
 * 7. Réinitialisation du système :
 *    - Fournit une fonction 'resetSystem' pour remettre l'ensemble du système à son état initial.
 *
 * Pourquoi c'est ainsi fait :
 * - Modularité : La séparation en sous-systèmes facilite la maintenance et l'extension du système.
 * - Réactivité : L'utilisation de RxJS et Vue 3 Composition API permet une gestion efficace des flux de données complexes.
 * - Performance : Les optimisations (shareReplay, mémoïsation) améliorent l'efficacité du système.
 * - Robustesse : La gestion centralisée des erreurs et le mode manuel assurent la résilience du système.
 * - Flexibilité : L'architecture permet facilement d'ajouter de nouvelles fonctionnalités ou de modifier le comportement existant.
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
} {
  /**
   * Subject pour gérer la destruction du composable.
   * Utilisé pour nettoyer les souscriptions lors de la destruction du composable.
   *
   * @type {Subject<void>}
   */
  const destroy$ = new Subject<void>();

  /**
   * Système d'alerte pour gérer les notifications du système d'eau.
   * Fournit des méthodes pour ajouter des alertes et accéder à la liste des alertes actuelles.
   *
   * @type {Object}
   * @property {Ref<Alert[]>} alerts - Liste réactive des alertes actuelles
   * @property {Function} addAlert - Fonction pour ajouter une nouvelle alerte
   */
  const { alerts, addAlert } = useAlertSystem();

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
  const { dam$ } = useDamManagement(
    dataSources.waterSource$,
    dataSources.weatherSource$,
    glacierMelt$,
  );

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
   * Lorsque true, le système utilise manualWaterLevel au lieu des valeurs simulées.
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
    return isManualMode.value ? manualWaterLevel.value : state.value.waterLevel;
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
      state.value.waterLevel = level;
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
      manualWaterLevel.value = state.value.waterLevel;
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
   * @param {function} next - La fonction à exécuter pour chaque valeur émise
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
   * - Améliore les performances en évitant les mises à jour inutiles
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

  /**
   * Observables partagés pour les différents aspects du système d'eau.
   * L'utilisation de shareReplay(1) permet d'optimiser les performances en évitant
   * les calculs redondants lorsque plusieurs composants s'abonnent au même Observable.
   *
   * @description
   * Ces Observables partagés sont créés à partir des Observables originaux en utilisant l'opérateur shareReplay(1).
   * Cela permet d'optimiser les performances en évitant de recalculer les valeurs pour chaque souscription.
   */
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

  /**
   * Souscription aux observables partagés.
   * Met à jour l'état du système en fonction des valeurs émises par les observables partagés.
   *
   * @description
   * Ces souscriptions utilisent la fonction optimizedSubscribe pour mettre à jour l'état du système
   * de manière efficace et gérer les erreurs de façon centralisée.
   */
  /**
   * Souscription au niveau du barrage.
   * Met à jour l'état du système en fonction du niveau du barrage.
   *
   * @description
   * Cette souscription met à jour le niveau d'eau dans l'état du système,
   * mais seulement si le système n'est pas en mode manuel.
   */
  optimizedSubscribe(
    sharedDam$,
    (level) => {
      if (!isManualMode.value) {
        state.value.waterLevel = level;
      }
    },
    'Souscription au niveau du barrage',
  );

  /**
   * Souscription aux conditions météorologiques.
   * Met à jour l'état du système en fonction des conditions météorologiques.
   */
  optimizedSubscribe(
    sharedWeather$,
    (weather) => {
      state.value.weatherCondition = weather;
    },
    'Souscription aux conditions météorologiques',
  );

  /**
   * Souscription à la fonte du glacier.
   * Met à jour l'état du système en fonction du volume et du taux de fonte du glacier.
   */
  optimizedSubscribe(
    sharedGlacierMelt$,
    ({ volume, meltRate }) => {
      state.value.glacierVolume = volume;
      state.value.meltRate = meltRate;
    },
    'Souscription à la fonte du glacier',
  );

  /**
   * Souscription à la purification de l'eau.
   * Met à jour l'état du système en fonction de la quantité d'eau purifiée.
   */
  optimizedSubscribe(
    sharedPurificationPlant$,
    (water) => {
      state.value.purifiedWater = water;
    },
    "Souscription à la purification de l'eau",
  );

  /**
   * Souscription à la production d'énergie.
   * Met à jour l'état du système en fonction de la quantité d'énergie produite.
   */
  optimizedSubscribe(
    sharedPowerPlant$,
    (power) => {
      state.value.powerGenerated = power;
    },
    "Souscription à la production d'énergie",
  );

  /**
   * Souscription à l'irrigation.
   * Met à jour l'état du système en fonction de la quantité d'eau utilisée pour l'irrigation.
   */
  optimizedSubscribe(
    sharedIrrigation$,
    (water) => {
      state.value.irrigationWater = water;
    },
    "Souscription à l'irrigation",
  );

  /**
   * Souscription au traitement des eaux usées.
   * Met à jour l'état du système en fonction de la quantité d'eau usée traitée.
   */
  optimizedSubscribe(
    sharedWastewaterTreatment$,
    (water) => {
      state.value.treatedWastewater = water;
    },
    'Souscription au traitement des eaux usées',
  );

  /**
   * Souscription au contrôle de la qualité de l'eau.
   * Met à jour l'état du système en fonction de la qualité de l'eau mesurée.
   */
  optimizedSubscribe(
    sharedWaterQualityControl$,
    (quality) => {
      state.value.waterQuality = quality;
    },
    "Souscription au contrôle de la qualité de l'eau",
  );

  /**
   * Souscription à la prédiction des inondations.
   * Met à jour l'état du système en fonction du risque d'inondation calculé.
   */
  optimizedSubscribe(
    sharedFloodPrediction$,
    (risk) => {
      state.value.floodRisk = risk;
    },
    'Souscription à la prédiction des inondations',
  );

  /**
   * Souscription à la gestion de l'eau des utilisateurs.
   * Met à jour l'état du système en fonction de la consommation d'eau des utilisateurs.
   */
  optimizedSubscribe(
    sharedUserWaterManagement$,
    (consumption) => {
      state.value.userConsumption = consumption;
    },
    "Souscription à la gestion de l'eau des utilisateurs",
  );

  /**
   * Souscription à la distribution d'eau.
   * Met à jour l'état du système en fonction de la quantité d'eau distribuée et génère des alertes si nécessaire.
   */
  optimizedSubscribe(
    sharedWaterDistribution$,
    (distributedWater) => {
      state.value.waterDistributed = distributedWater;

      /**
       * Génération d'alertes en fonction de la distribution d'eau.
       * Ajoute des alertes en fonction du niveau de distribution d'eau.
       */
      if (distributedWater < waterSystemConfig.LOW_WATER_DISTRIBUTION) {
        addAlert("Distribution d'eau faible", 'medium');
      } else if (distributedWater > waterSystemConfig.HIGH_WATER_DISTRIBUTION) {
        addAlert("Distribution d'eau élevée", 'low');
      }
    },
    "Souscription à la distribution d'eau",
  );

  /**
   * Gestion des alertes.
   * Génère des alertes en fonction des conditions du système.
   *
   * @description
   * Ce système d'alerte utilise l'opérateur merge de RxJS pour combiner plusieurs sources d'alertes.
   * Chaque source d'alerte est basée sur un Observable partagé et génère des alertes
   * en fonction de conditions spécifiques.
   */
  const alertSystem$ = merge(
    sharedDam$.pipe(
      /**
       * Alertes générées en fonction du niveau du barrage.
       * Ajoute des alertes en fonction du niveau du barrage.
       */
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
    /**
     * Alertes générées en fonction de la qualité de l'eau.
     * Ajoute des alertes en fonction de la qualité de l'eau.
     */
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
    /**
     * Alertes générées en fonction de la distribution d'eau.
     * Ajoute des alertes en fonction de la distribution d'eau.
     */
    sharedWaterDistribution$.pipe(
      filter((water) => water < waterSystemConfig.LOW_WATER_DISTRIBUTION),
      map(() => ({ message: "Alerte : Distribution d'eau faible", priority: 'medium' as const })),
    ),
    /**
     * Alertes générées en fonction de la distribution d'eau.
     * Ajoute des alertes en fonction de la distribution d'eau.
     */
    sharedWaterDistribution$.pipe(
      filter((water) => water > waterSystemConfig.HIGH_WATER_DISTRIBUTION),
      map(() => ({ message: "Information : Distribution d'eau élevée", priority: 'low' as const })),
    ),
    /**
     * Alertes générées en fonction de la consommation d'eau pour l'irrigation.
     * Ajoute des alertes en fonction de la consommation d'eau pour l'irrigation.
     */
    sharedIrrigation$.pipe(
      filter((water) => water > waterSystemConfig.HIGH_IRRIGATION_WATER),
      map(() => ({
        message: "Alerte : Consommation d'eau pour l'irrigation élevée",
        priority: 'medium' as const,
      })),
    ),
    /**
     * Alertes générées en fonction de la production d'énergie.
     * Ajoute des alertes en fonction de la production d'énergie.
     */
    sharedPowerPlant$.pipe(
      filter((power) => power < waterSystemConfig.LOW_POWER_GENERATION),
      map(() => ({ message: "Alerte : Production d'énergie faible", priority: 'medium' as const })),
    ),
    /**
     * Alertes générées en fonction de la production d'énergie.
     * Ajoute des alertes en fonction de la production d'énergie.
     */
    sharedPowerPlant$.pipe(
      filter((power) => power > waterSystemConfig.HIGH_POWER_GENERATION),
      map(() => ({
        message: "Information : Production d'énergie exceptionnellement élevée",
        priority: 'low' as const,
      })),
    ),
    /**
     * Alertes générées en fonction de la consommation d'eau des utilisateurs.
     * Ajoute des alertes en fonction de la consommation d'eau des utilisateurs.
     */
    sharedUserWaterManagement$.pipe(
      filter((consumption) => consumption > waterSystemConfig.HIGH_USER_CONSUMPTION),
      map(() => ({
        message: "Alerte : Consommation d'eau des utilisateurs élevée",
        priority: 'medium' as const,
      })),
    ),
  ).pipe(
    /**
     * Ajoute des alertes en fonction des messages et priorités générés.
     */
    tap(({ message, priority }) => addAlert(message, priority)),
    shareReplay(1),
  );

  /**
   * S'abonne à alertSystem$ et gère les erreurs de manière centralisée.
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

  /**
   * Calcul du total d'eau traitée.
   *
   * @description
   * Cette constante est une référence à un objet qui représente l'état actuel du système d'eau.
   * Elle est initialisée avec les valeurs par défaut définies dans waterSystemConfig.
   *
   */
  const memoizedTotalWaterProcessed = computed(() => {
    return state.value.purifiedWater + state.value.waterDistributed;
  });

  /**
   * Optimisation des calculs coûteux avec throttling.
   *
   * @description
   * Cette fonction utilise l'opérateur throttle pour limiter le nombre d'appels à la fonction memoizedTotalWaterProcessed.
   * Elle retarde l'exécution de cette fonction de manière à ce que le nombre d'appels ne dépasse pas une valeur spécifiée.
   * Cela permet de réduire la consommation de ressources et d'améliorer les performances du système.
   */
  const throttledTotalWaterProcessed = throttle(() => {
    return memoizedTotalWaterProcessed.value;
  }, waterSystemConfig.THROTTLE_DELAY);

  /**
   * Calcul du total d'eau traitée.
   *
   * @description
   * Cette constante est une référence à un objet qui représente l'état actuel du système d'eau.
   * Elle est initialisée avec les valeurs par défaut définies dans waterSystemConfig.
   * 
   */
  const totalWaterProcessed = computed(() => {
    if (waterSystemConfig.enablePerformanceLogs) {
      console.time('totalWaterProcessed');
      const result = throttledTotalWaterProcessed();
      console.timeEnd('totalWaterProcessed');
      return result;
    }
    return throttledTotalWaterProcessed();
  });

  /**
   * Calcul de l'efficacité du système.
   *
   * @description
   * Cette constante est une référence à un objet qui représente l'état actuel du système d'eau.
   * Elle est initialisée avec les valeurs par défaut définies dans waterSystemConfig.
   * 
   */
  const memoizedSystemEfficiency = computed(() => {
    const processedWater = memoizedTotalWaterProcessed.value;
    if (processedWater === 0) return 0;
    return (state.value.purifiedWater / processedWater) * 100;
  });

  /**
   * Optimisation des calculs coûteux avec throttling.
   *
   * @description
   * Cette fonction utilise l'opérateur throttle pour limiter le nombre d'appels à la fonction memoizedSystemEfficiency.
   * Elle retarde l'exécution de cette fonction de manière à ce que le nombre d'appels ne dépasse pas une valeur spécifiée.
   * Cela permet de réduire la consommation de ressources et d'améliorer les performances du système.
   */
  const throttledSystemEfficiency = throttle(() => {
    return memoizedSystemEfficiency.value;
  }, waterSystemConfig.THROTTLE_DELAY);

  /**
   * Calcul de l'efficacité du système.
   *
   * @description
   * Cette constante est une référence à un objet qui représente l'état actuel du système d'eau.
   * Elle est initialisée avec les valeurs par défaut définies dans waterSystemConfig.
   * 
   */
  const systemEfficiency = computed(() => {
    if (waterSystemConfig.enablePerformanceLogs) {
      console.time('systemEfficiency');
      const result = throttledSystemEfficiency();
      console.timeEnd('systemEfficiency');
      return result;
    }
    return throttledSystemEfficiency();
  });

  /**
   * Calcul du statut global du système.
   *
   * @description
   * Cette constante est une référence à un objet qui représente l'état actuel du système d'eau.
   * Elle est initialisée avec les valeurs par défaut définies dans waterSystemConfig.
   * 
   */
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

  /**
   * Convertir le ComputedRef<Alert[]> en Observable<Alert[]>
   *
   * @description
   * Cette constante est une référence à un objet qui représente l'état actuel du système d'eau.
   * Elle est initialisée avec les valeurs par défaut définies dans waterSystemConfig.
   * 
   */
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

  /**
   * Retourner les données du système d'eau.
   *
   * @description
   * Cette constante est une référence à un objet qui représente l'état actuel du système d'eau.
   * Elle est initialisée avec les valeurs par défaut définies dans waterSystemConfig.
   * 
   */
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
