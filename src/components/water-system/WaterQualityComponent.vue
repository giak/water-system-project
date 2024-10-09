<template>
  <div class="water-quality">
    <h3>
      <i class="pi pi-check-circle mr-2"></i>
      Qualité de l'Eau
    </h3>
    <p>
      Indice de qualité: {{ waterQuality.toFixed(2) }}%
      <TrendArrow :trend="waterQualityTrend" />
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import TrendArrow from './TrendArrow.vue';

const props = defineProps<{
  waterQuality: number;
}>();

const previousWaterQuality = ref(props.waterQuality);
const waterQualityTrend = ref(0);

watch(() => props.waterQuality, (newValue, oldValue) => {
  waterQualityTrend.value = newValue - oldValue;
  previousWaterQuality.value = newValue;
});
</script>