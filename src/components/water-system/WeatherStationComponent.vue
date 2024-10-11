<template>
  <div class="weather-station-component">
    <h3 v-once>
      <i class="pi pi-sun mr-2"></i>
      Station Météo
    </h3>
    <p>
      Conditions: {{ weatherCondition }}
      <span :title="changeText" class="weather-change">{{ changeSymbol }}</span>
    </p>
  </div>
</template>

<script setup lang="ts">
import type { WeatherCondition } from '@/types/waterSystem';
import { computed, ref, watch } from 'vue';

const props = defineProps<{
  weatherCondition: WeatherCondition;
}>();

const previousWeather = ref(props.weatherCondition);
const hasChanged = ref(false);

const changeSymbol = computed(() => (hasChanged.value ? '🔄' : ''));
const changeText = computed(() =>
  hasChanged.value ? 'Conditions changées' : 'Conditions stables',
);

watch(
  () => props.weatherCondition,
  (newValue, oldValue) => {
    hasChanged.value = newValue !== oldValue;
    previousWeather.value = newValue;
  },
);

const getWeatherIcon = computed(() => {
  switch (props.weatherCondition) {
    case 'ensoleillé':
      return '☀️';
    case 'nuageux':
      return '☁️';
    case 'pluvieux':
      return '🌧️';
    case 'orageux':
      return '⛈️';
    default:
      return '❓';
  }
});

const formattedWeatherCondition = computed(() => {
  return `${getWeatherIcon.value} ${props.weatherCondition}`;
});
</script>

<style scoped>
.weather-change {
  margin-left: 5px;
  font-size: 1.2em;
}
</style>