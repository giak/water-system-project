<template>
  <div class="flood-prediction">
    <h3 v-once>
      <i class="pi pi-exclamation-triangle mr-2"></i>
      Prévision des Inondations
    </h3>
    <p>
      Risque: {{ formattedFloodRisk }}%
      <TrendArrow :trend="floodRiskTrend" />
    </p>
    <div class="risk-indicator" :style="riskIndicatorStyle"></div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import TrendArrow from './TrendArrow.vue';

const props = defineProps<{
  floodRisk: number;
}>();

const previousFloodRisk = ref(props.floodRisk);
const floodRiskTrend = ref(0);

const formattedFloodRisk = computed(() => props.floodRisk.toFixed(2));

const riskIndicatorStyle = computed(() => {
  const hue = Math.max(0, 120 - props.floodRisk * 1.2);
  return {
    backgroundColor: `hsl(${hue}, 100%, 50%)`,
    width: `${props.floodRisk}%`,
  };
});

watch(
  () => props.floodRisk,
  (newValue, oldValue) => {
    floodRiskTrend.value = newValue - oldValue;
    previousFloodRisk.value = newValue;
  },
);
</script>

<style scoped>
.risk-indicator {
  height: 10px;
  transition: all 0.3s ease;
}
</style>