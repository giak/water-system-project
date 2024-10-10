<template>
  <div class="water-system__controls">
    <div class="water-system__slider">
      <span>0%</span>
      <input
        type="range"
        min="0"
        max="100"
        step="1"
        :value="currentWaterLevel"
        @input="updateWaterLevel"
        :disabled="!isManualMode"
      >
      <span>100%</span>
    </div>
    <div class="water-system__buttons">
      <button @click="toggleManualMode">
        {{ isManualMode ? 'Mode Automatique' : 'Mode Manuel' }}
      </button>
      <button @click="resetSystem">Réinitialiser</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  currentWaterLevel: number;
  isManualMode: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:waterLevel', value: number): void;
  (e: 'toggleManualMode'): void;
  (e: 'resetSystem'): void;
}>();

const updateWaterLevel = (event: Event) => {
  const target = event.target as HTMLInputElement;
  emit('update:waterLevel', Number(target.value));
};

const toggleManualMode = () => {
  emit('toggleManualMode');
};

const resetSystem = () => {
  emit('resetSystem');
};
</script>