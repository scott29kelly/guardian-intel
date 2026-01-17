import { StormEvent, StormEventType, SeverityLevel, StormActivityIndex, StateCode } from '../types';
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
  hail: 0.30, 
  wind: 0.25, 
  severe_thunderstorm: 0.25,
  tornado: 0.05, 
  tropical_storm: 0.03, 
  flooding: 0.07, 
  winter_storm: 0.05,
};

const SEVERITY_WEIGHTS: Record<SeverityLevel, number> = {
  minor: 0.35, 
  moderate: 0.30, 
  significant: 0.20, 
  severe: 0.12, 
  extreme: 0.03,
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
  } else if (eventType === 'tornado') {
    details.windSpeed = randomInt(65, 150);
    details.duration = randomInt(5, 45);
  } else if (eventType === 'flooding') {
    details.rainfall = parseFloat(randomBetween(2, 8).toFixed(1));
    details.duration = randomInt(60, 360);
  } else if (eventType === 'winter_storm') {
    details.windSpeed = randomInt(25, 55);
    details.duration = randomInt(180, 720);
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
    // Increase impact for significant storms
    event.estimatedStructuresAffected = Math.round(event.estimatedStructuresAffected * 1.5);
    event.estimatedResidentialUnits = Math.round(event.estimatedResidentialUnits * 1.5);
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
  const countyMap = new Map<string, { count: number; maxSeverity: SeverityLevel; state: StateCode }>();
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
    .map(([key, data]) => ({ 
      county: key.split('_')[0], 
      state: data.state, 
      eventCount: data.count, 
      severity: data.maxSeverity 
    }))
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

// Generate a specific high-impact storm for demo purposes
export function generateDemoHailEvent(): StormEvent {
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
  
  return {
    id: 'storm_demo_hail_001',
    eventType: 'hail',
    severity: 'significant',
    occurredAt: yesterday,
    reportedAt: new Date(yesterday.getTime() + 2 * 60 * 60 * 1000),
    location: {
      county: 'Bucks',
      state: 'PA',
      coordinates: { lat: 40.2068, lng: -75.0696 },
      affectedRadius: 5.2,
    },
    details: {
      hailSize: 1.25,
      duration: 18,
    },
    estimatedStructuresAffected: 2400,
    estimatedResidentialUnits: 2040,
    source: 'NOAA Storm Events Database',
    confidence: 92,
  };
}
