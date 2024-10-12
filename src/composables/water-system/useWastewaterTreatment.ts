import type { Observable } from 'rxjs';
import { distinctUntilChanged, map, scan, shareReplay } from 'rxjs/operators';

export function useWastewaterTreatment(wastewaterSource$: Observable<number>) {
  const wastewaterTreatment$ = wastewaterSource$.pipe(
    map((wastewater) => {
      const efficiency = 0.6 + Math.random() * 0.3; // Efficacité entre 60% et 90%
      return wastewater * efficiency;
    }),
    scan((acc, value) => acc + value, 0),
    distinctUntilChanged(),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  return {
    wastewaterTreatment$,
  };
}
