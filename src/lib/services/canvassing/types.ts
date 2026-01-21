export interface CanvassingLead {
  id: string;
  externalId?: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  latitude: number;
  longitude: number;
  status: CanvassingPinStatus;
  priority: "low" | "medium" | "high" | "urgent";
  customerId?: string;
  territoryId?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export type CanvassingPinStatus =
  | "new"
  | "not_home"
  | "contacted"
  | "interested"
  | "appointment_set"
  | "callback_requested"
  | "not_interested"
  | "do_not_knock"
  | "completed";

export interface CanvassingRoute {
  id: string;
  externalId?: string;
  name: string;
  pins: CanvassingLead[];
  optimizedOrder?: number[];
  assignedRepId?: string;
  scheduledDate?: Date;
  status: "planned" | "in_progress" | "completed" | "cancelled";
  totalPins: number;
  estimatedDurationMinutes?: number;
  estimatedDistanceMiles?: number;
}

export interface PushLeadsResult {
  success: boolean;
  recordsProcessed: number;
  recordsCreated: number;
  recordsUpdated: number;
  recordsFailed: number;
  errors?: string[];
}

export interface CanvassingStats {
  totalPins: number;
  byStatus: Record<CanvassingPinStatus, number>;
  todayKnocks: number;
  weekKnocks: number;
  conversionRate: number;
  avgPinsPerRoute: number;
}

export interface CanvassingAdapter {
  testConnection(): Promise<boolean>;
  getSyncStatus(): { enabled: boolean; lastSync: Date | null; provider: string };
  getLeads(options?: { status?: CanvassingPinStatus; territoryId?: string }): Promise<CanvassingLead[]>;
  pushLeads(leads: Omit<CanvassingLead, "id" | "createdAt" | "updatedAt">[]): Promise<PushLeadsResult>;
  getRoutes(options?: { status?: string; assignedRepId?: string }): Promise<CanvassingRoute[]>;
  createRoute(options: {
    pinIds: string[];
    routeName?: string;
    assignedRepId?: string;
    scheduledDate?: Date;
    optimizeFor?: "distance" | "time" | "priority";
  }): Promise<CanvassingRoute>;
  getStats(options?: { repId?: string; territoryId?: string }): Promise<CanvassingStats>;
}
