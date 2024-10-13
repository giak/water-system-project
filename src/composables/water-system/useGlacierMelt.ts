import type { WeatherCondition } from '@/types/waterSystem';
import { handleError } from '@/utils/errorHandler';
import { type Observable, type Subject, interval, withLatestFrom } from 'rxjs';
import { catchError, distinctUntilChanged, map, shareReplay, tap } from 'rxjs/operators';

// Constantes pour les taux de fonte selon les conditions météorologiques
const MELT_RATE_SUNNY = 0.0001;
const MELT_RATE_CLOUDY = 0.00005;
const MELT_RATE_RAINY = 0.00015;
const MELT_RATE_STORMY = 0.0002;

// Nouveau facteur pour simuler la perte d'eau (évaporation, infiltration, etc.)
const WATER_LOSS_FACTOR = 0.95;

/**
 * Composable pour simuler la fonte du glacier en fonction des conditions météorologiques.
 * @param {Observable<WeatherCondition>} weatherSource$ - Observable fournissant les conditions météorologiques.
 * @param {Subject<number>} glacierSource$ - Subject pour le volume du glacier.
 * @returns {Object} - Objet contenant l'observable de la fonte du glacier.
 *
 * @description
 * Ce composable utilise RxJS pour simuler la fonte du glacier en fonction des conditions météorologiques.
 * Il prend en entrée un observable des conditions météorologiques et un subject pour le volume du glacier.
 * En sortie, il retourne un observable de la fonte du glacier.
 */
export function useGlacierMelt(
  weatherSource$: Observable<WeatherCondition>,
  glacierSource$: Subject<number>,
) {
  /**
   * Observable de la fonte du glacier.
   * @type {Observable<{ volume: number; meltRate: number; waterFlow: number }>}
   * @description
   * Cet observable émet un objet à chaque émission de l'observable weatherSource$ et glacierSource$.
   * L'objet contient les propriétés :
   * - volume: le volume du glacier après la fonte.
   * - meltRate: le taux de fonte du glacier.
   * - waterFlow: le débit d'eau effectivement produit par la fonte du glacier.
   */
  const glacierMelt$ = interval(1000).pipe(
    // Prendre la valeur actuelle du volume du glacier
    withLatestFrom(weatherSource$, glacierSource$),
    // Calculer le taux de fonte du glacier en fonction des conditions météorologiques et du volume du glacier
    map(([, weather, volume]) => {
      let meltRate = 0;
      switch (weather) {
        case 'ensoleillé':
          meltRate = volume * MELT_RATE_SUNNY;
          break;
        case 'nuageux':
          meltRate = volume * MELT_RATE_CLOUDY;
          break;
        case 'pluvieux':
          meltRate = volume * MELT_RATE_RAINY;
          break;
        case 'orageux':
          meltRate = volume * MELT_RATE_STORMY;
          break;
      }
      // Calculer le nouveau volume du glacier après la fonte
      const newVolume = Math.max(0, volume - meltRate);
      // Appliquer le facteur de perte d'eau au meltRate pour obtenir le débit d'eau effectif
      const effectiveWaterFlow = meltRate * WATER_LOSS_FACTOR;
      // Retourner l'objet contenant le nouveau volume, le taux de fonte et le débit d'eau effectif
      return { volume: newVolume, meltRate, waterFlow: effectiveWaterFlow };
    }),
    // Éviter de re-émettre des valeurs identiques
    distinctUntilChanged(
      (prev, curr) => prev.volume === curr.volume && prev.waterFlow === curr.waterFlow,
    ),
    // Mettre à jour le volume du glacier via le subject
    tap(({ volume }) => glacierSource$.next(volume)),
    // Gérer les erreurs éventuelles
    catchError((error) => handleError(error, 'Simulation de fonte du glacier')),
    // Conserver la dernière valeur émise et permettre des réactivités multiples
    shareReplay(1),
  );

  return {
    glacierMelt$,
  };
}
