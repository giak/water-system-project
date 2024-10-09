import type { WeatherCondition } from '@/types/waterSystem';
import { measureObservablePerformance } from '@/utils/performanceUtils';
import { type Observable, interval } from 'rxjs';
import { distinctUntilChanged, map, shareReplay } from 'rxjs/operators';

export function useWeatherSimulation() {
  const weatherSimulation$: Observable<WeatherCondition> = interval(10000).pipe(
    map(() => {
      const conditions: WeatherCondition[] = ['ensoleillé', 'nuageux', 'pluvieux', 'orageux'];
      const randomIndex = Math.floor(Math.random() * conditions.length);
      return conditions[randomIndex];
    }),
    distinctUntilChanged(),
    shareReplay({ bufferSize: 1, refCount: true }),
    measureObservablePerformance('weatherSimulation$'),
  );

  return {
    weatherSimulation$,
  };
}
