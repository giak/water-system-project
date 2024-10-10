<template>
  <div class="water-system">
    <div class="water-system__header">
      <h2 class="water-system__title">Système de Gestion de l'Eau Avancé</h2>
      <div class="water-system__status">
        <p>Statut global : {{ overallSystemStatus }}</p>
        <p>Efficacité du système : {{ systemEfficiency?.toFixed(2) ?? 'N/A' }}%</p>
        <p>Total d'eau traitée : {{ totalWaterProcessed?.toFixed(2) ?? 'N/A' }} m³</p>
      </div>
    </div>
    <SystemControls
      :current-water-level="currentWaterLevel"
      :is-manual-mode="isManualMode"
      @update:water-level="setWaterLevel"
      @toggle-manual-mode="toggleManualMode"
      @reset-system="resetSystem"
    />
    <div class="water-system__components">
      <GlacierComponent 
        :glacier-volume="state.glacierVolume" 
        :melt-rate="state.meltRate"
        :water-flow="state.waterFlow" 
      />
      <DamComponent 
        :current-water-level="currentWaterLevel"
        :is-manual-mode="isManualMode"
        :glacier-inflow="state.waterFlow"
        :water-volume="state.damWaterVolume"  
        @update:water-level="setWaterLevel"
        @toggle-manual-mode="toggleManualMode"
        @reset-system="resetSystem"
      />
      <PurificationPlantComponent :purified-water="state.purifiedWater" />
      <PowerPlantComponent :power-generated="state.powerGenerated" />
      <DistributionComponent 
        :water-distributed="state.waterDistributed" 
        :water-level="currentWaterLevel" 
      />
      <WeatherStationComponent :weather-condition="state.weatherCondition" />
      <IrrigationComponent :irrigation-water="state.irrigationWater" />
      <WastewaterTreatmentComponent :treated-wastewater="state.treatedWastewater" />
      <WaterQualityComponent :water-quality="state.waterQuality" />
      <FloodPredictionComponent :flood-risk="state.floodRisk" />
      <UserConsumptionComponent :user-consumption="state.userConsumption" />
    </div>
    <div class="water-system__alerts">
      <AlertSystem :alerts="alerts" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useWaterSystem } from '@/composables/water-system/useWaterSystem';
import { defineAsyncComponent } from 'vue';
import AlertSystem from './AlertSystem.vue';
import DamComponent from './DamComponent.vue';
import DistributionComponent from './DistributionComponent.vue';
import SystemControls from './SystemControls.vue';

// Composants chargés de manière asynchrone
const FloodPredictionComponent = defineAsyncComponent(
  () => import('./FloodPredictionComponent.vue'),
);
const GlacierComponent = defineAsyncComponent(() => import('./GlacierComponent.vue'));
const IrrigationComponent = defineAsyncComponent(() => import('./IrrigationComponent.vue'));
const PowerPlantComponent = defineAsyncComponent(() => import('./PowerPlantComponent.vue'));
const PurificationPlantComponent = defineAsyncComponent(
  () => import('./PurificationPlantComponent.vue'),
);
const UserConsumptionComponent = defineAsyncComponent(
  () => import('./UserConsumptionComponent.vue'),
);
const WastewaterTreatmentComponent = defineAsyncComponent(
  () => import('./WastewaterTreatmentComponent.vue'),
);
const WaterQualityComponent = defineAsyncComponent(() => import('./WaterQualityComponent.vue'));
const WeatherStationComponent = defineAsyncComponent(() => import('./WeatherStationComponent.vue'));

const {
  state,
  currentWaterLevel,
  setWaterLevel,
  toggleManualMode,
  isManualMode,
  resetSystem,
  totalWaterProcessed,
  systemEfficiency,
  overallSystemStatus,
  alerts,
} = useWaterSystem();
</script>