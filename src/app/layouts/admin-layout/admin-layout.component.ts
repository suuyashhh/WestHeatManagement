import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterModule } from '@angular/router';
import { SidebarComponent } from '../../components/sidebar/sidebar.component';
import { ThemeService } from '../../services/theme.service';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterModule, SidebarComponent],
  templateUrl: './admin-layout.component.html',
  styleUrl: './admin-layout.component.css'
})
export class AdminLayoutComponent implements OnInit, OnDestroy {
  readonly themeService = inject(ThemeService);
  isSidebarCollapsed: boolean = false;
  isMobileSidebarOpen: boolean = false;
  currentTimeString: string = '';
  private timerInterval: any;

  // Notification badge count
  unreadAlertCount: number = 3;
  isNotificationsOpen: boolean = false;

  notifications = [
    {
      id: 1,
      title: 'Boiler 3 Chamber Temp High',
      time: '2m ago',
      type: 'danger',
      desc: 'Sensor TS-304 detected 862°C exceeding threshold.'
    },
    {
      id: 2,
      title: 'Exchanger Pressure Stabilized',
      time: '14m ago',
      type: 'normal',
      desc: 'Automatic bypass closed successfully.'
    },
    {
      id: 3,
      title: 'Scheduled Calibration Due',
      time: '1h ago',
      type: 'warning',
      desc: 'Turbine flow meter sensor TF-109 calibration needed.'
    }
  ];

  ngOnInit(): void {
    this.updateClock();
    this.timerInterval = setInterval(() => {
      this.updateClock();
    }, 1000);
  }

  ngOnDestroy(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
  }

  private updateClock(): void {
    const now = new Date();
    const day = now.getDate();
    const month = now.toLocaleString('en-US', { month: 'short' });
    const year = now.getFullYear();
    const time = now.toLocaleTimeString('en-US', {
      hour12: true,
      hour: '2-digit',
      minute: '2-digit'
    });
    this.currentTimeString = `${day} ${month} ${year}  ${time}`;
  }

  toggleSidebar(): void {
    this.isSidebarCollapsed = !this.isSidebarCollapsed;
  }

  toggleMobileSidebar(): void {
    this.isMobileSidebarOpen = !this.isMobileSidebarOpen;
  }

  closeMobileSidebar(): void {
    this.isMobileSidebarOpen = false;
  }

  toggleNotifications(): void {
    this.isNotificationsOpen = !this.isNotificationsOpen;
  }
}
