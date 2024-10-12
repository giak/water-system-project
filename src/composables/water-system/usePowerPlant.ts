import type { Observable } from 'rxjs';
import { distinctUntilChanged, filter, map, scan, shareReplay } from 'rxjs/operators';

export function usePowerPlant(dam$: Observable<number>) {
  const powerPlant$ = dam$.pipe(
    filter((level) => level > 30),
    map((water) => {
      const efficiency = 0.7 + Math.random() * 0.2; // Rendement entre 70% et 90%
      return water * 0.4 * efficiency * 10;
    }),
    scan((acc, value) => acc + value, 0), // Accumuler la production d'énergie
    distinctUntilChanged(),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  return {
    powerPlant$,
  };
}
