import type { WeatherCondition } from '@/types/waterSystem';
import { measureObservablePerformance } from '@/utils/performanceUtils';
import { type Observable, interval, withLatestFrom } from 'rxjs';
import { map, shareReplay } from 'rxjs/operators';

export function useFloodPrediction(
  dam$: Observable<number>,
  weatherSource$: Observable<WeatherCondition>,
) {
  const floodPrediction$ = interval(1000).pipe(
    withLatestFrom(dam$, weatherSource$),
    map(([, waterLevel, weather]) => {
      let risk = 0;
      if (weather === 'pluvieux') risk += 20;
      if (weather === 'orageux') risk += 40;
      if (waterLevel > 80) risk += 30;
      if (waterLevel > 90) risk += 20;
      return Math.min(100, risk);
    }),
    shareReplay(1),
    measureObservablePerformance('floodPrediction$'),
  );

  return {
    floodPrediction$,
  };
}
