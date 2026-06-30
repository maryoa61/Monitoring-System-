export interface LogEntry {
  id: string;
  timestamp: string;
  type: "error" | "warning" | "info" | "success";
  message: string;
  core: string;
}

export interface BorderNode {
  id: string;
  name: string;
  country: string;
  ip: string;
  port: number;
  protocol: string;
  latency: number;
  stability: number; // percentage
  packetLoss: number;
  jitter: number;
  status: "active" | "standby" | "unstable";
}

export interface ConnectionParams {
  protocol: string;
  encryption: string;
  activePort: number;
  mtuSize: number;
  keepAlive: string;
  dnsAddress: string;
}

export interface DiagnosticResult {
  analysis: string;
  suggestions: string[];
  fixedConfig?: string;
  isCustomFixed?: boolean;
}
