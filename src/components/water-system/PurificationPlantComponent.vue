<template>
  <div class="purification-plant">
    <h3 v-once>
      <i class="pi pi-filter mr-2"></i>
      Station de Purification
    </h3>
    <p>
      Eau purifiée: {{ formattedPurifiedWater }} m³
      <TrendArrow :trend="purifiedWaterTrend" />
    </p>
    <div class="purification-indicator" :style="purificationIndicatorStyle"></div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import TrendArrow from './TrendArrow.vue';

const props = defineProps<{
  purifiedWater: number;
}>();

const previousPurifiedWater = ref(props.purifiedWater);
const purifiedWaterTrend = ref(0);

const formattedPurifiedWater = computed(() => props.purifiedWater.toFixed(2));

const purificationIndicatorStyle = computed(() => {
  const percentage = Math.min(100, (props.purifiedWater / 1000) * 100);
  return {
    width: `${percentage}%`,
    backgroundColor: `hsl(${percentage * 1.2}, 100%, 50%)`,
  };
});

watch(
  () => props.purifiedWater,
  (newValue, oldValue) => {
    purifiedWaterTrend.value = newValue - oldValue;
    previousPurifiedWater.value = newValue;
  },
);
</script>

<style scoped>
.purification-indicator {
  height: 10px;
  transition: all 0.3s ease;
}
</style>