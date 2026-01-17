import {
  StormEvent,
  StormActivityIndex,
  PermitRecord,
  PermitVelocity,
  IntelligenceBrief,
  MarketIndicator,
  TerrainAlert,
  DataSource,
} from './types';
import { DATA_SOURCES, MOCK_COMPETITORS } from './constants';
import {
  generateStormEvents,
  generateDemoHailEvent,
  calculateStormActivityIndex,
  generateDemoPermits,
  calculateAllPermitVelocities,
  getPermitStats,
  generateDemoBrief,
  generateDemoMarketIndicators,
  getMarketSummary,
  generateDemoCompetitorActivities,
  generateDemoAlerts,
  assessCompetitorThreats,
  CompetitorActivity,
} from './generators';

// Singleton data store for demo data
class TerrainDataProvider {
  private static instance: TerrainDataProvider;
  private initialized = false;
  
  // Cached data
  private stormEvents: StormEvent[] = [];
  private stormActivityIndex: StormActivityIndex | null = null;
  private permitRecords: PermitRecord[] = [];
  private permitVelocities: PermitVelocity[] = [];
  private currentBrief: IntelligenceBrief | null = null;
  private briefArchive: IntelligenceBrief[] = [];
  private marketIndicators: MarketIndicator[] = [];
  private competitorActivities: CompetitorActivity[] = [];
  private activeAlerts: TerrainAlert[] = [];
  
  private constructor() {}
  
  static getInstance(): TerrainDataProvider {
    if (!TerrainDataProvider.instance) {
      TerrainDataProvider.instance = new TerrainDataProvider();
    }
    return TerrainDataProvider.instance;
  }
  
  // Initialize with demo data
  initialize(): void {
    if (this.initialized) return;
    
    // Generate storm data
    this.stormEvents = generateStormEvents(45);
    // Add the demo hail event prominently
    const demoHail = generateDemoHailEvent();
    this.stormEvents.unshift(demoHail);
    this.stormActivityIndex = calculateStormActivityIndex(this.stormEvents);
    
    // Generate permit data
    this.permitRecords = generateDemoPermits();
    this.permitVelocities = calculateAllPermitVelocities(this.permitRecords);
    
    // Generate the demo brief
    this.currentBrief = generateDemoBrief();
    this.briefArchive = [this.currentBrief];
    
    // Generate market data
    this.marketIndicators = generateDemoMarketIndicators();
    
    // Generate competitor intelligence
    this.competitorActivities = generateDemoCompetitorActivities();
    this.activeAlerts = generateDemoAlerts();
    
    this.initialized = true;
  }
  
  // Ensure initialization
  private ensureInitialized(): void {
    if (!this.initialized) {
      this.initialize();
    }
  }
  
  // Storm data accessors
  getStormEvents(): StormEvent[] {
    this.ensureInitialized();
    return this.stormEvents;
  }
  
  getRecentStormEvents(days: number = 7): StormEvent[] {
    this.ensureInitialized();
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    return this.stormEvents.filter(e => e.occurredAt >= cutoff);
  }
  
  getStormActivityIndex(): StormActivityIndex {
    this.ensureInitialized();
    return this.stormActivityIndex!;
  }
  
  // Permit data accessors
  getPermitRecords(): PermitRecord[] {
    this.ensureInitialized();
    return this.permitRecords;
  }
  
  getPermitVelocities(): PermitVelocity[] {
    this.ensureInitialized();
    return this.permitVelocities;
  }
  
  getPermitStats(days: number = 30) {
    this.ensureInitialized();
    return getPermitStats(this.permitRecords, days);
  }
  
  // Brief data accessors
  getCurrentBrief(): IntelligenceBrief {
    this.ensureInitialized();
    return this.currentBrief!;
  }
  
  getBriefArchive(): IntelligenceBrief[] {
    this.ensureInitialized();
    return this.briefArchive;
  }
  
  getBriefById(id: string): IntelligenceBrief | undefined {
    this.ensureInitialized();
    return this.briefArchive.find(b => b.id === id);
  }
  
  // Market data accessors
  getMarketIndicators(): MarketIndicator[] {
    this.ensureInitialized();
    return this.marketIndicators;
  }
  
  getMarketSummary() {
    this.ensureInitialized();
    return getMarketSummary(this.marketIndicators);
  }
  
  // Competitor data accessors
  getCompetitorActivities(): CompetitorActivity[] {
    this.ensureInitialized();
    return this.competitorActivities;
  }
  
  getCompetitors() {
    return MOCK_COMPETITORS;
  }
  
  getCompetitorThreatAssessment() {
    this.ensureInitialized();
    return assessCompetitorThreats(this.competitorActivities);
  }
  
  // Alert accessors
  getActiveAlerts(): TerrainAlert[] {
    this.ensureInitialized();
    return this.activeAlerts.filter(a => a.status === 'active');
  }
  
  getAllAlerts(): TerrainAlert[] {
    this.ensureInitialized();
    return this.activeAlerts;
  }
  
  // Data source info
  getDataSources(): DataSource[] {
    return DATA_SOURCES;
  }
  
  getDataSourceById(id: string): DataSource | undefined {
    return DATA_SOURCES.find(s => s.id === id);
  }
  
  // Dashboard summary data
  getDashboardSummary() {
    this.ensureInitialized();
    
    const stormIndex = this.stormActivityIndex!;
    const permitStats = this.getPermitStats(30);
    const marketSummary = this.getMarketSummary();
    const threatAssessment = this.getCompetitorThreatAssessment();
    const activeAlerts = this.getActiveAlerts();
    
    // Calculate opportunity score (composite metric)
    const stormScore = stormIndex.indexValue * 0.35;
    const permitScore = Math.min(100, permitStats.roofingCount * 2) * 0.25;
    const marketScore = (marketSummary.temperatureCounts.hot * 10 + marketSummary.temperatureCounts.warm * 5) * 0.2;
    const competitorScore = Math.max(0, 100 - threatAssessment.highThreat.length * 15) * 0.2;
    const opportunityScore = Math.round(stormScore + permitScore + marketScore + competitorScore);
    
    return {
      stormActivityIndex: stormIndex.indexValue,
      stormTrend: stormIndex.trend,
      stormEventCount: stormIndex.eventCount,
      structuresAffected: this.stormEvents
        .filter(e => e.occurredAt >= new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
        .reduce((sum, e) => sum + e.estimatedStructuresAffected, 0),
      permitCount: permitStats.totalCount,
      roofingPermitShare: permitStats.roofingSharePercent,
      permitTotalValue: permitStats.totalValue,
      hotMarkets: marketSummary.temperatureCounts.hot + marketSummary.temperatureCounts.warm,
      activeCompetitorThreats: threatAssessment.highThreat.length,
      activeAlertCount: activeAlerts.length,
      highPriorityAlerts: activeAlerts.filter(a => a.priority === 'high' || a.priority === 'critical').length,
      opportunityScore,
      lastUpdated: new Date(),
    };
  }
  
  // Force refresh (for demo purposes)
  refresh(): void {
    this.initialized = false;
    this.initialize();
  }
}

// Export singleton instance
export const terrainData = TerrainDataProvider.getInstance();

// Initialize on import for SSR
if (typeof window === 'undefined') {
  terrainData.initialize();
}
