<template>
  <div class="glacier">
    <h3 v-once>
      <i class="pi pi-cloud mr-2"></i>
      Glacier
    </h3>
    <div class="glacier-info">
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
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import TrendArrow from './TrendArrow.vue';

const props = defineProps<{
  glacierVolume: number;
  meltRate: number;
}>();

const previousGlacierVolume = ref(props.glacierVolume);
const previousMeltRate = ref(props.meltRate);
const glacierVolumeTrend = ref(0);
const meltRateTrend = ref(0);

const formattedGlacierVolume = computed(() => props.glacierVolume.toFixed(2));
const formattedMeltRate = computed(() => props.meltRate.toFixed(2));

watch(
  () => props.glacierVolume,
  (newValue, oldValue) => {
    glacierVolumeTrend.value = newValue - oldValue;
    previousGlacierVolume.value = newValue;
  }
);

watch(
  () => props.meltRate,
  (newValue, oldValue) => {
    meltRateTrend.value = newValue - oldValue;
    previousMeltRate.value = newValue;
  }
);
</script>

<style scoped>
/* Styles existants */
</style>