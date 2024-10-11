<template>
  <div class="water-quality-component">
    <h3 v-once>
      <i class="pi pi-check-circle mr-2"></i>
      Qualité de l'Eau
    </h3>
    <p>
      Indice de qualité: {{ formattedWaterQuality }}%
      <TrendArrow :trend="waterQualityTrend" />
    </p>
    <div class="quality-indicator" :style="qualityIndicatorStyle"></div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import TrendArrow from './TrendArrow.vue';

const props = defineProps<{
  waterQuality: number;
}>();

const previousWaterQuality = ref(props.waterQuality);
const waterQualityTrend = ref(0);

const formattedWaterQuality = computed(() => props.waterQuality.toFixed(2));

const qualityIndicatorStyle = computed(() => {
  const hue = Math.min(120, Math.max(0, props.waterQuality * 1.2));
  return {
    backgroundColor: `hsl(${hue}, 100%, 50%)`,
    width: `${props.waterQuality}%`,
  };
});

watch(
  () => props.waterQuality,
  (newValue, oldValue) => {
    waterQualityTrend.value = newValue - oldValue;
    previousWaterQuality.value = newValue;
  },
);
</script>

<style scoped>
.quality-indicator {
  height: 10px;
  transition: all 0.3s ease;
}
</style>