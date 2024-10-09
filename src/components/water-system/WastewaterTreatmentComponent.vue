<template>
  <div class="wastewater-treatment">
    <h3>
      <i class="pi pi-refresh mr-2"></i>
      Traitement des Eaux Usées
    </h3>
    <p>
      Eau traitée: {{ treatedWastewater.toFixed(2) }} m³
      <TrendArrow :trend="treatedWastewaterTrend" />
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import TrendArrow from './TrendArrow.vue';

const props = defineProps<{
  treatedWastewater: number;
}>();

const previousTreatedWastewater = ref(props.treatedWastewater);
const treatedWastewaterTrend = ref(0);

watch(() => props.treatedWastewater, (newValue, oldValue) => {
  treatedWastewaterTrend.value = newValue - oldValue;
  previousTreatedWastewater.value = newValue;
});
</script>