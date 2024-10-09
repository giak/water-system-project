<template>
  <div class="power-plant">
    <h3>
      <i class="pi pi-bolt mr-2"></i>
      Centrale Hydroélectrique
    </h3>
    <p>
      Énergie produite: {{ powerGenerated.toFixed(2) }} kWh
      <TrendArrow :trend="powerGeneratedTrend" />
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import TrendArrow from './TrendArrow.vue';

const props = defineProps<{
  powerGenerated: number;
}>();

const previousPowerGenerated = ref(props.powerGenerated);
const powerGeneratedTrend = ref(0);

watch(() => props.powerGenerated, (newValue, oldValue) => {
  powerGeneratedTrend.value = newValue - oldValue;
  previousPowerGenerated.value = newValue;
});
</script>