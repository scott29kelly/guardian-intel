import { Competitor, TerrainAlert, StateCode, InsightPriority, AlertType } from '../types';
import { MOCK_COMPETITORS, TERRITORY_COUNTIES } from '../constants';

// Helper functions
const randomBetween = (min: number, max: number) => Math.random() * (max - min) + min;
const randomInt = (min: number, max: number) => Math.floor(randomBetween(min, max + 1));
const randomChoice = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const randomDate = (start: Date, end: Date) => new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));

export interface CompetitorActivity {
  id: string;
  competitorId: string;
  competitorName: string;
  activityType: 'new_review' | 'job_sighting' | 'marketing_activity' | 'price_change' | 'expansion';
  description: string;
  location?: { county: string; state: StateCode };
  detectedAt: Date;
  significance: 'low' | 'medium' | 'high';
  source: string;
}

export function generateCompetitorActivity(competitor?: Competitor): CompetitorActivity {
  const comp = competitor || randomChoice(MOCK_COMPETITORS);
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  
  const activityTypes: CompetitorActivity['activityType'][] = [
    'new_review', 'job_sighting', 'marketing_activity', 'price_change', 'expansion'
  ];
  const activityType = randomChoice(activityTypes);
  
  const descriptions: Record<CompetitorActivity['activityType'], string[]> = {
    new_review: [
      `New 5-star Google review mentioning quick turnaround`,
      `Customer review praising insurance claim handling`,
      `Mixed review citing quality concerns`,
      `Positive BBB review with photo documentation`,
    ],
    job_sighting: [
      `Crew spotted working on large commercial project`,
      `Multiple yard signs observed in neighborhood`,
      `Branded trucks active in residential area`,
      `Observed completing job in target neighborhood`,
    ],
    marketing_activity: [
      `New Google Ads campaign detected in local market`,
      `Direct mail piece reported by customer`,
      `Radio spot running on local station`,
      `Increased social media advertising observed`,
    ],
    price_change: [
      `Customer reports lower quote than last quarter`,
      `Promotional pricing mentioned in recent review`,
      `Competitive bid substantially undercut market`,
      `Premium pricing strategy noted in commercial segment`,
    ],
    expansion: [
      `New office location announced`,
      `Hiring posts indicate growth plans`,
      `New service area mentioned in marketing`,
      `Equipment purchase suggests capacity increase`,
    ],
  };
  
  const serviceState = randomChoice(comp.serviceArea);
  const countiesInState = TERRITORY_COUNTIES.filter(c => c.state === serviceState);
  const county = randomChoice(countiesInState);
  
  return {
    id: `activity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    competitorId: comp.id,
    competitorName: comp.name,
    activityType,
    description: randomChoice(descriptions[activityType]),
    location: county ? { county: county.name, state: county.state } : undefined,
    detectedAt: randomDate(thirtyDaysAgo, now),
    significance: comp.threatLevel === 'high' ? 'high' : comp.threatLevel === 'moderate' ? 'medium' : 'low',
    source: 'Competitor Monitoring',
  };
}

export function generateCompetitorActivities(count: number = 20): CompetitorActivity[] {
  return Array.from({ length: count }, () => generateCompetitorActivity())
    .sort((a, b) => b.detectedAt.getTime() - a.detectedAt.getTime());
}

// Generate demo competitor activities with notable patterns
export function generateDemoCompetitorActivities(): CompetitorActivity[] {
  const activities: CompetitorActivity[] = [];
  const now = new Date();
  
  // Northeast Storm Repair expanding aggressively (for demo insight)
  const northeastComp = MOCK_COMPETITORS.find(c => c.name === 'Northeast Storm Repair')!;
  activities.push({
    id: 'activity_demo_001',
    competitorId: northeastComp.id,
    competitorName: northeastComp.name,
    activityType: 'marketing_activity',
    description: 'Significant increase in Google Ads spend detected in Bucks/Montgomery corridor',
    location: { county: 'Bucks', state: 'PA' },
    detectedAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
    significance: 'high',
    source: 'Competitor Monitoring',
  });
  
  activities.push({
    id: 'activity_demo_002',
    competitorId: northeastComp.id,
    competitorName: northeastComp.name,
    activityType: 'new_review',
    description: '18 new Google reviews in past 30 days indicating expanded operations',
    location: { county: 'Montgomery', state: 'PA' },
    detectedAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
    significance: 'high',
    source: 'Competitor Monitoring',
  });
  
  // Add general competitor noise
  activities.push(...generateCompetitorActivities(15));
  
  return activities.sort((a, b) => b.detectedAt.getTime() - a.detectedAt.getTime());
}

// Generate terrain alerts based on various triggers
export function generateTerrainAlert(
  alertType: AlertType,
  priority: InsightPriority
): TerrainAlert {
  const now = new Date();
  
  const alertTemplates: Record<AlertType, { title: string; summary: string; actions: string[] }[]> = {
    storm_event: [
      {
        title: 'Severe Hail Event Detected',
        summary: 'NOAA reports significant hail activity with potential for widespread roof damage.',
        actions: ['Deploy assessment teams', 'Prepare canvassing materials', 'Review capacity for surge'],
      },
      {
        title: 'High Wind Warning Active',
        summary: 'NWS issued high wind warning with gusts exceeding 60mph expected.',
        actions: ['Monitor damage reports', 'Prepare emergency response', 'Stage crews for rapid response'],
      },
    ],
    competitor_activity: [
      {
        title: 'Competitor Expansion Alert',
        summary: 'Major competitor activity detected in core market areas.',
        actions: ['Review pricing strategy', 'Increase marketing presence', 'Brief sales team'],
      },
    ],
    market_shift: [
      {
        title: 'Housing Market Shift Detected',
        summary: 'Significant change in housing market indicators affecting demand patterns.',
        actions: ['Adjust territory focus', 'Review lead prioritization', 'Update forecasts'],
      },
    ],
    permit_spike: [
      {
        title: 'Permit Activity Surge',
        summary: 'Unusual increase in building permit applications detected.',
        actions: ['Increase outreach to affected areas', 'Review production capacity', 'Consider additional crews'],
      },
    ],
    insurance_change: [
      {
        title: 'Insurance Policy Update',
        summary: 'Major carrier has updated claim processing procedures.',
        actions: ['Review updated requirements', 'Update documentation templates', 'Brief adjusters'],
      },
    ],
    opportunity_window: [
      {
        title: 'Time-Sensitive Opportunity',
        summary: 'Conditions indicate limited window for optimal customer engagement.',
        actions: ['Prioritize immediate outreach', 'Allocate resources', 'Track response rates'],
      },
    ],
  };
  
  const templates = alertTemplates[alertType];
  const template = randomChoice(templates);
  
  const affectedStates: StateCode[] = randomChoice([
    ['PA', 'NJ'],
    ['PA'],
    ['VA', 'MD'],
    ['NY'],
    ['PA', 'NJ', 'DE'],
  ] as StateCode[][]);
  
  const affectedCounties = TERRITORY_COUNTIES
    .filter(c => affectedStates.includes(c.state))
    .slice(0, randomInt(2, 5))
    .map(c => c.name);
  
  return {
    id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    createdAt: now,
    alertType,
    priority,
    title: template.title,
    summary: template.summary,
    affectedArea: { counties: affectedCounties, states: affectedStates },
    recommendedActions: template.actions,
    expiresAt: new Date(now.getTime() + randomInt(1, 7) * 24 * 60 * 60 * 1000),
    status: 'active',
  };
}

export function generateDemoAlerts(): TerrainAlert[] {
  const now = new Date();
  
  return [
    {
      id: 'alert_demo_001',
      createdAt: new Date(now.getTime() - 6 * 60 * 60 * 1000), // 6 hours ago
      alertType: 'storm_event',
      priority: 'high',
      title: 'Post-Storm Opportunity Window: Bucks County',
      summary: 'Hail event yesterday created 48-hour optimal engagement window. 2,400+ structures affected in Warminster-Richboro corridor.',
      affectedArea: { counties: ['Bucks'], states: ['PA'] },
      recommendedActions: [
        'Deploy 3-person canvassing team within 48 hours',
        'Focus on neighborhoods with 20+ year roofs',
        'Prepare insurance documentation materials',
      ],
      expiresAt: new Date(now.getTime() + 42 * 60 * 60 * 1000), // 42 hours from now
      status: 'active',
    },
    {
      id: 'alert_demo_002',
      createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      alertType: 'competitor_activity',
      priority: 'medium',
      title: 'Competitor Marketing Push: Montgomery County',
      summary: 'Northeast Storm Repair has increased ad spend by estimated 40% in Montgomery County corridor.',
      affectedArea: { counties: ['Montgomery', 'Bucks'], states: ['PA'] },
      recommendedActions: [
        'Review local pricing competitiveness',
        'Consider targeted remarketing campaign',
        'Monitor for customer feedback',
      ],
      expiresAt: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000),
      status: 'active',
    },
    {
      id: 'alert_demo_003',
      createdAt: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000), // 4 days ago
      alertType: 'permit_spike',
      priority: 'medium',
      title: 'Permit Surge: Lehigh Valley',
      summary: 'Building permit applications up 28% in Lehigh County with 62% roofing-related. Low competitor presence creates opportunity.',
      affectedArea: { counties: ['Lehigh', 'Northampton'], states: ['PA'] },
      recommendedActions: [
        'Increase marketing presence in Lehigh Valley',
        'Consider targeted direct mail campaign',
        'Review crew allocation for area',
      ],
      expiresAt: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000),
      status: 'active',
    },
  ];
}

// Competitor threat assessment
export function assessCompetitorThreats(activities: CompetitorActivity[]): {
  highThreat: Competitor[];
  recentActivity: CompetitorActivity[];
  affectedMarkets: { county: string; state: StateCode; activityCount: number }[];
} {
  const recentActivity = activities.filter(a => 
    a.detectedAt >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  );
  
  const highThreatIds = new Set(
    activities.filter(a => a.significance === 'high').map(a => a.competitorId)
  );
  const highThreat = MOCK_COMPETITORS.filter(c => highThreatIds.has(c.id));
  
  const marketMap = new Map<string, number>();
  activities.forEach(a => {
    if (a.location) {
      const key = `${a.location.county}_${a.location.state}`;
      marketMap.set(key, (marketMap.get(key) || 0) + 1);
    }
  });
  
  const affectedMarkets = Array.from(marketMap.entries())
    .map(([key, count]) => {
      const [county, state] = key.split('_');
      return { county, state: state as StateCode, activityCount: count };
    })
    .sort((a, b) => b.activityCount - a.activityCount);
  
  return { highThreat, recentActivity, affectedMarkets };
}
