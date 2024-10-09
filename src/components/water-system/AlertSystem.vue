<template>
  <div class="alert-system">
    <h3>
      <i class="pi pi-bell mr-2"></i>
      Système d'Alerte <span class="alert-count">({{ alerts.length }})</span>
    </h3>
    <div class="alert-columns">
      <div v-for="priority in ['high', 'medium', 'low']" :key="priority" :class="`alert-column ${priority}-priority`">
        <h4>{{ getPriorityLabel(priority) }}</h4>
        <div class="alert-container">
          <div class="pagination">
          <button @click="prevPage(priority)" :disabled="currentPage[priority] === 1">&lt; Précédent</button>
          <span>Page {{ currentPage[priority] }} / {{ totalPages(priority) }}</span>
          <button @click="nextPage(priority)" :disabled="currentPage[priority] === totalPages(priority)">Suivant &gt;</button>
        </div>
          <AlertItem 
            v-for="alert in paginatedAlerts(priority)" 
            :key="alert.id" 
            :alert="alert" 
            :is-recent="isRecentAlert(alert)" 
          />
        </div>
    
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, defineProps, ref } from 'vue';
import AlertItem from './AlertItem.vue';

interface Alert {
  id: string;
  message: string;
  timestamp: string;
  priority: 'high' | 'medium' | 'low';
}

const props = defineProps<{
  alerts: Alert[];
}>();

const itemsPerPage = 5;
const currentPage = ref({
  high: 1,
  medium: 1,
  low: 1,
});

const sortAlerts = (alerts: Alert[]) => {
  return [...alerts].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );
};

const filteredAlerts = computed(() => ({
  high: sortAlerts(props.alerts.filter((alert) => alert.priority === 'high')),
  medium: sortAlerts(props.alerts.filter((alert) => alert.priority === 'medium')),
  low: sortAlerts(props.alerts.filter((alert) => alert.priority === 'low')),
}));

const totalPages = (priority: string) =>
  Math.ceil(filteredAlerts.value[priority].length / itemsPerPage);

const paginatedAlerts = (priority: string) => {
  const start = (currentPage.value[priority] - 1) * itemsPerPage;
  const end = start + itemsPerPage;
  return filteredAlerts.value[priority].slice(start, end);
};

const nextPage = (priority: string) => {
  if (currentPage.value[priority] < totalPages(priority)) {
    currentPage.value[priority]++;
  }
};

const prevPage = (priority: string) => {
  if (currentPage.value[priority] > 1) {
    currentPage.value[priority]--;
  }
};

const isRecentAlert = (alert: Alert) => {
  const alertTime = new Date(alert.timestamp).getTime();
  const currentTime = new Date().getTime();
  const fiveMinutesAgo = currentTime - 5 * 60 * 1000;
  return alertTime > fiveMinutesAgo;
};

const getPriorityLabel = (priority: string) => {
  switch (priority) {
    case 'high':
      return 'Priorité Haute';
    case 'medium':
      return 'Priorité Moyenne';
    case 'low':
      return 'Priorité Basse';
    default:
      return '';
  }
};
</script>