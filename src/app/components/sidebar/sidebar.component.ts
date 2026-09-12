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

  navItems: NavItem[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: 'flame',
      badge: 'LIVE',
      badgeColor: 'flame',
      route: '/dashboard'
    },
    {
      id: 'data-server',
      label: 'Data Server',
      icon: 'server',
      badge: 'ONLINE',
      badgeColor: 'normal',
      route: '/data-server'
    },
    {
      id: 'thermal-storage',
      label: 'Thermal Storage',
      icon: 'cylinder',
      badge: '84%',
      badgeColor: 'cyan',
      route: '/thermal-storage'
    },
    {
      id: 'clients',
      label: 'Clients',
      icon: 'users',
      badge: '12 Active',
      badgeColor: 'optimal',
      route: '/clients'
    }
  ];

  onNavClick(): void {
    this.closeMobile.emit();
  }

  onToggle(): void {
    this.toggleCollapse.emit();
  }
}
