<template>
  <div class="distribution" :class="distributionClass">
    <h3 v-once>
      <i class="pi pi-share-alt mr-2"></i>
      Distribution d'Eau
    </h3>
    <div class="distribution-info">
      <div class="info-label" v-once>Eau distribuée :</div>
      <div class="info-value">
        {{ formattedWaterDistributed }} m³
        <TrendArrow v-if="showTrend" :trend="waterDistributedTrend" />
      </div>
    </div>
    <div class="distribution-status">
      <p v-if="isLowWater" class="alert">
        ⚠️ Niveau d'eau critique ! Distribution limitée.
      </p>
      <p v-else-if="isEffectiveDistribution" class="info">
        ✅ Distribution d'eau effective.
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import TrendArrow from './TrendArrow.vue';

const props = defineProps<{
  waterDistributed: number;
  waterLevel: number;
}>();

const previousWaterDistributed = ref(props.waterDistributed);
const waterDistributedTrend = ref(0);

const isLowWater = computed(() => props.waterLevel < 30);
const isEffectiveDistribution = computed(() => props.waterLevel > 70);

const showTrend = computed(() => !isLowWater.value);

const formattedWaterDistributed = computed(() => props.waterDistributed.toFixed(2));

const distributionClass = computed(() => {
  if (isLowWater.value) return 'low-water';
  if (isEffectiveDistribution.value) return 'effective-distribution';
  return '';
});

watch(
  () => props.waterDistributed,
  (newValue, oldValue) => {
    waterDistributedTrend.value = newValue - oldValue;
    previousWaterDistributed.value = newValue;
  },
);
</script>