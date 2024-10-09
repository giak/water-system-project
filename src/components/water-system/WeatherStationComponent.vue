<template>
  <div class="weather-station">
    <h3>Station Météo</h3>
    <p>
      Conditions: {{ weatherCondition }}
      <span :title="changeText" class="weather-change">{{ changeSymbol }}</span>
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue';

const props = defineProps<{
  weatherCondition: string;
}>();

const previousWeather = ref(props.weatherCondition);
const hasChanged = ref(false);

const changeSymbol = computed(() => hasChanged.value ? '🔄' : '');
const changeText = computed(() => hasChanged.value ? 'Conditions changées' : 'Conditions stables');

watch(() => props.weatherCondition, (newValue, oldValue) => {
  hasChanged.value = newValue !== oldValue;
  previousWeather.value = newValue;
});
</script>