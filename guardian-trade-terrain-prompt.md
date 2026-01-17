# Guardian Intel: Trade Terrain Intelligence Module
## Cursor + Claude Opus 4.5 Implementation Prompt

**Version:** 1.0  
**Created:** January 17, 2026  
**Purpose:** Complete implementation prompt for adding Trade Terrain Intelligence to Guardian Intel

---

## 🎯 QUICK START - PASTE THIS INTO CURSOR

Copy everything below the line into Cursor as your initial prompt:

---

# IMPLEMENTATION PROMPT FOR CURSOR

You are building a "Trade Terrain Intelligence" module for Guardian Intel, a Next.js 15 sales intelligence dashboard for Guardian Storm Repair (a roofing company specializing in insurance-based storm damage restoration across PA, NY, VA, NJ, DE, MD).

## CRITICAL CONTEXT

**This is a DEMO for executives.** Use realistic MOCK DATA throughout. The goal is demonstrating CONCEPT and VALUE so leadership can evaluate the approach before committing to real data integrations.

**Existing Stack:**
- Next.js 15 with App Router
- TypeScript (strict mode)
- Prisma ORM
- Tailwind CSS with dark "command center" aesthetic
- Mobile-first PWA design

**Design Language:**
- Dark backgrounds (#0a0a0f, #111118, #1a1a24)
- Accent colors: Cyan (#06b6d4), Amber for warnings (#f59e0b), Emerald for positive (#10b981), Rose for alerts (#f43f5e)
- Glassmorphism effects with subtle borders
- Data-dense displays optimized for quick scanning
- Consistent iconography using Lucide React

---

## MODULE ARCHITECTURE

Create these new directories and files:

```
/app/terrain/
  page.tsx                    # Main dashboard
  layout.tsx                  # Terrain section layout
  /briefs/
    page.tsx                  # Brief archive list
    [id]/page.tsx            # Individual brief view
  /sources/
    page.tsx                  # Data sources panel
  /alerts/
    page.tsx                  # Alert configuration & history
  /map/
    page.tsx                  # Territory visualization

/components/terrain/
  TerrainDashboard.tsx        # Main dashboard component
  StormActivityCard.tsx       # Storm index display
  PermitVelocityCard.tsx      # Permit trends display
  IntelligenceBriefCard.tsx   # Brief summary card
  InsightCard.tsx             # Individual insight display
  ActionItemCard.tsx          # Action item with status
  DataSourceStatus.tsx        # Source health indicator
  TerritoryMap.tsx            # Geographic visualization
  MetricCard.tsx              # Key metric display
  TrendChart.tsx              # Sparkline/trend visualization
  AlertBanner.tsx             # Urgent alert display
  BriefViewer.tsx             # Full brief reader
  SourcesGrid.tsx             # Data sources overview

/lib/terrain/
  types.ts                    # All TypeScript interfaces
  constants.ts                # Territory data, sources, competitors
  data-provider.ts            # Central data access layer
  /generators/
    storm-generator.ts        # Mock storm data generation
    permit-generator.ts       # Mock permit data generation
    brief-generator.ts        # AI brief content generation
    market-generator.ts       # Mock market data
    competitor-generator.ts   # Mock competitor intelligence
```

---

## PHASE 1: TYPE DEFINITIONS

Create `/lib/terrain/types.ts` with these core interfaces:

```typescript
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
```

---

## PHASE 2: CONSTANTS & TERRITORY DATA

Create `/lib/terrain/constants.ts`:

```typescript
import { County, StateCode, DataSource } from './types';

// Guardian's 6-state territory
export const GUARDIAN_STATES: StateCode[] = ['PA', 'NY', 'VA', 'NJ', 'DE', 'MD'];

export const GUARDIAN_OFFICES = {
  southampton_pa: {
    name: 'Main Headquarters',
    address: '610 Lakeside Drive, Southampton, PA 18966',
    phone: '1-855-424-5911',
    coordinates: { lat: 40.1876, lng: -75.0041 },
    primaryTerritory: ['PA', 'NJ', 'DE'] as StateCode[],
  },
  pittsford_ny: {
    name: 'NY Office',
    address: '1160 Pittsford Victor Road, Pittsford, New York 14534',
    phone: '1-855-766-3911',
    coordinates: { lat: 43.0937, lng: -77.5150 },
    primaryTerritory: ['NY'] as StateCode[],
  },
  fredericksburg_va: {
    name: 'VA Headquarters',
    address: '1320 Central Park Blvd, Suite 200, Fredericksburg, VA 22401',
    phone: '1-540-425-6770',
    coordinates: { lat: 38.3032, lng: -77.4605 },
    primaryTerritory: ['VA', 'MD'] as StateCode[],
  },
};

// Representative counties in Guardian territory
export const TERRITORY_COUNTIES: County[] = [
  // Pennsylvania - Primary Market
  { name: 'Bucks', state: 'PA', fipsCode: '42017', population: 628341, medianHomeValue: 385000, medianHomeAge: 42, coordinates: { lat: 40.3388, lng: -75.1052 } },
  { name: 'Montgomery', state: 'PA', fipsCode: '42091', population: 856553, medianHomeValue: 425000, medianHomeAge: 48, coordinates: { lat: 40.2100, lng: -75.3700 } },
  { name: 'Lehigh', state: 'PA', fipsCode: '42077', population: 374557, medianHomeValue: 275000, medianHomeAge: 45, coordinates: { lat: 40.6134, lng: -75.5930 } },
  { name: 'Northampton', state: 'PA', fipsCode: '42095', population: 312951, medianHomeValue: 265000, medianHomeAge: 47, coordinates: { lat: 40.7534, lng: -75.3071 } },
  { name: 'Chester', state: 'PA', fipsCode: '42029', population: 534413, medianHomeValue: 445000, medianHomeAge: 38, coordinates: { lat: 39.9700, lng: -75.7500 } },
  { name: 'Delaware', state: 'PA', fipsCode: '42045', population: 576830, medianHomeValue: 285000, medianHomeAge: 55, coordinates: { lat: 39.9167, lng: -75.4000 } },
  
  // New Jersey
  { name: 'Burlington', state: 'NJ', fipsCode: '34005', population: 461860, medianHomeValue: 315000, medianHomeAge: 40, coordinates: { lat: 39.8767, lng: -74.6683 } },
  { name: 'Camden', state: 'NJ', fipsCode: '34007', population: 523485, medianHomeValue: 235000, medianHomeAge: 50, coordinates: { lat: 39.8000, lng: -74.9500 } },
  { name: 'Mercer', state: 'NJ', fipsCode: '34021', population: 387340, medianHomeValue: 345000, medianHomeAge: 48, coordinates: { lat: 40.2833, lng: -74.7000 } },
  
  // New York
  { name: 'Monroe', state: 'NY', fipsCode: '36055', population: 759443, medianHomeValue: 185000, medianHomeAge: 55, coordinates: { lat: 43.1500, lng: -77.6167 } },
  { name: 'Ontario', state: 'NY', fipsCode: '36069', population: 112458, medianHomeValue: 195000, medianHomeAge: 48, coordinates: { lat: 42.8500, lng: -77.3000 } },
  
  // Virginia
  { name: 'Spotsylvania', state: 'VA', fipsCode: '51177', population: 140045, medianHomeValue: 365000, medianHomeAge: 25, coordinates: { lat: 38.1833, lng: -77.6500 } },
  { name: 'Stafford', state: 'VA', fipsCode: '51179', population: 156927, medianHomeValue: 425000, medianHomeAge: 22, coordinates: { lat: 38.4167, lng: -77.4500 } },
  { name: 'Prince William', state: 'VA', fipsCode: '51153', population: 482204, medianHomeValue: 445000, medianHomeAge: 28, coordinates: { lat: 38.7000, lng: -77.4833 } },
  
  // Maryland
  { name: 'Frederick', state: 'MD', fipsCode: '24021', population: 271717, medianHomeValue: 395000, medianHomeAge: 32, coordinates: { lat: 39.4667, lng: -77.4000 } },
  { name: 'Montgomery', state: 'MD', fipsCode: '24031', population: 1062061, medianHomeValue: 545000, medianHomeAge: 42, coordinates: { lat: 39.1333, lng: -77.2000 } },
  
  // Delaware
  { name: 'New Castle', state: 'DE', fipsCode: '10003', population: 570719, medianHomeValue: 285000, medianHomeAge: 45, coordinates: { lat: 39.5833, lng: -75.6333 } },
];

// Data source definitions - CRITICAL for showing execs what's mock vs real
export const DATA_SOURCES: DataSource[] = [
  {
    id: 'noaa_storm_events',
    name: 'NOAA Storm Events Database',
    type: 'weather',
    status: 'mock', // Would be 'live' in production
    description: 'Historical severe weather reports including hail, wind, and tornado events.',
    refreshFrequency: 'daily',
    lastUpdated: new Date(),
    reliability: 95,
    recordCount: 1247,
    integrationNotes: 'Free public API available at api.weather.gov. Production integration: ~2 weeks.',
    iconName: 'CloudLightning',
  },
  {
    id: 'county_permits',
    name: 'County Building Permits',
    type: 'permits',
    status: 'mock',
    description: 'Building permit applications from county governments.',
    refreshFrequency: 'weekly',
    lastUpdated: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    reliability: 75,
    recordCount: 3892,
    integrationNotes: 'Requires individual county API integrations. Some counties have open data portals.',
    iconName: 'FileCheck',
  },
  {
    id: 'zillow_market',
    name: 'Zillow Market Data',
    type: 'market',
    status: 'placeholder', // Shows this needs subscription
    description: 'Housing market indicators: values, sales velocity, trends.',
    refreshFrequency: 'monthly',
    lastUpdated: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
    reliability: 88,
    recordCount: 0,
    integrationNotes: 'Requires Zillow API partnership ($). Alternative: Redfin Data Center (free).',
    iconName: 'Home',
  },
  {
    id: 'roofing_contractor_mag',
    name: 'Roofing Contractor Magazine',
    type: 'trade_journal',
    status: 'placeholder',
    description: 'Industry news, trends, and best practices.',
    refreshFrequency: 'weekly',
    lastUpdated: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    reliability: 85,
    recordCount: 0,
    integrationNotes: 'Requires RSS integration or content partnership. Subscription needed for full access.',
    iconName: 'Newspaper',
  },
  {
    id: 'google_alerts',
    name: 'Competitor Monitoring',
    type: 'competitive',
    status: 'mock',
    description: 'Automated competitor mentions and market activity.',
    refreshFrequency: 'daily',
    lastUpdated: new Date(),
    reliability: 65,
    recordCount: 147,
    integrationNotes: 'Free via Google Alerts RSS. Production: aggregate alerts for key competitors.',
    iconName: 'Search',
  },
  {
    id: 'insurance_reports',
    name: 'Insurance Industry Reports',
    type: 'insurance',
    status: 'placeholder',
    description: 'Claim trends, carrier policies, adjuster patterns.',
    refreshFrequency: 'monthly',
    lastUpdated: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
    reliability: 80,
    recordCount: 0,
    integrationNotes: 'Requires industry subscriptions (IBHS, III) or public adjuster network partnership.',
    iconName: 'Shield',
  },
];

// Mock competitors for demo
export const MOCK_COMPETITORS = [
  {
    id: 'comp_1',
    name: 'Statewide Roofing Solutions',
    serviceArea: ['PA', 'NJ'] as StateCode[],
    estimatedSize: 'medium',
    strengths: ['Strong Google reviews', 'Fast response time'],
    weaknesses: ['Limited insurance expertise'],
    threatLevel: 'high',
  },
  {
    id: 'comp_2',
    name: 'Northeast Storm Repair',
    serviceArea: ['PA', 'NY', 'NJ'] as StateCode[],
    estimatedSize: 'large',
    strengths: ['Multi-state coverage', 'Marketing budget'],
    weaknesses: ['Impersonal service'],
    threatLevel: 'high',
  },
  {
    id: 'comp_3',
    name: 'Heritage Home Exteriors',
    serviceArea: ['PA'] as StateCode[],
    estimatedSize: 'small',
    strengths: ['Local reputation', 'Quality workmanship'],
    weaknesses: ['Limited capacity'],
    threatLevel: 'moderate',
  },
];
```

---

## PHASE 3: MOCK DATA GENERATORS

### Storm Data Generator

Create `/lib/terrain/generators/storm-generator.ts`:

```typescript
import { StormEvent, StormEventType, SeverityLevel, StormActivityIndex } from '../types';
import { TERRITORY_COUNTIES } from '../constants';

// Helper functions
const randomBetween = (min: number, max: number) => Math.random() * (max - min) + min;
const randomInt = (min: number, max: number) => Math.floor(randomBetween(min, max + 1));
const randomChoice = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const randomDate = (start: Date, end: Date) => new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));

// Weighted random selection
function weightedChoice<T extends string>(weights: Record<T, number>): T {
  const entries = Object.entries(weights) as [T, number][];
  const total = entries.reduce((sum, [, w]) => sum + w, 0);
  let r = Math.random() * total;
  for (const [key, weight] of entries) {
    r -= weight;
    if (r <= 0) return key;
  }
  return entries[0][0];
}

const STORM_WEIGHTS: Record<StormEventType, number> = {
  hail: 0.30, wind: 0.25, severe_thunderstorm: 0.25,
  tornado: 0.05, tropical_storm: 0.03, flooding: 0.07, winter_storm: 0.05,
};

const SEVERITY_WEIGHTS: Record<SeverityLevel, number> = {
  minor: 0.35, moderate: 0.30, significant: 0.20, severe: 0.12, extreme: 0.03,
};

export function generateStormEvent(dateRange?: { start: Date; end: Date }): StormEvent {
  const county = randomChoice(TERRITORY_COUNTIES);
  const now = new Date();
  const range = dateRange || { start: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000), end: now };
  
  const eventType = weightedChoice(STORM_WEIGHTS);
  const severity = weightedChoice(SEVERITY_WEIGHTS);
  const occurredAt = randomDate(range.start, range.end);
  
  // Generate realistic details based on event type
  const details: StormEvent['details'] = {};
  if (eventType === 'hail') {
    details.hailSize = parseFloat((randomBetween(0.75, 2.5)).toFixed(2));
    details.duration = randomInt(5, 30);
  } else if (eventType === 'wind' || eventType === 'severe_thunderstorm') {
    details.windSpeed = randomInt(50, 85);
    details.duration = randomInt(15, 90);
  }
  
  // Estimate affected structures
  const affectedRadius = randomBetween(2, 8);
  const baseAffected = Math.round(county.population / 2.5 * 0.01 * affectedRadius);
  const severityMultiplier = { minor: 0.3, moderate: 0.5, significant: 0.7, severe: 0.85, extreme: 1 }[severity];
  
  return {
    id: `storm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    eventType,
    severity,
    occurredAt,
    reportedAt: new Date(occurredAt.getTime() + randomInt(1, 6) * 60 * 60 * 1000),
    location: {
      county: county.name,
      state: county.state,
      coordinates: {
        lat: county.coordinates.lat + randomBetween(-0.1, 0.1),
        lng: county.coordinates.lng + randomBetween(-0.1, 0.1),
      },
      affectedRadius: parseFloat(affectedRadius.toFixed(1)),
    },
    details,
    estimatedStructuresAffected: Math.round(baseAffected * severityMultiplier),
    estimatedResidentialUnits: Math.round(baseAffected * severityMultiplier * 0.85),
    source: 'NOAA Storm Events Database',
    confidence: randomInt(75, 98),
  };
}

