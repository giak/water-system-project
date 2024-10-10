import type { WeatherCondition } from '@/types/waterSystem';
import { handleError } from '@/utils/errorUtils';
import { measureObservablePerformance } from '@/utils/performanceUtils';
import type { Observable } from 'rxjs';
import { interval, withLatestFrom } from 'rxjs';
import { catchError, map, shareReplay } from 'rxjs/operators';

// Facteurs d'influence des conditions météorologiques
const WEATHER_FACTOR_RAINY = 1.2;
const WEATHER_FACTOR_STORMY = 1.4;
const WEATHER_FACTOR_SUNNY = 0.9;

export function useDamManagement(
  waterSource$: Observable<number>,
  weatherSource$: Observable<WeatherCondition>,
  glacierMelt$: Observable<{ volume: number; meltRate: number; waterFlow: number }>,
) {
  const dam$ = interval(1000).pipe(
    withLatestFrom(waterSource$, weatherSource$, glacierMelt$),
    map(([, level, weather, glacier]) => {
      // Ajuster le niveau d'eau en fonction du débit d'eau du glacier
      let adjustedLevel = level + glacier.waterFlow;

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
        // 'nuageux' n'a pas d'effet particulier
      }

      // Ajouter une variation aléatoire pour simuler d'autres facteurs
      const randomVariation = (Math.random() - 0.5) * 5; // Variation de ±2.5%
      adjustedLevel += randomVariation;

      // Assurer que le niveau reste entre 0 et 100
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
