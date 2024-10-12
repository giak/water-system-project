import type { Observable, Subject } from 'rxjs';
import type { Ref } from 'vue';

export type WeatherCondition = 'ensoleillé' | 'nuageux' | 'pluvieux' | 'orageux';

export interface WaterSystemState {
  waterLevel: number;
  purifiedWater: number;
  powerGenerated: number;
  waterDistributed: number;
  weatherCondition: WeatherCondition;
  alerts: Alert[];
  irrigationWater: number;
  treatedWastewater: number;
  waterQuality: number;
  floodRisk: number;
  userConsumption: number;
  isAutoMode: boolean;
  glacierVolume: number;
  meltRate: number;
  waterFlow: number;
  damWaterVolume: number; // Ajout de cette ligne
}

export interface Alert {
  id: string;
  message: string;
  timestamp: string;
  priority: AlertPriority;
}

export type AlertPriority = 'high' | 'medium' | 'low';

export interface DataSources {
  waterSource$: Subject<number>;
  weatherSource$: Subject<WeatherCondition>;
  wastewaterSource$: Subject<number>;
  userConsumptionSource$: Subject<number>;
  glacierSource$: Subject<number>;
}

export interface GlacierMeltData {
  volume: number;
  meltRate: number;
}

export interface SimulationControls {
  isAutoMode: boolean;
  startSimulation: () => void;
  stopSimulation: () => void;
  toggleAutoMode: () => void;
}

export type WaterSystemObservables = {
  [K in keyof WaterSystemState]: K extends 'alerts'
    ? Observable<Alert[]>
    : Observable<WaterSystemState[K]>;
} & {
  waterFlow: Observable<number>;
};

export interface WaterSystemComposable {
  state: Ref<WaterSystemState>;
  observables: WaterSystemObservables;
  simulationControls: SimulationControls;
  updateWaterLevel: (newLevel: number) => void;
  updatePurifiedWater: (amount: number) => void;
  updatePowerGenerated: (amount: number) => void;
  updateWaterDistributed: (amount: number) => void;
  updateWeatherCondition: (condition: WeatherCondition) => void;
  addAlert: (alert: Alert) => void;
  removeAlert: (id: string) => void;
  updateGlacierMeltRate: (rate: number) => void;
  updateDamCapacity: (capacity: number) => void;
  isManualMode: Ref<boolean>;
  toggleManualMode: () => void;
  toggleAutoMode: () => void;
}

export interface WaterSourceLogEntry {
  timestamp: number;
  source: string;
  amount: number;
  weather?: WeatherCondition;
  flowRate?: number;
  quality?: number;
  temperature?: number;
}
