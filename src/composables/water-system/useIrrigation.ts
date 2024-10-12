import type { WeatherCondition } from '@/types/waterSystem';
import { type Observable, interval, withLatestFrom } from 'rxjs';
import { distinctUntilChanged, map, scan, shareReplay } from 'rxjs/operators';

export function useIrrigation(
  purificationPlant$: Observable<number>,
  weatherSource$: Observable<WeatherCondition>,
) {
  const irrigation$ = interval(1000).pipe(
    withLatestFrom(purificationPlant$, weatherSource$),
    map(([, water, weather]) => {
      let irrigationNeed = water * 0.3;
      if (weather === 'ensoleillé') irrigationNeed *= 1.2;
      if (weather === 'pluvieux') irrigationNeed *= 0.5;
      return irrigationNeed;
    }),
    scan((acc, value) => acc + value, 0),
    distinctUntilChanged(),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  return {
    irrigation$,
  };
}
