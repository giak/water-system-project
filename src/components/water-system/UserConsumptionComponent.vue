<template>
  <div class="user-consumption">
    <h3>
      <i class="pi pi-users mr-2"></i>
      Consommation des Utilisateurs
    </h3>
    <p>
      Total consommé: {{ userConsumption.toFixed(2) }} m³
      <TrendArrow :trend="userConsumptionTrend" />
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import TrendArrow from './TrendArrow.vue';

const props = defineProps<{
  userConsumption: number;
}>();

const previousUserConsumption = ref(props.userConsumption);
const userConsumptionTrend = ref(0);

watch(() => props.userConsumption, (newValue, oldValue) => {
  userConsumptionTrend.value = newValue - oldValue;
  previousUserConsumption.value = newValue;
});
</script>