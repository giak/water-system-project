export const waterSystemConfig = {
  enablePerformanceLogs: false, // Changez à true pour activer les logs

  // Constants for system initialization
  INITIAL_WATER_LEVEL: 50,
  INITIAL_GLACIER_VOLUME: 1000000,
  INITIAL_WATER_QUALITY: 90,
  INITIAL_FLOOD_RISK: 10,
  INITIAL_PURIFIED_WATER: 0,
  INITIAL_POWER_GENERATED: 0,
  INITIAL_WATER_DISTRIBUTED: 0,
  INITIAL_IRRIGATION_WATER: 0,
  INITIAL_TREATED_WASTEWATER: 0,
  INITIAL_USER_CONSUMPTION: 0,
  INITIAL_MELT_RATE: 0,
  INITIAL_WATER_FLOW: 0,
  INITIAL_DAM_WATER_LEVEL: 70,
  INITIAL_DAM_WATER_VOLUME: 1000000,

  // Constants for thresholds
  CRITICAL_WATER_LEVEL: 20,
  LOW_WATER_LEVEL: 30,
  HIGH_WATER_LEVEL: 80,
  VERY_HIGH_WATER_LEVEL: 90,
  LOW_WATER_QUALITY: 60,
  MEDIUM_WATER_QUALITY: 70,
  CRITICAL_WATER_QUALITY: 50,
  HIGH_FLOOD_RISK: 80,
  LOW_WATER_DISTRIBUTION: 50,
  HIGH_WATER_DISTRIBUTION: 500,
  HIGH_IRRIGATION_WATER: 1000,
  LOW_POWER_GENERATION: 100,
  HIGH_POWER_GENERATION: 1000,
  HIGH_USER_CONSUMPTION: 500,

  // Constants for calculations
  THROTTLE_DELAY: 1000, // 1 second
  SEASONAL_FACTOR_AMPLITUDE: 0.3,
  SEASONAL_FACTOR_PERIOD: 1000 * 60 * 60 * 24 * 30, // Approximately one month in milliseconds
  BASE_WATER_INPUT_MIN: 20,
  BASE_WATER_INPUT_MAX: 60,

  // New constants for glacier water flow
  HIGH_GLACIER_WATER_FLOW: 50, // Exemple de valeur, à ajuster selon vos besoins
  CRITICAL_GLACIER_WATER_FLOW: 80, // Exemple de valeur, à ajuster selon vos besoins
};
