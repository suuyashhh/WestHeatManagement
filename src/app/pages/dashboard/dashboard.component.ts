import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import {
  WasteHeatService,
  StorageTank,
  HeatConsumer
} from '../../services/waste-heat.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent {
  readonly heatService = inject(WasteHeatService);

  // Live Server Metrics
  readonly serverHeatKw = this.heatService.heatOutputKw;
  readonly temperatureC = this.heatService.temperatureC;
  readonly durationSeconds = this.heatService.durationSeconds;
  readonly incomingThermalEnergyKwh = this.heatService.incomingThermalEnergyKwh;
  readonly systemStatus = this.heatService.status;
  readonly heatIntensityRatio = this.heatService.heatIntensityRatio;

  // Live Storage Vessels State
  readonly tanks = this.heatService.tanks;
  readonly totalStoredEnergyKwh = this.heatService.totalStoredEnergyKwh;
  readonly totalStorageCapacityKwh = this.heatService.totalStorageCapacityKwh;
  readonly totalStorageLevelPercent = this.heatService.totalStorageLevelPercent;
  readonly activeChargingTankId = this.heatService.activeChargingTankId;
  readonly activeDischargingTankIds = this.heatService.activeDischargingTankIds;
  readonly isSimulationRunning = this.heatService.isSimulationRunning;

  // Live Heat Consumers & Distribution
  readonly consumers = this.heatService.consumers;
  readonly activeHeatSuppliesCount = this.heatService.activeHeatSuppliesCount;
  readonly totalDeliveryPowerKw = this.heatService.totalDeliveryPowerKw;
  readonly totalEnergyDeliveredKwh = this.heatService.totalEnergyDeliveredKwh;
  readonly deliveryHistory = this.heatService.deliveryHistory;

  // Active Discharging Links (which tank supplies which consumer)
  readonly activeSupplyingLinks = computed(() => {
    return this.consumers()
      .filter((c) => c.status === 'RECEIVING' && c.activeSourceTankId)
      .map((c) => ({
        consumerId: c.id,
        consumerName: c.name,
        company: c.company,
        tankId: c.activeSourceTankId as number,
        tankName: `Tank 0${c.activeSourceTankId}`,
        deliveryRateKw: c.deliveryRateKw,
        deliveredKwh: c.deliveredEnergyKwh,
        requiredKwh: c.requiredEnergyKwh,
        imageUrl: c.imageUrl || 'assets/heat-consumer-dp.jpg'
      }));
  });

  // Circular Gauge Stroke-Dashoffset
  readonly gaugeDashOffset = computed(() => {
    const circumference = 163.36; // 2 * PI * 26
    const pct = Math.min(100, Math.max(0, this.totalStorageLevelPercent()));
    return circumference * (1 - pct / 100);
  });

  // Average Storage Temperature Computed
  readonly avgStorageTemp = computed(() => {
    const t = this.tanks();
    if (!t || t.length === 0) return 45;
    const sum = t.reduce((acc, curr) => acc + curr.temperatureC, 0);
    return Math.round(sum / t.length);
  });

  // Actions
  setServerHeat(kw: number): void {
    this.heatService.setHeatOutput(kw);
  }

  toggleSupply(consumerId: string, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    const c = this.consumers().find((x) => x.id === consumerId);
    if (!c) return;

    if (c.status === 'RECEIVING') {
      this.heatService.stopSupply(consumerId);
    } else {
      this.heatService.startSupply(consumerId);
    }
  }

  getConsumerProgress(c: HeatConsumer): number {
    if (c.requiredEnergyKwh <= 0) return 0;
    return Math.min(100, Math.round((c.deliveredEnergyKwh / c.requiredEnergyKwh) * 100));
  }

  getTank(tankId: number | null): StorageTank | undefined {
    const id = tankId || 1;
    return this.tanks().find((t) => t.id === id);
  }

  isTankCharging(tankId: number): boolean {
    return this.activeChargingTankId() === tankId && this.serverHeatKw() > 0;
  }

  isTankDischarging(tankId: number): boolean {
    return this.activeDischargingTankIds().includes(tankId);
  }

  getSupplyingConsumers(tankId: number): HeatConsumer[] {
    return this.consumers().filter(
      (c) => c.status === 'RECEIVING' && c.activeSourceTankId === tankId
    );
  }
}

