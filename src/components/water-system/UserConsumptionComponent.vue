<template>
  <div class="user-consumption-component">
    <h3 v-once>
      <i class="pi pi-users mr-2"></i>
      Consommation des Utilisateurs
    </h3>
    <p>
      Total consommé: {{ formattedUserConsumption }} m³
      <TrendArrow :trend="userConsumptionTrend" />
    </p>
    <div class="consumption-indicator" :style="consumptionIndicatorStyle"></div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import TrendArrow from './TrendArrow.vue';

const props = defineProps<{
  userConsumption: number;
}>();

const previousUserConsumption = ref(props.userConsumption);
const userConsumptionTrend = ref(0);

const formattedUserConsumption = computed(() => props.userConsumption.toFixed(2));

const consumptionIndicatorStyle = computed(() => {
  const percentage = Math.min(100, (props.userConsumption / 1000) * 100);
  return {
    width: `${percentage}%`,
    backgroundColor: `hsl(${120 - percentage * 1.2}, 100%, 50%)`,
  };
});

watch(
  () => props.userConsumption,
  (newValue, oldValue) => {
    userConsumptionTrend.value = newValue - oldValue;
    previousUserConsumption.value = newValue;
  },
);
</script>

<style scoped>
.consumption-indicator {
  height: 10px;
  transition: all 0.3s ease;
}
</style>