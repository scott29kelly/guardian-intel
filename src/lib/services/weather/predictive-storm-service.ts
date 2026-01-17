/**
 * Predictive Storm Service
 * 
 * Analyzes weather forecasts to predict storm threats 72 hours in advance.
 * Enables first-mover advantage by identifying affected areas before storms hit.
 * 
 * Data Sources:
 * - NWS Forecast API (7-day forecasts)
 * - Storm Prediction Center Outlooks
 * - NWS Alerts for active watches/warnings
 */

import { noaaWeatherService, type ForecastPeriod, type WeatherAlert } from "./noaa-service";
import { prisma } from "@/lib/prisma";

// ============================================================
// Types
// ============================================================

export interface StormPrediction {
  id: string;
  type: "hail" | "wind" | "tornado" | "thunderstorm" | "mixed";
  severity: "marginal" | "slight" | "enhanced" | "moderate" | "high";
  probability: number; // 0-100
  
  // Timing
  expectedStart: Date;
  expectedEnd: Date;
  hoursUntil: number;
  
  // Location
  latitude: number;
  longitude: number;
  affectedArea: {
    states: string[];
    counties: string[];
    zipCodes: string[];
    radiusMiles: number;
  };
  
  // Threat details
  threats: {
    hailProbability: number;
    hailSizeRange: string; // e.g., "1-2 inches"
    windProbability: number;
    windSpeedRange: string; // e.g., "60-80 mph"
    tornadoProbability: number;
  };
  
  // Business impact
  potentialAffectedCustomers: number;
  estimatedDamageValue: number;
  
  // Recommendations
  recommendation: string;
  priorityLevel: "watch" | "prepare" | "urgent" | "critical";
  
  // Metadata
  source: string;
  confidence: number; // 0-100
  createdAt: Date;
  updatedAt: Date;
}

export interface PredictiveAlertSummary {
  totalPredictions: number;
  urgentCount: number;
  next24Hours: StormPrediction[];
  next48Hours: StormPrediction[];
  next72Hours: StormPrediction[];
  byState: Record<string, StormPrediction[]>;
  totalAffectedCustomers: number;
  totalPotentialValue: number;
}

export interface AffectedCustomer {
  id: string;
  firstName: string;
  lastName: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  phone: string | null;
  leadScore: number;
  estimatedJobValue: number | null;
  distanceFromCenter: number;
  stormPredictionId: string;
}

// ============================================================
// Service Class
// ============================================================

class PredictiveStormService {
  private spcBaseUrl = "https://www.spc.noaa.gov";
  private userAgent = "GuardianIntel/1.0 (contact@guardian-intel.com)";
  
  // Service territory - states we operate in
  private serviceStates = ["PA", "NJ", "DE", "MD", "VA", "NY", "OH", "WV"];
  
  // Key cities for forecast checks (central points of service areas)
  private monitoringLocations = [
    { name: "Philadelphia", lat: 39.9526, lon: -75.1652, state: "PA" },
    { name: "Pittsburgh", lat: 40.4406, lon: -79.9959, state: "PA" },
    { name: "Trenton", lat: 40.2206, lon: -74.7597, state: "NJ" },
    { name: "Wilmington", lat: 39.7391, lon: -75.5398, state: "DE" },
    { name: "Baltimore", lat: 39.2904, lon: -76.6122, state: "MD" },
    { name: "Richmond", lat: 37.5407, lon: -77.4360, state: "VA" },
    { name: "New York", lat: 40.7128, lon: -74.0060, state: "NY" },
    { name: "Columbus", lat: 39.9612, lon: -82.9988, state: "OH" },
  ];

  // ============================================================
  // Main Prediction Methods
  // ============================================================

