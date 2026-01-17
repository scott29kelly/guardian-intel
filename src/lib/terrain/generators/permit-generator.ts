import { PermitRecord, PermitType, PermitVelocity, StateCode } from '../types';
import { TERRITORY_COUNTIES, MUNICIPALITIES } from '../constants';

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

const PERMIT_TYPE_WEIGHTS: Record<PermitType, number> = {
  roof_replacement: 0.45,
  roof_repair: 0.25,
  new_construction: 0.10,
  siding: 0.12,
  general_exterior: 0.08,
};

const PROPERTY_TYPE_WEIGHTS = {
  residential: 0.75,
  commercial: 0.15,
  multi_family: 0.10,
};

// Average permit values by type
const PERMIT_VALUES: Record<PermitType, { min: number; max: number }> = {
  roof_replacement: { min: 8000, max: 35000 },
  roof_repair: { min: 1500, max: 8000 },
  new_construction: { min: 25000, max: 80000 },
  siding: { min: 8000, max: 25000 },
  general_exterior: { min: 3000, max: 15000 },
};

export function generatePermitRecord(dateRange?: { start: Date; end: Date }): PermitRecord {
  const county = randomChoice(TERRITORY_COUNTIES);
  const now = new Date();
  const range = dateRange || { start: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000), end: now };
  
  const permitType = weightedChoice(PERMIT_TYPE_WEIGHTS);
  const propertyType = weightedChoice(PROPERTY_TYPE_WEIGHTS) as 'residential' | 'commercial' | 'multi_family';
  const valueRange = PERMIT_VALUES[permitType];
  
  // Commercial and multi-family permits are typically higher value
  const multiplier = propertyType === 'commercial' ? 2.5 : propertyType === 'multi_family' ? 1.8 : 1;
  
  const municipalities = MUNICIPALITIES[county.state] || ['Unknown'];
  
  return {
    id: `permit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    permitType,
    issuedAt: randomDate(range.start, range.end),
    county: county.name,
    state: county.state,
    municipality: randomChoice(municipalities),
    estimatedValue: Math.round(randomBetween(valueRange.min, valueRange.max) * multiplier),
    propertyType,
    isStormRelated: Math.random() < 0.35, // 35% of roofing permits are storm-related
    source: 'County Building Permits',
  };
}

export function generatePermitRecords(count: number): PermitRecord[] {
  return Array.from({ length: count }, () => generatePermitRecord())
    .sort((a, b) => b.issuedAt.getTime() - a.issuedAt.getTime());
}

export function calculatePermitVelocity(permits: PermitRecord[], county: string, state: StateCode): PermitVelocity {
  const now = new Date();
  const currentPeriodStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const priorPeriodStart = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
  
  const countyPermits = permits.filter(p => p.county === county && p.state === state);
  const currentCount = countyPermits.filter(p => p.issuedAt >= currentPeriodStart).length;
  const priorCount = countyPermits.filter(p => p.issuedAt >= priorPeriodStart && p.issuedAt < currentPeriodStart).length;
  
  const percentChange = priorCount === 0 ? (currentCount > 0 ? 100 : 0) 
    : Math.round(((currentCount - priorCount) / priorCount) * 100);
  
  // Calculate roofing share
  const roofingCount = countyPermits.filter(p => 
    p.issuedAt >= currentPeriodStart && 
    (p.permitType === 'roof_replacement' || p.permitType === 'roof_repair')
  ).length;
  const roofingSharePercent = currentCount > 0 ? Math.round((roofingCount / currentCount) * 100) : 0;
  
  return {
    county,
    state,
    period: 'monthly',
    currentCount,
    priorPeriodCount: priorCount,
    percentChange,
    trend: percentChange > 15 ? 'accelerating' : percentChange < -15 ? 'decelerating' : 'stable',
    roofingSharePercent,
  };
}

export function calculateAllPermitVelocities(permits: PermitRecord[]): PermitVelocity[] {
  const velocities: PermitVelocity[] = [];
  
  TERRITORY_COUNTIES.forEach(county => {
    velocities.push(calculatePermitVelocity(permits, county.name, county.state));
  });
  
  return velocities.sort((a, b) => b.percentChange - a.percentChange);
}

// Generate permits with higher activity for demo
export function generateDemoPermits(): PermitRecord[] {
  const permits: PermitRecord[] = [];
  const now = new Date();
  
  // Generate baseline permits across territory
  permits.push(...generatePermitRecords(120));
  
  // Add surge in Lehigh County (for demo insight)
  const lehighSurge = Array.from({ length: 25 }, () => {
    const permit = generatePermitRecord({
      start: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000),
      end: now,
    });
    permit.county = 'Lehigh';
    permit.state = 'PA';
    permit.permitType = Math.random() < 0.62 ? 'roof_replacement' : permit.permitType;
    return permit;
  });
  permits.push(...lehighSurge);
  
  return permits.sort((a, b) => b.issuedAt.getTime() - a.issuedAt.getTime());
}

// Get aggregate permit stats for a time period
export function getPermitStats(permits: PermitRecord[], days: number = 30) {
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const recentPermits = permits.filter(p => p.issuedAt >= cutoff);
  
  const roofingPermits = recentPermits.filter(p => 
    p.permitType === 'roof_replacement' || p.permitType === 'roof_repair'
  );
  
  const stormRelatedPermits = recentPermits.filter(p => p.isStormRelated);
  
  const totalValue = recentPermits.reduce((sum, p) => sum + p.estimatedValue, 0);
  const roofingValue = roofingPermits.reduce((sum, p) => sum + p.estimatedValue, 0);
  
  return {
    totalCount: recentPermits.length,
    roofingCount: roofingPermits.length,
    stormRelatedCount: stormRelatedPermits.length,
    totalValue,
    roofingValue,
    averageValue: recentPermits.length > 0 ? Math.round(totalValue / recentPermits.length) : 0,
    roofingSharePercent: recentPermits.length > 0 
      ? Math.round((roofingPermits.length / recentPermits.length) * 100) 
      : 0,
    stormRelatedPercent: recentPermits.length > 0
      ? Math.round((stormRelatedPermits.length / recentPermits.length) * 100)
      : 0,
  };
}
