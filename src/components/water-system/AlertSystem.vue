<template>
  <div class="alert-system">
    <h3 v-once>
      <i class="pi pi-bell mr-2"></i>
      Système d'Alerte
    </h3>
    <p>Nombre d'alertes : {{ alerts.length }}</p>
    <div class="alert-columns">
      <div v-for="priority in priorities" :key="priority" :class="`alert-column ${priority}-priority`">
        <h4>{{ getPriorityLabel(priority) }}</h4>
        <div class="alert-container">
          <div class="pagination">
            <button @click="prevPage(priority)" :disabled="currentPage[priority] === 1">&lt; Précédent</button>
            <span>Page {{ currentPage[priority] }} / {{ Math.max(1, totalPages[priority]) }}</span>
            <button @click="nextPage(priority)" :disabled="currentPage[priority] >= totalPages[priority]">Suivant &gt;</button>
          </div>
          <TransitionGroup name="alert-list">
            <AlertItem 
              v-for="alert in paginatedAlerts[priority]" 
              :key="alert.id" 
              :alert="alert" 
              :is-recent="isRecentAlert(alert)"
            />
          </TransitionGroup>
          <p v-if="paginatedAlerts[priority].length === 0">Aucune alerte pour cette priorité.</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import AlertItem from './AlertItem.vue';
import type { Alert } from '@/types/waterSystem';

const props = defineProps<{
  alerts: Alert[];
}>();

const priorities = ['high', 'medium', 'low'] as const;
const itemsPerPage = 5;

const currentPage = ref({
  high: 1,
  medium: 1,
  low: 1,
});

const filteredAlerts = computed(() => {
  return priorities.reduce((acc, priority) => {
    acc[priority] = props.alerts.filter(alert => alert.priority === priority);
    return acc;
  }, {} as Record<typeof priorities[number], Alert[]>);
});

const totalPages = computed(() => {
  return priorities.reduce((acc, priority) => {
    acc[priority] = Math.max(1, Math.ceil(filteredAlerts.value[priority].length / itemsPerPage));
    return acc;
  }, {} as Record<typeof priorities[number], number>);
});

const paginatedAlerts = computed(() => {
  return priorities.reduce((acc, priority) => {
    const start = (currentPage.value[priority] - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    acc[priority] = filteredAlerts.value[priority].slice(start, end);
    return acc;
  }, {} as Record<typeof priorities[number], Alert[]>);
});

const prevPage = (priority: typeof priorities[number]) => {
  if (currentPage.value[priority] > 1) {
    currentPage.value[priority]--;
  }
};

const nextPage = (priority: typeof priorities[number]) => {
  if (currentPage.value[priority] < totalPages.value[priority]) {
    currentPage.value[priority]++;
  }
};

const getPriorityLabel = (priority: typeof priorities[number]) => {
  switch (priority) {
    case 'high': return 'Haute priorité';
    case 'medium': return 'Priorité moyenne';
    case 'low': return 'Basse priorité';
  }
};

const isRecentAlert = (alert: Alert) => {
  const now = new Date();
  const alertTime = new Date(alert.timestamp);
  return now.getTime() - alertTime.getTime() < 5000; // 5 secondes
};

watch(() => props.alerts, () => {
  for (const priority of priorities) {
    currentPage.value[priority] = 1;
  }
}, { deep: true });
</script>

<style scoped>
.alert-list-enter-active,
.alert-list-leave-active {
  transition: all 0.5s ease;
}
.alert-list-enter-from,
.alert-list-leave-to {
  opacity: 0;
  transform: translateX(30px);
}
</style>