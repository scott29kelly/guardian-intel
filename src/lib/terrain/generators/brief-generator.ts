import {
  IntelligenceBrief,
  KeyMetric,
  Insight,
  ActionItem,
  Trend,
  DataSourceReference,
  StormEvent,
  PermitRecord,
  StormActivityIndex,
  InsightCategory,
  InsightPriority,
  TeamRelevance,
} from '../types';
import { calculateStormActivityIndex } from './storm-generator';
import { getPermitStats } from './permit-generator';

// Generate the demo brief as specified in the spec
export function generateDemoBrief(): IntelligenceBrief {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

  const keyMetrics: KeyMetric[] = [
    { 
      id: 'm1', 
      name: 'Storm Activity Index', 
      value: 67, 
      unit: '/100', 
      change: 34, 
      changeDirection: 'up', 
      changeIsPositive: true, 
      context: '12 events recorded this period' 
    },
    { 
      id: 'm2', 
      name: 'Structures Affected', 
      value: 4850, 
      unit: '', 
      change: 0, 
      changeDirection: 'flat', 
      changeIsPositive: true, 
      context: '30-day rolling estimate' 
    },
    { 
      id: 'm3', 
      name: 'Permit Velocity', 
      value: 18, 
      unit: '%', 
      change: 18, 
      changeDirection: 'up', 
      changeIsPositive: true, 
      context: 'QoQ change in roofing permits' 
    },
    { 
      id: 'm4', 
      name: 'Opportunity Score', 
      value: 72, 
      unit: '/100', 
      change: 12, 
      changeDirection: 'up', 
      changeIsPositive: true, 
      context: 'Composite territory score' 
    },
  ];

  const insights: Insight[] = [
    {
      id: 'ins_001',
      category: 'opportunity',
      priority: 'high',
      title: 'Post-Storm Window: Bucks County Hail Event',
      description: 'NOAA confirmed 1.25" hail in Warminster-Richboro corridor on Jan 15. Estimated 2,400 residential structures in impact zone. Historical data suggests 12% claim filing rate within 14 days.',
      supportingData: [
        { source: 'NOAA Storm Events', sourceStatus: 'mock', metric: 'Hail size', value: '1.25"', asOfDate: now },
        { source: 'NOAA Storm Events', sourceStatus: 'mock', metric: 'Affected structures', value: 2400, asOfDate: now },
        { source: 'Historical Patterns', sourceStatus: 'mock', metric: 'Expected claim rate', value: '12%', asOfDate: now },
      ],
      suggestedAction: 'Deploy 3-person canvassing team to Warminster/Richboro within 48 hours. Focus on neighborhoods with 20+ year old roofs.',
      relevantTeam: 'sales',
      estimatedImpact: { 
        type: 'revenue', 
        magnitude: 'significant', 
        description: 'Potential 35-45 new contracts based on historical conversion' 
      },
      confidence: 87,
      expiresAt: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000),
    },
    {
      id: 'ins_002',
      category: 'trend',
      priority: 'medium',
      title: 'Lehigh Valley Permit Acceleration',
      description: 'Building permit applications in Lehigh County up 28% QoQ with 62% roofing-related. Limited competitor presence in this market creates favorable conditions.',
      supportingData: [
        { source: 'County Building Permits', sourceStatus: 'mock', metric: 'Permit change QoQ', value: '+28%', asOfDate: now },
        { source: 'County Building Permits', sourceStatus: 'mock', metric: 'Roofing share', value: '62%', asOfDate: now },
        { source: 'Competitor Monitoring', sourceStatus: 'mock', metric: 'Active competitors', value: 2, asOfDate: now },
      ],
      suggestedAction: 'Increase marketing presence in Lehigh Valley. Consider targeted direct mail campaign to homeowners with 25+ year old roofs.',
      relevantTeam: 'sales',
      estimatedImpact: { 
        type: 'revenue', 
        magnitude: 'moderate', 
        description: 'Capture additional market share in growth area' 
      },
      confidence: 78,
    },
    {
      id: 'ins_003',
      category: 'threat',
      priority: 'medium',
      title: 'Competitor Activity: Northeast Storm Repair Expansion',
      description: 'Northeast Storm Repair observed increasing Google Ads spend in Bucks/Montgomery corridor. New reviews indicate expanded service radius.',
      supportingData: [
        { source: 'Competitor Monitoring', sourceStatus: 'mock', metric: 'New reviews (30d)', value: 18, asOfDate: now },
        { source: 'Competitor Monitoring', sourceStatus: 'mock', metric: 'Est. ad spend increase', value: '+40%', asOfDate: now },
      ],
      suggestedAction: 'Review pricing competitiveness in affected areas. Consider targeted remarketing campaign to recent website visitors.',
      relevantTeam: 'leadership',
      estimatedImpact: { 
        type: 'competitive', 
        magnitude: 'moderate', 
        description: 'Potential market share erosion if unaddressed' 
      },
      confidence: 72,
    },
    {
      id: 'ins_004',
      category: 'opportunity',
      priority: 'medium',
      title: 'Monroe County NY: Aging Roof Inventory',
      description: 'Analysis indicates 38% of residential structures in Monroe County have roofs 20+ years old. Combined with recent wind events, significant replacement-cycle opportunity exists.',
      supportingData: [
        { source: 'Property Data', sourceStatus: 'placeholder', metric: 'Roofs 20+ years', value: '38%', asOfDate: now },
        { source: 'NOAA Storm Events', sourceStatus: 'mock', metric: 'Wind events (90d)', value: 4, asOfDate: now },
      ],
      suggestedAction: 'Develop targeted campaign for Rochester metro area emphasizing inspection services and storm damage assessment.',
      relevantTeam: 'sales',
      estimatedImpact: { 
        type: 'revenue', 
        magnitude: 'moderate', 
        description: 'Untapped market with strong demographics' 
      },
      confidence: 68,
    },
    {
      id: 'ins_005',
      category: 'anomaly',
      priority: 'low',
      title: 'Insurance Claim Processing Delays',
      description: 'Multiple customer reports indicate State Farm claim processing times have increased in PA market. Consider proactive communication with affected customers.',
      supportingData: [
        { source: 'Customer Feedback', sourceStatus: 'mock', metric: 'Delay reports', value: 7, asOfDate: now },
        { source: 'Customer Feedback', sourceStatus: 'mock', metric: 'Avg. delay', value: '8 days', asOfDate: now },
      ],
      suggestedAction: 'Create customer communication template addressing delays. Offer flexible scheduling to accommodate extended timelines.',
      relevantTeam: 'operations',
      estimatedImpact: { 
        type: 'efficiency', 
        magnitude: 'minor', 
        description: 'Improved customer satisfaction during delays' 
      },
      confidence: 65,
    },
  ];

  const actionItems: ActionItem[] = [
    {
      id: 'act_001',
      action: 'Deploy canvassing team to Bucks County within 48 hours',
      rationale: 'Capitalize on post-hail homeowner awareness window',
      assignTo: 'sales',
      urgency: 'immediate',
      expectedImpact: '35-45 potential new contracts',
      relatedInsightId: 'ins_001',
      status: 'pending',
      dueDate: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000),
    },
    {
      id: 'act_002',
      action: 'Review Lehigh Valley marketing strategy',
      rationale: 'Take advantage of permit surge and low competition',
      assignTo: 'leadership',
      urgency: 'this_week',
      expectedImpact: 'Increased market penetration in growth area',
      relatedInsightId: 'ins_002',
      status: 'pending',
      dueDate: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
    },
    {
      id: 'act_003',
      action: 'Analyze pricing in Bucks/Montgomery for competitive positioning',
      rationale: 'Counter competitor expansion with value proposition',
      assignTo: 'leadership',
      urgency: 'this_week',
      expectedImpact: 'Maintain market share against competitor push',
      relatedInsightId: 'ins_003',
      status: 'pending',
      dueDate: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
    },
    {
      id: 'act_004',
      action: 'Develop Rochester metro marketing campaign',
      rationale: 'Capture replacement-cycle opportunity',
      assignTo: 'sales',
      urgency: 'this_month',
      expectedImpact: 'New customer acquisition in underserved market',
      relatedInsightId: 'ins_004',
      status: 'pending',
      dueDate: new Date(now.getTime() + 21 * 24 * 60 * 60 * 1000),
    },
    {
      id: 'act_005',
      action: 'Create insurance delay communication template',
      rationale: 'Proactive customer management',
      assignTo: 'operations',
      urgency: 'this_week',
      expectedImpact: 'Improved customer satisfaction',
      relatedInsightId: 'ins_005',
      status: 'pending',
      dueDate: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000),
    },
  ];

  const trendsIdentified: Trend[] = [
    {
      id: 'trend_001',
      name: 'Storm Activity Increase',
      description: 'Territory-wide storm activity has increased over the past 6 weeks, driven primarily by late-season severe thunderstorms.',
      direction: 'improving', // Improving for Guardian means more opportunity
      timeframe: '6 weeks',
      dataPoints: Array.from({ length: 6 }, (_, i) => ({
        date: new Date(now.getTime() - (5 - i) * 7 * 24 * 60 * 60 * 1000),
        value: 35 + (i * 8) + Math.round(Math.random() * 10),
      })),
      significance: 'high',
      projection: 'Expected to remain elevated through end of month based on forecast patterns',
    },
    {
      id: 'trend_002',
      name: 'Permit Velocity Growth',
      description: 'Roofing permit applications showing consistent growth across PA counties.',
      direction: 'improving',
      timeframe: '3 months',
      dataPoints: Array.from({ length: 12 }, (_, i) => ({
        date: new Date(now.getTime() - (11 - i) * 7 * 24 * 60 * 60 * 1000),
        value: 45 + (i * 3) + Math.round(Math.random() * 8),
      })),
      significance: 'medium',
      projection: 'Seasonal factors suggest continued growth into spring',
    },
  ];

  const dataSourcesUsed: DataSourceReference[] = [
    { 
      sourceId: 'noaa_storm_events', 
      sourceName: 'NOAA Storm Events', 
      sourceStatus: 'mock', 
      recordsUsed: 1247, 
      dateRange: { start: threeMonthsAgo, end: now }, 
      reliability: 95 
    },
    { 
      sourceId: 'county_permits', 
      sourceName: 'County Building Permits', 
      sourceStatus: 'mock', 
      recordsUsed: 3892, 
      dateRange: { start: threeMonthsAgo, end: now }, 
      reliability: 75 
    },
    { 
      sourceId: 'google_alerts', 
      sourceName: 'Competitor Monitoring', 
      sourceStatus: 'mock', 
      recordsUsed: 147, 
      dateRange: { start: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000), end: now }, 
      reliability: 65 
    },
  ];

  return {
    id: 'brief_demo_weekly_001',
    generatedAt: now,
    briefType: 'weekly',
    territory: 'Guardian Primary (PA, NY, VA, NJ, DE, MD)',
    periodStart: weekAgo,
    periodEnd: now,
    executiveSummary: `Storm activity in your territory increased 34% week-over-week, concentrated in Bucks and Montgomery Counties following Thursday's severe thunderstorm cell. Building permit velocity in the Lehigh Valley suggests emerging retail opportunity—permit applications up 18% QoQ while competitor presence remains low. Recommend immediate canvassing deployment to affected PA counties within 48-hour window for optimal homeowner awareness timing.`,
    keyMetrics,
    insights,
    actionItems,
    trendsIdentified,
    dataSourcesUsed,
    confidenceScore: 78,
    dataQualityNotes: [
      'Storm data uses NOAA structure (demo data for this preview)',
      'Permit data aggregated from county records (demo data for this preview)',
      'Market indicators require Zillow/Redfin integration for production',
      'Insurance signals require industry report subscriptions',
    ],
    status: 'published',
  };
}

