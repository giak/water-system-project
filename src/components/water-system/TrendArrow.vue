<template>
  <span :class="arrowClass" :title="trendText">
    {{ arrowSymbol }}
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  trend: number;
}>();

const arrowSymbol = computed(() => {
  if (props.trend > 0) return '↑';
  if (props.trend < 0) return '↓';
  return '→';
});

const arrowClass = computed(() => {
  if (props.trend > 0) return 'trend-up';
  if (props.trend < 0) return 'trend-down';
  return 'trend-stable';
});

const trendText = computed(() => {
  if (props.trend > 0) return 'En augmentation';
  if (props.trend < 0) return 'En diminution';
  return 'Stable';
});
</script>