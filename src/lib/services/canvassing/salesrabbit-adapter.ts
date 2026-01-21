import type {
  CanvassingAdapter,
  CanvassingLead,
  CanvassingRoute,
  CanvassingStats,
  CanvassingPinStatus,
  PushLeadsResult,
} from "./types";

// Demo pins clustered around storm-affected areas
const DEMO_PINS: CanvassingLead[] = [
  // Southampton, PA cluster (storm area)
  { id: "demo-1", firstName: "John", lastName: "Smith", address: "123 Street Rd", city: "Southampton", state: "PA", zipCode: "18966", latitude: 40.1851, longitude: -75.0035, status: "new", priority: "high" },
  { id: "demo-2", firstName: "Mary", lastName: "Johnson", address: "456 County Line Rd", city: "Southampton", state: "PA", zipCode: "18966", latitude: 40.1862, longitude: -75.0112, status: "contacted", priority: "high" },
  { id: "demo-3", firstName: "Robert", lastName: "Williams", address: "789 Second St Pike", city: "Southampton", state: "PA", zipCode: "18966", latitude: 40.1799, longitude: -75.0068, status: "interested", priority: "urgent" },
  { id: "demo-4", firstName: "Patricia", lastName: "Brown", address: "321 Bustleton Pike", city: "Southampton", state: "PA", zipCode: "18966", latitude: 40.1835, longitude: -74.9987, status: "appointment_set", priority: "high" },
  { id: "demo-5", firstName: "Michael", lastName: "Jones", address: "654 Philmont Ave", city: "Southampton", state: "PA", zipCode: "18966", latitude: 40.1878, longitude: -75.0145, status: "new", priority: "medium" },

  // Doylestown, PA cluster
  { id: "demo-6", firstName: "Linda", lastName: "Davis", address: "100 Main St", city: "Doylestown", state: "PA", zipCode: "18901", latitude: 40.3101, longitude: -75.1299, status: "new", priority: "medium" },
  { id: "demo-7", firstName: "William", lastName: "Miller", address: "200 State St", city: "Doylestown", state: "PA", zipCode: "18901", latitude: 40.3122, longitude: -75.1315, status: "not_home", priority: "medium" },
  { id: "demo-8", firstName: "Elizabeth", lastName: "Wilson", address: "300 Court St", city: "Doylestown", state: "PA", zipCode: "18901", latitude: 40.3089, longitude: -75.1278, status: "callback_requested", priority: "high" },
  { id: "demo-9", firstName: "David", lastName: "Moore", address: "400 Broad St", city: "Doylestown", state: "PA", zipCode: "18901", latitude: 40.3145, longitude: -75.1332, status: "new", priority: "low" },
  { id: "demo-10", firstName: "Barbara", lastName: "Taylor", address: "500 Oakland Ave", city: "Doylestown", state: "PA", zipCode: "18901", latitude: 40.3067, longitude: -75.1256, status: "interested", priority: "high" },

  // Bensalem, PA cluster
  { id: "demo-11", firstName: "James", lastName: "Anderson", address: "1000 Street Rd", city: "Bensalem", state: "PA", zipCode: "19020", latitude: 40.1045, longitude: -74.9512, status: "new", priority: "high" },
  { id: "demo-12", firstName: "Jennifer", lastName: "Thomas", address: "1100 Neshaminy Blvd", city: "Bensalem", state: "PA", zipCode: "19020", latitude: 40.1078, longitude: -74.9489, status: "contacted", priority: "medium" },
  { id: "demo-13", firstName: "Richard", lastName: "Jackson", address: "1200 Bristol Pike", city: "Bensalem", state: "PA", zipCode: "19020", latitude: 40.0989, longitude: -74.9534, status: "not_interested", priority: "low" },
  { id: "demo-14", firstName: "Susan", lastName: "White", address: "1300 Hulmeville Rd", city: "Bensalem", state: "PA", zipCode: "19020", latitude: 40.1112, longitude: -74.9567, status: "new", priority: "medium" },
  { id: "demo-15", firstName: "Joseph", lastName: "Harris", address: "1400 Knights Rd", city: "Bensalem", state: "PA", zipCode: "19020", latitude: 40.1023, longitude: -74.9445, status: "appointment_set", priority: "urgent" },

  // Fredericksburg, VA cluster
  { id: "demo-16", firstName: "Margaret", lastName: "Martin", address: "500 William St", city: "Fredericksburg", state: "VA", zipCode: "22401", latitude: 38.3032, longitude: -77.4605, status: "new", priority: "high" },
  { id: "demo-17", firstName: "Charles", lastName: "Thompson", address: "600 Princess Anne St", city: "Fredericksburg", state: "VA", zipCode: "22401", latitude: 38.3056, longitude: -77.4623, status: "contacted", priority: "medium" },
  { id: "demo-18", firstName: "Dorothy", lastName: "Garcia", address: "700 Caroline St", city: "Fredericksburg", state: "VA", zipCode: "22401", latitude: 38.3018, longitude: -77.4589, status: "interested", priority: "high" },
  { id: "demo-19", firstName: "Thomas", lastName: "Martinez", address: "800 Charles St", city: "Fredericksburg", state: "VA", zipCode: "22401", latitude: 38.3078, longitude: -77.4645, status: "new", priority: "medium" },
  { id: "demo-20", firstName: "Nancy", lastName: "Robinson", address: "900 Hanover St", city: "Fredericksburg", state: "VA", zipCode: "22401", latitude: 38.2998, longitude: -77.4567, status: "callback_requested", priority: "high" },

  // Cherry Hill, NJ cluster
  { id: "demo-21", firstName: "Daniel", lastName: "Clark", address: "100 Haddonfield Rd", city: "Cherry Hill", state: "NJ", zipCode: "08002", latitude: 39.9346, longitude: -75.0307, status: "new", priority: "medium" },
  { id: "demo-22", firstName: "Lisa", lastName: "Rodriguez", address: "200 Route 70", city: "Cherry Hill", state: "NJ", zipCode: "08002", latitude: 39.9312, longitude: -75.0289, status: "not_home", priority: "medium" },
  { id: "demo-23", firstName: "Paul", lastName: "Lewis", address: "300 Kings Hwy", city: "Cherry Hill", state: "NJ", zipCode: "08002", latitude: 39.9378, longitude: -75.0334, status: "contacted", priority: "low" },
  { id: "demo-24", firstName: "Karen", lastName: "Lee", address: "400 Chapel Ave", city: "Cherry Hill", state: "NJ", zipCode: "08002", latitude: 39.9289, longitude: -75.0256, status: "new", priority: "high" },
  { id: "demo-25", firstName: "Mark", lastName: "Walker", address: "500 Marlton Pike", city: "Cherry Hill", state: "NJ", zipCode: "08002", latitude: 39.9401, longitude: -75.0367, status: "interested", priority: "high" },
];

