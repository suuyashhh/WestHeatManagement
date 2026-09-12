import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface TelemetryMetric {
  icon: string;
  label: string;
  value: string;
}

export interface ContainerState {
  id: number;
  name: string;
  temp: number;
  tempColor: string;
  level: number;
  levelColor: string;
  heatLevel: 'high' | 'medium' | 'low' | 'cold';
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit {
  // Center schematic container states
  containers: ContainerState[] = [
    {
      id: 1,
      name: 'Container 1',
      temp: 72,
      tempColor: '#ef4444',
      level: 85,
      levelColor: '#10b981',
      heatLevel: 'high'
    },
    {
      id: 2,
      name: 'Container 2',
      temp: 64,
      tempColor: '#f97316',
      level: 67,
      levelColor: '#10b981',
      heatLevel: 'medium'
    },
    {
      id: 3,
      name: 'Container 3',
      temp: 48,
      tempColor: '#0284c7',
      level: 42,
      levelColor: '#38bdf8',
      heatLevel: 'low'
    },
    {
      id: 4,
      name: 'Container 4',
      temp: 36,
      tempColor: '#0284c7',
      level: 18,
      levelColor: '#38bdf8',
      heatLevel: 'cold'
    }
  ];

  // Bottom Card 1: Server Heat Data
  serverHeatData: TelemetryMetric[] = [
    { icon: 'thermometer', label: 'Inlet Temp (°C)', value: '78' },
    { icon: 'outlet', label: 'Outlet Temp (°C)', value: '62' },
    { icon: 'heat', label: 'Heat Output (kW)', value: '8.5' },
    { icon: 'flow', label: 'Flow Rate (m³/h)', value: '1.2' }
  ];

  // Bottom Card 2: Thermal Storage Details
  storageDetails: TelemetryMetric[] = [
    { icon: 'thermometer', label: 'Total Capacity (kWh)', value: '10.0' },
    { icon: 'stored', label: 'Stored Heat (kWh)', value: '6.8' },
    { icon: 'available', label: 'Available Capacity (kWh)', value: '3.2' },
    { icon: 'avg-temp', label: 'Current Avg. Temp (°C)', value: '56' }
  ];

  // Bottom Card 4: Heat Storage Level
  storageLevels = [
    { name: 'Container 1', percent: 85, color: '#10b981', iconColor: '#10b981' },
    { name: 'Container 2', percent: 67, color: '#10b981', iconColor: '#38bdf8' },
    { name: 'Container 3', percent: 42, color: '#38bdf8', iconColor: '#38bdf8' },
    { name: 'Container 4', percent: 18, color: '#38bdf8', iconColor: '#38bdf8' }
  ];

  ngOnInit(): void {
    // Initialized with reference image telemetry values
  }
}

