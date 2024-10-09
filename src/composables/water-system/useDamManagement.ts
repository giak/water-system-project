import type { WeatherCondition } from '@/types/waterSystem';
import { handleError } from '@/utils/errorUtils';
import { measureObservablePerformance } from '@/utils/performanceUtils';
import type { Observable } from 'rxjs';
import { interval, withLatestFrom } from 'rxjs';
import { catchError, map, shareReplay } from 'rxjs/operators';

export function useDamManagement(
  waterSource$: Observable<number>,
  weatherSource$: Observable<WeatherCondition>,
  glacierMelt$: Observable<{ volume: number; meltRate: number }>,
) {
  const dam$ = interval(1000).pipe(
    withLatestFrom(waterSource$, weatherSource$, glacierMelt$),
    map(([, level, weather, glacier]) => {
      let adjustedLevel = level + glacier.meltRate;
      if (weather === 'pluvieux') adjustedLevel *= 1.1;
      if (weather === 'orageux') adjustedLevel *= 1.3;
      if (weather === 'ensoleillé') adjustedLevel *= 0.9;

      // Ajoutez une variation aléatoire
      const randomVariation = (Math.random() - 0.5) * 10; // Variation de ±5%
      adjustedLevel += randomVariation;

      return Math.max(0, Math.min(adjustedLevel, 100));
    }),
    catchError((error) => handleError(error, 'Calcul du niveau du barrage')),
    measureObservablePerformance('dam$'),
    shareReplay(1),
  );

  return {
    dam$,
  };
}
