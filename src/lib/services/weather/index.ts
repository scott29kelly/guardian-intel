/**
 * Weather Intelligence Service
 * 
 * Aggregates weather data from multiple sources:
 * - NOAA (National Weather Service)
 * - Weather API providers
 * - Hail trace services
 * 
 * Features:
 * - Real-time severe weather alerts
 * - Historical storm event lookup
 * - Hail/wind event detection for specific addresses
 * - Affected customer identification
 */

export interface WeatherAlert {
  id: string;
  type: "hail" | "wind" | "tornado" | "thunderstorm" | "flood" | "hurricane";
  severity: "minor" | "moderate" | "severe" | "catastrophic";
  headline: string;
  description: string;
  instruction?: string;
  
  // Location
  areas: string[];
  counties: string[];
  states: string[];
  polygon?: [number, number][];
  
  // Timing
  onset: Date;
  expires: Date;
  
  // Source
  source: "NWS" | "weather-api" | "hail-trace";
  sourceId: string;
}

export interface StormEvent {
  id: string;
  eventType: "hail" | "wind" | "tornado" | "thunderstorm";
  eventDate: Date;
  
  // Location
  latitude: number;
  longitude: number;
  city?: string;
  state: string;
  county?: string;
  zipCode?: string;
  
  // Measurements
  hailSize?: number;      // inches
  windSpeed?: number;     // mph
  windGust?: number;      // mph
  
  severity: "minor" | "moderate" | "severe" | "catastrophic";
  
  // Damage estimates
  propertyDamage?: number;
  injuryCount?: number;
  deathCount?: number;
  
  // Source
  source: string;
  sourceEventId?: string;
  rawData?: Record<string, unknown>;
}

export interface WeatherLookupResult {
  address: string;
  latitude: number;
  longitude: number;
  events: StormEvent[];
  alerts: WeatherAlert[];
  riskScore: number; // 0-100
  lastUpdated: Date;
}

class WeatherService {
  private noaaApiUrl = "https://api.weather.gov";
  private cacheTimeout = 15 * 60 * 1000; // 15 minutes
  private cache = new Map<string, { data: unknown; timestamp: number }>();

  /**
   * Get active weather alerts for a location
   */
  async getActiveAlerts(lat: number, lon: number): Promise<WeatherAlert[]> {
    const cacheKey = `alerts-${lat.toFixed(4)}-${lon.toFixed(4)}`;
    const cached = this.getFromCache<WeatherAlert[]>(cacheKey);
    if (cached) return cached;

    try {
      // Get point metadata first
      const pointRes = await fetch(`${this.noaaApiUrl}/points/${lat},${lon}`);
      if (!pointRes.ok) throw new Error("Failed to get point data");
      const pointData = await pointRes.json();

      // Get alerts for the zone
      const zoneId = pointData.properties.forecastZone?.split("/").pop();
      if (!zoneId) return [];

      const alertRes = await fetch(`${this.noaaApiUrl}/alerts/active?zone=${zoneId}`);
      if (!alertRes.ok) return [];
      const alertData = await alertRes.json();

      const alerts: WeatherAlert[] = (alertData.features || []).map((feature: any) => ({
        id: feature.id,
        type: this.mapAlertType(feature.properties.event),
        severity: this.mapSeverity(feature.properties.severity),
        headline: feature.properties.headline,
        description: feature.properties.description,
        instruction: feature.properties.instruction,
        areas: feature.properties.areaDesc?.split("; ") || [],
        counties: [],
        states: [],
        onset: new Date(feature.properties.onset),
        expires: new Date(feature.properties.expires),
        source: "NWS",
        sourceId: feature.properties.id,
      }));

      this.setCache(cacheKey, alerts);
      return alerts;
    } catch (error) {
      console.error("[Weather] Error fetching alerts:", error);
      return [];
    }
  }

  /**
   * Get historical storm events for a location within a date range
   */
  async getHistoricalEvents(
    lat: number,
    lon: number,
    startDate: Date,
    endDate: Date = new Date()
  ): Promise<StormEvent[]> {
    // In production, this would query NOAA Storm Events Database
    // or a commercial provider like Hail Trace
    
    const cacheKey = `history-${lat.toFixed(4)}-${lon.toFixed(4)}-${startDate.toISOString()}`;
    const cached = this.getFromCache<StormEvent[]>(cacheKey);
    if (cached) return cached;

    // Mock implementation - replace with real API calls
    const mockEvents: StormEvent[] = this.generateMockHistoricalEvents(lat, lon, startDate, endDate);
    
    this.setCache(cacheKey, mockEvents);
    return mockEvents;
  }

  /**
   * Check if an address was affected by recent storms
   */
  async checkAddressForStorms(
    address: string,
    city: string,
    state: string,
    zipCode: string,
    lookbackDays: number = 90
  ): Promise<WeatherLookupResult> {
    // Geocode the address (in production, use a geocoding service)
    const coords = await this.geocodeAddress(address, city, state, zipCode);
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - lookbackDays);

    const [events, alerts] = await Promise.all([
      this.getHistoricalEvents(coords.lat, coords.lon, startDate),
      this.getActiveAlerts(coords.lat, coords.lon),
    ]);

    // Calculate risk score based on events
    const riskScore = this.calculateRiskScore(events);

