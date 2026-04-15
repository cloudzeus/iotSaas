export interface SessionUser {
  id: string;
  email: string;
  name: string;
  tenantId?: string;
  role: string;
  preferredLang: string;
  preferredTheme: string;
}

export interface User {
  id: string;
  tenantId?: string;
  email: string;
  name: string;
  role: string;
  preferredLang: string;
  preferredTheme: string;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Tenant {
  id: string;
  slug: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  planId?: string;
  status: string;
  billingCycleDay: number;
  deviceCount: number;
  softoneCustomerId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Plan {
  id: string;
  name: string;
  minDevices: number;
  maxDevices?: number;
  pricePerDevice: number;
  alertLimitPerDevicePerMonth: number;
  dataRetentionDays?: number;
  features: Record<string, unknown>;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Device {
  id: string;
  tenantId: string;
  devEui: string;
  name: string;
  type?: string;
  model?: string;
  milesightDeviceId?: string;
  status: string;
  lastSeen?: Date;
  batteryPct?: number;
  rssi?: number;
  snr?: number;
  location?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface DeviceLog {
  id: bigint;
  deviceId: string;
  tenantId: string;
  receivedAt: Date;
  devEui: string;
  fPort?: number;
  fCnt?: number;
  rssi?: number;
  snr?: number;
  dataRate?: string;
  frequency?: string;
  rawHex?: string;
  decodedPayload?: Record<string, unknown>;
  eventType: string;
  isDuplicate: boolean;
  gatewayId?: string;
  createdAt: Date;
}

export interface Telemetry {
  id: bigint;
  deviceLogId?: bigint;
  deviceId: string;
  tenantId: string;
  fieldKey: string;
  fieldValue: number;
  unit?: string;
  recordedAt: Date;
}

export interface AlertRule {
  id: string;
  tenantId: string;
  deviceId?: string;
  name: string;
  conditionField: string;
  conditionOp: string;
  conditionValue?: number;
  severity: string;
  channels: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AlertEvent {
  id: string;
  tenantId: string;
  deviceId: string;
  alertRuleId?: string;
  message: string;
  severity: string;
  firedAt: Date;
  resolvedAt?: Date;
  yearMonth: string;
}

export interface Invoice {
  id: string;
  tenantId: string;
  periodYear: number;
  periodMonth: number;
  deviceCount: number;
  unitPrice: number;
  amount: number;
  status: string;
  vivaOrderCode?: string;
  vivaTransactionId?: string;
  softoneInvoiceId?: string;
  pdfUrl?: string;
  paidAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Dashboard {
  id: string;
  tenantId: string;
  name: string;
  isDefault: boolean;
  layout: unknown[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Widget {
  id: string;
  dashboardId: string;
  type: string;
  title: string;
  config: Record<string, unknown>;
  position: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    pageSize: number;
    pages: number;
  };
}
