<template>
  <div class="power-plant">
    <h3 v-once>
      <i class="pi pi-bolt mr-2"></i>
      Centrale Hydroélectrique
    </h3>
    <p>
      Énergie produite: {{ formattedPowerGenerated }} kWh
      <TrendArrow :trend="powerGeneratedTrend" />
    </p>
    <div class="power-indicator" :style="powerIndicatorStyle"></div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import TrendArrow from './TrendArrow.vue';

const props = defineProps<{
  powerGenerated: number;
}>();

const previousPowerGenerated = ref(props.powerGenerated);
const powerGeneratedTrend = ref(0);

const formattedPowerGenerated = computed(() => props.powerGenerated.toFixed(2));

const powerIndicatorStyle = computed(() => {
  const percentage = Math.min(100, (props.powerGenerated / 1000) * 100);
  return {
    width: `${percentage}%`,
    backgroundColor: `hsl(${120 * (percentage / 100)}, 100%, 50%)`,
  };
});

watch(
  () => props.powerGenerated,
  (newValue, oldValue) => {
    powerGeneratedTrend.value = newValue - oldValue;
    previousPowerGenerated.value = newValue;
  },
);
</script>

<style scoped>
.power-indicator {
  height: 10px;
  transition: all 0.3s ease;
}
</style>