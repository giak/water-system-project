import type { WeatherCondition } from '@/types/waterSystem';
import { type Observable, interval, withLatestFrom } from 'rxjs';
import { map, shareReplay } from 'rxjs/operators';

export function useWaterQualityControl(
  purificationPlant$: Observable<number>,
  wastewaterTreatment$: Observable<number>,
  weatherSource$: Observable<WeatherCondition>,
) {
  const waterQualityControl$ = interval(1000).pipe(
    withLatestFrom(purificationPlant$, wastewaterTreatment$, weatherSource$),
    map(([, purified, treated, weather]) => {
      let qualityScore = (purified / (purified + treated)) * 100;
      if (weather === 'orageux') qualityScore *= 0.9; // La qualité diminue lors des orages
      return Math.max(0, Math.min(100, qualityScore));
    }),
    shareReplay(1),
  );

  return {
    waterQualityControl$,
  };
}
