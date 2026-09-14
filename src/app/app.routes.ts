import { Routes } from '@angular/router';
import { AdminLayoutComponent } from './layouts/admin-layout/admin-layout.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { DataServerComponent } from './pages/data-server/data-server.component';
import { ThermalStorageComponent } from './pages/thermal-storage/thermal-storage.component';
import { HeatConsumersComponent } from './pages/heat-consumers/heat-consumers.component';

export const routes: Routes = [
  {
    path: '',
    component: AdminLayoutComponent,
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: DashboardComponent },
      { path: 'data-server', component: DataServerComponent },
      { path: 'thermal-storage', component: ThermalStorageComponent },
      { path: 'heat-consumers', component: HeatConsumersComponent },
      { path: 'clients', redirectTo: 'heat-consumers', pathMatch: 'full' },
      { path: 'reports', component: DashboardComponent },
      { path: 'settings', component: DashboardComponent },
      { path: '**', redirectTo: 'dashboard' }
    ]
  }
];
