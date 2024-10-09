<template>
  <div class="dam">
    <h3 v-once>
      <i class="pi pi-shield mr-2"></i>
      Barrage
    </h3>
    <div class="water-level" :style="{ height: `${waterLevel}%` }"></div>
    <p class="water-level-info">
      Niveau d'eau: {{ formattedWaterLevel }}%
      <TrendArrow :trend="waterLevelTrend" />
    </p>
    <div class="dam-controls">
      <input
        type="range"
        min="0"
        max="100"
        step="1"
        v-model.number="localWaterLevel"
        @input="updateWaterLevel"
        :disabled="isAutoMode"
      >
      <button @click="toggleAutoMode" class="btn btn--mode">
        {{ isAutoMode ? 'Mode manuel' : 'Mode automatique' }}
      </button>
      <button @click="resetSystem" class="btn btn--reset">RESET</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import TrendArrow from './TrendArrow.vue';

const props = defineProps<{
  waterLevel: number;
  isAutoMode: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:waterLevel', value: number): void;
  (e: 'toggleAutoMode'): void;
  (e: 'resetSystem'): void;
}>();

const localWaterLevel = ref(props.waterLevel);
const previousWaterLevel = ref(props.waterLevel);
const waterLevelTrend = ref(0);

const formattedWaterLevel = computed(() => props.waterLevel.toFixed(2));

watch(
  () => props.waterLevel,
  (newValue, oldValue) => {
    localWaterLevel.value = newValue;
    waterLevelTrend.value = newValue - oldValue;
    previousWaterLevel.value = newValue;
  },
);

const updateWaterLevel = () => {
  emit('update:waterLevel', localWaterLevel.value);
};

const toggleAutoMode = () => {
  emit('toggleAutoMode');
};

const resetSystem = () => {
  emit('resetSystem');
};
</script>