export function generateStormEvents(count: number): StormEvent[] {
  return Array.from({ length: count }, () => generateStormEvent())
    .sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime());
}

export function generateRecentSignificantStorms(count: number = 5): StormEvent[] {
  const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
  return Array.from({ length: count }, () => {
    const event = generateStormEvent({ start: twoWeeksAgo, end: new Date() });
    event.severity = randomChoice(['significant', 'severe', 'extreme'] as SeverityLevel[]);
    return event;
  }).sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime());
}

export function calculateStormActivityIndex(events: StormEvent[]): StormActivityIndex {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  
  const currentEvents = events.filter(e => e.occurredAt >= weekAgo);
  const priorEvents = events.filter(e => e.occurredAt >= twoWeeksAgo && e.occurredAt < weekAgo);
  
  const severityWeights = { minor: 1, moderate: 2, significant: 4, severe: 8, extreme: 16 };
  const currentScore = currentEvents.reduce((sum, e) => sum + severityWeights[e.severity], 0);
  const priorScore = priorEvents.reduce((sum, e) => sum + severityWeights[e.severity], 0);
  
  const indexValue = Math.min(100, Math.round((currentScore / 35) * 100));
  const percentChange = priorScore === 0 ? (currentScore > 0 ? 100 : 0) 
    : Math.round(((currentScore - priorScore) / priorScore) * 100);
  
  // Aggregate top counties
  const countyMap = new Map<string, { count: number; maxSeverity: SeverityLevel; state: string }>();
  currentEvents.forEach(e => {
    const key = `${e.location.county}_${e.location.state}`;
    const existing = countyMap.get(key) || { count: 0, maxSeverity: 'minor' as SeverityLevel, state: e.location.state };
    existing.count++;
    const severities: SeverityLevel[] = ['minor', 'moderate', 'significant', 'severe', 'extreme'];
    if (severities.indexOf(e.severity) > severities.indexOf(existing.maxSeverity)) {
      existing.maxSeverity = e.severity;
    }
    countyMap.set(key, existing);
  });
  
  const topCounties = Array.from(countyMap.entries())
    .map(([key, data]) => ({ county: key.split('_')[0], state: data.state as any, eventCount: data.count, severity: data.maxSeverity }))
    .sort((a, b) => b.eventCount - a.eventCount)
    .slice(0, 5);
  
  return {
    territory: 'Guardian Primary',
    period: 'weekly',
    startDate: weekAgo,
    endDate: now,
    indexValue,
    eventCount: currentEvents.length,
    trend: percentChange > 10 ? 'increasing' : percentChange < -10 ? 'decreasing' : 'stable',
    percentChangeFromPrior: percentChange,
    topCounties,
  };
}
```

---

## PHASE 4: SAMPLE EXECUTIVE SUMMARY CONTENT

For the AI brief generator, use realistic content patterns like:

**High Activity Example:**
```
"Storm activity in your territory is elevated at 73/100, up 34% week-over-week 
with 12 recorded events. Bucks County, PA shows highest activity with 4 significant 
events requiring immediate attention. Building permit velocity in Lehigh County 
suggests emerging opportunity – applications up 28% with 62% roofing-related. 
ACTION: Significant hail event in Montgomery County yesterday – estimated 2,400 
residential structures affected. Recommend immediate canvassing deployment."
```

**Low Activity Example:**
```
"Storm activity remains low (18/100) across your territory with only 3 minor events 
recorded this week. Focus shifts to retail opportunities and relationship building. 
Permit data shows steady activity in Chester County (stable +5%) suggesting 
consistent replacement-cycle demand. Consider proactive outreach to past customers 
for seasonal maintenance inspections."
```

---

## PHASE 5: UI COMPONENTS

### Main Dashboard Page (`/app/terrain/page.tsx`)

```tsx
import { Suspense } from 'react';
import TerrainDashboard from '@/components/terrain/TerrainDashboard';

