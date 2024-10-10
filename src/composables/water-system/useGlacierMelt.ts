import type { WeatherCondition } from '@/types/waterSystem';
import { handleError } from '@/utils/errorUtils';
import { measureObservablePerformance } from '@/utils/performanceUtils';
import { type Observable, type Subject, interval, withLatestFrom } from 'rxjs';
import { catchError, distinctUntilChanged, map, shareReplay, tap } from 'rxjs/operators';

// Constantes pour les taux de fonte selon les conditions météorologiques
const MELT_RATE_SUNNY = 0.0001;
const MELT_RATE_CLOUDY = 0.00005;
const MELT_RATE_RAINY = 0.00015;
const MELT_RATE_STORMY = 0.0002;

// Facteur d'ajustement pour le débit d'eau (simulant l'effet de la pente et de la distance)
const WATER_FLOW_ADJUSTMENT = 0.8;

export function useGlacierMelt(
  weatherSource$: Observable<WeatherCondition>,
  glacierSource$: Subject<number>,
) {
  const glacierMelt$ = interval(1000).pipe(
    withLatestFrom(weatherSource$, glacierSource$),
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
      const newVolume = Math.max(0, volume - meltRate);
      // Calcul du débit d'eau en tenant compte d'un facteur d'ajustement
      const waterFlow = meltRate * WATER_FLOW_ADJUSTMENT;
      return { volume: newVolume, meltRate, waterFlow };
    }),
    distinctUntilChanged(
      (prev, curr) => prev.volume === curr.volume && prev.waterFlow === curr.waterFlow,
    ),
    tap(({ volume }) => glacierSource$.next(volume)),
    catchError((error) => handleError(error, 'Simulation de fonte du glacier')),
    shareReplay(1),
    measureObservablePerformance('glacierMelt$'),
  );

  return {
    glacierMelt$,
  };
}
