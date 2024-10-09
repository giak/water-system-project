<template>
  <div class="flood-prediction">
    <h3>
      <i class="pi pi-exclamation-triangle mr-2"></i>
      Prévision des Inondations
    </h3>
    <p>
      Risque: {{ floodRisk.toFixed(2) }}%
      <TrendArrow :trend="floodRiskTrend" />
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import TrendArrow from './TrendArrow.vue';

const props = defineProps<{
  floodRisk: number;
}>();

const previousFloodRisk = ref(props.floodRisk);
const floodRiskTrend = ref(0);

watch(() => props.floodRisk, (newValue, oldValue) => {
  floodRiskTrend.value = newValue - oldValue;
  previousFloodRisk.value = newValue;
});
</script>