export const metadata = {
  title: 'Trade Terrain | Guardian Intel',
  description: 'Market intelligence and territory analysis',
};

export default function TerrainPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      <Suspense fallback={<TerrainSkeleton />}>
        <TerrainDashboard />
      </Suspense>
    </div>
  );
}

function TerrainSkeleton() {
  return (
    <div className="p-6 space-y-6 animate-pulse">
      <div className="h-8 w-64 bg-white/5 rounded" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-32 bg-white/5 rounded-lg" />
        ))}
      </div>
      <div className="h-96 bg-white/5 rounded-lg" />
    </div>
  );
}
```

### Key Metric Card Component

```tsx
// /components/terrain/MetricCard.tsx
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { KeyMetric } from '@/lib/terrain/types';

interface MetricCardProps {
  metric: KeyMetric;
}

export default function MetricCard({ metric }: MetricCardProps) {
  const TrendIcon = metric.changeDirection === 'up' ? TrendingUp 
    : metric.changeDirection === 'down' ? TrendingDown : Minus;
  
  const trendColor = metric.changeIsPositive 
    ? 'text-emerald-400' 
    : metric.changeDirection === 'flat' 
      ? 'text-zinc-400' 
      : 'text-rose-400';
  
  return (
    <div className="bg-[#111118] border border-white/10 rounded-lg p-4 hover:border-cyan-500/30 transition-colors">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-zinc-500 uppercase tracking-wide">{metric.name}</p>
          <p className="text-2xl font-bold text-white mt-1">
            {metric.value.toLocaleString()}{metric.unit}
          </p>
        </div>
        <div className={`flex items-center gap-1 ${trendColor}`}>
          <TrendIcon className="w-4 h-4" />
          <span className="text-sm font-medium">
            {metric.change > 0 ? '+' : ''}{metric.change}%
          </span>
        </div>
      </div>
      <p className="text-xs text-zinc-500 mt-2">{metric.context}</p>
    </div>
  );
}
```

### Data Source Status Badge

```tsx
// /components/terrain/DataSourceBadge.tsx
import { DataSourceStatus } from '@/lib/terrain/types';

