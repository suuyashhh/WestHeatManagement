import { Injectable, signal, computed } from '@angular/core';

export type StorageDurationOption = 5 | 300; // 5 seconds or 5 minutes (300s)
export type AllocationMode = 'AUTOMATIC_SEQUENTIAL' | 'MANUAL_SELECTION';
export type TankStatus = 'CHARGING' | 'DISCHARGING' | 'STANDBY' | 'FULL' | 'STORED';

export interface StorageTank {
  id: number;
  name: string;
  capacityKwh: number;
  storedEnergyKwh: number;
  fillPercentage: number;
  temperatureC: number;
  status: TankStatus;
}

export type ConsumerStatus =
  | 'ACTIVE'
  | 'RECEIVING'
  | 'PAUSED'
  | 'COMPLETED'
  | 'WAITING'
  | 'NO ENERGY AVAILABLE';

export type SourceTankSelection = 'AUTO' | number;

export interface HeatConsumer {
  id: string;
  name: string;
  company: string;
  contactPerson: string;
  phone: string;
  email: string;
  location: string;
  requiredEnergyKwh: number;
  maxHeatRateKw: number;
  deliveryRateKw: number;
  preferredTank: SourceTankSelection;
  activeSourceTankId: number | null;
  deliveredEnergyKwh: number;
  supplyDurationHours: number;
  status: ConsumerStatus;
  pricePerKwh: number;
  temperatureC: number;
  createdAt: string;
  autoSourceSelection: boolean;
  imageUrl?: string;
}

export interface DeliveryHistoryRecord {
  id: string;
  consumerId: string;
  consumerName: string;
  date: string;
  startTime: string;
  endTime: string;
  energyDeliveredKwh: number;
  avgDeliveryRateKw: number;
  sourceTank: string;
  pricePerKwh: number;
  totalAmount: number;
  status: string;
}

export interface SystemNotification {
  id: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'alert';
  timestamp: string;
}

@Injectable({
  providedIn: 'root'
})
export class WasteHeatService {
  // 1. Heat Output Power in kW (0 kW to 5 kW, Default: 1.0 kW)
  readonly heatOutputKw = signal<number>(1.0);

  // 2. Server Exhaust Temperature in °C (Independent parameter, fixed at 70°C)
  readonly temperatureC = signal<number>(70);

  // 3. Storage Duration Window (5 seconds or 300 seconds, Default: 300 seconds)
  readonly durationSeconds = signal<StorageDurationOption>(300);

  // 4. Theoretical Window Energy Calculations (per duration window):
  // Energy (kJ) = Heat Power (kW) × Time (seconds)
  readonly incomingThermalEnergyKj = computed(() => {
    return this.heatOutputKw() * this.durationSeconds();
  });

  // Energy (kWh) = Energy (kJ) / 3600
  readonly incomingThermalEnergyKwh = computed(() => {
    return this.incomingThermalEnergyKj() / 3600;
  });

  readonly energyKj = this.incomingThermalEnergyKj;
  readonly energyKwh = this.incomingThermalEnergyKwh;

  // 5. System Operational Status
  readonly status = computed(() => {
    if (this.heatOutputKw() <= 0) return 'Standby / Idle';
    if (this.isAllStorageFull()) return 'Storage Full / Halted';
    return 'Heat Generation Active';
  });

  // 6. Heat Intensity Ratio for visual animations & styles (0.0 to 1.0)
  readonly heatIntensityRatio = computed(() => {
    return Math.min(Math.max(this.heatOutputKw() / 5.0, 0), 1.0);
  });

  // 7. Human-readable duration label
  readonly durationLabel = computed(() => {
    return this.durationSeconds() === 5 ? '5 Seconds' : '5 Minutes';
  });

  // =========================================================================
  // STORAGE SYSTEM & TANKS STATE
  // =========================================================================

  // Storage Allocation Mode: Automatic Sequential (default) vs Manual Selection
  readonly allocationMode = signal<AllocationMode>('AUTOMATIC_SEQUENTIAL');

  // Manual selected tank ID (1 to 4)
  readonly manualSelectedTankId = signal<number>(1);

  // Priority order for filling (array of tank IDs, default: [1, 2, 3, 4])
  readonly priorityOrder = signal<number[]>([1, 2, 3, 4]);

  // Simulation Speed Multiplier (1x = real time, 10x = fast demo, 60x = rapid presentation)
  readonly simulationSpeed = signal<number>(10);

  // Simulation Running State (Play/Pause charging & simulation loop)
  readonly isSimulationRunning = signal<boolean>(true);

  // The 4 storage vessels with pre-seeded realistic energy levels (Requirement 6 & 15)
  readonly tanks = signal<StorageTank[]>([
    {
      id: 1,
      name: 'TANK 01',
      capacityKwh: 10.0,
      storedEnergyKwh: 8.0,
      fillPercentage: 80.0,
      temperatureC: 70,
      status: 'STORED'
    },
    {
      id: 2,
      name: 'TANK 02',
      capacityKwh: 20.0,
      storedEnergyKwh: 15.0,
      fillPercentage: 75.0,
      temperatureC: 70,
      status: 'STORED'
    },
    {
      id: 3,
      name: 'TANK 03',
      capacityKwh: 15.0,
      storedEnergyKwh: 5.0,
      fillPercentage: 33.33,
      temperatureC: 70,
      status: 'STORED'
    },
    {
      id: 4,
      name: 'TANK 04',
      capacityKwh: 25.0,
      storedEnergyKwh: 0.0,
      fillPercentage: 0.0,
      temperatureC: 70,
      status: 'STANDBY'
    }
  ]);

