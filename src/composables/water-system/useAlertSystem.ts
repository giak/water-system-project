import { waterSystemConfig } from '@/config/waterSystemConfig';
import type { Alert, AlertPriority } from '@/types/waterSystem';
import { PriorityQueue } from '@datastructures-js/priority-queue';
import { format } from 'date-fns';
import { merge, Observable } from 'rxjs';
import { filter, map, tap } from 'rxjs/operators';
import { v4 as uuidv4 } from 'uuid';
import { computed, ref, watch } from 'vue';

const MAX_ALERTS = 1000;

type SharedObservables = {
  dam$: Observable<number>;
  // Ajoutez ici les autres observables partagés avec leurs types spécifiques
};

export function useAlertSystem(sharedObservables: SharedObservables) {
  const alertQueue = new PriorityQueue<Alert>((a, b) => {
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    }
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  });

  // Nouvelle Map pour un accès rapide aux alertes existantes
  const alertMap = new Map<string, Alert & { count: number }>();

  const alertsChanged = ref(0);

  function addAlert(message: string, priority: AlertPriority) {
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
        const removedAlert = alertQueue.dequeue();
        if (removedAlert) {
          alertMap.delete(`${removedAlert.priority}-${removedAlert.message}`);
        }
      }
    }

    alertsChanged.value += 1;
  }

  function groupSimilarAlerts(alert: Alert): Alert & { count: number } {
    const key = `${alert.priority}-${alert.message}`;
    const existingAlert = alertMap.get(key);

    if (existingAlert) {
      existingAlert.count += 1;
      existingAlert.timestamp = alert.timestamp;
      return existingAlert;
    }

    const newGroupedAlert = { ...alert, count: 1 };
    alertMap.set(key, newGroupedAlert);
    return newGroupedAlert;
  }

  const alerts = computed(() => {
    alertsChanged.value; // Pour forcer la réévaluation
    return Array.from(alertQueue.toArray());
  });

  const alertSystem$ = merge(
    sharedObservables.dam$.pipe(
      map((level) => {
        if (level >= waterSystemConfig.VERY_HIGH_WATER_LEVEL)
          return {
            message: 'Alerte : Niveau du barrage critique! (90%+)',
            priority: 'high' as const,
          };
        if (level >= waterSystemConfig.HIGH_WATER_LEVEL)
          return {
            message: 'Avertissement : Niveau du barrage élevé (80%+)',
            priority: 'medium' as const,
          };
        if (level <= waterSystemConfig.CRITICAL_WATER_LEVEL)
          return {
            message: 'Alerte : Niveau du barrage très bas! (20% ou moins)',
            priority: 'high' as const,
          };
        if (level <= waterSystemConfig.LOW_WATER_LEVEL)
          return {
            message: 'Avertissement : Niveau du barrage bas (30% ou moins)',
            priority: 'medium' as const,
          };
        return null;
      }),
      filter((alert): alert is Exclude<typeof alert, null> => alert !== null),
    ),
    // Ajoutez ici les autres sources d'alertes comme dans useWaterSystem.ts
  ).pipe(tap(({ message, priority }) => addAlert(message, priority)));

  const alertsObservable$ = new Observable<Alert[]>((subscriber) => {
    const unwatch = watch(
      alerts,
      (newAlerts) => {
        subscriber.next(newAlerts);
      },
      { immediate: true, deep: true },
    );

    return () => {
      unwatch();
    };
  });

  return {
    alerts,
    addAlert,
    alertSystem$,
    alertsObservable$,
  };
}