interface DataSourceBadgeProps {
  status: DataSourceStatus;
  showLabel?: boolean;
}

export default function DataSourceBadge({ status, showLabel = true }: DataSourceBadgeProps) {
  const config = {
    live: { color: 'bg-emerald-500', label: 'Live' },
    mock: { color: 'bg-amber-500', label: 'Demo Data' },
    placeholder: { color: 'bg-zinc-500', label: 'Integration Pending' },
  }[status];
  
  return (
    <div className="flex items-center gap-1.5">
      <div className={`w-2 h-2 rounded-full ${config.color}`} />
      {showLabel && (
        <span className="text-xs text-zinc-400">{config.label}</span>
      )}
    </div>
  );
}
```

### Insight Card Component

```tsx
// /components/terrain/InsightCard.tsx
import { AlertTriangle, TrendingUp, Zap, Search } from 'lucide-react';
import { Insight } from '@/lib/terrain/types';
import DataSourceBadge from './DataSourceBadge';

interface InsightCardProps {
  insight: Insight;
  onActionClick?: () => void;
}

export default function InsightCard({ insight, onActionClick }: InsightCardProps) {
  const categoryIcons = {
    opportunity: TrendingUp,
    threat: AlertTriangle,
    trend: Search,
    anomaly: Zap,
  };
  const Icon = categoryIcons[insight.category];
  
  const priorityColors = {
    critical: 'border-rose-500 bg-rose-500/10',
    high: 'border-amber-500 bg-amber-500/10',
    medium: 'border-cyan-500 bg-cyan-500/10',
    low: 'border-zinc-500 bg-zinc-500/10',
  };
  
  const categoryColors = {
    opportunity: 'text-emerald-400',
    threat: 'text-rose-400',
    trend: 'text-cyan-400',
    anomaly: 'text-amber-400',
  };
  
  return (
    <div className={`border rounded-lg p-4 ${priorityColors[insight.priority]}`}>
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-lg bg-white/5 ${categoryColors[insight.category]}`}>
          <Icon className="w-5 h-5" />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xs font-medium uppercase ${categoryColors[insight.category]}`}>
              {insight.category}
            </span>
            <span className="text-xs text-zinc-500">•</span>
            <span className="text-xs text-zinc-500 capitalize">{insight.priority} priority</span>
          </div>
          
          <h3 className="text-white font-medium mb-2">{insight.title}</h3>
          <p className="text-sm text-zinc-400 mb-3">{insight.description}</p>
          
          {/* Supporting Data */}
          <div className="flex flex-wrap gap-2 mb-3">
            {insight.supportingData.slice(0, 3).map((dp, i) => (
              <div key={i} className="flex items-center gap-1.5 bg-white/5 px-2 py-1 rounded text-xs">
                <span className="text-zinc-500">{dp.metric}:</span>
                <span className="text-white font-medium">{dp.value}</span>
                <DataSourceBadge status={dp.sourceStatus} showLabel={false} />
              </div>
            ))}
          </div>
          
          {/* Suggested Action */}
          <div className="bg-white/5 rounded p-3 border border-white/5">
            <p className="text-xs text-zinc-500 uppercase mb-1">Suggested Action</p>
            <p className="text-sm text-cyan-300">{insight.suggestedAction}</p>
          </div>
          
          {/* Impact */}
          <div className="flex items-center justify-between mt-3 text-xs">
            <span className="text-zinc-500">
              Impact: <span className="text-zinc-300 capitalize">{insight.estimatedImpact.magnitude}</span>
            </span>
            <span className="text-zinc-500">
              Confidence: <span className="text-zinc-300">{insight.confidence}%</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

## PHASE 6: IMPLEMENTATION ORDER

Execute in this sequence:

1. **Types & Constants** (30 min)
   - Create all type definitions
   - Set up territory/county data
   - Define data sources with status indicators

2. **Mock Data Generators** (2 hours)
   - Storm event generator with realistic patterns
   - Permit record generator
   - Brief content generator with AI-style summaries

3. **Data Provider Layer** (1 hour)
   - Singleton pattern for data caching
   - Initialization with mock data
   - Access methods for components

4. **Core UI Components** (3 hours)
   - MetricCard, InsightCard, DataSourceBadge
   - TerrainDashboard main layout
   - Brief viewer components

5. **Pages & Routing** (1 hour)
   - Main terrain dashboard
   - Brief archive and detail views
   - Data sources panel

6. **Polish & Demo Prep** (1 hour)
   - Loading states
   - Empty states
   - Source status indicators prominently displayed

---

## KEY DEMO POINTS FOR EXECUTIVES

When Guardian leadership reviews this module, they should immediately understand:

1. **What's Real vs Demo** - Every data point shows its source status (Live/Demo/Pending)

2. **Integration Roadmap** - Each placeholder source shows what's needed to activate it

3. **Actionable Output** - Briefs generate specific action items assigned to teams

4. **Time Value** - The system surfaces insights leadership would never find manually

5. **Scalability** - Architecture supports adding new data sources without rebuilding

---

## SAMPLE GENERATED BRIEF FOR DEMO

Include this pre-generated brief in the initial data:

```typescript
const DEMO_BRIEF: IntelligenceBrief = {
  id: 'brief_demo_weekly_001',
  generatedAt: new Date(),
  briefType: 'weekly',
  territory: 'Guardian Primary (PA, NY, VA, NJ, DE, MD)',
  periodStart: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
  periodEnd: new Date(),
  
  executiveSummary: `Storm activity in your territory increased 34% week-over-week, concentrated in Bucks and Montgomery Counties following Thursday's severe thunderstorm cell. Building permit velocity in the Lehigh Valley suggests emerging retail opportunity—permit applications up 18% QoQ while competitor presence remains low. Recommend immediate canvassing deployment to affected PA counties within 48-hour window for optimal homeowner awareness timing.`,
  
  keyMetrics: [
    { id: 'm1', name: 'Storm Activity Index', value: 67, unit: '/100', change: 34, changeDirection: 'up', changeIsPositive: true, context: '12 events recorded this period' },
    { id: 'm2', name: 'Structures Affected', value: 4850, unit: '', change: 0, changeDirection: 'flat', changeIsPositive: true, context: '30-day rolling estimate' },
    { id: 'm3', name: 'Permit Velocity', value: 18, unit: '%', change: 18, changeDirection: 'up', changeIsPositive: true, context: 'QoQ change in roofing permits' },
    { id: 'm4', name: 'Opportunity Score', value: 72, unit: '/100', change: 12, changeDirection: 'up', changeIsPositive: true, context: 'Composite territory score' },
  ],
  
  insights: [
    {
      id: 'ins_001',
      category: 'opportunity',
      priority: 'high',
      title: 'Post-Storm Window: Bucks County Hail Event',
      description: 'NOAA confirmed 1.25" hail in Warminster-Richboro corridor on Jan 15. Estimated 2,400 residential structures in impact zone. Historical data suggests 12% claim filing rate within 14 days.',
      supportingData: [
        { source: 'NOAA Storm Events', sourceStatus: 'mock', metric: 'Hail size', value: '1.25"', asOfDate: new Date() },
        { source: 'NOAA Storm Events', sourceStatus: 'mock', metric: 'Affected structures', value: 2400, asOfDate: new Date() },
      ],
      suggestedAction: 'Deploy 3-person canvassing team to Warminster/Richboro within 48 hours. Focus on neighborhoods with 20+ year old roofs.',
      relevantTeam: 'sales',
      estimatedImpact: { type: 'revenue', magnitude: 'significant', description: 'Potential 35-45 new contracts based on historical conversion' },
      confidence: 87,
      expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    },
    // Add 4-5 more insights...
  ],
  
  actionItems: [
    {
      id: 'act_001',
      action: 'Deploy canvassing team to Bucks County within 48 hours',
      rationale: 'Capitalize on post-hail homeowner awareness window',
      assignTo: 'sales',
      urgency: 'immediate',
      expectedImpact: '35-45 potential new contracts',
      relatedInsightId: 'ins_001',
      status: 'pending',
      dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
    },
    // Add more action items...
  ],
  
  trendsIdentified: [],
  
  dataSourcesUsed: [
    { sourceId: 'noaa_storm_events', sourceName: 'NOAA Storm Events', sourceStatus: 'mock', recordsUsed: 1247, dateRange: { start: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), end: new Date() }, reliability: 95 },
    { sourceId: 'county_permits', sourceName: 'County Building Permits', sourceStatus: 'mock', recordsUsed: 3892, dateRange: { start: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), end: new Date() }, reliability: 75 },
    { sourceId: 'google_alerts', sourceName: 'Competitor Monitoring', sourceStatus: 'mock', recordsUsed: 147, dateRange: { start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), end: new Date() }, reliability: 65 },
  ],
  
  confidenceScore: 78,
  
  dataQualityNotes: [
    'Storm data uses NOAA structure (demo data for this preview)',
    'Permit data aggregated from county records (demo data for this preview)',
    'Market indicators require Zillow/Redfin integration for production',
    'Insurance signals require industry report subscriptions',
  ],
  
  status: 'published',
};
```

---

## END OF PROMPT

After pasting this into Cursor, you can guide implementation with follow-up prompts like:

- "Build the storm generator first with all helper functions"
- "Create the MetricCard component following the design spec"
- "Generate the main TerrainDashboard layout with responsive grid"
- "Add the data provider with initialization logic"

The modular structure allows incremental building and testing.
