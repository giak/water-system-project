<template>
  <div class="dam">
    <h3 v-once>
      <i class="pi pi-shield mr-2"></i>
      Barrage
    </h3>
    <div class="water-level" :style="{ height: `${currentWaterLevel}%` }"></div>
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
        :disabled="!isManualMode"
      >
      <button @click="toggleManualMode" :class="['btn', isManualMode ? 'btn--manual' : 'btn--auto']">
        {{ isManualMode ? 'Mode manuel' : 'Mode automatique' }}
      </button>
      <button @click="resetSystem" class="btn btn--reset">RESET</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import TrendArrow from './TrendArrow.vue';

const props = defineProps<{
  currentWaterLevel: number;
  isManualMode: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:water-level', value: number): void;
  (e: 'toggle-manual-mode'): void;
  (e: 'reset-system'): void;
}>();

const localWaterLevel = ref(props.currentWaterLevel);

const formattedWaterLevel = computed(() => props.currentWaterLevel.toFixed(2));

const waterLevelTrend = ref(0);

watch(() => props.currentWaterLevel, (newValue, oldValue) => {
  localWaterLevel.value = newValue;
  waterLevelTrend.value = newValue - oldValue;
});

const updateWaterLevel = () => {
  if (props.isManualMode) {
    emit('update:water-level', localWaterLevel.value);
  }
};

const toggleManualMode = () => {
  emit('toggle-manual-mode');
};

const resetSystem = () => {
  emit('reset-system');
};
</script>

<style scoped>
.btn--auto {
  background-color: #4CAF50;
  color: white;
}

.btn--manual {
  background-color: #f44336;
  color: white;
}
</style>
