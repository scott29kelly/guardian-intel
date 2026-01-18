// Storm generators
export {
  generateStormEvent,
  generateStormEvents,
  generateRecentSignificantStorms,
  calculateStormActivityIndex,
  generateDemoHailEvent,
} from './storm-generator';

// Permit generators
export {
  generatePermitRecord,
  generatePermitRecords,
  calculatePermitVelocity,
  calculateAllPermitVelocities,
  generateDemoPermits,
  getPermitStats,
} from './permit-generator';

// Brief generators
export {
  generateDemoBrief,
  generateBriefFromData,
} from './brief-generator';

// Market generators
export {
  generateMarketIndicator,
  generateAllMarketIndicators,
  generateDemoMarketIndicators,
  getMarketSummary,
  MARKET_TEMPERATURE_CONFIG,
} from './market-generator';

// Competitor generators
export {
  generateCompetitorActivity,
  generateCompetitorActivities,
  generateDemoCompetitorActivities,
  generateTerrainAlert,
  generateDemoAlerts,
  assessCompetitorThreats,
} from './competitor-generator';
export type { CompetitorActivity } from './competitor-generator';
