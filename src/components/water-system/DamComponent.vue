<template>
  <div class="dam">
    <h3 v-once>
      <i class="pi pi-shield mr-2"></i>
      Barrage
    </h3>
    <div class="water-level" :style="{ height: `${currentWaterLevel}%` }"></div>
    <p class="water-level-info" :class="waterLevelStatusClass">
      Niveau d'eau: {{ formattedWaterLevel }}%
      <TrendArrow :trend="waterLevelTrend" />
    </p>
    <p class="water-volume-info">
      Volume d'eau: {{ formattedWaterVolume }} m³
      <TrendArrow :trend="waterVolumeTrend" />
    </p>
    <p class="glacier-inflow-info">
      Apport du glacier: {{ formattedGlacierInflow }} m³/h
      <TrendArrow :trend="glacierInflowTrend" />
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
import { waterSystemConfig } from '@/config/waterSystemConfig';
import { computed, ref, watch } from 'vue';
import TrendArrow from './TrendArrow.vue';

const props = defineProps<{
  currentWaterLevel: number;
  isManualMode: boolean;
  glacierInflow: number;
  waterVolume: number;
}>();

const emit = defineEmits<{
  (e: 'update:water-level', value: number): void;
  (e: 'toggle-manual-mode'): void;
  (e: 'reset-system'): void;
}>();

const localWaterLevel = ref(props.currentWaterLevel);

const formattedWaterLevel = computed(() => props.currentWaterLevel.toFixed(2));
const formattedGlacierInflow = computed(() => props.glacierInflow.toFixed(2));
const formattedWaterVolume = computed(() => props.waterVolume.toFixed(2));

const waterLevelTrend = ref(0);
const glacierInflowTrend = ref(0);
const waterVolumeTrend = ref(0);

const waterLevelStatusClass = computed(() => {
  if (props.currentWaterLevel >= waterSystemConfig.VERY_HIGH_WATER_LEVEL) return 'critical';
  if (props.currentWaterLevel >= waterSystemConfig.HIGH_WATER_LEVEL) return 'warning';
  if (props.currentWaterLevel <= waterSystemConfig.CRITICAL_WATER_LEVEL) return 'critical';
  if (props.currentWaterLevel <= waterSystemConfig.LOW_WATER_LEVEL) return 'warning';
  return '';
});

watch(
  () => props.currentWaterLevel,
  (newValue, oldValue) => {
    localWaterLevel.value = newValue;
    waterLevelTrend.value = newValue - oldValue;
  },
);

watch(
  () => props.glacierInflow,
  (newValue, oldValue) => {
    glacierInflowTrend.value = newValue - oldValue;
  },
);

watch(
  () => props.waterVolume,
  (newValue, oldValue) => {
    waterVolumeTrend.value = newValue - oldValue;
  },
);

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
.water-level-info.critical {
  color: red;
  font-weight: bold;
}

.water-level-info.warning {
  color: orange;
  font-weight: bold;
}

.glacier-inflow-info {
  z-index: 100;
  margin: 30px 0 0 30px;
  width: 100%;
  font-style: italic;
}

.water-volume-info {
  position: absolute;
  z-index: 100;
  top: 70px; 
  left: 10px;
  background-color: rgba(255, 255, 255, 0.7);
  padding: 5px;
  border-radius: 5px;
}
</style>