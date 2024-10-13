import { waterSystemConfig } from '@/config/waterSystemConfig';
import type { WeatherCondition } from '@/types/waterSystem';
import { handleError } from '@/utils/errorHandler';
import type { Observable } from 'rxjs';
import { BehaviorSubject, combineLatest } from 'rxjs';
import { catchError, scan, shareReplay } from 'rxjs/operators';
import { ref } from 'vue';

/**
 * Facteurs d'influence des conditions météorologiques sur le niveau d'eau du barrage.
 * Ces facteurs sont utilisés pour ajuster le niveau d'eau en fonction des conditions météorologiques.
 *
 * @constant
 * @type {Object}
 * @property {number} WEATHER_FACTOR_RAINY - Facteur d'augmentation du niveau d'eau en cas de pluie.
 * @property {number} WEATHER_FACTOR_STORMY - Facteur d'augmentation du niveau d'eau en cas d'orage.
 * @property {number} WEATHER_FACTOR_SUNNY - Facteur de diminution du niveau d'eau en cas de temps ensoleillé.
 *
 * @description
 * Ces facteurs sont utilisés pour simuler l'impact des conditions météorologiques sur le niveau d'eau du barrage.
 * Un facteur supérieur à 1 augmente le niveau d'eau, tandis qu'un facteur inférieur à 1 le diminue.
 *
 * Pourquoi c'est ainsi fait :
 * - Cela permet de simuler de manière réaliste l'impact des conditions météorologiques sur le niveau d'eau du barrage.
 * - Les valeurs choisies reflètent l'impact relatif de chaque condition météorologique sur l'apport en eau.
 * - Cette approche permet une simulation dynamique et réactive aux changements météorologiques.
 */
const WEATHER_FACTOR_RAINY = 1.2;
const WEATHER_FACTOR_STORMY = 1.4;
const WEATHER_FACTOR_SUNNY = 0.9;

/**
 * Facteurs d'ajustement pour la simulation du niveau d'eau du barrage.
 *
 * @constant
 * @type {Object}
 * @property {number} WATER_ACCUMULATION_FACTOR - Facteur d'accumulation d'eau dans le barrage.
 * @property {number} WATER_USAGE_FACTOR - Facteur de consommation d'eau du barrage.
 * @property {number} SMOOTHING_FACTOR - Facteur de lissage pour éviter les changements brusques de niveau d'eau.
 *
 * @description
 * Ces facteurs sont utilisés pour ajuster finement la simulation du niveau d'eau du barrage :
 * - WATER_ACCUMULATION_FACTOR détermine la vitesse à laquelle l'eau s'accumule dans le barrage.
 * - WATER_USAGE_FACTOR simule la consommation constante d'eau du barrage.
 * - SMOOTHING_FACTOR permet de lisser les variations du niveau d'eau pour éviter des changements trop brusques.
 *
 * Pourquoi c'est ainsi fait :
 * - Ces facteurs permettent un contrôle précis sur la dynamique du niveau d'eau du barrage.
 * - Ils offrent la flexibilité nécessaire pour ajuster la simulation en fonction des besoins spécifiques du système.
 * - L'utilisation de facteurs séparés pour l'accumulation et l'usage de l'eau permet de simuler un équilibre réaliste.
 */
const WATER_ACCUMULATION_FACTOR = 0.005;
const WATER_USAGE_FACTOR = 0.003;
const SMOOTHING_FACTOR = 0.1;

/**
 * Composable pour la gestion du barrage dans le système de gestion de l'eau.
 *
 * @function
 * @param {Observable<number>} waterSource$ - Observable représentant la source d'eau entrante.
 * @param {Observable<WeatherCondition>} weatherSource$ - Observable des conditions météorologiques.
 * @param {Observable<{ volume: number; meltRate: number; waterFlow: number }>} glacierMelt$ - Observable des données de fonte du glacier.
 * @returns {Object} Un objet contenant les observables et fonctions pour gérer le barrage.
 *
 * @description
 * Ce composable gère la simulation du niveau d'eau du barrage en prenant en compte :
 * - L'apport d'eau de diverses sources (rivières, pluie, fonte des glaciers)
 * - Les conditions météorologiques
 * - L'utilisation de l'eau
 *
 * Il fournit :
 * - Un observable du niveau d'eau du barrage
 * - Une fonction pour définir le niveau d'eau initial
 * - Une référence réactive au volume d'eau du barrage
 * - Une fonction pour mettre à jour le volume d'eau du barrage
 *
 * Pourquoi c'est ainsi fait :
 * - L'utilisation d'observables permet une gestion réactive et en temps réel du niveau d'eau.
 * - La séparation des sources de données (eau, météo, glacier) permet une modularité et une flexibilité accrues.
 * - Le calcul du niveau d'eau prend en compte de multiples facteurs pour une simulation réaliste.
 * - L'utilisation de RxJS permet une gestion efficace des flux de données asynchrones et complexes.
 */