    return {
      address: `${address}, ${city}, ${state} ${zipCode}`,
      latitude: coords.lat,
      longitude: coords.lon,
      events,
      alerts,
      riskScore,
      lastUpdated: new Date(),
    };
  }

  /**
   * Get all customers in an affected area
   */
  async getAffectedCustomerIds(
    centerLat: number,
    centerLon: number,
    radiusMiles: number
  ): Promise<string[]> {
    // In production, this would query the database for customers
    // within the radius using Haversine formula or PostGIS
    
    // For now, return empty array - implement with Prisma query
    console.log(`[Weather] Finding customers within ${radiusMiles} miles of ${centerLat}, ${centerLon}`);
    return [];
  }

  /**
   * Geocode an address to lat/lon
   */
  private async geocodeAddress(
    address: string,
    city: string,
    state: string,
    zipCode: string
  ): Promise<{ lat: number; lon: number }> {
    // In production, use Google Maps, Mapbox, or Census Geocoder
    // For now, use approximate coordinates based on zip code
    
    const zipCoords: Record<string, { lat: number; lon: number }> = {
      "43215": { lat: 39.9612, lon: -82.9988 },
      "43017": { lat: 40.0992, lon: -83.1140 },
      "43081": { lat: 40.1262, lon: -82.9296 },
      "43065": { lat: 40.1578, lon: -83.0752 },
      "43068": { lat: 39.9551, lon: -82.8133 },
    };

    return zipCoords[zipCode] || { lat: 40.1773, lon: -75.0035 }; // Default to Southampton, PA (Guardian HQ)
  }

  /**
   * Map NWS event types to our simplified types
   */
  private mapAlertType(event: string): WeatherAlert["type"] {
    const lower = event.toLowerCase();
    if (lower.includes("hail")) return "hail";
    if (lower.includes("tornado")) return "tornado";
    if (lower.includes("wind")) return "wind";
    if (lower.includes("flood")) return "flood";
    if (lower.includes("hurricane") || lower.includes("tropical")) return "hurricane";
    return "thunderstorm";
  }

  /**
   * Map NWS severity to our levels
   */
  private mapSeverity(severity: string): WeatherAlert["severity"] {
    switch (severity?.toLowerCase()) {
      case "extreme": return "catastrophic";
      case "severe": return "severe";
      case "moderate": return "moderate";
      default: return "minor";
    }
  }

  /**
   * Calculate storm damage risk score
   */
  private calculateRiskScore(events: StormEvent[]): number {
    if (events.length === 0) return 0;

    let score = 0;
    const now = new Date();

    for (const event of events) {
      const daysAgo = (now.getTime() - event.eventDate.getTime()) / (1000 * 60 * 60 * 24);
      const recencyMultiplier = Math.max(0, 1 - daysAgo / 90); // Decay over 90 days

      let eventScore = 0;
      
      // Hail scoring
      if (event.hailSize) {
        if (event.hailSize >= 2) eventScore += 40;
        else if (event.hailSize >= 1) eventScore += 25;
        else if (event.hailSize >= 0.75) eventScore += 15;
        else eventScore += 5;
      }

      // Wind scoring
      if (event.windSpeed) {
        if (event.windSpeed >= 80) eventScore += 40;
        else if (event.windSpeed >= 60) eventScore += 25;
        else if (event.windSpeed >= 45) eventScore += 15;
      }

      // Severity multiplier
      const severityMultipliers: Record<string, number> = {
        catastrophic: 1.5,
        severe: 1.25,
        moderate: 1.0,
        minor: 0.75,
      };
      
      eventScore *= severityMultipliers[event.severity] || 1;
      eventScore *= recencyMultiplier;
      
      score += eventScore;
    }

    return Math.min(100, Math.round(score));
  }

  /**
   * Generate mock historical events for development
   */
  private generateMockHistoricalEvents(
    lat: number,
    lon: number,
    startDate: Date,
    endDate: Date
  ): StormEvent[] {
    // Generate realistic mock data for Mid-Atlantic region (PA, NJ, DE, MD, VA, NY)
    const events: StormEvent[] = [];
    const random = () => Math.random();

    // Add a few random events
    const eventCount = Math.floor(random() * 4);
    
    for (let i = 0; i < eventCount; i++) {
      const eventDate = new Date(
        startDate.getTime() + random() * (endDate.getTime() - startDate.getTime())
      );

      const isHail = random() > 0.4;
      
      events.push({
        id: `mock-${i}-${Date.now()}`,
        eventType: isHail ? "hail" : "wind",
        eventDate,
        latitude: lat + (random() - 0.5) * 0.1,
        longitude: lon + (random() - 0.5) * 0.1,
        state: "OH",
        hailSize: isHail ? 0.5 + random() * 1.5 : undefined,
        windSpeed: !isHail ? 45 + random() * 40 : undefined,
        severity: random() > 0.7 ? "severe" : random() > 0.4 ? "moderate" : "minor",
        source: "mock-data",
      });
    }

    return events.sort((a, b) => b.eventDate.getTime() - a.eventDate.getTime());
  }

  /**
   * Cache helpers
   */
  private getFromCache<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data as T;
    }
    return null;
  }

  private setCache(key: string, data: unknown): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }
}

export const weatherService = new WeatherService();

// ============================================================
// Re-export NOAA and Storm Intel services
// ============================================================

export * from "./noaa-service";
export * from "./storm-intel-service";
