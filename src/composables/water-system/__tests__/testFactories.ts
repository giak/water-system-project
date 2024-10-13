import { waterSystemConfig } from '@/config/waterSystemConfig';
import type { WaterSystemState, WeatherCondition } from '@/types/waterSystem';

export function createMockWaterSystemState(
  overrides: Partial<WaterSystemState> = {},
): WaterSystemState {
  return {
    waterLevel: waterSystemConfig.INITIAL_DAM_WATER_LEVEL,
    isAutoMode: true,
    purifiedWater: waterSystemConfig.INITIAL_PURIFIED_WATER,
    powerGenerated: waterSystemConfig.INITIAL_POWER_GENERATED,
    waterDistributed: waterSystemConfig.INITIAL_WATER_DISTRIBUTED,
    weatherCondition: 'ensoleillé' as WeatherCondition,
    alerts: [],
    irrigationWater: waterSystemConfig.INITIAL_IRRIGATION_WATER,
    treatedWastewater: waterSystemConfig.INITIAL_TREATED_WASTEWATER,
    waterQuality: waterSystemConfig.INITIAL_WATER_QUALITY,
    floodRisk: waterSystemConfig.INITIAL_FLOOD_RISK,
    userConsumption: waterSystemConfig.INITIAL_USER_CONSUMPTION,
    glacierVolume: waterSystemConfig.INITIAL_GLACIER_VOLUME,
    meltRate: waterSystemConfig.INITIAL_MELT_RATE,
    waterFlow: waterSystemConfig.INITIAL_WATER_FLOW,
    damWaterVolume: waterSystemConfig.INITIAL_DAM_WATER_VOLUME,
    ...overrides,
  };
}

export function createMockWaterSystemMetrics(
  overrides: Partial<WaterSystemMetrics> = {},
): WaterSystemMetrics {
  return {
    waterLevel: 50 as number,
    waterQuality: 75 as number,
    floodRisk: 20 as number,
    glacierVolume: 1000000 as number,
    ...overrides,
  };
}
