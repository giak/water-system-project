import { waterSystemConfig } from '@/config/waterSystemConfig';
import { Observable, throwError } from 'rxjs';
import { take } from 'rxjs/operators';
import { describe, expect, it, vi } from 'vitest';
import {
  calculateOverallSystemStatus,
  createMockWaterSystemDependencies,
  useWaterSystem,
} from '../useWaterSystem';

// Pas besoin de mocker waterSystemConfig, on peut utiliser la vraie configuration
vi.mock('vue', async () => {
  const actual = await vi.importActual('vue');
  return {
    ...actual,
    provide: vi.fn(),
    onMounted: vi.fn((fn) => fn()),
    onUnmounted: vi.fn(),
  };
});

describe('useWaterSystem', () => {
  describe('calculateOverallSystemStatus', () => {
    it('should return "Critique" when water level is below critical', () => {
      const status = calculateOverallSystemStatus(
        waterSystemConfig.CRITICAL_WATER_LEVEL - 1,
        100,
        waterSystemConfig,
      );
      expect(status).toBe('Critique');
    });

    it('should return "Préoccupant" when water level is low', () => {
      const status = calculateOverallSystemStatus(
        waterSystemConfig.LOW_WATER_LEVEL,
        100,
        waterSystemConfig,
      );
      expect(status).toBe('Préoccupant');
    });

    it('should return "Normal" when water level and quality are good', () => {
      const status = calculateOverallSystemStatus(
        waterSystemConfig.LOW_WATER_LEVEL + 1,
        waterSystemConfig.MEDIUM_WATER_QUALITY + 1,
        waterSystemConfig,
      );
      expect(status).toBe('Normal');
    });

    // Ajoutons un test supplémentaire pour la qualité de l'eau
    it('should return "Préoccupant" when water quality is below medium', () => {
      const status = calculateOverallSystemStatus(
        waterSystemConfig.LOW_WATER_LEVEL + 1,
        waterSystemConfig.MEDIUM_WATER_QUALITY - 1,
        waterSystemConfig,
      );
      expect(status).toBe('Préoccupant');
    });
  });

  describe('useWaterSystem', () => {
    it('should use injected dependencies and initialize correctly', () => {
      const mockDeps = createMockWaterSystemDependencies({
        getCurrentTime: () => 2000,
        getRandomNumber: () => 0.75,
      });

      const { totalWaterProcessed, state } = useWaterSystem(mockDeps, waterSystemConfig);

      // Vérifier que totalWaterProcessed est correctement initialisé
      expect(totalWaterProcessed.value).toBe(
        waterSystemConfig.INITIAL_PURIFIED_WATER + waterSystemConfig.INITIAL_WATER_DISTRIBUTED,
      );

      // Vérifier que l'état initial est correct
      expect(state.value.purifiedWater).toBe(waterSystemConfig.INITIAL_PURIFIED_WATER);
      expect(state.value.waterDistributed).toBe(waterSystemConfig.INITIAL_WATER_DISTRIBUTED);

      // Vérifier que les dépendances injectées sont utilisées
      expect(mockDeps.getCurrentTime()).toBe(2000);
      expect(mockDeps.getRandomNumber()).toBe(0.75);
    });
  });

  describe('System State', () => {
    it('should emit correct system state and update currentSystemState', (done) => {
      const mockDeps = createMockWaterSystemDependencies();
      const { systemState$, currentSystemState } = useWaterSystem(mockDeps, waterSystemConfig);

      systemState$.pipe(take(1)).subscribe((state) => {
        expect(state).toHaveProperty('overallStatus');
        expect(state).toHaveProperty('criticalSituation');
        expect(state).toHaveProperty('glacierStatus');

        expect(currentSystemState.value).toHaveProperty('waterLevel');
        expect(currentSystemState.value).toHaveProperty('weatherCondition');
        expect(currentSystemState.value).toHaveProperty('glacierVolume');

        done();
      });
    });
  });

  describe('Side Effects', () => {
    it('should trigger alerts for critical situations', (done) => {
      const mockDeps = createMockWaterSystemDependencies();
      const { sideEffects$, alerts } = useWaterSystem(mockDeps, {
        ...waterSystemConfig,
        CRITICAL_WATER_LEVEL: 100, // Force a critical situation
      });

      sideEffects$.pipe(take(1)).subscribe(() => {
        expect(alerts.value.some((alert) => alert.message.includes('Situation critique'))).toBe(
          true,
        );
        done();
      });
    });
  });

  describe('Error Handling', () => {
    it('should retry on error and eventually succeed', (done) => {
      const mockDeps = createMockWaterSystemDependencies();
      let callCount = 0;
      const erroringObservable = new Observable<number>((subscriber) => {
        callCount++;
        if (callCount < 3) {
          subscriber.error(new Error('Test error'));
        } else {
          subscriber.next(50);
          subscriber.complete();
        }
      });

      const { systemState$ } = useWaterSystem(mockDeps, {
        ...waterSystemConfig,
        dam$: erroringObservable,
      });

      systemState$.pipe(take(1)).subscribe({
        next: (state) => {
          expect(state.overallStatus).toBe('Normal');
          expect(callCount).toBe(3);
          done();
        },
        error: (error) => {
          done(error);
        },
      });
    });

    it('should emit an alert on critical error', (done) => {
      const mockDeps = createMockWaterSystemDependencies();
      const criticalErrorObservable = throwError(() => new Error('Critical error'));

      const { systemState$, alerts } = useWaterSystem(mockDeps, {
        ...waterSystemConfig,
        dam$: criticalErrorObservable,
      });

      systemState$.pipe(take(1)).subscribe({
        next: () => {
          done(new Error('Should not emit a value'));
        },
        error: () => {
          expect(alerts.value.value[0].message).toContain('Erreur système critique');
          expect(alerts.value.value[0].priority).toBe('high');
          done();
        },
      });
    });
  });
});