  // Total Storage Capacity (sum of all 4 tanks)
  readonly totalStorageCapacityKwh = computed(() => {
    return this.tanks().reduce((sum, t) => sum + t.capacityKwh, 0);
  });

  // Total Stored Thermal Energy across all 4 tanks
  readonly totalStoredEnergyKwh = computed(() => {
    return this.tanks().reduce((sum, t) => sum + t.storedEnergyKwh, 0);
  });

  // Total Storage Fill Level (%)
  readonly totalStorageLevelPercent = computed(() => {
    const cap = this.totalStorageCapacityKwh();
    if (cap <= 0) return 0;
    return Math.min(100, (this.totalStoredEnergyKwh() / cap) * 100);
  });

  // Check if all tanks are 100% full
  readonly isAllStorageFull = computed(() => {
    return this.tanks().every((t) => t.storedEnergyKwh >= t.capacityKwh - 0.001);
  });

  // Check if storage is low (< 15% or < 3 kWh)
  readonly isLowStorage = computed(() => {
    const stored = this.totalStoredEnergyKwh();
    return stored > 0.001 && (stored < 3.0 || this.totalStorageLevelPercent() < 15);
  });

  // Check if all thermal storage is depleted
  readonly isStorageDepleted = computed(() => {
    return this.totalStoredEnergyKwh() <= 0.001;
  });

  // Active Charging Tank ID (the tank currently receiving incoming heat from server)
  readonly activeChargingTankId = computed<number | null>(() => {
    if (this.heatOutputKw() <= 0 || !this.isSimulationRunning()) {
      return null;
    }

    const currentTanks = this.tanks();
    const mode = this.allocationMode();

    if (mode === 'MANUAL_SELECTION') {
      const manualId = this.manualSelectedTankId();
      const tank = currentTanks.find((t) => t.id === manualId);
      if (tank && tank.storedEnergyKwh < tank.capacityKwh - 0.001) {
        return manualId;
      }
      return null;
    }

    // AUTOMATIC SEQUENTIAL MODE (respects priorityOrder)
    const order = this.priorityOrder();
    for (const tankId of order) {
      const tank = currentTanks.find((t) => t.id === tankId);
      if (tank && tank.storedEnergyKwh < tank.capacityKwh - 0.001) {
        return tankId;
      }
    }

    return null;
  });

  // Overall Storage Status Label for Top SCADA Banner
  readonly storageStatus = computed(() => {
    if (this.heatOutputKw() <= 0 && this.activeDischargingTankIds().length === 0) {
      return this.totalStoredEnergyKwh() > 0 ? 'STORED / READY' : 'IDLE / STANDBY';
    }
    if (this.activeDischargingTankIds().length > 0 && this.activeChargingTankId() !== null) {
      return 'CHARGE / DISCHARGE';
    }
    if (this.activeDischargingTankIds().length > 0) return 'DISCHARGING';
    if (this.isAllStorageFull()) return 'ALL VESSELS FULL';
    if (this.activeChargingTankId() !== null) return 'CHARGING';
    return 'STANDBY';
  });

  // Active Storage Tank Name (e.g. 'TANK 01' or 'NONE')
  readonly activeStorageName = computed(() => {
    const activeId = this.activeChargingTankId();
    if (!activeId) {
      if (this.isAllStorageFull()) return 'ALL FULL';
      if (this.allocationMode() === 'MANUAL_SELECTION') {
        const manualTank = this.tanks().find((t) => t.id === this.manualSelectedTankId());
        return manualTank && manualTank.storedEnergyKwh >= manualTank.capacityKwh
          ? `TANK 0${manualTank.id} FULL`
          : 'STANDBY';
      }
      return 'STANDBY';
    }
    const t = this.tanks().find((x) => x.id === activeId);
    return t ? t.name : 'STANDBY';
  });

  // =========================================================================
  // HEAT CONSUMERS & THERMAL ENERGY DISTRIBUTION STATE (WITH LOCALSTORAGE)
  // =========================================================================

  private readonly STORAGE_KEY_CONSUMERS = 'west_heat_consumers_v3';
  private readonly STORAGE_KEY_HISTORY = 'west_heat_delivery_history_v3';

