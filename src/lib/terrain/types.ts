// Data Source Types
export type DataSourceType = 'weather' | 'permits' | 'market' | 'trade_journal' | 'competitive' | 'insurance';
export type DataSourceStatus = 'live' | 'mock' | 'placeholder';

export interface DataSource {
  id: string;
  name: string;
  type: DataSourceType;
  status: DataSourceStatus;  // CRITICAL: Shows execs what's real vs demo
  description: string;
  refreshFrequency: 'realtime' | 'daily' | 'weekly' | 'monthly';
  lastUpdated: Date;
  reliability: number; // 0-100
  recordCount: number;
  integrationNotes: string; // What's needed to make this real
  iconName: string;
}

// Geographic Types
export type StateCode = 'PA' | 'NY' | 'VA' | 'NJ' | 'DE' | 'MD';

export interface County {
  name: string;
  state: StateCode;
  fipsCode: string;
  population: number;
  medianHomeValue: number;
  medianHomeAge: number;
  coordinates: { lat: number; lng: number };
}

// Storm Event Types
export type StormEventType = 'hail' | 'wind' | 'tornado' | 'severe_thunderstorm' | 'tropical_storm' | 'flooding' | 'winter_storm';
export type SeverityLevel = 'minor' | 'moderate' | 'significant' | 'severe' | 'extreme';

export interface StormEvent {
  id: string;
  eventType: StormEventType;
  severity: SeverityLevel;
  occurredAt: Date;
  reportedAt: Date;
  location: {
    county: string;
    state: StateCode;
    coordinates: { lat: number; lng: number };
    affectedRadius: number;
  };
  details: {
    hailSize?: number;
    windSpeed?: number;
    rainfall?: number;
    duration?: number;
  };
  estimatedStructuresAffected: number;
  estimatedResidentialUnits: number;
  source: string;
  confidence: number;
}

export interface StormActivityIndex {
  territory: string;
  period: 'daily' | 'weekly' | 'monthly';
  startDate: Date;
  endDate: Date;
  indexValue: number; // 0-100
  eventCount: number;
  trend: 'increasing' | 'stable' | 'decreasing';
  percentChangeFromPrior: number;
  topCounties: Array<{
    county: string;
    state: StateCode;
    eventCount: number;
    severity: SeverityLevel;
  }>;
}

// Permit Types
export type PermitType = 'roof_replacement' | 'roof_repair' | 'new_construction' | 'siding' | 'general_exterior';

export interface PermitRecord {
  id: string;
  permitType: PermitType;
  issuedAt: Date;
  county: string;
  state: StateCode;
  municipality: string;
  estimatedValue: number;
  propertyType: 'residential' | 'commercial' | 'multi_family';
  isStormRelated: boolean;
  source: string;
}

export interface PermitVelocity {
  county: string;
  state: StateCode;
  period: 'weekly' | 'monthly' | 'quarterly';
  currentCount: number;
  priorPeriodCount: number;
  percentChange: number;
  trend: 'accelerating' | 'stable' | 'decelerating';
  roofingSharePercent: number;
}

// Intelligence Brief Types
export type BriefType = 'daily' | 'weekly' | 'monthly' | 'alert' | 'quarterly';
export type InsightCategory = 'opportunity' | 'threat' | 'trend' | 'anomaly';
export type InsightPriority = 'critical' | 'high' | 'medium' | 'low';
export type TeamRelevance = 'sales' | 'production' | 'leadership' | 'operations' | 'all';

export interface IntelligenceBrief {
  id: string;
  generatedAt: Date;
  briefType: BriefType;
  territory: string;
  periodStart: Date;
  periodEnd: Date;
  executiveSummary: string;
  keyMetrics: KeyMetric[];
  insights: Insight[];
  actionItems: ActionItem[];
  trendsIdentified: Trend[];
  dataSourcesUsed: DataSourceReference[];
  confidenceScore: number;
  dataQualityNotes: string[];
  status: 'draft' | 'published' | 'archived';
}

export interface KeyMetric {
  id: string;
  name: string;
  value: number;
  unit: string;
  change: number;
  changeDirection: 'up' | 'down' | 'flat';
  changeIsPositive: boolean;
  context: string;
}

export interface Insight {
  id: string;
  category: InsightCategory;
  priority: InsightPriority;
  title: string;
  description: string;
  supportingData: DataPoint[];
  suggestedAction: string;
  relevantTeam: TeamRelevance;
  estimatedImpact: {
    type: 'revenue' | 'efficiency' | 'risk_reduction' | 'competitive';
    magnitude: 'minor' | 'moderate' | 'significant' | 'major';
    description: string;
  };
  confidence: number;
  expiresAt?: Date;
}

export interface DataPoint {
  source: string;
  sourceStatus: DataSourceStatus;
  metric: string;
  value: string | number;
  asOfDate: Date;
  context?: string;
}

export interface ActionItem {
  id: string;
  action: string;
  rationale: string;
  assignTo: TeamRelevance;
  urgency: 'immediate' | 'this_week' | 'this_month' | 'this_quarter';
  expectedImpact: string;
  relatedInsightId: string;
  status: 'pending' | 'in_progress' | 'completed' | 'dismissed';
  dueDate?: Date;
}

export interface Trend {
  id: string;
  name: string;
  description: string;
  direction: 'improving' | 'stable' | 'declining';
  timeframe: string;
  dataPoints: Array<{ date: Date; value: number }>;
  significance: 'low' | 'medium' | 'high';
  projection?: string;
}

export interface DataSourceReference {
  sourceId: string;
  sourceName: string;
  sourceStatus: DataSourceStatus;
  recordsUsed: number;
  dateRange: { start: Date; end: Date };
  reliability: number;
}

// Alert Types
export type AlertType = 'storm_event' | 'competitor_activity' | 'market_shift' | 'permit_spike' | 'insurance_change' | 'opportunity_window';

export interface TerrainAlert {
  id: string;
  createdAt: Date;
  alertType: AlertType;
  priority: InsightPriority;
  title: string;
  summary: string;
  affectedArea: { counties: string[]; states: StateCode[] };
  recommendedActions: string[];
  expiresAt: Date;
  status: 'active' | 'acknowledged' | 'actioned' | 'expired';
}

// Competitor Types
export interface Competitor {
  id: string;
  name: string;
  serviceArea: StateCode[];
  estimatedSize: 'small' | 'medium' | 'large';
  strengths: string[];
  weaknesses: string[];
  threatLevel: 'low' | 'moderate' | 'high';
}

// Market Data Types
export interface MarketIndicator {
  id: string;
  county: string;
  state: StateCode;
  medianHomeValue: number;
  valueChangeYoY: number;
  salesVelocity: number;
  inventoryMonths: number;
  averageDaysOnMarket: number;
  marketTemperature: 'cold' | 'cool' | 'neutral' | 'warm' | 'hot';
  asOfDate: Date;
}
