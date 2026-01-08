/**
 * Storm Intel Service - Aggregates all free weather data sources
 * into actionable sales intelligence for roofing companies
 * 
 * Data Sources:
 * 1. NOAA/NWS - Alerts, forecasts, storm reports
 * 2. Historical storm database - Past events by location
 * 
 * Features:
 * - Real-time severe weather alerts
 * - Storm damage opportunity identification
 * - Customer impact analysis
 * - Canvassing recommendations
 */

import { noaaWeatherService, WeatherAlert, HailReport, WindReport, StormEvent } from "./noaa-service";

// ============================================================
// Types
// ============================================================

export interface StormOpportunity {
  id: string;
  type: "hail" | "wind" | "tornado" | "severe_storm";
  severity: "low" | "moderate" | "high" | "critical";
  location: {
    county: string;
    state: string;
    latitude?: number;
    longitude?: number;
  };
  eventDate: Date;
  details: {
    hailSize?: number;
    windSpeed?: number;
    description: string;
  };
  estimatedAffectedHomes: number;
  estimatedOpportunityValue: number;
  affectedCustomerIds: string[];
  recommendedAction: string;
  priority: number; // 1-10
}

export interface CustomerWeatherImpact {
  customerId: string;
  customerName: string;
  address: string;
  lat: number;
  lon: number;
  impactLevel: "none" | "low" | "moderate" | "high" | "critical";
  activeAlerts: WeatherAlert[];
  recentStormEvents: {
    hail: HailReport[];
    wind: WindReport[];
  };
  recommendation: string;
  lastChecked: Date;
}

export interface DailyStormBrief {
  date: Date;
  state: string;
  summary: string;
  totalOpportunities: number;
  estimatedTotalValue: number;
  criticalAlerts: WeatherAlert[];
  topOpportunities: StormOpportunity[];
  affectedCounties: string[];
  canvassingRecommendations: string[];
}

// ============================================================
// Storm Intel Service
// ============================================================

export class StormIntelService {
  
  /**
   * Generate morning storm brief for sales team
   */
  async generateDailyBrief(state: string): Promise<DailyStormBrief> {
    const activity = await noaaWeatherService.getStateStormActivity(state);
    
    // Calculate opportunities from storm reports
    const opportunities = this.calculateOpportunities(
      activity.todaysReports.hail,
      activity.todaysReports.wind,
      activity.alerts
    );

    // Generate canvassing recommendations
    const canvassingRecs = this.generateCanvassingRecommendations(
      activity.alerts,
      activity.todaysReports
    );

    // Calculate total opportunity value
    const totalValue = opportunities.reduce((sum, o) => sum + o.estimatedOpportunityValue, 0);

    return {
      date: new Date(),
      state,
      summary: this.generateBriefSummary(activity),
      totalOpportunities: opportunities.length,
      estimatedTotalValue: totalValue,
      criticalAlerts: activity.alerts.filter(
        (a) => a.severity === "severe" || a.severity === "extreme"
      ),
      topOpportunities: opportunities.slice(0, 5),
      affectedCounties: activity.summary.affectedCounties,
      canvassingRecommendations: canvassingRecs,
    };
  }

  /**
   * Check weather impact for a list of customers
   */
  async checkCustomerImpacts(
    customers: Array<{ id: string; name: string; address: string; lat: number; lon: number }>
  ): Promise<CustomerWeatherImpact[]> {
    const impacts: CustomerWeatherImpact[] = [];

    // Process customers in parallel batches of 5 to avoid rate limiting
    const batchSize = 5;
    for (let i = 0; i < customers.length; i += batchSize) {
      const batch = customers.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(async (customer) => {
          const check = await noaaWeatherService.checkAddressForStormDamage(
            customer.lat,
            customer.lon,
            15 // 15 mile radius
          );

          return {
            customerId: customer.id,
            customerName: customer.name,
            address: customer.address,
            lat: customer.lat,
            lon: customer.lon,
            impactLevel: this.mapRiskToImpact(check.riskLevel),
            activeAlerts: check.alerts,
            recentStormEvents: {
              hail: check.recentHailReports,
              wind: check.recentWindReports,
            },
            recommendation: check.recommendation,
            lastChecked: new Date(),
          };
        })
      );
      impacts.push(...batchResults);
    }

