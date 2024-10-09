import type { Subject } from 'rxjs';

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
  priority: 'high' | 'medium' | 'low';
}

export interface DataSources {
  waterSource$: Subject<number>;
  weatherSource$: Subject<WeatherCondition>;
  wastewaterSource$: Subject<number>;
  userConsumptionSource$: Subject<number>;
  glacierSource$: Subject<number>; // Changé de Observable<number> à Subject<number>
}

export type WeatherCondition = 'ensoleillé' | 'nuageux' | 'pluvieux' | 'orageux';
