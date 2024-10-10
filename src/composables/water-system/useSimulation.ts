import type { DataSources, WeatherCondition } from '@/types/waterSystem';
import { type Observable, take, BehaviorSubject } from 'rxjs';
import { ref } from 'vue';

export function useSimulation(
  dataSources: DataSources,
  weatherSimulation$: Observable<WeatherCondition>,
) {
  const isAutoMode = ref(true);
  let simulationInterval: number | null = null;
  const currentGlacierVolume = new BehaviorSubject<number>(1000000); // Valeur initiale arbitraire

  function startSimulation() {
    if (simulationInterval) return;
    simulationInterval = window.setInterval(() => {
      if (isAutoMode.value) {
        const baseWaterInput = 40 + (Math.random() * 60 - 30);
        const seasonalFactor = 1 + 0.5 * Math.sin(Date.now() / (1000 * 60 * 60 * 24 * 30));
        dataSources.waterSource$.next(baseWaterInput * seasonalFactor);

        const glacierMeltRate = 0.00001 + Math.random() * 0.00009;
        const newGlacierVolume = Math.max(
          0,
          currentGlacierVolume.getValue() * (1 - glacierMeltRate),
        );
        currentGlacierVolume.next(newGlacierVolume);
        dataSources.glacierSource$.next(newGlacierVolume);

        weatherSimulation$.pipe(take(1)).subscribe((weather) => {
          dataSources.weatherSource$.next(weather);
        });
      }
    }, 2000);
  }

  function stopSimulation() {
    if (simulationInterval) {
      window.clearInterval(simulationInterval);
      simulationInterval = null;
    }
  }

  function toggleAutoMode() {
    isAutoMode.value = !isAutoMode.value;
    if (isAutoMode.value) {
      startSimulation();
    } else {
      stopSimulation();
    }
  }

  return {
    isAutoMode,
    startSimulation,
    stopSimulation,
    toggleAutoMode,
    currentGlacierVolume, // Exposer cette valeur si nécessaire
  };
}
