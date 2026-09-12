import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

export interface NavItem {
  id: string;
  label: string;
  icon: string;
  badge?: string;
  badgeColor?: string;
  route: string;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css'
})
export class SidebarComponent {
  @Input() isCollapsed: boolean = false;
  @Input() isMobileOpen: boolean = false;
  @Output() toggleCollapse = new EventEmitter<void>();
  @Output() closeMobile = new EventEmitter<void>();

  activeNavId: string = 'dashboard';

  navItems: NavItem[] = [
    {
      id: 'dashboard',
      label: 'Heat Dashboard',
      icon: 'flame',
      badge: 'LIVE',
      badgeColor: 'flame',
      route: '/dashboard'
    },
    {
      id: 'zones',
      label: 'Thermal Zones',
      icon: 'layers',
      badge: '4 Active',
      badgeColor: 'cyan',
      route: '/dashboard'
    },
    {
      id: 'telemetry',
      label: 'Sensor Telemetry',
      icon: 'activity',
      route: '/dashboard'
    },
    {
      id: 'equipment',
      label: 'Boilers & Exchangers',
      icon: 'cpu',
      route: '/dashboard'
    },
    {
      id: 'energy',
      label: 'Power & Fuel Yield',
      icon: 'zap',
      badge: '96.4%',
      badgeColor: 'normal',
      route: '/dashboard'
    },
    {
      id: 'alarms',
      label: 'Safety & Alarms',
      icon: 'alert-triangle',
      badge: '2 Alert',
      badgeColor: 'warning',
      route: '/dashboard'
    },
    {
      id: 'analytics',
      label: 'Thermal Reports',
      icon: 'bar-chart-2',
      route: '/dashboard'
    },
    {
      id: 'settings',
      label: 'Plant Settings',
      icon: 'settings',
      route: '/dashboard'
    }
  ];

  selectNav(item: NavItem): void {
    this.activeNavId = item.id;
    this.closeMobile.emit();
  }

  onToggle(): void {
    this.toggleCollapse.emit();
  }
}
