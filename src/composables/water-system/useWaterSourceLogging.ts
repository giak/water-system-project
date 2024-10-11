import { ref } from 'vue';
import  { type Observable, Subject } from 'rxjs';
import type { WaterSourceLogEntry } from '@/types/waterSystem';

export function useWaterSourceLogging() {
  const logs = ref<WaterSourceLogEntry[]>([]);
  const logSubject = new Subject<WaterSourceLogEntry>();

  const log$: Observable<WaterSourceLogEntry> = logSubject.asObservable();

  function addLogEntry(entry: WaterSourceLogEntry) {
    logs.value.push(entry);
    logSubject.next(entry);
  }

  function logWaterSource(source: string) {
    return (amount: number) => {
      addLogEntry({
        timestamp: Date.now(),
        source,
        amount,
      });
    };
  }

  return {
    logs,
    log$,
    addLogEntry,
    logWaterSource,
  };
}