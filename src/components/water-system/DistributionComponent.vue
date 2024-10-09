<template>
  <div class="distribution" :class="distributionClass">
    <h3>Distribution d'Eau</h3>
    <p>
      Eau distribuée: {{ displayedWaterDistributed }} m³
      <TrendArrow v-if="showTrend" :trend="waterDistributedTrend" />
    </p>
    <p v-if="isLowWater" class="alert">
      ⚠️ Niveau d'eau critique ! Distribution limitée.
    </p>
    <p v-if="isEffectiveDistribution" class="info">
      ✅ Distribution d'eau effective.
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import TrendArrow from './TrendArrow.vue';

const props = defineProps<{
  waterDistributed: number;
  waterLevel: number;
}>();

const previousWaterDistributed = ref(props.waterDistributed);
const waterDistributedTrend = ref(0);

const isLowWater = computed(() => props.waterLevel < 30);
const isEffectiveDistribution = computed(() => props.waterLevel > 70);
const isNormalDistribution = computed(() => props.waterLevel >= 30 && props.waterLevel <= 70);

const showTrend = computed(() => !isLowWater.value);

const distributionClass = computed(() => {
  if (isLowWater.value) return 'low-water';
  if (isEffectiveDistribution.value) return 'effective-distribution';
  return '';
});

const displayedWaterDistributed = computed(() => {
  if (isLowWater.value) return '0.00';
  return props.waterDistributed.toFixed(2);
});

watch(() => props.waterDistributed, (newValue, oldValue) => {
  if (!isNormalDistribution.value) {
    waterDistributedTrend.value = newValue - oldValue;
    previousWaterDistributed.value = newValue;
  }
});
</script>