  private readonly DEFAULT_CONSUMERS: HeatConsumer[] = [
    {
      id: 'CON-001',
      name: 'ABC Food Processing',
      company: 'Apex Agro & Foods Ltd.',
      contactPerson: 'Rajesh Sharma',
      phone: '+91 98230 44120',
      email: 'r.sharma@apexfoods.in',
      location: 'Industrial Zone Bay-4',
      requiredEnergyKwh: 25.0,
      maxHeatRateKw: 5.0,
      deliveryRateKw: 4.0,
      preferredTank: 2,
      activeSourceTankId: 2,
      deliveredEnergyKwh: 12.5,
      supplyDurationHours: 6.25,
      status: 'RECEIVING',
      pricePerKwh: 8.0,
      temperatureC: 70,
      createdAt: '14 Sep 2026',
      autoSourceSelection: true,
      imageUrl: 'assets/heat-consumer-dp.jpg'
    },
    {
      id: 'CON-002',
      name: 'XYZ Textile Industry',
      company: 'Western Spinners & Weavers',
      contactPerson: 'Meera Patel',
      phone: '+91 98451 22890',
      email: 'm.patel@xyztextiles.com',
      location: 'Textile Cluster Phase 2',
      requiredEnergyKwh: 30.0,
      maxHeatRateKw: 6.0,
      deliveryRateKw: 3.0,
      preferredTank: 1,
      activeSourceTankId: 1,
      deliveredEnergyKwh: 6.0,
      supplyDurationHours: 10.0,
      status: 'ACTIVE',
      pricePerKwh: 8.5,
      temperatureC: 70,
      createdAt: '14 Sep 2026',
      autoSourceSelection: false,
      imageUrl: 'assets/heat-consumer-dp.jpg'
    },
    {
      id: 'CON-003',
      name: 'Industrial Dryer Unit #4',
      company: 'AeroDry Systems Corp',
      contactPerson: 'Vikram Verma',
      phone: '+91 97110 88341',
      email: 'v.verma@aerodry.com',
      location: 'Sector 9 Thermal Hub',
      requiredEnergyKwh: 18.0,
      maxHeatRateKw: 4.0,
      deliveryRateKw: 2.5,
      preferredTank: 3,
      activeSourceTankId: 3,
      deliveredEnergyKwh: 0.0,
      supplyDurationHours: 7.2,
      status: 'WAITING',
      pricePerKwh: 7.5,
      temperatureC: 70,
      createdAt: '14 Sep 2026',
      autoSourceSelection: true,
      imageUrl: 'assets/heat-consumer-dp.jpg'
    },
    {
      id: 'CON-004',
      name: 'Bio-Chem Refining Lab',
      company: 'Synthesis Bio-Processors',
      contactPerson: 'Dr. Anita Desai',
      phone: '+91 94221 66750',
      email: 'a.desai@synthesisbio.org',
      location: 'Biotech Science Park #12',
      requiredEnergyKwh: 15.0,
      maxHeatRateKw: 5.0,
      deliveryRateKw: 3.5,
      preferredTank: 'AUTO',
      activeSourceTankId: 2,
      deliveredEnergyKwh: 15.0,
      supplyDurationHours: 4.29,
      status: 'COMPLETED',
      pricePerKwh: 8.0,
      temperatureC: 70,
      createdAt: '13 Sep 2026',
      autoSourceSelection: true,
      imageUrl: 'assets/heat-consumer-dp.jpg'
    }
  ];

  private readonly DEFAULT_HISTORY: DeliveryHistoryRecord[] = [
    {
      id: 'TXN-849201',
      consumerId: 'CON-004',
      consumerName: 'Bio-Chem Refining Lab',
      date: '14 Sep 2026',
      startTime: '08:30 AM',
      endTime: '12:45 PM',
      energyDeliveredKwh: 15.0,
      avgDeliveryRateKw: 3.5,
      sourceTank: 'Tank 2',
      pricePerKwh: 8.0,
      totalAmount: 120.0,
      status: 'Completed'
    },
    {
      id: 'TXN-849188',
      consumerId: 'CON-001',
      consumerName: 'ABC Food Processing',
      date: '13 Sep 2026',
      startTime: '02:00 PM',
      endTime: '06:00 PM',
      energyDeliveredKwh: 20.0,
      avgDeliveryRateKw: 5.0,
      sourceTank: 'Tank 1',
      pricePerKwh: 8.0,
      totalAmount: 160.0,
      status: 'Completed'
    },
    {
      id: 'TXN-849140',
      consumerId: 'CON-002',
      consumerName: 'XYZ Textile Industry',
      date: '12 Sep 2026',
      startTime: '09:15 AM',
      endTime: '01:15 PM',
      energyDeliveredKwh: 12.0,
      avgDeliveryRateKw: 3.0,
      sourceTank: 'Tank 3',
      pricePerKwh: 8.5,
      totalAmount: 102.0,
      status: 'Completed'
    }
  ];

