import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface ThermalZone {
  id: string;
  name: string;
  subLocation: string;
  temperature: number;
  targetTemp: number;
  pressure: string;
  status: 'normal' | 'warning' | 'danger' | 'optimal';
  fuelFlow: string;
  efficiency: number;
}

export interface SensorData {
  tag: string;
  name: string;
  location: string;
  value: string;
  unit: string;
  status: 'normal' | 'warning' | 'danger';
  threshold: string;
  lastUpdated: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit {
  selectedFilter: string = 'all';

  zones: ThermalZone[] = [
    {
      id: 'ZN-01',
      name: 'Primary Combustion Chamber',
      subLocation: 'Boiler Unit A - Main Vessel',
      temperature: 874.2,
      targetTemp: 850.0,
      pressure: '4.15 Bar',
      status: 'warning',
      fuelFlow: '142.8 m³/h',
      efficiency: 94.8
    },
    {
      id: 'ZN-02',
      name: 'Superheater Exchanger',
      subLocation: 'Secondary Steam Circuit #2',
      temperature: 642.0,
      targetTemp: 640.0,
      pressure: '18.40 Bar',
      status: 'optimal',
      fuelFlow: '88.4 m³/h',
      efficiency: 98.2
    },
    {
      id: 'ZN-03',
      name: 'Turbine Pre-Heater Section',
      subLocation: 'Generator Intake Manifold',
      temperature: 512.6,
      targetTemp: 520.0,
      pressure: '12.80 Bar',
      status: 'normal',
      fuelFlow: '64.0 m³/h',
      efficiency: 96.1
    },
    {
      id: 'ZN-04',
      name: 'Flue Gas Economizer',
      subLocation: 'Exhaust Stack Recovery',
      temperature: 228.4,
      targetTemp: 235.0,
      pressure: '1.20 Bar',
      status: 'optimal',
      fuelFlow: 'N/A (Recapture)',
      efficiency: 99.4
    }
  ];

  sensors: SensorData[] = [
    {
      tag: 'TS-304',
      name: 'Combustion Core Pyrometer',
      location: 'Boiler Chamber A',
      value: '874.2',
      unit: '°C',
      status: 'warning',
      threshold: 'Max: 860°C',
      lastUpdated: '1s ago'
    },
    {
      tag: 'PS-102',
      name: 'Superheater High-Pressure Feed',
      location: 'Circuit #2 Pipe',
      value: '18.40',
      unit: 'Bar',
      status: 'normal',
      threshold: 'Max: 22.0 Bar',
      lastUpdated: '2s ago'
    },
    {
      tag: 'FS-501',
      name: 'Pre-heater Intake Flow Sensor',
      location: 'Intake Manifold 1',
      value: '142.8',
      unit: 'kg/s',
      status: 'normal',
      threshold: '120 - 160 kg/s',
      lastUpdated: 'Just now'
    },
    {
      tag: 'TS-809',
      name: 'Flue Gas Recirculation Temp',
      location: 'Stack Economizer',
      value: '228.4',
      unit: '°C',
      status: 'normal',
      threshold: 'Max: 260°C',
      lastUpdated: '4s ago'
    },
    {
      tag: 'OS-202',
      name: 'Excess O2 Analyzer',
      location: 'Burner Array B',
      value: '2.84',
      unit: '% O2',
      status: 'normal',
      threshold: '2.5 - 3.2 %',
      lastUpdated: '10s ago'
    },
    {
      tag: 'VS-411',
      name: 'Turbine Vibration Transducer',
      location: 'Shaft Bearing 4',
      value: '1.42',
      unit: 'mm/s',
      status: 'normal',
      threshold: 'Max: 2.8 mm/s',
      lastUpdated: '2s ago'
    }
  ];

  controlToggles = [
    { label: 'Auto Burner Modulator', state: true, desc: 'Dynamic fuel-air ratio optimization' },
    { label: 'Coolant Emergency Loop', state: false, desc: 'Standby for high-heat emergency' },
    { label: 'EGR Heat Recapture', state: true, desc: 'Circulate flue gases to preheater' },
    { label: 'Secondary Pressure Relief', state: false, desc: 'Automatic safety valve bypass' }
  ];

  ngOnInit(): void {
    // Component initialization
  }

  setFilter(filter: string): void {
    this.selectedFilter = filter;
  }

  get filteredSensors(): SensorData[] {
    if (this.selectedFilter === 'all') return this.sensors;
    return this.sensors.filter(s => s.status === this.selectedFilter);
  }

  toggleControl(control: any): void {
    control.state = !control.state;
  }

  triggerDiagnosticScan(): void {
    alert('Diagnostics initiated: All 24 thermal zones reporting telemetry within calibrated margins.');
  }
}
