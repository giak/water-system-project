<template>
  <div class="glacier">
    <h3>Glacier</h3>
    <p>
      Volume de glace : {{ glacierVolume.toFixed(2) }} m³
      <TrendArrow :trend="glacierVolumeTrend" />
    </p>
    <p>
      Débit de fonte : {{ meltRate.toFixed(2) }} m³/h
      <TrendArrow :trend="meltRateTrend" />
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import TrendArrow from './TrendArrow.vue';

const props = defineProps<{
  glacierVolume: number;
  meltRate: number;
}>();

const previousGlacierVolume = ref(props.glacierVolume);
const previousMeltRate = ref(props.meltRate);
const glacierVolumeTrend = ref(0);
const meltRateTrend = ref(0);

watch(() => props.glacierVolume, (newValue, oldValue) => {
  glacierVolumeTrend.value = newValue - oldValue;
  previousGlacierVolume.value = newValue;
});

watch(() => props.meltRate, (newValue, oldValue) => {
  meltRateTrend.value = newValue - oldValue;
  previousMeltRate.value = newValue;
});
</script>