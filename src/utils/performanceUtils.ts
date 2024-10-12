import { computed, type ComputedRef } from 'vue';
import { throttle } from 'lodash-es';
import { waterSystemConfig } from '@/config/waterSystemConfig';

/**
 * Crée une version mémoïsée et throttled d'une fonction de calcul.
 *
 * @param {Function} calculationFn - La fonction de calcul à optimiser
 * @param {string} name - Le nom du calcul (utilisé pour les logs de performance)
 * @returns {ComputedRef<any>} Une référence calculée optimisée
 */
export function createOptimizedComputed<T>(
  calculationFn: () => T,
  name: string
): ComputedRef<T> {
  const memoizedFn = computed(calculationFn);

  const throttledFn = throttle(() => {
    return memoizedFn.value;
  }, waterSystemConfig.THROTTLE_DELAY);

  return computed(() => {
    if (waterSystemConfig.enablePerformanceLogs) {
      console.time(`${name} calculation`);
      const result = throttledFn();
      console.timeEnd(`${name} calculation`);
      return result;
    }
    return throttledFn();
  });
}