// Generate a brief from actual storm and permit data
export function generateBriefFromData(
  storms: StormEvent[],
  permits: PermitRecord[]
): IntelligenceBrief {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  
  const stormIndex = calculateStormActivityIndex(storms);
  const permitStats = getPermitStats(permits, 30);
  
  const isHighActivity = stormIndex.indexValue >= 50;
  const isLowActivity = stormIndex.indexValue < 25;
  
  let executiveSummary: string;
  if (isHighActivity) {
    executiveSummary = `Storm activity in your territory is elevated at ${stormIndex.indexValue}/100, ${stormIndex.trend === 'increasing' ? 'up' : stormIndex.trend === 'decreasing' ? 'down' : 'stable'} ${Math.abs(stormIndex.percentChangeFromPrior)}% week-over-week with ${stormIndex.eventCount} recorded events. ${stormIndex.topCounties[0]?.county || 'Primary market'} shows highest activity. Building permit velocity remains ${permitStats.roofingSharePercent > 50 ? 'strong' : 'moderate'} with ${permitStats.roofingSharePercent}% roofing-related. ACTION: Review storm-affected areas for immediate opportunity deployment.`;
  } else if (isLowActivity) {
    executiveSummary = `Storm activity remains low (${stormIndex.indexValue}/100) across your territory with only ${stormIndex.eventCount} events recorded this week. Focus shifts to retail opportunities and relationship building. Permit data shows ${permitStats.totalCount} applications this period suggesting ${permitStats.roofingSharePercent > 50 ? 'consistent' : 'moderate'} replacement-cycle demand.`;
  } else {
    executiveSummary = `Storm activity at moderate levels (${stormIndex.indexValue}/100) with ${stormIndex.eventCount} events this period. Territory conditions support balanced storm response and retail development strategies. Permit activity at ${permitStats.totalCount} applications indicates steady market conditions.`;
  }

  const keyMetrics: KeyMetric[] = [
    {
      id: 'm1',
      name: 'Storm Activity Index',
      value: stormIndex.indexValue,
      unit: '/100',
      change: stormIndex.percentChangeFromPrior,
      changeDirection: stormIndex.percentChangeFromPrior > 0 ? 'up' : stormIndex.percentChangeFromPrior < 0 ? 'down' : 'flat',
      changeIsPositive: stormIndex.percentChangeFromPrior > 0,
      context: `${stormIndex.eventCount} events recorded`,
    },
    {
      id: 'm2',
      name: 'Permits (30d)',
      value: permitStats.totalCount,
      unit: '',
      change: 0,
      changeDirection: 'flat',
      changeIsPositive: true,
      context: `${permitStats.roofingSharePercent}% roofing`,
    },
    {
      id: 'm3',
      name: 'Storm-Related',
      value: permitStats.stormRelatedPercent,
      unit: '%',
      change: 0,
      changeDirection: 'flat',
      changeIsPositive: permitStats.stormRelatedPercent > 30,
      context: `${permitStats.stormRelatedCount} permits`,
    },
    {
      id: 'm4',
      name: 'Avg. Permit Value',
      value: permitStats.averageValue,
      unit: '',
      change: 0,
      changeDirection: 'flat',
      changeIsPositive: true,
      context: 'Across all types',
    },
  ];

  return {
    id: `brief_generated_${Date.now()}`,
    generatedAt: now,
    briefType: 'weekly',
    territory: 'Guardian Primary (PA, NY, VA, NJ, DE, MD)',
    periodStart: weekAgo,
    periodEnd: now,
    executiveSummary,
    keyMetrics,
    insights: [],
    actionItems: [],
    trendsIdentified: [],
    dataSourcesUsed: [
      { sourceId: 'noaa_storm_events', sourceName: 'NOAA Storm Events', sourceStatus: 'mock', recordsUsed: storms.length, dateRange: { start: weekAgo, end: now }, reliability: 95 },
      { sourceId: 'county_permits', sourceName: 'County Building Permits', sourceStatus: 'mock', recordsUsed: permits.length, dateRange: { start: weekAgo, end: now }, reliability: 75 },
    ],
    confidenceScore: 72,
    dataQualityNotes: ['Brief generated from available mock data'],
    status: 'draft',
  };
}
