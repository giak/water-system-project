<template>
  <div class="water-system">
    <div class="water-system__header">
      <h2 class="water-system__title">Système de Gestion de l'Eau Avancé</h2>
    </div>
    <div class="water-system__components">
      <GlacierComponent :glacier-volume="glacierVolume" :melt-rate="meltRate" />
      <DamComponent 
        :water-level="waterLevel" 
        :is-auto-mode="isAutoMode"
        @update:water-level="setWaterLevel"
        @toggle-auto-mode="toggleAutoMode"
        @reset-system="resetSystem"
      />

      <PurificationPlantComponent :purified-water="purifiedWater" />
      <PowerPlantComponent :power-generated="powerGenerated" />
      <DistributionComponent :water-distributed="waterDistributed" :water-level="waterLevel" />
      <WeatherStationComponent :weather-condition="weatherCondition" />
      <IrrigationComponent :irrigation-water="irrigationWater" />
      <WastewaterTreatmentComponent :treated-wastewater="treatedWastewater" />
      <WaterQualityComponent :water-quality="waterQuality" />
      <FloodPredictionComponent :flood-risk="floodRisk" />
      <UserConsumptionComponent :user-consumption="userConsumption" />
      
    </div>
    <div class="water-system__alerts">
      <AlertSystem :alerts="alerts" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useWaterSystem } from '@/composables/water-system/useWaterSystem';
import AlertSystem from './AlertSystem.vue';
import DamComponent from './DamComponent.vue';
import DistributionComponent from './DistributionComponent.vue';
import FloodPredictionComponent from './FloodPredictionComponent.vue';
import GlacierComponent from './GlacierComponent.vue';
import IrrigationComponent from './IrrigationComponent.vue';
import PowerPlantComponent from './PowerPlantComponent.vue';
import PurificationPlantComponent from './PurificationPlantComponent.vue';
import UserConsumptionComponent from './UserConsumptionComponent.vue';
import WastewaterTreatmentComponent from './WastewaterTreatmentComponent.vue';
import WaterQualityComponent from './WaterQualityComponent.vue';
import WeatherStationComponent from './WeatherStationComponent.vue';

const {
  waterLevel,
  setWaterLevel,
  isAutoMode,
  toggleAutoMode,
  purifiedWater,
  powerGenerated,
  waterDistributed,
  weatherCondition,
  alerts,
  irrigationWater,
  treatedWastewater,
  waterQuality,
  floodRisk,
  userConsumption,
  resetSystem,
  glacierVolume,
  meltRate,
} = useWaterSystem();
</script>