  /**
   * Get all storm predictions for the next 72 hours
   */
  async getPredictions(options?: {
    state?: string;
    hoursAhead?: number;
    minSeverity?: StormPrediction["severity"];
  }): Promise<StormPrediction[]> {
    const hoursAhead = options?.hoursAhead || 72;
    const predictions: StormPrediction[] = [];
    
    // 1. Check SPC Outlooks for severe weather potential
    const outlooks = await this.fetchSPCOutlooks();
    
    // 2. Get forecasts for each monitoring location
    const forecasts = await this.fetchLocationForecasts();
    
    // 3. Analyze forecasts for storm indicators
    for (const forecast of forecasts) {
      const stormPeriods = this.analyzeForStormPotential(forecast.periods, forecast.location);
      
      for (const period of stormPeriods) {
        // Only include if within time window
        const hoursUntil = (period.startTime.getTime() - Date.now()) / (1000 * 60 * 60);
        if (hoursUntil > 0 && hoursUntil <= hoursAhead) {
          const prediction = await this.buildPrediction(period, forecast, outlooks);
          if (prediction) {
            predictions.push(prediction);
          }
        }
      }
    }
    
    // 4. Add any active SPC outlooks as predictions
    for (const outlook of outlooks) {
      if (options?.state && !outlook.affectedStates.includes(options.state)) continue;
      
      const hoursUntil = (outlook.validTime.getTime() - Date.now()) / (1000 * 60 * 60);
      if (hoursUntil > 0 && hoursUntil <= hoursAhead) {
        predictions.push(this.outlookToPrediction(outlook));
      }
    }
    
    // Filter by state if specified
    let filtered = predictions;
    if (options?.state) {
      filtered = predictions.filter(p => 
        p.affectedArea.states.includes(options.state!)
      );
    }
    
    // Filter by minimum severity
    if (options?.minSeverity) {
      const severityOrder = ["marginal", "slight", "enhanced", "moderate", "high"];
      const minIndex = severityOrder.indexOf(options.minSeverity);
      filtered = filtered.filter(p => 
        severityOrder.indexOf(p.severity) >= minIndex
      );
    }
    
    // Sort by hours until (soonest first)
    return filtered.sort((a, b) => a.hoursUntil - b.hoursUntil);
  }

  /**
   * Get predictions summary for dashboard
   */
  async getPredictionSummary(): Promise<PredictiveAlertSummary> {
    const predictions = await this.getPredictions({ hoursAhead: 72 });
    const now = Date.now();
    
    const next24Hours = predictions.filter(p => p.hoursUntil <= 24);
    const next48Hours = predictions.filter(p => p.hoursUntil > 24 && p.hoursUntil <= 48);
    const next72Hours = predictions.filter(p => p.hoursUntil > 48 && p.hoursUntil <= 72);
    
    // Group by state
    const byState: Record<string, StormPrediction[]> = {};
    for (const prediction of predictions) {
      for (const state of prediction.affectedArea.states) {
        if (!byState[state]) byState[state] = [];
        byState[state].push(prediction);
      }
    }
    
    return {
      totalPredictions: predictions.length,
      urgentCount: predictions.filter(p => p.priorityLevel === "urgent" || p.priorityLevel === "critical").length,
      next24Hours,
      next48Hours,
      next72Hours,
      byState,
      totalAffectedCustomers: predictions.reduce((sum, p) => sum + p.potentialAffectedCustomers, 0),
      totalPotentialValue: predictions.reduce((sum, p) => sum + p.estimatedDamageValue, 0),
    };
  }

