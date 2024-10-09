import { ref, onMounted, onUnmounted, watch } from 'vue';
import { interval, Subject, merge, Observable, combineLatest } from 'rxjs';
import { map, filter, take, mergeMap, share, scan, debounceTime, distinctUntilChanged, withLatestFrom } from 'rxjs/operators';
import { format } from 'date-fns';

interface Alert {
  message: string;
  timestamp: string;
  priority: 'high' | 'medium' | 'low';
}

export function useWaterSystem() {
  // États réactifs
  const waterLevel = ref(50); // Commencer avec un niveau d'eau moyen
  const purifiedWater = ref(0);
  const powerGenerated = ref(0);
  const waterDistributed = ref(0);
  const weatherCondition = ref('ensoleillé');
  const alerts = ref<Alert[]>([]);
  const irrigationWater = ref(0);
  const treatedWastewater = ref(0);
  const waterQuality = ref(90); // Commencer avec une bonne qualité d'eau
  const floodRisk = ref(10); // Risque initial faible
  const userConsumption = ref(0);
  const isAutoMode = ref(true);

  // Sources de données
  const waterSource$ = new Subject<number>();
  const weatherSource$ = new Subject<string>();
  const wastewaterSource$ = new Subject<number>();
  const userConsumptionSource$ = new Subject<number>();

  // Simulation des conditions météorologiques
  const weatherSimulation$ = interval(10000).pipe(
    map(() => {
      const conditions = ['ensoleillé', 'nuageux', 'pluvieux', 'orageux'];
      const randomIndex = Math.floor(Math.random() * conditions.length);
      return conditions[randomIndex];
    })
  );

  // Modifions le barrage pour permettre des niveaux d'eau plus bas
  const dam$ = combineLatest([waterSource$, weatherSource$]).pipe(
    map(([level, weather]) => {
      let adjustedLevel = level;
      if (weather === 'pluvieux') adjustedLevel *= 1.1;
      if (weather === 'orageux') adjustedLevel *= 1.3;
      if (weather === 'ensoleillé') adjustedLevel *= 0.9; // Réduction en cas de beau temps
      return Math.max(0, Math.min(adjustedLevel, 100)); // Assurons-nous que le niveau ne descend pas en dessous de 0
    }),
    share()
  );

  // Station de purification avec efficacité variable
  const purificationPlant$ = dam$.pipe(
    filter(level => level > 20),
    map(water => {
      const efficiency = 0.5 + (Math.random() * 0.3); // Efficacité entre 50% et 80%
      return water * efficiency;
    }),
    mergeMap(water => interval(1000).pipe(
      take(5),
      map(() => water / 5)
    ))
  );

  // Centrale hydroélectrique avec rendement variable
  const powerPlant$ = dam$.pipe(
    filter(level => level > 30),
    map(water => {
      const efficiency = 0.7 + (Math.random() * 0.2); // Rendement entre 70% et 90%
      return water * 0.4 * efficiency * 10;
    })
  );

  // Système d'irrigation influencé par la météo
  const irrigation$ = combineLatest([purificationPlant$, weatherSource$]).pipe(
    map(([water, weather]) => {
      let irrigationNeed = water * 0.3;
      if (weather === 'ensoleillé') irrigationNeed *= 1.2;
      if (weather === 'pluvieux') irrigationNeed *= 0.5;
      return irrigationNeed;
    }),
    scan((acc, value) => acc + value, 0)
  );

  // Traitement des eaux usées avec efficacité variable
  const wastewaterTreatment$ = wastewaterSource$.pipe(
    map(wastewater => {
      const efficiency = 0.6 + (Math.random() * 0.3); // Efficacité entre 60% et 90%
      return wastewater * efficiency;
    }),
    scan((acc, value) => acc + value, 0)
  );

  // Contrôle de la qualité de l'eau
  const waterQualityControl$ = combineLatest([purificationPlant$, wastewaterTreatment$, weatherSource$]).pipe(
    map(([purified, treated, weather]) => {
      let qualityScore = (purified / (purified + treated)) * 100;
      if (weather === 'orageux') qualityScore *= 0.9; // La qualité diminue lors des orages
      return Math.max(0, Math.min(100, qualityScore));
    })
  );

  // Système de prévision des inondations
  const floodPrediction$ = combineLatest([dam$, weatherSource$]).pipe(
    map(([waterLevel, weather]) => {
      let risk = 0;
      if (weather === 'pluvieux') risk += 20;
      if (weather === 'orageux') risk += 40;
      if (waterLevel > 80) risk += 30;
      if (waterLevel > 90) risk += 20;
      return Math.min(100, risk);
    })
  );

  // Gestion de la consommation d'eau des utilisateurs
  const userWaterManagement$ = combineLatest([userConsumptionSource$, waterQualityControl$, weatherSource$]).pipe(
    map(([consumption, quality, weather]) => {
      let adjustedConsumption = consumption;
      if (quality < 50) adjustedConsumption *= 0.8; // Réduction si la qualité est mauvaise
      if (weather === 'ensoleillé') adjustedConsumption *= 1.2; // Augmentation par temps chaud
      return adjustedConsumption;
    }),
    scan((acc, value) => acc + value, 0)
  );

  // Ajustons la distribution d'eau en fonction du niveau d'eau
  const waterDistribution$ = dam$.pipe(
    map(level => {
      if (level > 70) {
        return level * 0.8; // Distribution effective
      } else if (level > 30) {
        return level * 0.5; // Distribution réduite
      } else {
        return level * 0.2; // Distribution minimale
      }
    }),
    scan((acc, value) => acc + value, 0)
  );

  // Système de surveillance et d'alerte
  const alertSystem$ = merge(
    dam$.pipe(
      filter(level => level > 90),
      map(() => ({ message: "Alerte : Niveau du barrage critique!", priority: 'high' as const }))
    ),
    weatherSource$.pipe(
      filter(condition => condition === 'orageux'),
      map(() => ({ message: "Alerte : Conditions météorologiques dangereuses!", priority: 'medium' as const }))
    ),
    purificationPlant$.pipe(
      scan((acc, value) => acc + value, 0),
      filter(total => total < 100),
      debounceTime(5000),
      map(() => ({ message: "Alerte : Production d'eau purifiée faible!", priority: 'medium' as const }))
    ),
    waterQualityControl$.pipe(
      filter(quality => quality < 60),
      map(() => ({ message: "Alerte : Qualité de l'eau en dessous des normes!", priority: 'high' as const }))
    ),
    floodPrediction$.pipe(
      filter(risk => risk > 80),
      map(() => ({ message: "Alerte : Risque élevé d'inondation!", priority: 'high' as const }))
    ),
    dam$.pipe(
      filter(level => level < 30),
      map(() => ({ message: "Alerte : Niveau d'eau critique, distribution limitée!", priority: 'high' as const }))
    ),
    dam$.pipe(
      filter(level => level > 70),
      map(() => ({ message: "Information : Distribution d'eau effective.", priority: 'low' as const }))
    ),
    dam$.pipe(
      filter(level => level <= 70 && level > 30),
      map(() => ({ message: "Alerte : Distribution d'eau réduite.", priority: 'medium' as const }))
    ),
    dam$.pipe(
      filter(level => level <= 30),
      map(() => ({ message: "Alerte : Distribution d'eau minimale !", priority: 'high' as const }))
    )
  );

  let subscriptions: any[] = [];

  function resetSystem() {
    waterLevel.value = 50;
    purifiedWater.value = 0;
    powerGenerated.value = 0;
    waterDistributed.value = 0;
    weatherCondition.value = 'ensoleillé';
    alerts.value = [];
    irrigationWater.value = 0;
    treatedWastewater.value = 0;
    waterQuality.value = 90;
    floodRisk.value = 10;
    userConsumption.value = 0;

    // Réinitialiser les sources de données
    waterSource$.next(50);
    weatherSource$.next('ensoleillé');
    wastewaterSource$.next(0);
    userConsumptionSource$.next(0);
  }

  function setWaterLevel(level: number) {
    waterLevel.value = level;
    waterSource$.next(level);
  }

  function toggleAutoMode() {
    isAutoMode.value = !isAutoMode.value;
    if (isAutoMode.value) {
      startSimulation();
    } else {
      stopSimulation();
    }
  }

  let simulationInterval: number | null = null;

  function startSimulation() {
    if (simulationInterval) return;
    simulationInterval = setInterval(() => {
      const baseWaterInput = 40 + (Math.random() * 40 - 20);
      const seasonalFactor = 1 + 0.3 * Math.sin(Date.now() / (1000 * 60 * 60 * 24 * 30));
      waterSource$.next(baseWaterInput * seasonalFactor);
      
      // ... autres simulations (wastewater, userConsumption)
    }, 2000);
  }

  function stopSimulation() {
    if (simulationInterval) {
      clearInterval(simulationInterval);
      simulationInterval = null;
    }
  }

  onMounted(() => {
    subscriptions = [
      dam$.subscribe(level => waterLevel.value = level),
      purificationPlant$.subscribe(water => purifiedWater.value += water),
      powerPlant$.subscribe(power => powerGenerated.value += power),
      irrigation$.subscribe(water => irrigationWater.value = water),
      wastewaterTreatment$.subscribe(water => treatedWastewater.value = water),
      waterQualityControl$.subscribe(quality => waterQuality.value = quality),
      floodPrediction$.subscribe(risk => floodRisk.value = risk),
      userWaterManagement$.subscribe(consumption => userConsumption.value = consumption),
      alertSystem$.subscribe(({ message, priority }) => {
        const timestamp = format(new Date(), 'yyyy-MM-dd HH:mm:ss');
        alerts.value.push({ message, timestamp, priority });
      }),
      weatherSimulation$.subscribe(weather => {
        weatherCondition.value = weather;
        weatherSource$.next(weather);
      }),
      waterDistribution$.subscribe(water => waterDistributed.value = water)
    ];

    if (isAutoMode.value) {
      startSimulation();
    }
  });

  onUnmounted(() => {
    subscriptions.forEach(sub => sub.unsubscribe());
    stopSimulation();
  });

  return {
    waterLevel,
    purifiedWater,
    powerGenerated,
    waterDistributed,
    weatherCondition,
    alerts,
    irrigationWater,
    treatedWastewater,
    waterQuality,
    floodRisk,
    userConsumption,
    resetSystem,
    setWaterLevel,
    isAutoMode,
    toggleAutoMode
  };
}