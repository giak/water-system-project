import type { Alert } from '@/types/waterSystem';
import { PriorityQueue } from '@datastructures-js/priority-queue';
import { format } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';
import { computed, ref } from 'vue';

const MAX_ALERTS = 1000;

export function useAlertSystem() {
  const alertQueue = new PriorityQueue<Alert>((a, b) => {
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    }
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  });

  const alertsChanged = ref(0);

  function addAlert(message: string, priority: Alert['priority']) {
    const timestamp = format(new Date(), 'yyyy-MM-dd HH:mm:ss');
    const newAlert: Alert = {
      id: uuidv4(),
      message,
      timestamp,
      priority,
    };

    const groupedAlert = groupSimilarAlerts(newAlert);

    if (groupedAlert.count === 1) {
      alertQueue.enqueue(groupedAlert);
      if (alertQueue.size() > MAX_ALERTS) {
        alertQueue.dequeue();
      }
    }

    alertsChanged.value += 1;
  }

  function groupSimilarAlerts(alert: Alert): Alert & { count?: number } {
    const existingAlert = Array.from(alertQueue.toArray()).find(
      (a) => a.priority === alert.priority && a.message === alert.message,
    ) as (Alert & { count?: number }) | undefined;

    if (existingAlert) {
      existingAlert.count = (existingAlert.count || 1) + 1;
      existingAlert.timestamp = alert.timestamp;
      return existingAlert;
    }

    return { ...alert, count: 1 };
  }

  const alerts = computed(() => {
    alertsChanged.value; // Pour forcer la réévaluation
    return Array.from(alertQueue.toArray());
  });

  return {
    alerts,
    addAlert,
  };
}
