import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import {
  WasteHeatService,
  HeatConsumer,
  ConsumerStatus,
  SourceTankSelection,
  StorageTank
} from '../../services/waste-heat.service';

@Component({
  selector: 'app-heat-consumers',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './heat-consumers.component.html',
  styleUrl: './heat-consumers.component.css'
})
export class HeatConsumersComponent {
  readonly heatService = inject(WasteHeatService);

  // Filter for consumer list cards
  activeFilter = signal<'ALL' | 'RECEIVING' | 'ACTIVE' | 'COMPLETED'>('ALL');

  // Detail Control Modal State
  showDetailModal = signal<boolean>(false);

  // Edit Consumer Modal State
  showEditModal = signal<boolean>(false);
  editingConsumerId = signal<string | null>(null);
  editFormError = signal<string | null>(null);
  inlineDeleteConfirm = signal<boolean>(false);

  // Dedicated In-App Delete Confirmation Modal State
  consumerToDelete = signal<HeatConsumer | null>(null);

  // Edit Consumer Model
  editForm = {
    id: '',
    name: '',
    company: '',
    contactPerson: '',
    phone: '',
    email: '',
    location: '',
    requiredEnergyKwh: 25.0,
    maxHeatRateKw: 5.0,
    deliveryRateKw: 4.0,
    preferredTank: 'AUTO' as SourceTankSelection,
    pricePerKwh: 8.0,
    status: 'ACTIVE' as ConsumerStatus,
    autoSourceSelection: true,
    imageUrl: 'assets/heat-consumer-dp.jpg'
  };

  // Add Heat Consumer Modal Drawer state
  showAddModal = signal<boolean>(false);
  formError = signal<string | null>(null);

  // New Consumer Form Model
  newConsumer = {
    name: '',
    company: '',
    contactPerson: '',
    phone: '',
    email: '',
    location: '',
    requiredEnergyKwh: 25.0,
    maxHeatRateKw: 5.0,
    preferredTank: 'AUTO' as SourceTankSelection,
    pricePerKwh: 8.0,
    status: 'ACTIVE' as ConsumerStatus,
    autoSourceSelection: true,
    imageUrl: 'assets/heat-consumer-dp.jpg'
  };

  // Helper computed for form estimated duration
  readonly formEstimatedDurationHours = computed(() => {
    const energy = Number(this.newConsumer.requiredEnergyKwh) || 0;
    const rate = Number(this.newConsumer.maxHeatRateKw) || 1;
    return rate > 0 ? Math.round((energy / rate) * 10) / 10 : 0;
  });

  // Filtered Consumers List
  readonly filteredConsumers = computed(() => {
    const list = this.heatService.consumers();
    const filter = this.activeFilter();
    if (filter === 'ALL') return list;
    if (filter === 'RECEIVING') return list.filter((c) => c.status === 'RECEIVING');
    if (filter === 'ACTIVE') return list.filter((c) => c.status === 'ACTIVE');
    if (filter === 'COMPLETED') return list.filter((c) => c.status === 'COMPLETED');
    return list;
  });

  // Selected Consumer Helper
  readonly currentConsumer = computed(() => {
    return this.heatService.selectedConsumer();
  });

  // Calculated Progress for Current Selected Consumer (0 to 100%)
  readonly currentProgress = computed(() => {
    const c = this.currentConsumer();
    if (!c || c.requiredEnergyKwh <= 0) return 0;
    return Math.min(100, Math.round((c.deliveredEnergyKwh / c.requiredEnergyKwh) * 1000) / 10);
  });

  // Remaining Energy for Current Selected Consumer
  readonly currentRemainingKwh = computed(() => {
    const c = this.currentConsumer();
    if (!c) return 0;
    return Math.max(0, Math.round((c.requiredEnergyKwh - c.deliveredEnergyKwh) * 100) / 100);
  });

