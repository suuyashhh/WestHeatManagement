import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface HeatClient {
  id: string;
  name: string;
  industry: string;
  contractMW: number;
  currentDrawMW: number;
  steamGrade: string;
  valveOpenPct: number;
  status: 'active' | 'throttled' | 'standby';
  billingStatus: 'paid' | 'pending' | 'overdue';
  meterId: string;
}

@Component({
  selector: 'app-clients',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './clients.component.html',
  styleUrl: './clients.component.css'
})
export class ClientsComponent {
  selectedFilter: string = 'all';

  clients: HeatClient[] = [
    {
      id: 'CLI-001',
      name: 'West Steel & Rolling Mills',
      industry: 'Heavy Metallurgy',
      contractMW: 14.5,
      currentDrawMW: 12.8,
      steamGrade: 'Superheated (420°C / 24 Bar)',
      valveOpenPct: 88,
      status: 'active',
      billingStatus: 'paid',
      meterId: 'HM-STEEL-99'
    },
    {
      id: 'CLI-002',
      name: 'Apex District Heating Grid',
      industry: 'Municipal Heating',
      contractMW: 12.0,
      currentDrawMW: 9.4,
      steamGrade: 'Hot Water (120°C / 8 Bar)',
      valveOpenPct: 78,
      status: 'active',
      billingStatus: 'paid',
      meterId: 'HM-MUNI-14'
    },
    {
      id: 'CLI-003',
      name: 'PetroChem Refining Plant #3',
      industry: 'Chemical Process',
      contractMW: 16.0,
      currentDrawMW: 11.2,
      steamGrade: 'High Pressure (380°C / 18 Bar)',
      valveOpenPct: 70,
      status: 'active',
      billingStatus: 'paid',
      meterId: 'HM-PETRO-03'
    },
    {
      id: 'CLI-004',
      name: 'Bio-Agro Grain Dryers',
      industry: 'Agriculture Processing',
      contractMW: 6.0,
      currentDrawMW: 2.8,
      steamGrade: 'Medium Steam (180°C / 6 Bar)',
      valveOpenPct: 46,
      status: 'active',
      billingStatus: 'pending',
      meterId: 'HM-AGRO-72'
    },
    {
      id: 'CLI-005',
      name: 'Pacific Paper & Pulp Mill',
      industry: 'Manufacturing & Drying',
      contractMW: 8.5,
      currentDrawMW: 0.0,
      steamGrade: 'Process Steam (210°C / 10 Bar)',
      valveOpenPct: 0,
      status: 'standby',
      billingStatus: 'paid',
      meterId: 'HM-PULP-11'
    }
  ];

  setFilter(filter: string): void {
    this.selectedFilter = filter;
  }

  get filteredClients(): HeatClient[] {
    if (this.selectedFilter === 'all') return this.clients;
    return this.clients.filter(c => c.status === this.selectedFilter);
  }

  adjustValve(client: HeatClient): void {
    const newValve = prompt(`Adjust delivery valve percentage for ${client.name} (Current: ${client.valveOpenPct}%):`, client.valveOpenPct.toString());
    if (newValve !== null && !isNaN(Number(newValve))) {
      client.valveOpenPct = Math.min(100, Math.max(0, Number(newValve)));
      client.currentDrawMW = +(client.contractMW * (client.valveOpenPct / 100)).toFixed(1);
    }
  }
}
