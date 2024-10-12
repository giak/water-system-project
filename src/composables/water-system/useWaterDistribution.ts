import type { Observable } from 'rxjs';
import { map, scan, shareReplay } from 'rxjs/operators';

const DAILY_RESET_VALUE = 1000; // Valeur arbitraire, à ajuster selon les besoins

export function useWaterDistribution(dam$: Observable<number>) {
  const waterDistribution$ = dam$.pipe(
    map((level) => {
      if (level > 70) return level * 0.8;
      if (level > 30) return level * 0.5;
      return level * 0.2;
    }),
    scan((acc, value) => acc + value, 0),
    map((total) => Math.max(0, total - DAILY_RESET_VALUE)),
    shareReplay(1),
  );

  return {
    waterDistribution$,
  };
}
