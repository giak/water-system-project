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
    <div class="water-system__components">
      <GlacierComponent 
        :glacier-volume="state.glacierVolume" 
        :melt-rate="state.meltRate" 
      />
      <DamComponent 
        :current-water-level="currentWaterLevel"
        :is-manual-mode="isManualMode"
        @update:water-level="setWaterLevel"
        @toggle-manual-mode="toggleManualMode"
        @reset-system="resetSystem"
      />
      <PurificationPlantComponent :purified-water="state.purifiedWater" />
      <PowerPlantComponent :power-generated="state.powerGenerated" />
      <DistributionComponent 
        :water-distributed="state.waterDistributed" 
        :water-level="state.waterLevel" 
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
  state,
  currentWaterLevel,
  setWaterLevel,
  toggleManualMode,
  isManualMode, // Utilisez directement isManualMode ici
  resetSystem,
  totalWaterProcessed,
  systemEfficiency,
  overallSystemStatus,
  alerts,
  addAlert,
} = useWaterSystem();
</script>