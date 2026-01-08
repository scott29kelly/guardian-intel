/**
 * NOAA Weather Service - Aggregates multiple free government weather APIs
 * 
 * Data Sources Combined:
 * 1. NWS Alerts API - Real-time severe weather warnings
 * 2. NWS Forecast API - Weather forecasts by location
 * 3. NOAA Storm Events - Historical storm data (hail, wind, tornado)
 * 4. Storm Prediction Center - Severe weather outlooks
 * 5. NEXRAD Radar - Radar imagery locations
 * 
 * All APIs are FREE and don't require API keys (just a User-Agent header)
 */

// ============================================================
// Types
// ============================================================

export interface WeatherAlert {
  id: string;
  type: "thunderstorm" | "tornado" | "hail" | "wind" | "flood" | "other";
  severity: "minor" | "moderate" | "severe" | "extreme";
  headline: string;
  description: string;
  instruction?: string;
  areas: string[];
  counties: string[];
  onset: Date;
  expires: Date;
  source: string;
}

export interface StormEvent {
  id: string;
  type: string;
  date: Date;
  state: string;
  county: string;
  latitude: number;
  longitude: number;
  hailSize?: number; // inches
  windSpeed?: number; // mph
  tornadoScale?: string; // EF0-EF5
  damageAmount?: number;
  injuries?: number;
  deaths?: number;
  narrative?: string;
}

export interface LocationForecast {
  latitude: number;
  longitude: number;
  periods: ForecastPeriod[];
  alerts: WeatherAlert[];
}

export interface ForecastPeriod {
  name: string;
  startTime: Date;
  endTime: Date;
  temperature: number;
  temperatureUnit: string;
  windSpeed: string;
  windDirection: string;
  icon: string;
  shortForecast: string;
  detailedForecast: string;
  probabilityOfPrecipitation?: number;
}

export interface HailReport {
  date: Date;
  latitude: number;
  longitude: number;
  size: number; // inches
  location: string;
  county: string;
  state: string;
}

export interface WindReport {
  date: Date;
  latitude: number;
  longitude: number;
  speed: number; // mph
  location: string;
  county: string;
  state: string;
}

// ============================================================
// NOAA Weather Service Class
// ============================================================

export class NOAAWeatherService {
  private userAgent = "GuardianIntel/1.0 (contact@guardian-intel.com)";
  private nwsBaseUrl = "https://api.weather.gov";
  
  // ============================================================
  // NWS Alerts API - Real-time severe weather warnings
  // Docs: https://www.weather.gov/documentation/services-web-api
  // ============================================================

  /**
   * Get active weather alerts for a specific area
   * @param state - Two-letter state code (e.g., "OH")
   * @param zone - Optional NWS zone code
   */
  async getActiveAlerts(state: string, zone?: string): Promise<WeatherAlert[]> {
    try {
      let url = `${this.nwsBaseUrl}/alerts/active?area=${state}`;
      if (zone) {
        url = `${this.nwsBaseUrl}/alerts/active/zone/${zone}`;
      }

      const response = await fetch(url, {
        headers: { "User-Agent": this.userAgent },
      });

      if (!response.ok) {
        throw new Error(`NWS API error: ${response.status}`);
      }

      const data = await response.json();
      return this.parseNWSAlerts(data.features || []);
    } catch (error) {
      console.error("[NOAA] Failed to fetch alerts:", error);
      return [];
    }
  }

  /**
   * Get alerts for a specific point (lat/lon)
   */
  async getAlertsForLocation(lat: number, lon: number): Promise<WeatherAlert[]> {
    try {
      const url = `${this.nwsBaseUrl}/alerts/active?point=${lat},${lon}`;
      const response = await fetch(url, {
        headers: { "User-Agent": this.userAgent },
      });

      if (!response.ok) {
        throw new Error(`NWS API error: ${response.status}`);
      }

      const data = await response.json();
      return this.parseNWSAlerts(data.features || []);
    } catch (error) {
      console.error("[NOAA] Failed to fetch location alerts:", error);
      return [];
    }
  }

  private parseNWSAlerts(features: any[]): WeatherAlert[] {
    return features.map((feature) => {
      const props = feature.properties;
      return {
        id: feature.id || props.id,
        type: this.categorizeAlertType(props.event),
        severity: this.mapSeverity(props.severity),
        headline: props.headline || props.event,
        description: props.description || "",
        instruction: props.instruction,
        areas: props.areaDesc ? props.areaDesc.split("; ") : [],
        counties: this.extractCounties(props.geocode),
        onset: new Date(props.onset || props.effective),
        expires: new Date(props.expires || props.ends),
        source: "NWS",
      };
    });
  }

  private categorizeAlertType(event: string): WeatherAlert["type"] {
    const eventLower = event?.toLowerCase() || "";
    if (eventLower.includes("tornado")) return "tornado";
    if (eventLower.includes("hail")) return "hail";
    if (eventLower.includes("thunder") || eventLower.includes("storm")) return "thunderstorm";
    if (eventLower.includes("wind")) return "wind";
    if (eventLower.includes("flood")) return "flood";
    return "other";
  }