  /**
   * Get customers who will be affected by a predicted storm
   */
  async getAffectedCustomers(predictionId: string): Promise<AffectedCustomer[]> {
    // Parse prediction ID to get location info
    const [, lat, lon, radius] = predictionId.split("-");
    const centerLat = parseFloat(lat);
    const centerLon = parseFloat(lon);
    const radiusMiles = parseFloat(radius) || 25;
    
    // Query customers near the prediction center
    // Using bounding box approximation (1 degree ≈ 69 miles)
    const latDelta = radiusMiles / 69;
    const lonDelta = radiusMiles / (69 * Math.cos(centerLat * Math.PI / 180));
    
    const customers = await prisma.customer.findMany({
      where: {
        latitude: { gte: centerLat - latDelta, lte: centerLat + latDelta },
        longitude: { gte: centerLon - lonDelta, lte: centerLon + lonDelta },
        status: { in: ["lead", "prospect", "customer"] },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        address: true,
        city: true,
        state: true,
        zipCode: true,
        phone: true,
        leadScore: true,
        estimatedJobValue: true,
        latitude: true,
        longitude: true,
      },
      orderBy: { leadScore: "desc" },
      take: 100,
    });
    
    // Calculate actual distance and filter
    return customers
      .map(c => ({
        ...c,
        distanceFromCenter: this.getDistanceMiles(
          centerLat, centerLon,
          c.latitude || centerLat, c.longitude || centerLon
        ),
        stormPredictionId: predictionId,
      }))
      .filter(c => c.distanceFromCenter <= radiusMiles)
      .sort((a, b) => b.leadScore - a.leadScore);
  }

  /**
   * Get customers in predicted storm path by ZIP codes
   */
  async getCustomersByPredictedZips(zipCodes: string[]): Promise<AffectedCustomer[]> {
    const customers = await prisma.customer.findMany({
      where: {
        zipCode: { in: zipCodes },
        status: { in: ["lead", "prospect", "customer"] },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        address: true,
        city: true,
        state: true,
        zipCode: true,
        phone: true,
        leadScore: true,
        estimatedJobValue: true,
        latitude: true,
        longitude: true,
      },
      orderBy: { leadScore: "desc" },
    });
    
    return customers.map(c => ({
      ...c,
      distanceFromCenter: 0,
      stormPredictionId: `zip-${zipCodes.join(",")}`,
    }));
  }

  // ============================================================
  // SPC Outlook Fetching
  // ============================================================

  private async fetchSPCOutlooks(): Promise<SPCOutlook[]> {
    const outlooks: SPCOutlook[] = [];
    
    try {
      // Fetch Day 1, 2, and 3 outlooks
      for (const day of [1, 2, 3]) {
        const outlook = await this.fetchDayOutlook(day);
        if (outlook) outlooks.push(outlook);
      }
    } catch (error) {
      console.error("[Predictive] Failed to fetch SPC outlooks:", error);
    }
    
    return outlooks;
  }

  private async fetchDayOutlook(day: number): Promise<SPCOutlook | null> {
    try {
      // SPC provides GeoJSON outlooks
      const url = `${this.spcBaseUrl}/products/outlook/day${day}otlk_cat.lyr.geojson`;
      
      const response = await fetch(url, {
        headers: { "User-Agent": this.userAgent },
        next: { revalidate: 3600 }, // Cache for 1 hour
      });
      
      if (!response.ok) return null;
      
      const data = await response.json();
      if (!data.features || data.features.length === 0) return null;
      
      // Find the highest risk category
      const maxRisk = data.features.reduce((max: any, f: any) => {
        const risk = this.parseSPCRisk(f.properties?.LABEL || f.properties?.DN);
        return risk > max.risk ? { risk, feature: f } : max;
      }, { risk: 0, feature: null });
      
      if (!maxRisk.feature) return null;
      
      // Calculate affected states from geometry
      const affectedStates = this.getStatesFromGeometry(maxRisk.feature.geometry);
      
      const validTime = new Date();
      validTime.setDate(validTime.getDate() + day - 1);
      validTime.setHours(12, 0, 0, 0);
      
      return {
        day,
        category: this.riskToCategory(maxRisk.risk),
        validTime,
        affectedStates: affectedStates.filter(s => this.serviceStates.includes(s)),
        geometry: maxRisk.feature.geometry,
        probability: maxRisk.risk,
      };
    } catch (error) {
      console.error(`[Predictive] Failed to fetch day ${day} outlook:`, error);
      return null;
    }
  }

  private parseSPCRisk(label: string | number): number {
    if (typeof label === "number") return label;
    const l = String(label).toLowerCase();
    if (l.includes("high")) return 5;
    if (l.includes("mod")) return 4;
    if (l.includes("enh")) return 3;
    if (l.includes("slgt") || l.includes("slight")) return 2;
    if (l.includes("mrgl") || l.includes("marginal")) return 1;
    return 0;
  }

