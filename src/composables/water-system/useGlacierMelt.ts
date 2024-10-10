import type { WeatherCondition } from '@/types/waterSystem';
import { handleError } from '@/utils/errorUtils';
import { measureObservablePerformance } from '@/utils/performanceUtils';
import { type Observable, type Subject, interval, withLatestFrom } from 'rxjs';
import { catchError, distinctUntilChanged, map, shareReplay, tap } from 'rxjs/operators';

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
          meltRate = volume * 0.0001;
          break;
        case 'nuageux':
          meltRate = volume * 0.00005;
          break;
        case 'pluvieux':
          meltRate = volume * 0.00015;
          break;
        case 'orageux':
          meltRate = volume * 0.0002;
          break;
      }
      const newVolume = Math.max(0, volume - meltRate);
      const waterFlow = meltRate; // Nouveau : débit d'eau provenant de la fonte
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
