import { waterSystemConfig } from '@/config/waterSystemConfig';
import { tap } from 'rxjs/operators';

export function measureObservablePerformance<T>(name: string) {
  return tap<T>({
    subscribe: () => {
      if (waterSystemConfig.enablePerformanceLogs) console.time(`Subscribe ${name}`);
    },
    next: (value) => {
      if (waterSystemConfig.enablePerformanceLogs) {
        const endTime = performance.now();
        console.log(
          `Observable ${name} - Temps: ${endTime.toFixed(2)}ms - Valeur: ${JSON.stringify(value)}`,
        );
      }
    },
    complete: () => {
      if (waterSystemConfig.enablePerformanceLogs) console.timeEnd(`Subscribe ${name}`);
    },
  });
}
