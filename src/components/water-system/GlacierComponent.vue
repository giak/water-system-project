<template>
  <div class="glacier">
    <h3 v-once>
      <i class="pi pi-cloud mr-2"></i>
      Glacier
    </h3>
    <div class="glacier-info" :class="{ 'critical': isCriticalVolume }">
      <div class="info-label" v-once>Volume de glace :</div>
      <div class="info-value">
        {{ formattedGlacierVolume }} m³
        <TrendArrow :trend="glacierVolumeTrend" />
      </div>
    </div>
    <div class="glacier-info">
      <div class="info-label" v-once>Débit de fonte :</div>
      <div class="info-value">
        {{ formattedMeltRate }} m³/h
        <TrendArrow :trend="meltRateTrend" />
      </div>
    </div>
    <div class="glacier-info" :class="waterFlowStatusClass">
      <div class="info-label" v-once>Débit d'eau :</div>
      <div class="info-value">
        {{ formattedWaterFlow }} m³/h
        <TrendArrow :trend="waterFlowTrend" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { waterSystemConfig } from '@/config/waterSystemConfig';
import { computed, ref, watch } from 'vue';
import TrendArrow from './TrendArrow.vue';

const props = defineProps<{
  glacierVolume: number;
  meltRate: number;
  waterFlow: number;
}>();

const previousGlacierVolume = ref(props.glacierVolume);
const previousMeltRate = ref(props.meltRate);
const previousWaterFlow = ref(props.waterFlow);
const glacierVolumeTrend = ref(0);
const meltRateTrend = ref(0);
const waterFlowTrend = ref(0);

const formattedGlacierVolume = computed(() =>
  props.glacierVolume.toLocaleString(undefined, { maximumFractionDigits: 2 }),
);
const formattedMeltRate = computed(() =>
  props.meltRate.toLocaleString(undefined, { maximumFractionDigits: 2 }),
);
const formattedWaterFlow = computed(() =>
  props.waterFlow.toLocaleString(undefined, { maximumFractionDigits: 2 }),
);

const isCriticalVolume = computed(
  () => props.glacierVolume < waterSystemConfig.CRITICAL_GLACIER_WATER_FLOW,
);

// Calcul du volume critique du glacier
const waterFlowStatusClass = computed(() => {
  if (props.waterFlow > waterSystemConfig.CRITICAL_GLACIER_WATER_FLOW) return 'critical';
  if (props.waterFlow > waterSystemConfig.HIGH_GLACIER_WATER_FLOW) return 'warning';
  return '';
});

watch(
  () => props.glacierVolume,
  (newValue, oldValue) => {
    glacierVolumeTrend.value = newValue - oldValue;
    previousGlacierVolume.value = newValue;
  },
);

watch(
  () => props.meltRate,
  (newValue, oldValue) => {
    meltRateTrend.value = newValue - oldValue;
    previousMeltRate.value = newValue;
  },
);

watch(
  () => props.waterFlow,
  (newValue, oldValue) => {
    waterFlowTrend.value = newValue - oldValue;
    previousWaterFlow.value = newValue;
  },
);
</script>

<style scoped>
.glacier-info.critical {
  color: red;
  font-weight: bold;
}

.glacier-info.warning {
  color: orange;
  font-weight: bold;
}
</style>