<template>
  <div class="alert-system">
    <h3>Système d'Alerte <span class="alert-count">({{ alerts.length }})</span></h3>
    <div class="alert-columns">
      <div class="alert-column high-priority">
        <h4>Priorité Haute</h4>
        <div class="alert-container">
          <AlertItem v-for="alert in sortedHighPriorityAlerts" :key="alert.timestamp" :alert="alert" :is-recent="isRecentAlert(alert)" />
        </div>
      </div>
      <div class="alert-column medium-priority">
        <h4>Priorité Moyenne</h4>
        <div class="alert-container">
          <AlertItem v-for="alert in sortedMediumPriorityAlerts" :key="alert.timestamp" :alert="alert" :is-recent="isRecentAlert(alert)" />
        </div>
      </div>
      <div class="alert-column low-priority">
        <h4>Priorité Basse</h4>
        <div class="alert-container">
          <AlertItem v-for="alert in sortedLowPriorityAlerts" :key="alert.timestamp" :alert="alert" :is-recent="isRecentAlert(alert)" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import AlertItem from './AlertItem.vue';

interface Alert {
  message: string;
  timestamp: string;
  priority: 'high' | 'medium' | 'low';
}

const props = defineProps<{
  alerts: Alert[];
}>();

const sortAlerts = (alerts: Alert[]) => {
  return [...alerts].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );
};

const sortedHighPriorityAlerts = computed(() =>
  sortAlerts(props.alerts.filter((alert) => alert.priority === 'high')),
);
const sortedMediumPriorityAlerts = computed(() =>
  sortAlerts(props.alerts.filter((alert) => alert.priority === 'medium')),
);
const sortedLowPriorityAlerts = computed(() =>
  sortAlerts(props.alerts.filter((alert) => alert.priority === 'low')),
);

const isRecentAlert = (alert: Alert) => {
  const alertTime = new Date(alert.timestamp).getTime();
  const currentTime = new Date().getTime();
  const fiveMinutesAgo = currentTime - 5 * 60 * 100;
  return alertTime > fiveMinutesAgo;
};
</script>