  private mapSeverity(severity: string): WeatherAlert["severity"] {
    switch (severity?.toLowerCase()) {
      case "extreme": return "extreme";
      case "severe": return "severe";
      case "moderate": return "moderate";
      default: return "minor";
    }
  }

  private extractCounties(geocode: any): string[] {
    if (!geocode?.SAME) return [];
    // SAME codes are county FIPS codes
    return geocode.SAME;
  }

  // ============================================================
  // NWS Forecast API - Weather forecasts by location
  // ============================================================

  /**
   * Get forecast for a specific location
   */
  async getForecast(lat: number, lon: number): Promise<LocationForecast | null> {
    try {
      // First, get the forecast office and grid point
      const pointUrl = `${this.nwsBaseUrl}/points/${lat},${lon}`;
      const pointResponse = await fetch(pointUrl, {
        headers: { "User-Agent": this.userAgent },
      });

      if (!pointResponse.ok) {
        throw new Error(`NWS Points API error: ${pointResponse.status}`);
      }

      const pointData = await pointResponse.json();
      const forecastUrl = pointData.properties.forecast;

      // Get the actual forecast
      const forecastResponse = await fetch(forecastUrl, {
        headers: { "User-Agent": this.userAgent },
      });

      if (!forecastResponse.ok) {
        throw new Error(`NWS Forecast API error: ${forecastResponse.status}`);
      }

      const forecastData = await forecastResponse.json();
      const alerts = await this.getAlertsForLocation(lat, lon);

      return {
        latitude: lat,
        longitude: lon,
        periods: forecastData.properties.periods.map((p: any) => ({
          name: p.name,
          startTime: new Date(p.startTime),
          endTime: new Date(p.endTime),
          temperature: p.temperature,
          temperatureUnit: p.temperatureUnit,
          windSpeed: p.windSpeed,
          windDirection: p.windDirection,
          icon: p.icon,
          shortForecast: p.shortForecast,
          detailedForecast: p.detailedForecast,
          probabilityOfPrecipitation: p.probabilityOfPrecipitation?.value,
        })),
        alerts,
      };
    } catch (error) {
      console.error("[NOAA] Failed to fetch forecast:", error);
      return null;
    }
  }

  // ============================================================
  // Storm Prediction Center - Severe Weather Reports
  // Docs: https://www.spc.noaa.gov/climo/reports/
  // ============================================================

  /**
   * Get today's storm reports (hail, wind, tornado)
   * SPC updates these throughout the day
   */
  async getTodaysStormReports(): Promise<{
    hail: HailReport[];
    wind: WindReport[];
    tornado: StormEvent[];
  }> {
    const today = new Date();
    const dateStr = this.formatSPCDate(today);
    
    const [hail, wind, tornado] = await Promise.all([
      this.fetchSPCReports("hail", dateStr),
      this.fetchSPCReports("wind", dateStr),
      this.fetchSPCReports("torn", dateStr),
    ]);

    return {
      hail: hail as HailReport[],
      wind: wind as WindReport[],
      tornado: tornado as StormEvent[],
    };
  }

  /**
   * Get storm reports for a specific date
   */
  async getStormReportsForDate(date: Date): Promise<{
    hail: HailReport[];
    wind: WindReport[];
    tornado: StormEvent[];
  }> {
    const dateStr = this.formatSPCDate(date);
    
    const [hail, wind, tornado] = await Promise.all([
      this.fetchSPCReports("hail", dateStr),
      this.fetchSPCReports("wind", dateStr),
      this.fetchSPCReports("torn", dateStr),
    ]);

    return {
      hail: hail as HailReport[],
      wind: wind as WindReport[],
      tornado: tornado as StormEvent[],
    };
  }

  private async fetchSPCReports(type: "hail" | "wind" | "torn", dateStr: string): Promise<any[]> {
    try {
      // SPC provides CSV files for storm reports
      const url = `https://www.spc.noaa.gov/climo/reports/${dateStr}_rpts_${type}.csv`;
      
      const response = await fetch(url, {
        headers: { "User-Agent": this.userAgent },
      });

      if (!response.ok) {
        // No reports for this date is common
        return [];
      }

      const csvText = await response.text();
      return this.parseSPCCsv(csvText, type);
    } catch (error) {
      console.error(`[NOAA] Failed to fetch ${type} reports:`, error);
      return [];
    }
  }

