import { waterSystemConfig } from '@/config/waterSystemConfig';
import type { WaterSourceLogEntry, WeatherCondition } from '@/types/waterSystem';
import { type Observable, Subject } from 'rxjs';
import { ref } from 'vue';

/**
 * Composable pour la gestion des logs des sources d'eau
 * @returns {Object} Fonctions et observables pour la gestion des logs
 */
export function useWaterSourceLogging() {
  const logs = ref<WaterSourceLogEntry[]>([]);
  const logSubject = new Subject<WaterSourceLogEntry>();

  /**
   * Observable des entrées de log
   * @type {Observable<WaterSourceLogEntry>}
   */
  const log$: Observable<WaterSourceLogEntry> = logSubject.asObservable();

  /**
   * Ajoute une nouvelle entrée de log
   * @param {WaterSourceLogEntry} entry - L'entrée de log à ajouter
   */
  function addLogEntry(entry: WaterSourceLogEntry) {
    if (waterSystemConfig.enableDetailedWaterSourceLogs) {
      logs.value.push(entry);
      logSubject.next(entry);
    }
  }

  /**
   * Crée une fonction de log pour une source d'eau spécifique
   * @param {string} source - Le nom de la source d'eau
   * @returns {Function} Fonction pour logger les données de cette source
   */
  function logWaterSource(source: string) {
    return (amount: number, weather?: WeatherCondition, flowRate?: number, quality?: number, temperature?: number) => {
      if (waterSystemConfig.enableDetailedWaterSourceLogs) {
        addLogEntry({
          timestamp: Date.now(),
          source,
          amount,
          weather,
          flowRate,
          quality,
          temperature
        });
      }
    };
  }

  return {
    logs,
    log$,
    addLogEntry,
    logWaterSource,
  };
}