  private loadConsumersFromStorage(): HeatConsumer[] {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const raw = localStorage.getItem(this.STORAGE_KEY_CONSUMERS);
        if (raw !== null) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            return parsed.map((c: HeatConsumer) => {
              // If marked COMPLETED but still has unmet demand, restore to ACTIVE
              if (c.status === 'COMPLETED' && c.deliveredEnergyKwh < c.requiredEnergyKwh - 0.05) {
                return { ...c, status: 'ACTIVE' as ConsumerStatus };
              }
              // Ensure delivery rate is valid if set to 0 while active
              if ((!c.deliveryRateKw || c.deliveryRateKw <= 0) && c.maxHeatRateKw > 0) {
                return { ...c, deliveryRateKw: Math.min(c.maxHeatRateKw, 4.0) };
              }
              return c;
            });
          }
        }
      } catch (e) {
        console.warn('Failed to load consumers from localStorage', e);
      }
    }
    return this.DEFAULT_CONSUMERS;
  }

  saveConsumersToStorage(list?: HeatConsumer[]): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const data = list || this.consumers();
        localStorage.setItem(this.STORAGE_KEY_CONSUMERS, JSON.stringify(data));
      } catch (e) {
        console.warn('Failed to save consumers to localStorage', e);
      }
    }
  }

  private loadHistoryFromStorage(): DeliveryHistoryRecord[] {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const raw = localStorage.getItem(this.STORAGE_KEY_HISTORY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) return parsed;
        }
      } catch (e) {
        console.warn('Failed to load history from localStorage', e);
      }
    }
    return this.DEFAULT_HISTORY;
  }

  saveHistoryToStorage(history?: DeliveryHistoryRecord[]): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const data = history || this.deliveryHistory();
        localStorage.setItem(this.STORAGE_KEY_HISTORY, JSON.stringify(data));
      } catch (e) {
        console.warn('Failed to save history to localStorage', e);
      }
    }
  }

  readonly consumers = signal<HeatConsumer[]>(this.loadConsumersFromStorage());
  readonly selectedConsumerId = signal<string>('CON-001');

  readonly selectedConsumer = computed<HeatConsumer | null>(() => {
    const list = this.consumers();
    const id = this.selectedConsumerId();
    return list.find((c) => c.id === id) || (list.length > 0 ? list[0] : null);
  });

  readonly deliveryHistory = signal<DeliveryHistoryRecord[]>(this.loadHistoryFromStorage());

  // SCADA Global Alert Toast
  readonly activeNotification = signal<SystemNotification | null>(null);

  // Distribution Telemetry Computed Metrics
  readonly totalDeliveryPowerKw = computed(() => {
    return this.consumers()
      .filter((c) => c.status === 'RECEIVING')
      .reduce((sum, c) => sum + c.deliveryRateKw, 0);
  });

  readonly totalEnergyDeliveredKwh = computed(() => {
    const liveDelivered = this.consumers().reduce((sum, c) => sum + c.deliveredEnergyKwh, 0);
    const pastHistorical = this.deliveryHistory().reduce((sum, h) => sum + h.energyDeliveredKwh, 0);
    return Math.round((liveDelivered + pastHistorical) * 100) / 100;
  });

  readonly activeConsumersCount = computed(() => {
    return this.consumers().length;
  });

  readonly activeHeatSuppliesCount = computed(() => {
    return this.consumers().filter((c) => c.status === 'RECEIVING').length;
  });

  // Tanks currently being discharged to consumers
  readonly activeDischargingTankIds = computed<number[]>(() => {
    const ids = new Set<number>();
    for (const c of this.consumers()) {
      if (c.status === 'RECEIVING' && c.activeSourceTankId) {
        ids.add(c.activeSourceTankId);
      }
    }
    return Array.from(ids);
  });

  // Timer interval handle for the continuous simulation engine
  private simIntervalId: any = null;
  private readonly TICK_MS = 100; // updates every 100ms for ultra-smooth fluid animation

  constructor() {
    this.sanitizeConsumersState();
    this.startSimulationLoop();
  }

  private sanitizeConsumersState(): void {
    this.consumers.update((list) =>
      list.map((c) => {
        if (c.status === 'COMPLETED' && c.deliveredEnergyKwh < c.requiredEnergyKwh - 0.05) {
          return { ...c, status: 'ACTIVE' as ConsumerStatus };
        }
        if ((!c.deliveryRateKw || c.deliveryRateKw <= 0) && c.maxHeatRateKw > 0) {
          return { ...c, deliveryRateKw: Math.min(c.maxHeatRateKw, 4.0) };
        }
        return c;
      })
    );
  }

  // =========================================================================
  // CONTINUOUS LIVE CHARGING & DISCHARGING SIMULATION ENGINE
  // =========================================================================
  private startSimulationLoop(): void {
    if (typeof window === 'undefined') return;

    this.simIntervalId = setInterval(() => {
      this.tick();
    }, this.TICK_MS);
  }

  private tick(): void {
    if (!this.isSimulationRunning()) {
      return;
    }

    const deltaSeconds = (this.TICK_MS / 1000) * this.simulationSpeed();

    // 1. CHARGING STAGE: Accumulate heat from server if kw > 0
    const kw = this.heatOutputKw();
    if (kw > 0) {
      const activeChargeId = this.activeChargingTankId();
      if (activeChargeId) {
        const energyToAddKwh = (kw * deltaSeconds) / 3600;
        this.depositEnergy(energyToAddKwh);
      }
    }

    // 2. DISCHARGING STAGE: Deliver heat to active consumers
    this.dischargeToConsumers(deltaSeconds);

    // 3. Update Visual Statuses of All Tanks
    this.refreshTankStatuses();
  }

  private depositEnergy(energyKwh: number): void {
    let remainingEnergy = energyKwh;
    let updatedTanks = [...this.tanks()];
    const mode = this.allocationMode();

    if (mode === 'MANUAL_SELECTION') {
      const targetId = this.manualSelectedTankId();
      const index = updatedTanks.findIndex((t) => t.id === targetId);
      if (index !== -1) {
        const tank = updatedTanks[index];
        const roomKwh = tank.capacityKwh - tank.storedEnergyKwh;
        const addKwh = Math.min(roomKwh, remainingEnergy);
        const newStored = Math.min(tank.capacityKwh, tank.storedEnergyKwh + addKwh);
        const fillPct = (newStored / tank.capacityKwh) * 100;

        updatedTanks[index] = {
          ...tank,
          storedEnergyKwh: Math.round(newStored * 100000) / 100000,
          fillPercentage: Math.min(100, Math.round(fillPct * 100) / 100),
          status: newStored >= tank.capacityKwh - 0.001 ? 'FULL' : 'CHARGING'
        };
      }
    } else {
      // AUTOMATIC SEQUENTIAL MODE
      const order = this.priorityOrder();
      for (const tankId of order) {
        if (remainingEnergy <= 0) break;

        const index = updatedTanks.findIndex((t) => t.id === tankId);
        if (index === -1) continue;

        const tank = updatedTanks[index];
        const roomKwh = tank.capacityKwh - tank.storedEnergyKwh;

        if (roomKwh > 0.0001) {
          const addKwh = Math.min(roomKwh, remainingEnergy);
          const newStored = Math.min(tank.capacityKwh, tank.storedEnergyKwh + addKwh);
          const fillPct = (newStored / tank.capacityKwh) * 100;

          updatedTanks[index] = {
            ...tank,
            storedEnergyKwh: Math.round(newStored * 100000) / 100000,
            fillPercentage: Math.min(100, Math.round(fillPct * 100) / 100),
            status: newStored >= tank.capacityKwh - 0.001 ? 'FULL' : 'CHARGING'
          };

          remainingEnergy -= addKwh;
        }
      }
    }

    this.tanks.set(updatedTanks);
  }

  private dischargeToConsumers(deltaSeconds: number): void {
    const currentConsumers = [...this.consumers()];
    let updatedTanks = [...this.tanks()];
    let consumersChanged = false;
    let tanksChanged = false;

    for (let i = 0; i < currentConsumers.length; i++) {
      const consumer = currentConsumers[i];
      if (consumer.status !== 'RECEIVING' || consumer.deliveryRateKw <= 0) {
        continue;
      }

      // Energy (kWh) = (Power kW * deltaSeconds) / 3600
      const neededKwh = (consumer.deliveryRateKw * deltaSeconds) / 3600;
      const remainingToTarget = consumer.requiredEnergyKwh - consumer.deliveredEnergyKwh;

      if (remainingToTarget <= 0.0001) {
        // Automatic Completion (Requirement 10)
        currentConsumers[i] = {
          ...consumer,
          deliveredEnergyKwh: consumer.requiredEnergyKwh,
          status: 'COMPLETED',
          deliveryRateKw: 0
        };
        consumersChanged = true;

        this.recordCompletedDelivery(currentConsumers[i]);
        this.notify('success', `Thermal Energy Delivery Completed for ${consumer.name}`);
        continue;
      }

      const withdrawTargetKwh = Math.min(neededKwh, remainingToTarget);

      // Determine Source Tank
      let targetTankId = consumer.activeSourceTankId;
      if (!targetTankId || targetTankId < 1 || targetTankId > 4) {
        targetTankId = consumer.preferredTank === 'AUTO' ? 1 : consumer.preferredTank;
      }

      let tankIndex = updatedTanks.findIndex((t) => t.id === targetTankId);
      let tank = tankIndex !== -1 ? updatedTanks[tankIndex] : null;

      // Check if target tank has stored energy
      if (!tank || tank.storedEnergyKwh <= 0.001) {
        // Tank is depleted!
        if (consumer.autoSourceSelection) {
          // Automatic Source Selection: Find next tank with available stored energy (Requirement 7)
          const alternateTank = updatedTanks.find((t) => t.storedEnergyKwh > 0.005);
          if (alternateTank) {
            const oldTankId = targetTankId;
            targetTankId = alternateTank.id;
            tankIndex = updatedTanks.findIndex((t) => t.id === targetTankId);
            tank = updatedTanks[tankIndex];

            currentConsumers[i] = {
              ...consumer,
              activeSourceTankId: targetTankId
            };
            consumersChanged = true;

            this.notify(
              'warning',
              `Tank 0${oldTankId} depleted – Switching heat source to Tank 0${targetTankId}`
            );
          } else {
            // All tanks empty!
            currentConsumers[i] = {
              ...consumer,
              status: 'NO ENERGY AVAILABLE'
            };
            consumersChanged = true;
            this.notify('alert', 'Thermal energy depleted in all vessels – Heat supply paused');
            continue;
          }
        } else {
          // Manual tank mode: selected tank is depleted
          currentConsumers[i] = {
            ...consumer,
            status: 'NO ENERGY AVAILABLE'
          };
          consumersChanged = true;
          this.notify(
            'alert',
            `Tank 0${targetTankId} depleted – Heat supply halted (Manual Source Selection)`
          );
          continue;
        }
      }

      // Draw energy from tank (Requirement 6 & 15: real-time storage decrease)
      const actualDrawnKwh = Math.min(tank.storedEnergyKwh, withdrawTargetKwh);
      const newStored = Math.max(0, tank.storedEnergyKwh - actualDrawnKwh);
      const fillPct = (newStored / tank.capacityKwh) * 100;

      updatedTanks[tankIndex] = {
        ...tank,
        storedEnergyKwh: Math.round(newStored * 100000) / 100000,
        fillPercentage: Math.min(100, Math.max(0, Math.round(fillPct * 100) / 100))
      };
      tanksChanged = true;

      // Increase delivered energy for customer
      const newDelivered = consumer.deliveredEnergyKwh + actualDrawnKwh;
      const isNowCompleted = newDelivered >= consumer.requiredEnergyKwh - 0.0001;

      currentConsumers[i] = {
        ...consumer,
        deliveredEnergyKwh: Math.round(newDelivered * 10000) / 10000,
        activeSourceTankId: targetTankId,
        status: isNowCompleted ? 'COMPLETED' : 'RECEIVING',
        deliveryRateKw: isNowCompleted ? 0 : consumer.deliveryRateKw
      };
      consumersChanged = true;

      if (isNowCompleted) {
        this.recordCompletedDelivery(currentConsumers[i]);
        this.notify('success', `Thermal Energy Delivery Completed for ${consumer.name}`);
      }
    }

    if (tanksChanged) {
      this.tanks.set(updatedTanks);
    }
    if (consumersChanged) {
      this.consumers.set(currentConsumers);
      // Auto-persist active delivery progression every 3 seconds to localStorage
      const now = Date.now();
      if (now - this.lastConsumersSaveTime > 3000) {
        this.saveConsumersToStorage(currentConsumers);
        this.lastConsumersSaveTime = now;
      }
    }
  }

  private lastConsumersSaveTime = 0;

  private recordCompletedDelivery(consumer: HeatConsumer): void {
    const historyEntry: DeliveryHistoryRecord = {
      id: 'TXN-' + Math.floor(100000 + Math.random() * 900000),
      consumerId: consumer.id,
      consumerName: consumer.name,
      date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      startTime: '10:00 AM',
      endTime: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      energyDeliveredKwh: Math.round(consumer.deliveredEnergyKwh * 100) / 100,
      avgDeliveryRateKw: consumer.maxHeatRateKw,
      sourceTank: consumer.activeSourceTankId ? `Tank ${consumer.activeSourceTankId}` : 'Tank 1',
      pricePerKwh: consumer.pricePerKwh || 8.0,
      totalAmount: Math.round(consumer.deliveredEnergyKwh * (consumer.pricePerKwh || 8.0) * 100) / 100,
      status: 'Completed'
    };

    this.deliveryHistory.update((prev) => [historyEntry, ...prev]);
    this.saveHistoryToStorage();
    this.saveConsumersToStorage();
  }

  private refreshTankStatuses(): void {
    const activeChargeId = this.activeChargingTankId();
    const dischargingIds = this.activeDischargingTankIds();

    const updated = this.tanks().map((t) => {
      const isCharging = activeChargeId !== null && t.id === activeChargeId && this.heatOutputKw() > 0;
      const isDischarging = dischargingIds.includes(t.id);

      if (t.storedEnergyKwh >= t.capacityKwh - 0.001) {
        return {
          ...t,
          status: (isDischarging ? 'DISCHARGING' : 'FULL') as TankStatus,
          fillPercentage: 100
        };
      }
      if (isDischarging) {
        return { ...t, status: 'DISCHARGING' as TankStatus };
      }
      if (isCharging) {
        return { ...t, status: 'CHARGING' as TankStatus };
      }
      return { ...t, status: (t.storedEnergyKwh > 0.001 ? 'STORED' : 'STANDBY') as TankStatus };
    });

    this.tanks.set(updated);
  }

  notify(type: 'info' | 'warning' | 'success' | 'alert', message: string): void {
    this.activeNotification.set({
      id: 'notif-' + Date.now(),
      message,
      type,
      timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    });

    // Auto-dismiss after 6 seconds
    setTimeout(() => {
      this.activeNotification.update((current) => (current?.message === message ? null : current));
    }, 6000);
  }

  dismissNotification(): void {
    this.activeNotification.set(null);
  }

  // =========================================================================
  // CONSUMER ACTIONS & SUPPLY CONTROLS (Requirements 2, 4, 11, 13)
  // =========================================================================

  selectConsumer(id: string): void {
    this.selectedConsumerId.set(id);
  }

  addConsumer(data: {
    name: string;
    company: string;
    contactPerson: string;
    phone: string;
    email: string;
    location: string;
    requiredEnergyKwh: number;
    maxHeatRateKw: number;
    preferredTank: SourceTankSelection;
    pricePerKwh: number;
    status?: ConsumerStatus;
    autoSourceSelection?: boolean;
    imageUrl?: string;
  }): HeatConsumer {
    const count = this.consumers().length + 1;
    const pad = count < 10 ? `00${count}` : count < 100 ? `0${count}` : `${count}`;
    const id = `CON-${pad}`;

    const newConsumer: HeatConsumer = {
      id,
      name: data.name.trim() || `Consumer ${pad}`,
      company: data.company.trim() || 'Industrial Consumer Corp',
      contactPerson: data.contactPerson.trim() || 'Site Operator',
      phone: data.phone.trim() || '+91 90000 00000',
      email: data.email.trim() || 'operator@industrial.net',
      location: data.location.trim() || 'Zone 1 Grid Hub',
      requiredEnergyKwh: Number(data.requiredEnergyKwh) || 20.0,
      maxHeatRateKw: Number(data.maxHeatRateKw) || 5.0,
      deliveryRateKw: Math.min(Number(data.maxHeatRateKw) || 5.0, 4.0),
      preferredTank: data.preferredTank,
      activeSourceTankId: data.preferredTank === 'AUTO' ? 1 : data.preferredTank,
      deliveredEnergyKwh: 0.0,
      supplyDurationHours:
        Math.round(((Number(data.requiredEnergyKwh) || 20.0) / (Number(data.maxHeatRateKw) || 5.0)) * 10) / 10,
      status: data.status || 'ACTIVE',
      pricePerKwh: Number(data.pricePerKwh) || 8.0,
      temperatureC: 70,
      createdAt: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      autoSourceSelection: data.autoSourceSelection !== undefined ? data.autoSourceSelection : true,
      imageUrl: data.imageUrl || 'assets/heat-consumer-dp.jpg'
    };

    this.consumers.update((prev) => [newConsumer, ...prev]);
    this.selectedConsumerId.set(id);
    this.saveConsumersToStorage();
    this.notify('success', `Heat Consumer registered: ${newConsumer.name}`);
    return newConsumer;
  }

  updateConsumer(id: string, updates: Partial<HeatConsumer>): boolean {
    let updated = false;
    this.consumers.update((list) =>
      list.map((c) => {
        if (c.id === id) {
          updated = true;
          const req = updates.requiredEnergyKwh !== undefined ? Number(updates.requiredEnergyKwh) : c.requiredEnergyKwh;
          const rate = updates.deliveryRateKw !== undefined ? Number(updates.deliveryRateKw) : (c.deliveryRateKw > 0 ? c.deliveryRateKw : 4.0);
          const hours = rate > 0 ? Math.round((req / rate) * 10) / 10 : c.supplyDurationHours;
          let activeTank = c.activeSourceTankId;
          if (updates.preferredTank !== undefined) {
            activeTank = updates.preferredTank === 'AUTO' ? (c.activeSourceTankId || 1) : updates.preferredTank;
          }
          let newStatus = updates.status !== undefined ? updates.status : c.status;
          // If demand was increased so delivered < req, status should no longer be COMPLETED
          if (newStatus === 'COMPLETED' && c.deliveredEnergyKwh < req - 0.05) {
            newStatus = 'ACTIVE';
          }
          return {
            ...c,
            ...updates,
            status: newStatus,
            requiredEnergyKwh: req,
            deliveryRateKw: rate,
            activeSourceTankId: activeTank,
            supplyDurationHours: hours
          };
        }
        return c;
      })
    );
    if (updated) {
      this.saveConsumersToStorage();
      this.notify('success', `Consumer profile updated successfully`);
    }
    return updated;
  }

  deleteConsumer(id: string): boolean {
    const target = this.consumers().find((c) => c.id === id);
    if (!target) return false;
    const remaining = this.consumers().filter((c) => c.id !== id);
    this.consumers.set(remaining);
    if (this.selectedConsumerId() === id) {
      this.selectedConsumerId.set(remaining.length > 0 ? remaining[0].id : '');
    }
    this.saveConsumersToStorage(remaining);
    this.notify('info', `Consumer removed: ${target.name}`);
    return true;
  }

  setConsumerDeliveryRate(id: string, kw: number): void {
    const clamped = Math.min(Math.max(Number(kw) || 0, 0), 10.0);
    this.consumers.update((list) =>
      list.map((c) => {
        if (c.id === id) {
          const hours = clamped > 0 ? Math.round((c.requiredEnergyKwh / clamped) * 10) / 10 : 0;
          return {
            ...c,
            deliveryRateKw: Math.round(clamped * 100) / 100,
            supplyDurationHours: hours
          };
        }
        return c;
      })
    );
    this.saveConsumersToStorage();
  }

  setConsumerPreferredTank(id: string, tankId: SourceTankSelection): void {
    this.consumers.update((list) =>
      list.map((c) => {
        if (c.id === id) {
          const activeTank = tankId === 'AUTO' ? (c.activeSourceTankId || 1) : tankId;
          return {
            ...c,
            preferredTank: tankId,
            activeSourceTankId: activeTank
          };
        }
        return c;
      })
    );
    this.saveConsumersToStorage();
  }

  toggleConsumerAutoSource(id: string): void {
    this.consumers.update((list) =>
      list.map((c) => {
        if (c.id === id) {
          const nextAuto = !c.autoSourceSelection;
          return {
            ...c,
            autoSourceSelection: nextAuto
          };
        }
        return c;
      })
    );
    this.saveConsumersToStorage();
  }

  startSupply(id: string): boolean {
    const consumer = this.consumers().find((c) => c.id === id);
    if (!consumer) return false;

    // Check if available energy exists
    if (this.totalStoredEnergyKwh() <= 0.001) {
      this.notify('alert', 'INSUFFICIENT STORED THERMAL ENERGY – Cannot begin heat transfer. Storage tanks are depleted.');
      this.consumers.update((list) =>
        list.map((c) => (c.id === id ? { ...c, status: 'NO ENERGY AVAILABLE' } : c))
      );
      this.saveConsumersToStorage();
      return false;
    }

    let requiredKwh = consumer.requiredEnergyKwh;
    if (consumer.deliveredEnergyKwh >= requiredKwh) {
      // If customer demand was already met, auto-extend demand by 25 kWh so supply can run seamlessly
      requiredKwh = Math.round((consumer.deliveredEnergyKwh + 25.0) * 10) / 10;
      this.notify('info', `Target demand extended to ${requiredKwh} kWh for ${consumer.name}. Resuming heat supply...`);
    }

    const maxRate = consumer.maxHeatRateKw > 0 ? consumer.maxHeatRateKw : 5.0;
    const rate = consumer.deliveryRateKw > 0 ? consumer.deliveryRateKw : Math.min(maxRate, 4.0);

    // Determine active tank
    let targetTankId = consumer.preferredTank === 'AUTO' ? 1 : consumer.preferredTank;
    const targetTank = this.tanks().find((t) => t.id === targetTankId);
    if (!targetTank || targetTank.storedEnergyKwh <= 0.001) {
      // Find alternate tank with available stored energy
      const alternate = this.tanks().find((t) => t.storedEnergyKwh > 0.005);
      if (alternate) {
        targetTankId = alternate.id;
      }
    }

    this.consumers.update((list) =>
      list.map((c) =>
        c.id === id
          ? {
              ...c,
              requiredEnergyKwh: requiredKwh,
              status: 'RECEIVING',
              deliveryRateKw: rate,
              activeSourceTankId: targetTankId
            }
          : c
      )
    );
    this.saveConsumersToStorage();

    this.notify('success', `Thermal energy supply started for ${consumer.name} from Tank 0${targetTankId} at ${rate.toFixed(1)} kW`);
    return true;
  }

  pauseSupply(id: string): void {
    this.consumers.update((list) =>
      list.map((c) => {
        if (c.id === id && c.status === 'RECEIVING') {
          return { ...c, status: 'PAUSED' };
        }
        return c;
      })
    );
    this.saveConsumersToStorage();
    const consumer = this.consumers().find((c) => c.id === id);
    if (consumer) {
      this.notify('info', `Thermal energy supply paused for ${consumer.name}`);
    }
  }

  resumeSupply(id: string): void {
    this.startSupply(id);
  }

  stopSupply(id: string): void {
    const consumer = this.consumers().find((c) => c.id === id);

    this.consumers.update((list) =>
      list.map((c) => {
        if (c.id === id) {
          return {
            ...c,
            status: 'ACTIVE',
            deliveryRateKw: 0
          };
        }
        return c;
      })
    );
    this.saveConsumersToStorage();

    if (consumer) {
      this.notify('info', `Thermal energy delivery session stopped for ${consumer.name}`);
    }
  }

  // =========================================================================
  // ACTIONS & CONTROLS FOR THERMAL STORAGE & SERVER
  // =========================================================================

  setHeatOutput(val: number): void {
    const clamped = Math.min(Math.max(Number(val) || 0, 0), 5.0);
    this.heatOutputKw.set(Math.round(clamped * 100) / 100);
  }

  setDuration(seconds: StorageDurationOption): void {
    this.durationSeconds.set(seconds);
  }

  setAllocationMode(mode: AllocationMode): void {
    this.allocationMode.set(mode);
  }

  selectManualTank(tankId: number): boolean {
    const tank = this.tanks().find((t) => t.id === tankId);
    if (!tank) return false;
    this.manualSelectedTankId.set(tankId);
    return tank.storedEnergyKwh < tank.capacityKwh - 0.001;
  }

  setPriorityOrder(newOrder: number[]): boolean {
    const unique = new Set(newOrder);
    if (unique.size !== 4 || !newOrder.every((id) => id >= 1 && id <= 4)) {
      return false;
    }
    this.priorityOrder.set([...newOrder]);
    return true;
  }

  setSimulationSpeed(speed: number): void {
    this.simulationSpeed.set(Math.max(1, speed));
  }

  toggleSimulationPause(): void {
    this.isSimulationRunning.update((prev) => !prev);
  }

  updateTankCapacities(newCaps: { [tankId: number]: number }): { success: boolean; error?: string } {
    const current = this.tanks();

    for (const tank of current) {
      const newCap = newCaps[tank.id];
      if (newCap !== undefined) {
        if (newCap <= 0) {
          return {
            success: false,
            error: `${tank.name}: Capacity must be greater than 0 kWh.`
          };
        }
        if (newCap < tank.storedEnergyKwh) {
          return {
            success: false,
            error: `${tank.name}: New capacity (${newCap} kWh) cannot be lower than currently stored energy (${tank.storedEnergyKwh.toFixed(2)} kWh).`
          };
        }
      }
    }

    const updated = current.map((t) => {
      const cap = newCaps[t.id] !== undefined ? newCaps[t.id] : t.capacityKwh;
      const fillPct = (t.storedEnergyKwh / cap) * 100;
      return {
        ...t,
        capacityKwh: Math.round(cap * 100) / 100,
        fillPercentage: Math.min(100, Math.round(fillPct * 100) / 100),
        status: t.storedEnergyKwh >= cap - 0.001 ? ('FULL' as TankStatus) : t.status
      };
    });

    this.tanks.set(updated);
    return { success: true };
  }

  resetStorage(): void {
    const updated = this.tanks().map((t) => ({
      ...t,
      storedEnergyKwh: 0,
      fillPercentage: 0,
      status: 'STANDBY' as TankStatus
    }));
    this.tanks.set(updated);

    // Pause any consumers currently receiving
    this.consumers.update((list) =>
      list.map((c) => (c.status === 'RECEIVING' ? { ...c, status: 'NO ENERGY AVAILABLE' } : c))
    );

    this.notify('info', 'All thermal storage vessels reset to 0 kWh.');
  }
}