  // Active Source Tank Entity for Selected Consumer
  readonly currentSourceTank = computed<StorageTank | undefined>(() => {
    const c = this.currentConsumer();
    if (!c) return undefined;
    const tankId = c.activeSourceTankId || 1;
    return this.heatService.tanks().find((t) => t.id === tankId);
  });

  // Estimated Duration for Current Selected Consumer based on live delivery rate
  readonly currentEstimatedDurationHours = computed(() => {
    const c = this.currentConsumer();
    if (!c) return 0;
    const rate = c.deliveryRateKw;
    if (rate <= 0) return 0;
    const remaining = Math.max(0, c.requiredEnergyKwh - c.deliveredEnergyKwh);
    return Math.round((remaining / rate) * 10) / 10;
  });

  // Flow animation speed variable helper (returns a duration in seconds)
  readonly flowAnimationDuration = computed(() => {
    const c = this.currentConsumer();
    if (!c || c.status !== 'RECEIVING' || c.deliveryRateKw <= 0) {
      return '0s';
    }
    // Faster particles at higher kW: 1kW => 3.5s, 5kW => 1.2s, 10kW => 0.6s
    const seconds = Math.max(0.4, 4.0 / Math.max(c.deliveryRateKw, 0.5));
    return `${seconds.toFixed(2)}s`;
  });

  // Delivery History Totals
  readonly totalHistoryKwh = computed(() => {
    return this.heatService.deliveryHistory().reduce((sum, h) => sum + h.energyDeliveredKwh, 0);
  });

  readonly totalHistoryRevenue = computed(() => {
    return this.heatService.deliveryHistory().reduce((sum, h) => sum + h.totalAmount, 0);
  });

  // Actions
  selectConsumer(id: string): void {
    this.heatService.selectConsumer(id);
  }

  openConsumerDetail(id: string): void {
    this.heatService.selectConsumer(id);
    this.showDetailModal.set(true);
  }

  closeConsumerDetail(): void {
    this.showDetailModal.set(false);
  }

  toggleSupply(consumerId?: string, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    const id = consumerId || this.currentConsumer()?.id;
    if (!id) return;
    const consumer = this.heatService.consumers().find((c) => c.id === id);
    if (!consumer) return;

    if (consumer.status === 'RECEIVING') {
      this.heatService.stopSupply(id);
    } else {
      this.heatService.startSupply(id);
    }
  }

  getTank(tankId: number | null): StorageTank | undefined {
    const id = tankId || 1;
    return this.heatService.tanks().find((t) => t.id === id);
  }

  setFilter(filter: 'ALL' | 'RECEIVING' | 'ACTIVE' | 'COMPLETED'): void {
    this.activeFilter.set(filter);
  }

  onRateSliderChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const val = parseFloat(input.value);
    const c = this.currentConsumer();
    if (c) {
      this.heatService.setConsumerDeliveryRate(c.id, val);
    }
  }

  setRatePreset(kw: number): void {
    const c = this.currentConsumer();
    if (c) {
      this.heatService.setConsumerDeliveryRate(c.id, kw);
    }
  }

  setSourceTank(tankId: SourceTankSelection): void {
    const c = this.currentConsumer();
    if (c) {
      this.heatService.setConsumerPreferredTank(c.id, tankId);
    }
  }

  toggleAutoSource(): void {
    const c = this.currentConsumer();
    if (c) {
      this.heatService.toggleConsumerAutoSource(c.id);
    }
  }

  startSupply(consumerId?: string): void {
    const id = consumerId || this.currentConsumer()?.id;
    if (id) {
      this.heatService.startSupply(id);
    }
  }

  pauseSupply(consumerId?: string): void {
    const id = consumerId || this.currentConsumer()?.id;
    if (id) {
      this.heatService.pauseSupply(id);
    }
  }

  resumeSupply(consumerId?: string): void {
    const id = consumerId || this.currentConsumer()?.id;
    if (id) {
      this.heatService.resumeSupply(id);
    }
  }

  stopSupply(consumerId?: string): void {
    const id = consumerId || this.currentConsumer()?.id;
    if (id) {
      this.heatService.stopSupply(id);
    }
  }

  // =========================================================================
  // EDIT CONSUMER MODAL & DP IMAGE MANAGEMENT
  // =========================================================================
  openEditModal(consumer: HeatConsumer, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.editingConsumerId.set(consumer.id);
    this.editForm = {
      id: consumer.id,
      name: consumer.name,
      company: consumer.company,
      contactPerson: consumer.contactPerson,
      phone: consumer.phone,
      email: consumer.email,
      location: consumer.location,
      requiredEnergyKwh: consumer.requiredEnergyKwh,
      maxHeatRateKw: consumer.maxHeatRateKw,
      deliveryRateKw: consumer.deliveryRateKw,
      preferredTank: consumer.preferredTank,
      pricePerKwh: consumer.pricePerKwh,
      status: consumer.status,
      autoSourceSelection: consumer.autoSourceSelection,
      imageUrl: consumer.imageUrl || 'assets/heat-consumer-dp.jpg'
    };
    this.editFormError.set(null);
    this.inlineDeleteConfirm.set(false);
    this.showEditModal.set(true);
  }

  closeEditModal(): void {
    this.showEditModal.set(false);
    this.editFormError.set(null);
    this.editingConsumerId.set(null);
    this.inlineDeleteConfirm.set(false);
  }

  onEditImageFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          this.editForm.imageUrl = reader.result;
        }
      };
      reader.readAsDataURL(file);
    }
  }

  onAddImageFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          this.newConsumer.imageUrl = reader.result;
        }
      };
      reader.readAsDataURL(file);
    }
  }

  setEditImagePreset(url: string): void {
    this.editForm.imageUrl = url;
  }

  setAddImagePreset(url: string): void {
    this.newConsumer.imageUrl = url;
  }

  saveConsumerEdit(): void {
    const id = this.editingConsumerId();
    if (!id) return;

    if (!this.editForm.name.trim()) {
      this.editFormError.set('Consumer Facility Name cannot be blank.');
      return;
    }
    if (Number(this.editForm.requiredEnergyKwh) <= 0) {
      this.editFormError.set('Required Thermal Energy must be greater than 0 kWh.');
      return;
    }
    if (Number(this.editForm.maxHeatRateKw) <= 0) {
      this.editFormError.set('Max Heat Supply Rate must be greater than 0 kW.');
      return;
    }

    const req = Number(this.editForm.requiredEnergyKwh);
    let status = this.editForm.status;
    const existing = this.heatService.consumers().find((c) => c.id === id);
    if (existing && existing.deliveredEnergyKwh < req - 0.05 && status === 'COMPLETED') {
      status = 'ACTIVE';
    }

    this.heatService.updateConsumer(id, {
      name: this.editForm.name.trim(),
      company: this.editForm.company.trim() || this.editForm.name.trim(),
      contactPerson: this.editForm.contactPerson.trim(),
      phone: this.editForm.phone.trim(),
      email: this.editForm.email.trim(),
      location: this.editForm.location.trim(),
      requiredEnergyKwh: req,
      maxHeatRateKw: Number(this.editForm.maxHeatRateKw),
      deliveryRateKw: Math.min(Number(this.editForm.deliveryRateKw) || Number(this.editForm.maxHeatRateKw), Number(this.editForm.maxHeatRateKw)),
      preferredTank: this.editForm.preferredTank,
      pricePerKwh: Number(this.editForm.pricePerKwh) || 8.0,
      status: status,
      autoSourceSelection: this.editForm.autoSourceSelection,
      imageUrl: this.editForm.imageUrl
    });

    this.showEditModal.set(false);
    this.editingConsumerId.set(null);
  }

  // =========================================================================
  // BULLETPROOF IN-APP DELETE ACTIONS (No Browser confirm() Dialog Reliance)
  // =========================================================================
  promptDeleteCardConsumer(consumer: HeatConsumer, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.consumerToDelete.set(consumer);
  }

  promptDeleteFromEdit(): void {
    const id = this.editingConsumerId();
    if (!id) return;
    const consumer = this.heatService.consumers().find((c) => c.id === id);
    if (consumer) {
      this.consumerToDelete.set(consumer);
    } else {
      // Fallback object from editForm
      this.consumerToDelete.set({
        ...this.editForm,
        activeSourceTankId: 1,
        deliveredEnergyKwh: 0,
        supplyDurationHours: 1,
        temperatureC: 70,
        createdAt: ''
      });
    }
  }

  confirmDeleteConsumer(id?: string): void {
    const targetId = id || this.consumerToDelete()?.id || this.editingConsumerId();
    if (targetId) {
      this.heatService.deleteConsumer(targetId);
      this.consumerToDelete.set(null);
      this.showEditModal.set(false);
      this.editingConsumerId.set(null);
      this.inlineDeleteConfirm.set(false);
      if (this.showDetailModal() && this.currentConsumer()?.id === targetId) {
        this.showDetailModal.set(false);
      }
    }
  }

  cancelDeletePrompt(): void {
    this.consumerToDelete.set(null);
    this.inlineDeleteConfirm.set(false);
  }

  // =========================================================================
  // ADD CONSUMER MODAL MANAGEMENT
  // =========================================================================
  openAddModal(): void {
    this.resetForm();
    this.formError.set(null);
    this.showAddModal.set(true);
  }

  closeAddModal(): void {
    this.showAddModal.set(false);
    this.formError.set(null);
  }

  submitNewConsumer(): void {
    if (!this.newConsumer.name.trim()) {
      this.formError.set('Consumer Name is required.');
      return;
    }

    if (this.newConsumer.requiredEnergyKwh <= 0) {
      this.formError.set('Required Thermal Energy must be greater than 0 kWh.');
      return;
    }

    if (this.newConsumer.maxHeatRateKw <= 0) {
      this.formError.set('Maximum Required Heat Rate must be greater than 0 kW.');
      return;
    }

    this.heatService.addConsumer({
      name: this.newConsumer.name.trim(),
      company: this.newConsumer.company.trim() || this.newConsumer.name.trim(),
      contactPerson: this.newConsumer.contactPerson.trim() || 'Plant Manager',
      phone: this.newConsumer.phone.trim() || '+91 98000 12345',
      email: this.newConsumer.email.trim() || 'operations@industry.com',
      location: this.newConsumer.location.trim() || 'Thermal Zone Alpha',
      requiredEnergyKwh: Number(this.newConsumer.requiredEnergyKwh),
      maxHeatRateKw: Number(this.newConsumer.maxHeatRateKw),
      preferredTank: this.newConsumer.preferredTank,
      pricePerKwh: Number(this.newConsumer.pricePerKwh) || 8.0,
      status: this.newConsumer.status,
      autoSourceSelection: this.newConsumer.autoSourceSelection,
      imageUrl: this.newConsumer.imageUrl || 'assets/heat-consumer-dp.jpg'
    });

    this.showAddModal.set(false);
  }

  resetForm(): void {
    this.newConsumer = {
      name: '',
      company: '',
      contactPerson: '',
      phone: '',
      email: '',
      location: '',
      requiredEnergyKwh: 25.0,
      maxHeatRateKw: 5.0,
      preferredTank: 'AUTO',
      pricePerKwh: 8.0,
      status: 'ACTIVE',
      autoSourceSelection: true,
      imageUrl: 'assets/heat-consumer-dp.jpg'
    };
  }

  dismissNotification(): void {
    this.heatService.dismissNotification();
  }

  getConsumerProgress(c: HeatConsumer): number {
    if (c.requiredEnergyKwh <= 0) return 0;
    return Math.min(100, Math.round((c.deliveredEnergyKwh / c.requiredEnergyKwh) * 100));
  }
}