    // Sort by impact level (critical first)
    return impacts.sort((a, b) => {
      const order = { critical: 0, high: 1, moderate: 2, low: 3, none: 4 };
      return order[a.impactLevel] - order[b.impactLevel];
    });
  }

  /**
   * Get real-time storm opportunities for a region
   */
  async getStormOpportunities(state: string): Promise<StormOpportunity[]> {
    const activity = await noaaWeatherService.getStateStormActivity(state);
    return this.calculateOpportunities(
      activity.todaysReports.hail,
      activity.todaysReports.wind,
      activity.alerts
    );
  }

  /**
   * Get forecast for determining best canvassing days
   */
  async getCanvassingForecast(
    lat: number,
    lon: number
  ): Promise<{
    bestDays: Array<{ day: string; conditions: string; score: number }>;
    avoid: Array<{ day: string; reason: string }>;
  }> {
    const forecast = await noaaWeatherService.getForecast(lat, lon);
    
    if (!forecast) {
      return { bestDays: [], avoid: [] };
    }

    const bestDays: Array<{ day: string; conditions: string; score: number }> = [];
    const avoid: Array<{ day: string; reason: string }> = [];

    // Analyze each forecast period
    for (const period of forecast.periods) {
      // Skip night periods
      if (period.name.toLowerCase().includes("night")) continue;

      const shortForecast = period.shortForecast.toLowerCase();
      const hasRain = shortForecast.includes("rain") || shortForecast.includes("shower");
      const hasStorm = shortForecast.includes("thunder") || shortForecast.includes("storm");
      const isHot = period.temperature > 95;
      const isCold = period.temperature < 32;

      if (hasStorm) {
        avoid.push({
          day: period.name,
          reason: `Storms expected - ${period.shortForecast}`,
        });
      } else if (hasRain) {
        avoid.push({
          day: period.name,
          reason: `Rain expected - ${period.shortForecast}`,
        });
      } else if (isHot) {
        bestDays.push({
          day: period.name,
          conditions: period.shortForecast,
          score: 6, // OK but hot
        });
      } else if (isCold) {
        bestDays.push({
          day: period.name,
          conditions: period.shortForecast,
          score: 5, // OK but cold
        });
      } else {
        bestDays.push({
          day: period.name,
          conditions: period.shortForecast,
          score: 10, // Perfect conditions
        });
      }
    }

    // Sort best days by score
    bestDays.sort((a, b) => b.score - a.score);

    return { bestDays: bestDays.slice(0, 5), avoid };
  }

  // ============================================================
  // Private Helper Methods
  // ============================================================

  private calculateOpportunities(
    hailReports: HailReport[],
    windReports: WindReport[],
    alerts: WeatherAlert[]
  ): StormOpportunity[] {
    const opportunities: StormOpportunity[] = [];
    let idCounter = 1;

    // Group hail reports by county for better opportunity calculation
    const hailByCounty = this.groupByCounty(hailReports);
    
    for (const [county, reports] of Object.entries(hailByCounty)) {
      const maxSize = Math.max(...reports.map((r) => r.size));
      const avgSize = reports.reduce((sum, r) => sum + r.size, 0) / reports.length;
      
      // Estimate affected homes based on hail size and report count
      const estimatedHomes = this.estimateAffectedHomes(reports.length, maxSize);
      
      // Estimate opportunity value ($8k-15k average roof)
      const avgRoofValue = maxSize >= 1.5 ? 12000 : maxSize >= 1.0 ? 10000 : 8000;
      const estimatedValue = estimatedHomes * avgRoofValue * 0.3; // 30% close rate assumption

      opportunities.push({
        id: `opp-${idCounter++}`,
        type: "hail",
        severity: maxSize >= 2.0 ? "critical" : maxSize >= 1.0 ? "high" : "moderate",
        location: {
          county,
          state: reports[0].state,
          latitude: reports[0].latitude,
          longitude: reports[0].longitude,
        },
        eventDate: reports[0].date,
        details: {
          hailSize: maxSize,
          description: `${reports.length} hail report(s), max size ${maxSize}" (${this.getHailDescription(maxSize)})`,
        },
        estimatedAffectedHomes: estimatedHomes,
        estimatedOpportunityValue: estimatedValue,
        affectedCustomerIds: [], // Would be populated by matching against customer database
        recommendedAction: this.getHailRecommendation(maxSize),
        priority: this.calculatePriority(maxSize, reports.length),
      });
    }

    // Add wind damage opportunities
    const windByCounty = this.groupByCounty(windReports);
    
    for (const [county, reports] of Object.entries(windByCounty)) {
      const maxSpeed = Math.max(...reports.map((r) => r.speed));
      
      if (maxSpeed >= 50) { // Only significant wind
        const estimatedHomes = this.estimateAffectedHomesWind(reports.length, maxSpeed);
        const estimatedValue = estimatedHomes * 5000 * 0.2; // Wind repairs typically smaller

        opportunities.push({
          id: `opp-${idCounter++}`,
          type: "wind",
          severity: maxSpeed >= 70 ? "critical" : maxSpeed >= 60 ? "high" : "moderate",
          location: {
            county,
            state: reports[0].state,
            latitude: reports[0].latitude,
            longitude: reports[0].longitude,
          },
          eventDate: reports[0].date,
          details: {
            windSpeed: maxSpeed,
            description: `${reports.length} wind report(s), max ${maxSpeed} mph`,
          },
          estimatedAffectedHomes: estimatedHomes,
          estimatedOpportunityValue: estimatedValue,
          affectedCustomerIds: [],
          recommendedAction: `Wind damage likely at ${maxSpeed}mph. Check for shingle damage, soffit/fascia issues.`,
          priority: this.calculatePriorityWind(maxSpeed, reports.length),
        });
      }
    }

    // Sort by priority
    return opportunities.sort((a, b) => b.priority - a.priority);
  }

  private groupByCounty<T extends { county: string }>(items: T[]): Record<string, T[]> {
    return items.reduce((acc, item) => {
      if (!acc[item.county]) acc[item.county] = [];
      acc[item.county].push(item);
      return acc;
    }, {} as Record<string, T[]>);
  }

  private estimateAffectedHomes(reportCount: number, hailSize: number): number {
    // Rough estimation based on report density and size
    const baseHomes = reportCount * 500; // Each report represents ~500 home radius
    const sizeMultiplier = hailSize >= 2.0 ? 3 : hailSize >= 1.5 ? 2 : 1;
    return Math.round(baseHomes * sizeMultiplier);
  }

  private estimateAffectedHomesWind(reportCount: number, speed: number): number {
    const baseHomes = reportCount * 300;
    const speedMultiplier = speed >= 70 ? 2.5 : speed >= 60 ? 1.5 : 1;
    return Math.round(baseHomes * speedMultiplier);
  }

  private getHailDescription(size: number): string {
    if (size >= 4.0) return "Softball+, catastrophic damage likely";
    if (size >= 2.75) return "Baseball, severe roof damage";
    if (size >= 2.0) return "Hen egg, significant damage likely";
    if (size >= 1.75) return "Golf ball, roof damage expected";
    if (size >= 1.5) return "Ping pong ball, damage possible";
    if (size >= 1.0) return "Quarter, minor damage possible";
    return "Small hail, minimal damage";
  }

  private getHailRecommendation(size: number): string {
    if (size >= 2.0) {
      return "PRIORITY: Large hail confirmed. Deploy canvassing teams immediately. High close rate expected.";
    }
    if (size >= 1.5) {
      return "Strong opportunity. Start outreach to existing customers in area, then door-to-door.";
    }
    if (size >= 1.0) {
      return "Moderate opportunity. Check on existing customers, offer free inspections.";
    }
    return "Monitor area. May be good for follow-up marketing campaign.";
  }

  private calculatePriority(hailSize: number, reportCount: number): number {
    let priority = 0;
    
    // Size scoring (0-6 points)
    if (hailSize >= 2.0) priority += 6;
    else if (hailSize >= 1.5) priority += 4;
    else if (hailSize >= 1.0) priority += 2;
    
    // Report count scoring (0-4 points)
    if (reportCount >= 10) priority += 4;
    else if (reportCount >= 5) priority += 3;
    else if (reportCount >= 3) priority += 2;
    else priority += 1;
    
    return Math.min(priority, 10);
  }

  private calculatePriorityWind(speed: number, reportCount: number): number {
    let priority = 0;
    
    if (speed >= 70) priority += 5;
    else if (speed >= 60) priority += 3;
    else priority += 1;
    
    if (reportCount >= 5) priority += 3;
    else if (reportCount >= 3) priority += 2;
    else priority += 1;
    
    return Math.min(priority, 10);
  }

  private mapRiskToImpact(
    risk: "low" | "moderate" | "high" | "critical"
  ): CustomerWeatherImpact["impactLevel"] {
    return risk;
  }

  private generateBriefSummary(activity: {
    alerts: WeatherAlert[];
    summary: {
      totalAlerts: number;
      severeAlerts: number;
      hailReports: number;
      windReports: number;
    };
  }): string {
    const { summary } = activity;
    
    if (summary.severeAlerts > 0) {
      return `⚠️ SEVERE WEATHER ACTIVE: ${summary.severeAlerts} severe alert(s). ${summary.hailReports} hail reports, ${summary.windReports} wind reports today.`;
    }
    
    if (summary.hailReports > 0 || summary.windReports > 0) {
      return `Storm activity detected: ${summary.hailReports} hail reports, ${summary.windReports} wind reports. ${summary.totalAlerts} active weather alert(s).`;
    }
    
    if (summary.totalAlerts > 0) {
      return `${summary.totalAlerts} weather alert(s) active. Monitor conditions for developing opportunities.`;
    }
    
    return "No significant storm activity. Good day for follow-ups and scheduled inspections.";
  }

  private generateCanvassingRecommendations(
    alerts: WeatherAlert[],
    reports: { hail: HailReport[]; wind: WindReport[]; tornado: StormEvent[] }
  ): string[] {
    const recommendations: string[] = [];

    // Hail-based recommendations
    const largeHail = reports.hail.filter((h) => h.size >= 1.5);
    if (largeHail.length > 0) {
      const counties = [...new Set(largeHail.map((h) => h.county))];
      recommendations.push(
        `🎯 HIGH PRIORITY: Canvas ${counties.join(", ")} - ${largeHail.length} large hail report(s) (1.5"+)`
      );
    }

    // Tornado recommendations
    if (reports.tornado.length > 0) {
      const counties = [...new Set(reports.tornado.map((t) => t.county))];
      recommendations.push(
        `🌪️ TORNADO DAMAGE: ${counties.join(", ")} - Insurance fast-track opportunities`
      );
    }

    // Wind recommendations
    const highWind = reports.wind.filter((w) => w.speed >= 60);
    if (highWind.length > 0) {
      const counties = [...new Set(highWind.map((w) => w.county))];
      recommendations.push(
        `💨 WIND DAMAGE: ${counties.join(", ")} - Check for shingle/fascia damage`
      );
    }

    // Alert-based recommendations
    const stormAlerts = alerts.filter(
      (a) => a.type === "thunderstorm" || a.type === "hail"
    );
    if (stormAlerts.length > 0) {
      recommendations.push(
        `⏰ MONITOR: Active storm alerts - prepare teams for post-storm canvassing`
      );
    }

    if (recommendations.length === 0) {
      recommendations.push(
        "📋 No storm activity - focus on existing leads and scheduled appointments"
      );
    }

    return recommendations;
  }
}

// Export singleton instance
export const stormIntelService = new StormIntelService();
