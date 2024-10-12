import type { WeatherCondition } from '@/types/waterSystem';
import { type Observable, interval, withLatestFrom } from 'rxjs';
import { map, scan, shareReplay } from 'rxjs/operators';

const DAILY_RESET_VALUE = 1000; // Valeur arbitraire, à ajuster selon les besoins

export function useUserWaterManagement(
  userConsumptionSource$: Observable<number>,
  waterQualityControl$: Observable<number>,
  weatherSource$: Observable<WeatherCondition>,
) {
  const userWaterManagement$ = interval(1000).pipe(
    withLatestFrom(userConsumptionSource$, waterQualityControl$, weatherSource$),
    map(([, consumption, quality, weather]) => {
      let adjustedConsumption = consumption;
      if (quality < 50) adjustedConsumption *= 0.8;
      if (weather === 'ensoleillé') adjustedConsumption *= 1.2;
      return adjustedConsumption;
    }),
    scan((acc, value) => acc + value, 0),
    map((total) => Math.max(0, total - DAILY_RESET_VALUE)),
    shareReplay(1),
    // measureObservablePerformance('userWaterManagement$'),
  );

  return {
    userWaterManagement$,
  };
}
