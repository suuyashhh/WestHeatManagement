import { Injectable, signal, computed, effect } from '@angular/core';

export type StorageDurationOption = 5 | 300; // 5 seconds or 5 minutes (300s)
export type AllocationMode = 'AUTOMATIC_SEQUENTIAL' | 'MANUAL_SELECTION';
export type TankStatus = 'CHARGING' | 'STANDBY' | 'FULL' | 'STORED';

export interface StorageTank {
  id: number;
  name: string;
  capacityKwh: number;
  storedEnergyKwh: number;
  fillPercentage: number;
  temperatureC: number;
  status: TankStatus;
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

  // Simulation Running State (Play/Pause charging)
  readonly isSimulationRunning = signal<boolean>(true);

  // The 4 storage vessels with individual configurable capacities
  readonly tanks = signal<StorageTank[]>([
    {
      id: 1,
      name: 'TANK 01',
      capacityKwh: 10.0,
      storedEnergyKwh: 0.0,
      fillPercentage: 0.0,
      temperatureC: 70,
      status: 'STANDBY'
    },
    {
      id: 2,
      name: 'TANK 02',
      capacityKwh: 20.0,
      storedEnergyKwh: 0.0,
      fillPercentage: 0.0,
      temperatureC: 70,
      status: 'STANDBY'
    },
    {
      id: 3,
      name: 'TANK 03',
      capacityKwh: 15.0,
      storedEnergyKwh: 0.0,
      fillPercentage: 0.0,
      temperatureC: 70,
      status: 'STANDBY'
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

  // Active Charging Tank ID (the tank currently receiving incoming heat)
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
      return null; // Selected tank is full
    }

    // AUTOMATIC SEQUENTIAL MODE (respects priorityOrder)
    const order = this.priorityOrder();
    for (const tankId of order) {
      const tank = currentTanks.find((t) => t.id === tankId);
      if (tank && tank.storedEnergyKwh < tank.capacityKwh - 0.001) {
        return tankId;
      }
    }

    return null; // All tanks full
  });

  // Overall Storage Status Label for Top SCADA Banner
  readonly storageStatus = computed(() => {
    if (this.heatOutputKw() <= 0) return 'IDLE / STANDBY';
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
        return manualTank && manualTank.storedEnergyKwh >= manualTank.capacityKwh ? `TANK 0${manualTank.id} FULL` : 'STANDBY';
      }
      return 'STANDBY';
    }
    const t = this.tanks().find((x) => x.id === activeId);
    return t ? t.name : 'STANDBY';
  });

  // Timer interval handle for the continuous simulation engine
  private simIntervalId: any = null;
  private readonly TICK_MS = 100; // updates every 100ms for ultra-smooth fluid animation

  constructor() {
    this.startSimulationLoop();
  }

  // =========================================================================
  // CONTINUOUS LIVE CHARGING SIMULATION LOOP
  // =========================================================================
  private startSimulationLoop(): void {
    if (typeof window === 'undefined') return;

    this.simIntervalId = setInterval(() => {
      this.tick();
    }, this.TICK_MS);
  }

  private tick(): void {
    const kw = this.heatOutputKw();
    if (kw <= 0 || !this.isSimulationRunning()) {
      this.updateTankStatuses(null);
      return;
    }

    const activeId = this.activeChargingTankId();
    if (!activeId) {
      this.updateTankStatuses(null);
      return;
    }

    // Calculate energy accumulated during this 100ms tick:
    // deltaSeconds = (TICK_MS / 1000) * speedMultiplier
    const deltaSeconds = (this.TICK_MS / 1000) * this.simulationSpeed();
    // Energy (kWh) = (kW * seconds) / 3600
    const energyToAddKwh = (kw * deltaSeconds) / 3600;

    this.depositEnergy(energyToAddKwh);
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

    // Refresh statuses for tanks not actively charging
    const activeId = this.activeChargingTankId();
    updatedTanks = updatedTanks.map((t) => {
      if (t.storedEnergyKwh >= t.capacityKwh - 0.001) {
        return { ...t, status: 'FULL' as TankStatus, fillPercentage: 100 };
      }
      if (t.id === activeId && this.heatOutputKw() > 0) {
        return { ...t, status: 'CHARGING' as TankStatus };
      }
      return { ...t, status: (t.storedEnergyKwh > 0 ? 'STORED' : 'STANDBY') as TankStatus };
    });

    this.tanks.set(updatedTanks);
  }

  private updateTankStatuses(activeId: number | null): void {
    const updated = this.tanks().map((t) => {
      if (t.storedEnergyKwh >= t.capacityKwh - 0.001) {
        return { ...t, status: 'FULL' as TankStatus, fillPercentage: 100 };
      }
      if (activeId !== null && t.id === activeId) {
        return { ...t, status: 'CHARGING' as TankStatus };
      }
      return { ...t, status: (t.storedEnergyKwh > 0 ? 'STORED' : 'STANDBY') as TankStatus };
    });
    this.tanks.set(updated);
  }

  // =========================================================================
  // ACTIONS & CONTROLS
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
    // Validate that newOrder contains exactly [1, 2, 3, 4] with no duplicates
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

  // Update tank capacities with validation
  updateTankCapacities(newCaps: { [tankId: number]: number }): { success: boolean; error?: string } {
    const current = this.tanks();

    // 1. Validation: Verify no capacity is lower than already stored energy
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

    // 2. Apply updated capacities without resetting stored energy
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

  // Reset all stored thermal energy to 0. Capacity configurations are strictly preserved!
  resetStorage(): void {
    const updated = this.tanks().map((t) => ({
      ...t,
      storedEnergyKwh: 0,
      fillPercentage: 0,
      status: 'STANDBY' as TankStatus
    }));
    this.tanks.set(updated);
  }
}
