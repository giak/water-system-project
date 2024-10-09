<template>
  <div class="purification-plant">
    <h3>
      <i class="pi pi-filter mr-2"></i>
      Station de Purification
    </h3>
    <p>
      Eau purifiée: {{ purifiedWater.toFixed(2) }} m³
      <TrendArrow :trend="purifiedWaterTrend" />
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import TrendArrow from './TrendArrow.vue';

const props = defineProps<{
  purifiedWater: number;
}>();

const previousPurifiedWater = ref(props.purifiedWater);
const purifiedWaterTrend = ref(0);

watch(() => props.purifiedWater, (newValue, oldValue) => {
  purifiedWaterTrend.value = newValue - oldValue;
  previousPurifiedWater.value = newValue;
});
</script>