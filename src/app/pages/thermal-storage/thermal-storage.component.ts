import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { WasteHeatService, AllocationMode, StorageDurationOption } from '../../services/waste-heat.service';

@Component({
  selector: 'app-thermal-storage',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './thermal-storage.component.html',
  styleUrl: './thermal-storage.component.css'
})
export class ThermalStorageComponent {
  readonly heatService = inject(WasteHeatService);

  // Modal / Drawer state for Storage Capacity Configuration
  readonly showConfigModal = signal<boolean>(false);

  // Editable capacity inputs bound in the configuration form
  editCapacities: { [tankId: number]: number } = {
    1: 10,
    2: 20,
    3: 15,
    4: 25
  };

  capacityError = signal<string | null>(null);
  capacitySuccess = signal<boolean>(false);

  // Temporary priority order for editing
  editPriority: number[] = [1, 2, 3, 4];

  constructor() {
    this.syncFormWithService();
  }

  syncFormWithService(): void {
    const current = this.heatService.tanks();
    for (const t of current) {
      this.editCapacities[t.id] = t.capacityKwh;
    }
    this.editPriority = [...this.heatService.priorityOrder()];
  }

  openConfigModal(): void {
    this.syncFormWithService();
    this.capacityError.set(null);
    this.capacitySuccess.set(false);
    this.showConfigModal.set(true);
  }

  closeConfigModal(): void {
    this.showConfigModal.set(false);
    this.capacityError.set(null);
  }

  applyCapacities(): void {
    this.capacityError.set(null);
    this.capacitySuccess.set(false);

    const result = this.heatService.updateTankCapacities(this.editCapacities);
    if (!result.success) {
      this.capacityError.set(result.error || 'Failed to update storage capacities.');
    } else {
      this.capacitySuccess.set(true);
      setTimeout(() => {
        this.capacitySuccess.set(false);
        this.showConfigModal.set(false);
      }, 900);
    }
  }

  // Allocation Mode Toggle
  setAllocationMode(mode: AllocationMode): void {
    this.heatService.setAllocationMode(mode);
  }

  // Manual Active Tank Selection
  selectManualTank(id: number): void {
    const isAvailable = this.heatService.selectManualTank(id);
    if (!isAvailable) {
      // Tank is full
    }
  }

  // Priority Order modification with duplicate prevention (swaps positions)
  changePriority(slotIndex: number, newTankIdStr: string): void {
    const newTankId = parseInt(newTankIdStr, 10);
    const order = [...this.heatService.priorityOrder()];
    const existingIndex = order.indexOf(newTankId);

    if (existingIndex !== -1) {
      // Swap elements to ensure no duplicate tank IDs
      const temp = order[slotIndex];
      order[slotIndex] = newTankId;
      order[existingIndex] = temp;
    } else {
      order[slotIndex] = newTankId;
    }

    this.heatService.setPriorityOrder(order);
  }

  // Duration selection
  setDuration(sec: StorageDurationOption): void {
    this.heatService.setDuration(sec);
  }

  // Simulation Speed multiplier
  setSpeed(speed: number): void {
    this.heatService.setSimulationSpeed(speed);
  }

  // Reset Storage with SCADA confirmation modal
  readonly showResetModal = signal<boolean>(false);

  openResetModal(): void {
    this.showResetModal.set(true);
  }

  closeResetModal(): void {
    this.showResetModal.set(false);
  }

  executeReset(): void {
    this.heatService.resetStorage();
    this.showResetModal.set(false);
  }

  confirmResetStorage(): void {
    this.openResetModal();
  }

  // Helpers
  getTank(id: number) {
    return this.heatService.tanks().find((t) => t.id === id);
  }

  isTankActive(id: number): boolean {
    return this.heatService.activeChargingTankId() === id;
  }
}