  private parseSPCCsv(csvText: string, type: string): any[] {
    const lines = csvText.trim().split("\n");
    if (lines.length < 2) return [];

    // Skip header row
    const reports: any[] = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(",");
      if (cols.length < 8) continue;

      const baseReport = {
        date: this.parseSPCDateTime(cols[0], cols[1]),
        latitude: parseFloat(cols[5]),
        longitude: parseFloat(cols[6]),
        location: cols[7]?.replace(/"/g, ""),
        county: cols[8]?.replace(/"/g, ""),
        state: cols[9]?.replace(/"/g, ""),
      };

      if (type === "hail") {
        reports.push({
          ...baseReport,
          size: parseFloat(cols[2]) / 100, // Convert to inches
        });
      } else if (type === "wind") {
        reports.push({
          ...baseReport,
          speed: parseInt(cols[2]) || 0,
        });
      } else {
        reports.push({
          ...baseReport,
          type: "tornado",
          tornadoScale: cols[2],
        });
      }
    }

    return reports;
  }

  private formatSPCDate(date: Date): string {
    const y = date.getFullYear().toString().slice(2);
    const m = (date.getMonth() + 1).toString().padStart(2, "0");
    const d = date.getDate().toString().padStart(2, "0");
    return `${y}${m}${d}`;
  }

  private parseSPCDateTime(time: string, tz: string): Date {
    // SPC uses HHMM format
    const now = new Date();
    const hours = parseInt(time.slice(0, 2));
    const minutes = parseInt(time.slice(2, 4));
    now.setHours(hours, minutes, 0, 0);
    return now;
  }

  // ============================================================
  // Utility: Check if address was affected by recent storms
  // ============================================================

  /**
   * Check if a specific address might have been affected by recent storms
   * Combines alerts + storm reports to determine impact
   */
  async checkAddressForStormDamage(
    lat: number,
    lon: number,
    radiusMiles: number = 10
  ): Promise<{
    hasActiveAlerts: boolean;
    alerts: WeatherAlert[];
    recentHailReports: HailReport[];
    recentWindReports: WindReport[];
    riskLevel: "low" | "moderate" | "high" | "critical";
    recommendation: string;
  }> {
    // Get active alerts for the location
    const alerts = await this.getAlertsForLocation(lat, lon);
    
    // Get today's storm reports
    const reports = await this.getTodaysStormReports();
    
    // Filter reports within radius
    const nearbyHail = reports.hail.filter(
      (r) => this.getDistanceMiles(lat, lon, r.latitude, r.longitude) <= radiusMiles
    );
    const nearbyWind = reports.wind.filter(
      (r) => this.getDistanceMiles(lat, lon, r.latitude, r.longitude) <= radiusMiles
    );

    // Determine risk level
    let riskLevel: "low" | "moderate" | "high" | "critical" = "low";
    let recommendation = "No significant weather threats detected.";

    const severeAlerts = alerts.filter((a) => a.severity === "severe" || a.severity === "extreme");
    const largeHail = nearbyHail.filter((h) => h.size >= 1.0);

    if (severeAlerts.length > 0 || largeHail.length > 0) {
      riskLevel = "critical";
      recommendation = "URGENT: Recent severe weather in area. Recommend immediate inspection outreach.";
    } else if (nearbyHail.length > 0 || alerts.length > 0) {
      riskLevel = "high";
      recommendation = "Storm activity detected nearby. Good candidate for inspection call.";
    } else if (nearbyWind.filter((w) => w.speed >= 50).length > 0) {
      riskLevel = "moderate";
      recommendation = "High winds reported in area. Consider follow-up for wind damage.";
    }

    return {
      hasActiveAlerts: alerts.length > 0,
      alerts,
      recentHailReports: nearbyHail,
      recentWindReports: nearbyWind,
      riskLevel,
      recommendation,
    };
  }

  /**
   * Get all storm activity for a state (for the Storm Intel page)
   */
  async getStateStormActivity(state: string): Promise<{
    alerts: WeatherAlert[];
    todaysReports: {
      hail: HailReport[];
      wind: WindReport[];
      tornado: StormEvent[];
    };
    summary: {
      totalAlerts: number;
      severeAlerts: number;
      hailReports: number;
      windReports: number;
      affectedCounties: string[];
    };
  }> {
    const [alerts, reports] = await Promise.all([
      this.getActiveAlerts(state),
      this.getTodaysStormReports(),
    ]);

    // Filter reports to state
    const stateReports = {
      hail: reports.hail.filter((r) => r.state === state),
      wind: reports.wind.filter((r) => r.state === state),
      tornado: reports.tornado.filter((r) => r.state === state),
    };

    // Get unique affected counties
    const affectedCounties = new Set<string>();
    alerts.forEach((a) => a.counties.forEach((c) => affectedCounties.add(c)));
    stateReports.hail.forEach((r) => affectedCounties.add(r.county));
    stateReports.wind.forEach((r) => affectedCounties.add(r.county));

    return {
      alerts,
      todaysReports: stateReports,
      summary: {
        totalAlerts: alerts.length,
        severeAlerts: alerts.filter((a) => a.severity === "severe" || a.severity === "extreme").length,
        hailReports: stateReports.hail.length,
        windReports: stateReports.wind.length,
        affectedCounties: Array.from(affectedCounties),
      },
    };
  }

  // ============================================================
  // Helper: Distance calculation
  // ============================================================

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

// Export singleton instance
export const noaaWeatherService = new NOAAWeatherService();
