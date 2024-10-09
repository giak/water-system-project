<template>
  <div class="wastewater-treatment">
    <h3 v-once>
      <i class="pi pi-refresh mr-2"></i>
      Traitement des Eaux Usées
    </h3>
    <p>
      Eau traitée: {{ formattedTreatedWastewater }} m³
      <TrendArrow :trend="treatedWastewaterTrend" />
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import TrendArrow from './TrendArrow.vue';

const props = defineProps<{
  treatedWastewater: number;
}>();

const previousTreatedWastewater = ref(props.treatedWastewater);
const treatedWastewaterTrend = ref(0);

const formattedTreatedWastewater = computed(() => props.treatedWastewater.toFixed(2));

watch(
  () => props.treatedWastewater,
  (newValue, oldValue) => {
    treatedWastewaterTrend.value = newValue - oldValue;
    previousTreatedWastewater.value = newValue;
  },
);
</script>