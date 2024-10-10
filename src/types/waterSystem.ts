import type { Subject, Observable } from 'rxjs';

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
};