const DEMO_ROUTES: CanvassingRoute[] = [
  {
    id: "route-1",
    name: "Southampton Storm Route",
    pins: DEMO_PINS.slice(0, 5),
    optimizedOrder: [0, 1, 2, 3, 4],
    status: "planned",
    totalPins: 5,
    estimatedDurationMinutes: 120,
    estimatedDistanceMiles: 8.5,
  },
  {
    id: "route-2",
    name: "Doylestown Follow-up",
    pins: DEMO_PINS.slice(5, 10),
    optimizedOrder: [0, 2, 4, 1, 3],
    status: "in_progress",
    totalPins: 5,
    estimatedDurationMinutes: 150,
    estimatedDistanceMiles: 12.3,
  },
];

export class SalesRabbitAdapter implements CanvassingAdapter {
  private apiKey: string | null;
  private teamId: string | null;
  private isDemoMode: boolean;
  private lastSync: Date | null = null;

  constructor() {
    this.apiKey = process.env.SALESRABBIT_API_KEY || null;
    this.teamId = process.env.SALESRABBIT_TEAM_ID || null;
    this.isDemoMode = !this.apiKey || !this.teamId;
  }

  async testConnection(): Promise<boolean> {
    if (this.isDemoMode) {
      return true;
    }

    try {
      const response = await fetch("https://api.salesrabbit.com/v1/users/me", {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "X-Team-ID": this.teamId!,
        },
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  getSyncStatus(): { enabled: boolean; lastSync: Date | null; provider: string } {
    return {
      enabled: true,
      lastSync: this.lastSync,
      provider: this.isDemoMode ? "demo" : "salesrabbit",
    };
  }

  async getLeads(options?: { status?: CanvassingPinStatus; territoryId?: string }): Promise<CanvassingLead[]> {
    if (this.isDemoMode) {
      let leads = [...DEMO_PINS];
      if (options?.status) {
        leads = leads.filter((l) => l.status === options.status);
      }
      this.lastSync = new Date();
      return leads;
    }

    try {
      const response = await fetch("https://api.salesrabbit.com/v1/leads", {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "X-Team-ID": this.teamId!,
        },
      });

      if (!response.ok) {
        throw new Error(`SalesRabbit API error: ${response.status}`);
      }

      const data = await response.json();
      this.lastSync = new Date();
      return this.mapSalesRabbitLeads(data.leads || []);
    } catch (error) {
      console.error("[SalesRabbit] getLeads error:", error);
      return [];
    }
  }

  async pushLeads(leads: Omit<CanvassingLead, "id" | "createdAt" | "updatedAt">[]): Promise<PushLeadsResult> {
    if (this.isDemoMode) {
      // Simulate successful push in demo mode
      return {
        success: true,
        recordsProcessed: leads.length,
        recordsCreated: leads.length,
        recordsUpdated: 0,
        recordsFailed: 0,
      };
    }

    try {
      const response = await fetch("https://api.salesrabbit.com/v1/leads/batch", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "X-Team-ID": this.teamId!,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ leads: this.mapToSalesRabbitFormat(leads) }),
      });

      if (!response.ok) {
        throw new Error(`SalesRabbit API error: ${response.status}`);
      }

      const data = await response.json();
      return {
        success: true,
        recordsProcessed: leads.length,
        recordsCreated: data.created || 0,
        recordsUpdated: data.updated || 0,
        recordsFailed: data.failed || 0,
        errors: data.errors,
      };
    } catch (error) {
      console.error("[SalesRabbit] pushLeads error:", error);
      return {
        success: false,
        recordsProcessed: leads.length,
        recordsCreated: 0,
        recordsUpdated: 0,
        recordsFailed: leads.length,
        errors: [error instanceof Error ? error.message : "Unknown error"],
      };
    }
  }

  async getRoutes(options?: { status?: string; assignedRepId?: string }): Promise<CanvassingRoute[]> {
    if (this.isDemoMode) {
      let routes = [...DEMO_ROUTES];
      if (options?.status) {
        routes = routes.filter((r) => r.status === options.status);
      }
      return routes;
    }

    try {
      const params = new URLSearchParams();
      if (options?.status) params.set("status", options.status);
      if (options?.assignedRepId) params.set("assignedTo", options.assignedRepId);

      const response = await fetch(`https://api.salesrabbit.com/v1/routes?${params}`, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "X-Team-ID": this.teamId!,
        },
      });

      if (!response.ok) {
        throw new Error(`SalesRabbit API error: ${response.status}`);
      }

      const data = await response.json();
      return this.mapSalesRabbitRoutes(data.routes || []);
    } catch (error) {
      console.error("[SalesRabbit] getRoutes error:", error);
      return [];
    }
  }

  async createRoute(options: {
    pinIds: string[];
    routeName?: string;
    assignedRepId?: string;
    scheduledDate?: Date;
    optimizeFor?: "distance" | "time" | "priority";
  }): Promise<CanvassingRoute> {
    const pins = DEMO_PINS.filter((p) => options.pinIds.includes(p.id));
    const optimizedOrder = this.optimizeRoute(pins, options.optimizeFor || "distance");

    if (this.isDemoMode) {
      return {
        id: `route-${Date.now()}`,
        name: options.routeName || `Route ${new Date().toLocaleDateString()}`,
        pins,
        optimizedOrder,
        assignedRepId: options.assignedRepId,
        scheduledDate: options.scheduledDate,
        status: "planned",
        totalPins: pins.length,
        estimatedDurationMinutes: pins.length * 15,
        estimatedDistanceMiles: this.calculateRouteDistance(pins, optimizedOrder),
      };
    }

    try {
      const response = await fetch("https://api.salesrabbit.com/v1/routes", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "X-Team-ID": this.teamId!,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: options.routeName,
          leadIds: options.pinIds,
          assignedTo: options.assignedRepId,
          scheduledDate: options.scheduledDate?.toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error(`SalesRabbit API error: ${response.status}`);
      }

      const data = await response.json();
      return this.mapSalesRabbitRoute(data.route);
    } catch (error) {
      console.error("[SalesRabbit] createRoute error:", error);
      throw error;
    }
  }

  async getStats(options?: { repId?: string; territoryId?: string }): Promise<CanvassingStats> {
    if (this.isDemoMode) {
      const pins = DEMO_PINS;
      const byStatus = pins.reduce((acc, p) => {
        acc[p.status] = (acc[p.status] || 0) + 1;
        return acc;
      }, {} as Record<CanvassingPinStatus, number>);

      return {
        totalPins: pins.length,
        byStatus,
        todayKnocks: 12,
        weekKnocks: 47,
        conversionRate: 0.23,
        avgPinsPerRoute: 8,
      };
    }

    try {
      const params = new URLSearchParams();
      if (options?.repId) params.set("userId", options.repId);

      const response = await fetch(`https://api.salesrabbit.com/v1/stats?${params}`, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "X-Team-ID": this.teamId!,
        },
      });

      if (!response.ok) {
        throw new Error(`SalesRabbit API error: ${response.status}`);
      }

      const data = await response.json();
      return {
        totalPins: data.totalLeads || 0,
        byStatus: data.byStatus || {},
        todayKnocks: data.todayActivity || 0,
        weekKnocks: data.weekActivity || 0,
        conversionRate: data.conversionRate || 0,
        avgPinsPerRoute: data.avgLeadsPerRoute || 0,
      };
    } catch (error) {
      console.error("[SalesRabbit] getStats error:", error);
      return {
        totalPins: 0,
        byStatus: {} as Record<CanvassingPinStatus, number>,
        todayKnocks: 0,
        weekKnocks: 0,
        conversionRate: 0,
        avgPinsPerRoute: 0,
      };
    }
  }

  // Nearest-neighbor route optimization
  private optimizeRoute(pins: CanvassingLead[], strategy: "distance" | "time" | "priority"): number[] {
    if (pins.length <= 2) return pins.map((_, i) => i);

    // For priority strategy, sort by priority first then optimize within priority groups
    if (strategy === "priority") {
      const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
      const sorted = [...pins].sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
      return sorted.map((p) => pins.indexOf(p));
    }

    // Nearest-neighbor algorithm for distance/time
    const visited = new Set<number>();
    const order: number[] = [];
    let current = 0;

    while (order.length < pins.length) {
      visited.add(current);
      order.push(current);

      let nearest = -1;
      let nearestDist = Infinity;

      for (let i = 0; i < pins.length; i++) {
        if (!visited.has(i)) {
          const dist = this.haversineDistance(pins[current], pins[i]);
          if (dist < nearestDist) {
            nearestDist = dist;
            nearest = i;
          }
        }
      }

      if (nearest !== -1) {
        current = nearest;
      }
    }

    return order;
  }

  private haversineDistance(a: CanvassingLead, b: CanvassingLead): number {
    const R = 3959; // Earth's radius in miles
    const dLat = this.toRad(b.latitude - a.latitude);
    const dLon = this.toRad(b.longitude - a.longitude);
    const lat1 = this.toRad(a.latitude);
    const lat2 = this.toRad(b.latitude);

    const x =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
    const c = 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));

    return R * c;
  }

  private toRad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  private calculateRouteDistance(pins: CanvassingLead[], order: number[]): number {
    let total = 0;
    for (let i = 0; i < order.length - 1; i++) {
      total += this.haversineDistance(pins[order[i]], pins[order[i + 1]]);
    }
    return Math.round(total * 10) / 10;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private mapSalesRabbitLeads(leads: any[]): CanvassingLead[] {
    return leads.map((l) => ({
      id: l.id,
      externalId: l.id,
      firstName: l.firstName || "",
      lastName: l.lastName || "",
      email: l.email,
      phone: l.phone,
      address: l.address || "",
      city: l.city || "",
      state: l.state || "",
      zipCode: l.zip || "",
      latitude: l.latitude || 0,
      longitude: l.longitude || 0,
      status: this.mapStatus(l.status),
      priority: this.mapPriority(l.priority),
    }));
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private mapSalesRabbitRoutes(routes: any[]): CanvassingRoute[] {
    return routes.map((r) => this.mapSalesRabbitRoute(r));
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private mapSalesRabbitRoute(r: any): CanvassingRoute {
    return {
      id: r.id,
      externalId: r.id,
      name: r.name || "",
      pins: this.mapSalesRabbitLeads(r.leads || []),
      optimizedOrder: r.optimizedOrder,
      assignedRepId: r.assignedTo,
      scheduledDate: r.scheduledDate ? new Date(r.scheduledDate) : undefined,
      status: r.status || "planned",
      totalPins: r.leadCount || 0,
      estimatedDurationMinutes: r.estimatedMinutes,
      estimatedDistanceMiles: r.estimatedMiles,
    };
  }

  private mapToSalesRabbitFormat(leads: Omit<CanvassingLead, "id" | "createdAt" | "updatedAt">[]) {
    return leads.map((l) => ({
      firstName: l.firstName,
      lastName: l.lastName,
      email: l.email,
      phone: l.phone,
      address: l.address,
      city: l.city,
      state: l.state,
      zip: l.zipCode,
      latitude: l.latitude,
      longitude: l.longitude,
      status: l.status,
      customFields: {
        customerId: l.customerId,
        territoryId: l.territoryId,
      },
    }));
  }

  private mapStatus(status: string): CanvassingPinStatus {
    const statusMap: Record<string, CanvassingPinStatus> = {
      new: "new",
      not_home: "not_home",
      "Not Home": "not_home",
      contacted: "contacted",
      interested: "interested",
      appointment: "appointment_set",
      callback: "callback_requested",
      not_interested: "not_interested",
      dnk: "do_not_knock",
      completed: "completed",
    };
    return statusMap[status] || "new";
  }

  private mapPriority(priority: string): "low" | "medium" | "high" | "urgent" {
    const priorityMap: Record<string, "low" | "medium" | "high" | "urgent"> = {
      low: "low",
      medium: "medium",
      high: "high",
      urgent: "urgent",
      "1": "low",
      "2": "medium",
      "3": "high",
      "4": "urgent",
    };
    return priorityMap[priority] || "medium";
  }
}
