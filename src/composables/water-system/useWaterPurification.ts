import { type Observable, interval } from 'rxjs';
import { filter, map, mergeMap, scan, shareReplay, take } from 'rxjs/operators';

export function useWaterPurification(dam$: Observable<number>) {
  const purificationPlant$ = dam$.pipe(
    filter((level) => level > 20),
    map((water) => {
      const efficiency = 0.5 + Math.random() * 0.3; // Efficacité entre 50% et 80%
      return water * efficiency;
    }),
    mergeMap((water) =>
      interval(1000).pipe(
        take(5),
        map(() => water / 5),
      ),
    ),
    scan((acc, value) => acc + value, 0),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  return {
    purificationPlant$,
  };
}
