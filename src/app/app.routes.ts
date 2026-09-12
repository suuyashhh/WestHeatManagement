import { Routes } from '@angular/router';
import { AdminLayoutComponent } from './layouts/admin-layout/admin-layout.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { DataServerComponent } from './pages/data-server/data-server.component';
import { ThermalStorageComponent } from './pages/thermal-storage/thermal-storage.component';
import { ClientsComponent } from './pages/clients/clients.component';

export const routes: Routes = [
  {
    path: '',
    component: AdminLayoutComponent,
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: DashboardComponent },
      { path: 'data-server', component: DataServerComponent },
      { path: 'thermal-storage', component: ThermalStorageComponent },
      { path: 'clients', component: ClientsComponent },
      { path: 'reports', component: DashboardComponent },
      { path: 'settings', component: DashboardComponent },
      { path: '**', redirectTo: 'dashboard' }
    ]
  }
];
