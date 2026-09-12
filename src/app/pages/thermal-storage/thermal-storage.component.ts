import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface StorageTank {
  id: string;
  name: string;
  type: string;
  capacityMWh: number;
  currentMWh: number;
  socPercent: number;
  temperature: number;
  pressure: string;
  flowRate: string;
  mode: 'charging' | 'discharging' | 'standby';
}

@Component({
  selector: 'app-thermal-storage',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './thermal-storage.component.html',
  styleUrl: './thermal-storage.component.css'
})
export class ThermalStorageComponent {
  globalMode: 'auto' | 'force_charge' | 'peak_discharge' = 'auto';

  tanks: StorageTank[] = [
    {
      id: 'TK-SALT-01',
      name: 'Molten Nitrate Salt Main Vessel',
      type: 'Sensible Molten Salt (60/40 NaNO3-KNO3)',
      capacityMWh: 250,
      currentMWh: 216,
      socPercent: 86.4,
      temperature: 565,
      pressure: '1.2 Bar',
      flowRate: '+14.2 MWth',
      mode: 'charging'
    },
    {
      id: 'TK-STEAM-02',
      name: 'High-Pressure Steam Accumulator',
      type: 'Pressurized Ruths Steam Vessel',
      capacityMWh: 80,
      currentMWh: 73.6,
      socPercent: 92.0,
      temperature: 198,
      pressure: '15.4 Bar',
      flowRate: '+4.8 MWth',
      mode: 'charging'
    },
    {
      id: 'TK-PCM-03',
      name: 'Latent Heat Phase Change Cell',
      type: 'Eutectic Salt Matrix (PCM)',
      capacityMWh: 45,
      currentMWh: 30.8,
      socPercent: 68.5,
      temperature: 284,
      pressure: '2.4 Bar',
      flowRate: '-6.2 MWth',
      mode: 'discharging'
    },
    {
      id: 'TK-STRAT-04',
      name: 'Stratified Return Water Buffer',
      type: 'Thermocline Water Tank',
      capacityMWh: 60,
      currentMWh: 25.2,
      socPercent: 42.0,
      temperature: 72,
      pressure: '3.1 Bar',
      flowRate: '0.0 MWth',
      mode: 'standby'
    }
  ];

  setGlobalMode(mode: 'auto' | 'force_charge' | 'peak_discharge'): void {
    this.globalMode = mode;
  }

  toggleTankMode(tank: StorageTank): void {
    if (tank.mode === 'charging') {
      tank.mode = 'discharging';
      tank.flowRate = '-8.5 MWth';
    } else if (tank.mode === 'discharging') {
      tank.mode = 'standby';
      tank.flowRate = '0.0 MWth';
    } else {
      tank.mode = 'charging';
      tank.flowRate = '+10.0 MWth';
    }
  }
}
