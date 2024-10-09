<template>
  <div class="alert-item" :class="[alert.priority, { 'recent': isRecent }]">
    <div class="alert-timestamp">{{ alert.timestamp }}</div>
    <div class="alert-message" :class="{ 'bold': isRecent }">{{ alert.message }}</div>
  </div>
</template>

<script setup lang="ts">
interface Alert {
  message: string;
  timestamp: string;
  priority: 'high' | 'medium' | 'low';
}

defineProps<{
  alert: Alert;
  isRecent: boolean;
}>();
</script>