  private riskToCategory(risk: number): StormPrediction["severity"] {
    if (risk >= 5) return "high";
    if (risk >= 4) return "moderate";
    if (risk >= 3) return "enhanced";
    if (risk >= 2) return "slight";
    return "marginal";
  }

  private getStatesFromGeometry(geometry: any): string[] {
    // Simplified: check which monitoring locations fall within bounds
    const states = new Set<string>();
    
    if (geometry.type === "Polygon" || geometry.type === "MultiPolygon") {
      for (const loc of this.monitoringLocations) {
        // Simple bounding box check
        const coords = geometry.type === "Polygon" 
          ? geometry.coordinates[0] 
          : geometry.coordinates[0][0];
        
        if (this.pointInPolygon(loc.lat, loc.lon, coords)) {
          states.add(loc.state);
        }
      }
    }
    
    return Array.from(states);
  }

  private pointInPolygon(lat: number, lon: number, polygon: number[][]): boolean {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i][0], yi = polygon[i][1];
      const xj = polygon[j][0], yj = polygon[j][1];
      
      const intersect = ((yi > lat) !== (yj > lat))
        && (lon < (xj - xi) * (lat - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  }

  // ============================================================
  // Forecast Analysis
  // ============================================================

  private async fetchLocationForecasts(): Promise<LocationForecastData[]> {
    const forecasts: LocationForecastData[] = [];
    
    // Fetch forecasts in parallel for all monitoring locations
    const results = await Promise.allSettled(
      this.monitoringLocations.map(async loc => {
        const forecast = await noaaWeatherService.getForecast(loc.lat, loc.lon);
        return { location: loc, forecast };
      })
    );
    
    for (const result of results) {
      if (result.status === "fulfilled" && result.value.forecast) {
        forecasts.push({
          location: result.value.location,
          periods: result.value.forecast.periods,
          alerts: result.value.forecast.alerts,
        });
      }
    }
    
    return forecasts;
  }

  private analyzeForStormPotential(
    periods: ForecastPeriod[],
    location: { name: string; lat: number; lon: number; state: string }
  ): StormPotentialPeriod[] {
    const stormPeriods: StormPotentialPeriod[] = [];
    
    for (const period of periods) {
      const forecast = period.detailedForecast.toLowerCase();
      const shortForecast = period.shortForecast.toLowerCase();
      
      // Look for storm indicators
      const hasThunderstorm = forecast.includes("thunderstorm") || shortForecast.includes("thunderstorm");
      const hasStorm = forecast.includes("storm") || shortForecast.includes("storm");
      const hasHail = forecast.includes("hail");
      const hasTornado = forecast.includes("tornado");
      const hasWind = forecast.includes("damaging wind") || forecast.includes("high wind");
      const hasSevere = forecast.includes("severe");
      
      if (hasThunderstorm || hasStorm || hasHail || hasTornado || hasSevere) {
        // Parse wind speed from forecast
        const windMatch = period.windSpeed.match(/(\d+)/);
        const windSpeed = windMatch ? parseInt(windMatch[1]) : 0;
        
        // Calculate threat probabilities
        const hailProbability = hasHail ? 60 : (hasSevere ? 30 : 10);
        const windProbability = hasWind ? 70 : (windSpeed >= 25 ? 50 : 20);
        const tornadoProbability = hasTornado ? 40 : (hasSevere ? 10 : 2);
        
        // Determine type and severity
        let type: StormPrediction["type"] = "thunderstorm";
        if (hasHail && hasWind) type = "mixed";
        else if (hasHail) type = "hail";
        else if (hasTornado) type = "tornado";
        else if (hasWind) type = "wind";
        
        let severity: StormPrediction["severity"] = "marginal";
        if (hasTornado) severity = "high";
        else if (hasSevere && hasHail) severity = "moderate";
        else if (hasSevere) severity = "enhanced";
        else if (hasThunderstorm) severity = "slight";
        
        stormPeriods.push({
          ...period,
          location,
          type,
          severity,
          threats: {
            hailProbability,
            windProbability,
            tornadoProbability,
          },
        });
      }
    }
    
    return stormPeriods;
  }

  private async buildPrediction(
    period: StormPotentialPeriod,
    forecast: LocationForecastData,
    outlooks: SPCOutlook[]
  ): Promise<StormPrediction | null> {
    const hoursUntil = (period.startTime.getTime() - Date.now()) / (1000 * 60 * 60);
    if (hoursUntil < 0) return null;
    
    // Check if there's an SPC outlook that matches
    const matchingOutlook = outlooks.find(o => 
      o.affectedStates.includes(period.location.state) &&
      Math.abs(o.validTime.getTime() - period.startTime.getTime()) < 24 * 60 * 60 * 1000
    );
    
    // Boost severity if SPC agrees
    let severity = period.severity;
    if (matchingOutlook && this.severityOrder(matchingOutlook.category) > this.severityOrder(severity)) {
      severity = matchingOutlook.category;
    }
    
    // Get affected ZIP codes (approximate by state)
    const affectedZips = await this.getZipsNearLocation(
      period.location.lat, 
      period.location.lon, 
      25
    );
    
    // Count potentially affected customers
    const customerCount = await prisma.customer.count({
      where: {
        zipCode: { in: affectedZips },
        status: { in: ["lead", "prospect", "customer"] },
      },
    });
    
    // Estimate damage value
    const avgJobValue = 15000; // Average job value
    const damageRate = this.getDamageRate(severity);
    const estimatedDamage = customerCount * avgJobValue * damageRate;
    
    // Build recommendation
    const recommendation = this.buildRecommendation(severity, hoursUntil, period.type);
    const priorityLevel = this.getPriorityLevel(severity, hoursUntil);
    
    return {
      id: `pred-${period.location.lat.toFixed(4)}-${period.location.lon.toFixed(4)}-25-${period.startTime.getTime()}`,
      type: period.type,
      severity,
      probability: Math.min(100, period.threats.hailProbability + period.threats.windProbability),
      expectedStart: period.startTime,
      expectedEnd: period.endTime,
      hoursUntil: Math.round(hoursUntil),
      latitude: period.location.lat,
      longitude: period.location.lon,
      affectedArea: {
        states: [period.location.state],
        counties: [], // Would need reverse geocoding
        zipCodes: affectedZips,
        radiusMiles: 25,
      },
      threats: {
        hailProbability: period.threats.hailProbability,
        hailSizeRange: period.threats.hailProbability > 30 ? "0.75-1.5 inches" : "< 0.75 inches",
        windProbability: period.threats.windProbability,
        windSpeedRange: period.threats.windProbability > 50 ? "50-70 mph" : "30-50 mph",
        tornadoProbability: period.threats.tornadoProbability,
      },
      potentialAffectedCustomers: customerCount,
      estimatedDamageValue: Math.round(estimatedDamage),
      recommendation,
      priorityLevel,
      source: "NWS Forecast" + (matchingOutlook ? " + SPC Outlook" : ""),
      confidence: matchingOutlook ? 80 : 60,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  private outlookToPrediction(outlook: SPCOutlook): StormPrediction {
    const hoursUntil = (outlook.validTime.getTime() - Date.now()) / (1000 * 60 * 60);
    
    return {
      id: `spc-${outlook.day}-${outlook.validTime.getTime()}`,
      type: "mixed",
      severity: outlook.category,
      probability: outlook.probability * 20,
      expectedStart: outlook.validTime,
      expectedEnd: new Date(outlook.validTime.getTime() + 12 * 60 * 60 * 1000),
      hoursUntil: Math.round(hoursUntil),
      latitude: 39.5, // Regional center
      longitude: -76.5,
      affectedArea: {
        states: outlook.affectedStates,
        counties: [],
        zipCodes: [],
        radiusMiles: 100,
      },
      threats: {
        hailProbability: outlook.category === "high" ? 70 : outlook.category === "moderate" ? 50 : 30,
        hailSizeRange: outlook.category === "high" ? "1-2+ inches" : "0.75-1.5 inches",
        windProbability: 60,
        windSpeedRange: "50-70 mph",
        tornadoProbability: outlook.category === "high" ? 30 : 10,
      },
      potentialAffectedCustomers: 0, // Calculated separately
      estimatedDamageValue: 0,
      recommendation: this.buildRecommendation(outlook.category, hoursUntil, "mixed"),
      priorityLevel: this.getPriorityLevel(outlook.category, hoursUntil),
      source: `SPC Day ${outlook.day} Outlook`,
      confidence: 75,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  // ============================================================
  // Helpers
  // ============================================================

  private severityOrder(severity: StormPrediction["severity"]): number {
    const order = { marginal: 1, slight: 2, enhanced: 3, moderate: 4, high: 5 };
    return order[severity] || 0;
  }

  private getDamageRate(severity: StormPrediction["severity"]): number {
    const rates = { marginal: 0.05, slight: 0.10, enhanced: 0.20, moderate: 0.35, high: 0.50 };
    return rates[severity] || 0.10;
  }

  private buildRecommendation(
    severity: StormPrediction["severity"],
    hoursUntil: number,
    type: StormPrediction["type"]
  ): string {
    if (hoursUntil <= 12) {
      return `URGENT: ${type} threat in next ${Math.round(hoursUntil)} hours. Have teams ready for immediate response.`;
    } else if (hoursUntil <= 24) {
      return `PREPARE: ${severity} ${type} risk tomorrow. Pre-position canvassers in affected areas.`;
    } else if (hoursUntil <= 48) {
      return `WATCH: Storm potential in 2 days. Start pre-qualifying leads in target ZIPs.`;
    } else {
      return `MONITOR: ${severity} risk in 3 days. Good time to review customer data in affected areas.`;
    }
  }

  private getPriorityLevel(
    severity: StormPrediction["severity"],
    hoursUntil: number
  ): StormPrediction["priorityLevel"] {
    if (severity === "high" || (severity === "moderate" && hoursUntil <= 24)) {
      return "critical";
    } else if (severity === "moderate" || (severity === "enhanced" && hoursUntil <= 24)) {
      return "urgent";
    } else if (severity === "enhanced" || hoursUntil <= 24) {
      return "prepare";
    }
    return "watch";
  }

  private async getZipsNearLocation(lat: number, lon: number, radiusMiles: number): Promise<string[]> {
    // Get distinct ZIP codes from customers within radius
    const latDelta = radiusMiles / 69;
    const lonDelta = radiusMiles / (69 * Math.cos(lat * Math.PI / 180));
    
    const customers = await prisma.customer.findMany({
      where: {
        latitude: { gte: lat - latDelta, lte: lat + latDelta },
        longitude: { gte: lon - lonDelta, lte: lon + lonDelta },
      },
      select: { zipCode: true },
      distinct: ["zipCode"],
    });
    
    return customers.map(c => c.zipCode);
  }

  private getDistanceMiles(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 3959; // Earth's radius in miles
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(deg: number): number {
    return deg * (Math.PI / 180);
  }
}

// ============================================================
// Supporting Types
// ============================================================

interface SPCOutlook {
  day: number;
  category: StormPrediction["severity"];
  validTime: Date;
  affectedStates: string[];
  geometry: any;
  probability: number;
}

interface LocationForecastData {
  location: { name: string; lat: number; lon: number; state: string };
  periods: ForecastPeriod[];
  alerts: WeatherAlert[];
}

interface StormPotentialPeriod extends ForecastPeriod {
  location: { name: string; lat: number; lon: number; state: string };
  type: StormPrediction["type"];
  severity: StormPrediction["severity"];
  threats: {
    hailProbability: number;
    windProbability: number;
    tornadoProbability: number;
  };
}

// ============================================================
// Export Singleton
// ============================================================

export const predictiveStormService = new PredictiveStormService();
