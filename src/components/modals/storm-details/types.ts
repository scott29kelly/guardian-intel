import { CloudLightning, Wind, CloudRain, Zap } from "lucide-react";

export interface StormEvent {
  id: string;
  type: string;
  date: Date;
  location: string;
  county: string;
  state?: string;
  latitude?: number;
  longitude?: number;
  hailSize?: number;
  windSpeed?: number;
  severity: string;
  affectedCustomers: number;
  inspectionsPending: number;
  claimsFiled: number;
  opportunity: number;
}

export interface ForecastPeriod {
  name: string;
  startTime: string;
  endTime: string;
  temperature: number;
  temperatureUnit: string;
  windSpeed: string;
  windDirection: string;
  icon: string;
  shortForecast: string;
  detailedForecast: string;
  probabilityOfPrecipitation?: number;
}

export interface WeatherAlert {
  id: string;
  type: string;
  severity: string;
  headline: string;
  description: string;
  instruction?: string;
  areas: string[];
  onset: string;
  expires: string;
}

export interface ForecastData {
  latitude: number;
  longitude: number;
  periods: ForecastPeriod[];
  alerts: WeatherAlert[];
}

export interface AffectedCustomer {
  id: string;
  name: string;
  address: string;
  phone: string;
  status: string;
}

export const stormTypeIcons: Record<string, typeof CloudLightning> = {
  hail: CloudRain,
  wind: Wind,
  thunderstorm: Zap,
  tornado: CloudLightning,
};

export const severityColors: Record<string, string> = {
  minor: "bg-guardian-500/20 text-guardian-400 border-guardian-500/30",
  moderate: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  severe: "bg-rose-500/20 text-rose-400 border-rose-500/30",
  catastrophic: "bg-purple-500/20 text-purple-400 border-purple-500/30",
};

export const statusLabels: Record<string, { label: string; color: string }> = {
  not_contacted: { label: "Not Contacted", color: "bg-surface-500/20 text-surface-400" },
  contacted: { label: "Contacted", color: "bg-blue-500/20 text-blue-400" },
  pending_inspection: { label: "Pending Inspection", color: "bg-amber-500/20 text-amber-400" },
  claim_filed: { label: "Claim Filed", color: "bg-emerald-500/20 text-emerald-400" },
};

export const locationCoords: Record<string, { lat: number; lon: number; state: string }> = {
  "Southampton, PA": { lat: 40.1773, lon: -75.0035, state: "PA" },
  "Doylestown, PA": { lat: 40.3101, lon: -75.1299, state: "PA" },
  "Bensalem, PA": { lat: 40.1046, lon: -74.9518, state: "PA" },
  "Fredericksburg, VA": { lat: 38.3032, lon: -77.4605, state: "VA" },
};

export const mockAffectedCustomers: AffectedCustomer[] = [
  { id: "1", name: "Robert Chen", address: "123 Oak Lane", phone: "(555) 234-5678", status: "pending_inspection" },
  { id: "2", name: "Michael Davis", address: "456 Elm Street", phone: "(555) 345-6789", status: "claim_filed" },
  { id: "3", name: "Jennifer Walsh", address: "789 Pine Ave", phone: "(555) 456-7890", status: "contacted" },
  { id: "4", name: "Thomas Anderson", address: "321 Maple Dr", phone: "(555) 567-8901", status: "not_contacted" },
  { id: "5", name: "Patricia Williams", address: "654 Cedar Blvd", phone: "(555) 678-9012", status: "not_contacted" },
];

export type TabId = "overview" | "forecast" | "alerts";