export function useDamManagement(
  waterSource$: Observable<number>,
  weatherSource$: Observable<WeatherCondition>,
  glacierMelt$: Observable<{ volume: number; meltRate: number; waterFlow: number }>,
) {
  /**
   * Niveau d'eau initial du barrage.
   *
   * @type {BehaviorSubject<number>}
   * @description
   * Utilise un BehaviorSubject pour stocker et émettre le niveau d'eau initial du barrage.
   * La valeur initiale est fixée à 70% de la capacité du barrage.
   *
   * Pourquoi c'est ainsi fait :
   * - BehaviorSubject permet d'avoir une valeur initiale et d'émettre la dernière valeur à chaque nouvelle souscription.
   * - Cela assure que le système a toujours une valeur de niveau d'eau, même avant la première mise à jour.
   */
  const initialWaterLevel = new BehaviorSubject<number>(70);

  /**
   * Observable du niveau d'eau du barrage.
   *
   * @type {Observable<number>}
   * @description
   * Cet observable combine les sources d'eau, les conditions météorologiques et la fonte des glaciers
   * pour calculer en continu le niveau d'eau du barrage.
   *
   * Le calcul prend en compte :
   * - L'apport d'eau des différentes sources
   * - L'impact des conditions météorologiques
   * - L'utilisation de l'eau
   * - Un facteur de lissage pour éviter les changements brusques
   *
   * Pourquoi c'est ainsi fait :
   * - L'utilisation de combineLatest permet de réagir à tout changement dans l'une des sources de données.
   * - L'opérateur scan permet de conserver l'état précédent et de calculer incrémentalement le nouveau niveau.
   * - Le traitement des erreurs et la mesure des performances sont intégrés pour assurer la robustesse et l'optimisation.
   * - shareReplay(1) permet de partager le dernier résultat calculé avec tous les abonnés, optimisant ainsi les performances.
   */
  const dam$ = combineLatest([waterSource$, weatherSource$, glacierMelt$, initialWaterLevel]).pipe(
    /**
     * Fonction de calcul du niveau d'eau du barrage.
     *
     * @function
     * @param {number} acc - Le niveau d'eau actuel du barrage (en pourcentage).
     * @param {[number, WeatherCondition, { volume: number; meltRate: number; waterFlow: number }, number]} args - Les arguments du calcul.
     * @returns {number} Le nouveau niveau d'eau du barrage.
     *
     * @description
     * Cette fonction calcule le niveau d'eau du barrage en fonction des données d'entrée :
     * - waterInput : Apport d'eau de la rivière.
     * - weather : Conditions météorologiques.
     * - glacier : Données de fonte du glacier.
     * - initialLevel : Niveau d'eau initial du barrage.
     *
     * Elle ajuste le niveau d'eau en fonction de l'apport d'eau, de la fonte du glacier, de l'utilisation de l'eau et des conditions météorologiques.
     *
     * Pourquoi c'est ainsi fait :
     * - L'utilisation de scan permet de conserver l'état précédent et de calculer incrémentalement le nouveau niveau.
     * - Le traitement des erreurs et la mesure des performances sont intégrés pour assurer la robustesse et l'optimisation.
     * - shareReplay(1) permet de partager le dernier résultat calculé avec tous les abonnés, optimisant ainsi les performances.
     */
    scan((acc, [waterInput, weather, glacier, initialLevel]) => {
      let adjustedLevel = acc;

      // Ajouter l'apport d'eau
      adjustedLevel += waterInput * WATER_ACCUMULATION_FACTOR;
      adjustedLevel += glacier.waterFlow * WATER_ACCUMULATION_FACTOR;

      // Simuler l'utilisation de l'eau
      adjustedLevel -= adjustedLevel * WATER_USAGE_FACTOR;

      // Appliquer les facteurs météorologiques
      switch (weather) {
        case 'pluvieux':
          adjustedLevel *= WEATHER_FACTOR_RAINY;
          break;
        case 'orageux':
          adjustedLevel *= WEATHER_FACTOR_STORMY;
          break;
        case 'ensoleillé':
          adjustedLevel *= WEATHER_FACTOR_SUNNY;
          break;
      }

      // Appliquer le lissage
      adjustedLevel = acc + (adjustedLevel - acc) * SMOOTHING_FACTOR;

      // Assurer que le niveau reste entre 0 et 100
      return Math.max(0, Math.min(adjustedLevel, 100));
    }, initialWaterLevel.getValue()),
    catchError((error) => handleError(error, 'Calcul du niveau du barrage')),
    shareReplay(1),
  );

  /**
   * Fonction pour définir le niveau d'eau initial du barrage.
   *
   * @function
   * @param {number} level - Le nouveau niveau d'eau initial à définir.
   *
   * @description
   * Cette fonction permet de modifier le niveau d'eau initial du barrage.
   * Elle est utilisée pour initialiser ou réinitialiser le système.
   *
   * Pourquoi c'est ainsi fait :
   * - L'utilisation d'une fonction séparée permet de contrôler explicitement quand le niveau initial est modifié.
   * - Cela offre une flexibilité pour réinitialiser le système ou ajuster le niveau initial selon les besoins.
   */
  const setInitialWaterLevel = (level: number) => {
    initialWaterLevel.next(level);
  };

  /**
   * Volume d'eau actuel du barrage.
   *
   * @type {Ref<number>}
   * @description
   * Cette référence réactive stocke le volume d'eau actuel du barrage en mètres cubes.
   *
   * Pourquoi c'est ainsi fait :
   * - L'utilisation d'une ref Vue permet une réactivité dans les composants Vue qui utilisent cette valeur.
   * - Séparer le volume d'eau du niveau d'eau permet des calculs et des affichages plus flexibles.
   */
  const damWaterVolume = ref(0);

  /**
   * Fonction pour calculer le volume d'eau dans le barrage.
   *
   * @function
   * @param {number} waterLevel - Le niveau d'eau actuel du barrage (en pourcentage).
   * @returns {number} Le volume d'eau calculé en mètres cubes.
   *
   * @description
   * Cette fonction calcule le volume d'eau dans le barrage en fonction du niveau d'eau actuel.
   * Elle utilise la capacité initiale du barrage définie dans la configuration du système.
   *
   * Pourquoi c'est ainsi fait :
   * - La séparation de ce calcul dans une fonction dédiée permet sa réutilisation et facilite les tests unitaires.
   * - L'utilisation de la configuration du système permet une flexibilité dans la définition de la capacité du barrage.
   */
  const calculateDamWaterVolume = (waterLevel: number) => {
    return (waterLevel * waterSystemConfig.INITIAL_DAM_WATER_VOLUME) / 100;
  };

  /**
   * Fonction pour mettre à jour le volume d'eau du barrage.
   *
   * @function
   * @param {number} waterLevel - Le niveau d'eau actuel du barrage (en pourcentage).
   *
   * @description
   * Cette fonction met à jour la référence réactive damWaterVolume avec le nouveau volume calculé.
   * Elle est appelée chaque fois que le niveau d'eau du barrage change.
   *
   * Pourquoi c'est ainsi fait :
   * - La séparation de cette mise à jour dans une fonction dédiée permet un contrôle précis sur quand et comment le volume est mis à jour.
   * - Cela facilite également l'ajout de logique supplémentaire liée à la mise à jour du volume si nécessaire à l'avenir.
   */
  const updateDamWaterVolume = (waterLevel: number) => {
    damWaterVolume.value = calculateDamWaterVolume(waterLevel);
  };

  return {
    dam$,
    setInitialWaterLevel,
    damWaterVolume,
    updateDamWaterVolume,
  };
}
