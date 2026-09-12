import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface ServerNode {
  id: string;
  name: string;
  protocol: string;
  ipAddress: string;
  port: number;
  status: 'online' | 'standby' | 'warning' | 'offline';
  throughput: string;
  latency: string;
  uptime: string;
  tagsCount: number;
}

export interface ServerLog {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'success' | 'error';
  source: string;
  message: string;
}

@Component({
  selector: 'app-data-server',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './data-server.component.html',
  styleUrl: './data-server.component.css'
})
export class DataServerComponent {
  serverNodes: ServerNode[] = [
    {
      id: 'SRV-MODBUS-01',
      name: 'Primary SCADA Modbus Gateway',
      protocol: 'Modbus TCP',
      ipAddress: '192.168.4.10',
      port: 502,
      status: 'online',
      throughput: '1.42 MB/s',
      latency: '8 ms',
      uptime: '42d 18h',
      tagsCount: 1840
    },
    {
      id: 'SRV-OPCUA-02',
      name: 'Turbine & Exchanger OPC-UA Server',
      protocol: 'OPC-UA (Binary)',
      ipAddress: '192.168.4.11',
      port: 4840,
      status: 'online',
      throughput: '860 KB/s',
      latency: '12 ms',
      uptime: '18d 04h',
      tagsCount: 920
    },
    {
      id: 'SRV-MQTT-03',
      name: 'Field Wireless Sensor Broker',
      protocol: 'MQTT / TLS',
      ipAddress: '192.168.4.15',
      port: 8883,
      status: 'online',
      throughput: '340 KB/s',
      latency: '15 ms',
      uptime: '9d 12h',
      tagsCount: 560
    },
    {
      id: 'SRV-FAILOVER-04',
      name: 'Redundant Hot-Standby Mirror',
      protocol: 'Sync Cluster',
      ipAddress: '192.168.4.20',
      port: 9092,
      status: 'standby',
      throughput: '120 KB/s',
      latency: '4 ms',
      uptime: '42d 18h',
      tagsCount: 3320
    }
  ];

  recentLogs: ServerLog[] = [
    {
      id: 'LOG-4821',
      timestamp: '16:02:14',
      level: 'success',
      source: 'SRV-MODBUS-01',
      message: 'Polled 1840 PLC tags successfully with 0 parity errors.'
    },
    {
      id: 'LOG-4820',
      timestamp: '15:58:30',
      level: 'info',
      source: 'SRV-OPCUA-02',
      message: 'Client session auto-renewed for Turbine-04 telemetry pipe.'
    },
    {
      id: 'LOG-4819',
      timestamp: '15:54:12',
      level: 'warn',
      source: 'SRV-MQTT-03',
      message: 'Sensor TS-809 packet jitter detected (+18ms). Re-routed.'
    },
    {
      id: 'LOG-4818',
      timestamp: '15:45:00',
      level: 'info',
      source: 'CLUSTER-SYNC',
      message: 'State snapshot synchronized with standby node SRV-FAILOVER-04.'
    }
  ];

  restartNode(node: ServerNode): void {
    alert(`Re-initializing network interface for ${node.name} (${node.ipAddress}:${node.port})`);
  }

  pingCluster(): void {
    alert('Cluster health check: All 4 data gateway nodes responded in < 15ms.');
  }
}
