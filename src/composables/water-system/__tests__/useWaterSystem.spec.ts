import { waterSystemConfig } from '@config/waterSystemConfig';
import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import { defineComponent, nextTick } from 'vue';
import { calculateOverallSystemStatus, useWaterSystem } from '../useWaterSystem';
import { createMockWaterSystemState } from './testFactories';

// Mock des dépendances
vi.mock('@/utils/errorHandler', () => ({
  handleError: vi.fn(),
  retryStrategy: () => vi.fn(),
}));

// Composant de test
const TestComponent = defineComponent({
  setup() {
    return useWaterSystem();
  },
  template: '<div></div>',
});

describe('useWaterSystem', () => {
  describe('calculateOverallSystemStatus', () => {
    it('should correctly calculate status for all possible inputs', () => {
      for (let waterLevel = 0; waterLevel <= 100; waterLevel++) {
        for (let waterQuality = 0; waterQuality <= 100; waterQuality++) {
          const status = calculateOverallSystemStatus(waterLevel, waterQuality, waterSystemConfig);
          if (
            waterLevel < waterSystemConfig.CRITICAL_WATER_LEVEL ||
            waterQuality < waterSystemConfig.CRITICAL_WATER_QUALITY
          ) {
            expect(status).toBe('Critique');
          } else if (
            waterLevel <= waterSystemConfig.LOW_WATER_LEVEL ||
            waterQuality < waterSystemConfig.MEDIUM_WATER_QUALITY
          ) {
            expect(status).toBe('Préoccupant');
          } else {
            expect(status).toBe('Normal');
          }
        }
      }
    });
  });

  describe('useWaterSystem', () => {
    it('should initialize with correct default values', async () => {
      const wrapper = mount(TestComponent);
      await nextTick(); // Attendre que les réactifs soient mis à jour

      const { state } = wrapper.vm;
      expect(state).toEqual(createMockWaterSystemState());
    });

    it('should update state correctly when water level changes', async () => {
      const wrapper = mount(TestComponent);
      const waterSystem = wrapper.vm;

      // Vérifier la structure retournée par useWaterSystem
      console.log('Structure retournée par useWaterSystem:', Object.keys(waterSystem));

      // Vérifier l'état initial
      expect(waterSystem.state.waterLevel).toBe(waterSystemConfig.INITIAL_DAM_WATER_LEVEL);

      // Vérifier si isAutoMode existe et est une valeur ou une fonction calculée
      if ('isAutoMode' in waterSystem) {
        const isAutoMode =
          typeof waterSystem.isAutoMode === 'function'
            ? waterSystem.isAutoMode()
            : waterSystem.isAutoMode;
        expect(isAutoMode).toBe(true);
      } else {
        console.warn("isAutoMode n'est pas défini dans l'objet retourné par useWaterSystem");
      }

      // Vérifier si isManualMode existe et est une valeur ou une fonction calculée
      if ('isManualMode' in waterSystem) {
        const isManualMode =
          typeof waterSystem.isManualMode === 'function'
            ? waterSystem.isManualMode()
            : waterSystem.isManualMode;
        expect(isManualMode).toBe(false);
      } else {
        console.warn("isManualMode n'est pas défini dans l'objet retourné par useWaterSystem");
      }

      console.log(
        'État initial:',
        waterSystem.state.waterLevel,
        'Mode auto:',
        waterSystem.isAutoMode,
        'Mode manuel:',
        waterSystem.isManualMode,
      );

      // Activer le mode manuel
      if (typeof waterSystem.toggleManualMode === 'function') {
        await waterSystem.toggleManualMode();
      } else {
        console.warn(
          "toggleManualMode n'est pas une fonction dans l'objet retourné par useWaterSystem",
        );
      }

      console.log(
        'Après activation du mode manuel:',
        waterSystem.state.waterLevel,
        'Mode auto:',
        waterSystem.isAutoMode,
        'Mode manuel:',
        waterSystem.isManualMode,
      );

      // Changer le niveau d'eau
      if (typeof waterSystem.setWaterLevel === 'function') {
        await waterSystem.setWaterLevel(75);
      } else {
        console.warn(
          "setWaterLevel n'est pas une fonction dans l'objet retourné par useWaterSystem",
        );
      }

      // Attendre que les réactifs soient mis à jour
      await nextTick();
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Vérifier que le niveau d'eau a été mis à jour
      console.log(
        'Après setWaterLevel:',
        waterSystem.state.waterLevel,
        'Mode auto:',
        waterSystem.isAutoMode,
        'Mode manuel:',
        waterSystem.isManualMode,
      );
      expect(waterSystem.state.waterLevel).toBe(75);

      // Vérifier que le volume du barrage a été mis à jour en conséquence
      const expectedVolume = 0.75 * waterSystemConfig.INITIAL_DAM_WATER_VOLUME;
      console.log('Volume du barrage:', waterSystem.state.damWaterVolume);
      expect(waterSystem.state.damWaterVolume).toBeCloseTo(expectedVolume, 2);

      // Vérifier que les modes ont été correctement mis à jour
      if ('isAutoMode' in waterSystem) {
        const isAutoMode =
          typeof waterSystem.isAutoMode === 'function'
            ? waterSystem.isAutoMode()
            : waterSystem.isAutoMode;
        expect(isAutoMode).toBe(false);
      }

      if ('isManualMode' in waterSystem) {
        const isManualMode =
          typeof waterSystem.isManualMode === 'function'
            ? waterSystem.isManualMode()
            : waterSystem.isManualMode;
        expect(isManualMode).toBe(true);
      }

      expect(waterSystem.state.purifiedWater).toBe(waterSystemConfig.INITIAL_PURIFIED_WATER);
    });

    it('should handle critical situations correctly', async () => {
      const wrapper = mount(TestComponent);
      const waterSystem = wrapper.vm;

      console.log('État initial:', waterSystem.state);

      // Activer le mode manuel
      await waterSystem.toggleManualMode();
      console.log('Mode manuel activé:', waterSystem.isManualMode);

      // Simuler une situation critique
      const criticalWaterLevel = waterSystemConfig.CRITICAL_WATER_LEVEL - 1;
      const criticalWaterQuality = waterSystemConfig.CRITICAL_WATER_QUALITY - 1;

      console.log("Tentative de définition du niveau d'eau critique:", criticalWaterLevel);
      await waterSystem.setWaterLevel(criticalWaterLevel);
      console.log('Après setWaterLevel:', waterSystem.state.waterLevel);

      waterSystem.state.waterQuality = criticalWaterQuality;
      console.log("Après définition de la qualité de l'eau:", waterSystem.state.waterQuality);

      // Attendre que les effets asynchrones se produisent
      await new Promise((resolve) => setTimeout(resolve, 2000));

      console.log('État final:', waterSystem.state);
      console.log('Alertes actuelles:', waterSystem.alerts);

      // Vérifications
      expect(waterSystem.state.waterLevel).toBe(criticalWaterLevel);
      expect(waterSystem.state.waterQuality).toBe(criticalWaterQuality);

      // ... (reste du test inchangé)
    });
  });
});
