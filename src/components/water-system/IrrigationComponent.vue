<template>
  <div class="irrigation">
    <h3 v-once>
      <i class="pi pi-seedling mr-2"></i>
      Système d'Irrigation
    </h3>
    <p>
      Eau utilisée: {{ formattedIrrigationWater }} m³
      <TrendArrow :trend="irrigationWaterTrend" />
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import TrendArrow from './TrendArrow.vue';

const props = defineProps<{
  irrigationWater: number;
}>();

const previousIrrigationWater = ref(props.irrigationWater);
const irrigationWaterTrend = ref(0);

const formattedIrrigationWater = computed(() => props.irrigationWater.toFixed(2));

watch(
  () => props.irrigationWater,
  (newValue, oldValue) => {
    irrigationWaterTrend.value = newValue - oldValue;
    previousIrrigationWater.value = newValue;
  },
);
</script>