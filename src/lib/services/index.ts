/**
 * Services Barrel Export
 *
 * Centralized exports for all service modules.
 * Import services from here instead of individual files:
 *
 *   import { getAI, weatherService, crmService } from "@/lib/services";
 */

// =============================================================================
// AI SERVICE
// =============================================================================
export {
  // Core
  initializeAI,
  getAI,
  // Router
  AIRouter,
  getAIRouter,
  initializeAIRouter,
  // Adapters
  ClaudeAdapter,
  createClaudeOpusAdapter,
  createClaudeSonnetAdapter,
  createClaudeHaikuAdapter,
  KimiAdapter,
  createKimiAdapter,
  PerplexityAdapter,
  createPerplexityAdapter,
  OpenAIAdapter,
  createOpenAIAdapter,
  GeminiAdapter,
  createGeminiFlashAdapter,
  createGeminiProAdapter,
  // Tools
  AI_TOOLS,
  executeTool,
  getToolsByCategory,
  // Context
  CustomerContextBuilder,
  getCustomerContext,
  getCustomerContexts,
  getContextSummary,
  buildCustomerSystemPrompt,
} from "./ai";
export type { Message, AITask, AIAdapter, ChatRequest, ChatResponse, ToolCall, ToolResult } from "./ai";

// =============================================================================
// ANALYTICS SERVICE
// =============================================================================
export {
  runDailyAggregation,
  aggregateForDate,
  backfillMetrics,
} from "./analytics";
export type { AggregationResult, DailyMetricsData } from "./analytics";

// =============================================================================
// AUDIT SERVICE
// =============================================================================
export {
  auditService,
  getClientInfo,
  createRequestAuditor,
} from "./audit";
export type { AuditEventType, AuditEntityType, AuditLogEntry, AuditLogFilter } from "./audit";

// =============================================================================
// CANVASSING SERVICE
// =============================================================================
export {
  getCanvassingAdapter,
  SalesRabbitAdapter,
} from "./canvassing";
export type {
  CanvassingAdapter,
  CanvassingLead,
  CanvassingRoute,
  CanvassingStats,
  CanvassingPinStatus,
  PushLeadsResult,
} from "./canvassing";

// =============================================================================
// CARRIER SERVICE
// =============================================================================
export {
  carrierService,
  carrierNames,
} from "./carriers";
export type {
  CarrierAdapter,
  CarrierConfig,
  CarrierResponse,
  ClaimSubmission,
  ClaimFilingResult,
  ClaimStatusResult,
  DamageArea,
} from "./carriers";

// =============================================================================
// COMPETITOR SERVICE
// =============================================================================
export { getCompetitorAnalytics } from "./competitors";
export type {
  CompetitorData,
  CompetitorAnalytics,
  CompetitorActivityData,
  CompetitorRanking,
  ActivityTrend,
  TerritoryBreakdown,
  AnalyticsQueryParams,
} from "./competitors";

// =============================================================================
// CONTRACT SERVICE
// =============================================================================
export {
  contractService,
  DEFAULT_CONTRACT_TEMPLATE,
  DEFAULT_TERMS,
} from "./contracts";
export type { ContractStatus, ContractData, SignatureData, AuditEvent } from "./contracts";

// =============================================================================
// CRM SERVICE
// =============================================================================
export {
  getCrmAdapter,
  crmService,
} from "./crm";
export type { ICrmAdapter, CrmConfig, LeapConfig, CrmCustomer, CrmSyncResult } from "./crm";

// =============================================================================
// GEOCODING SERVICE
// =============================================================================
export { geocodingService } from "./geocoding";
export type { GeocodingResult } from "./geocoding";

// =============================================================================
// NOTIFICATIONS SERVICE
// =============================================================================
export {
  buildStormAlertPayload,
  sendPushNotification,
  sendStormAlert,
} from "./notifications";
export type { NotificationPayload } from "./notifications";

// =============================================================================
// OUTREACH SERVICE
// =============================================================================
export { outreachService } from "./outreach";
export type {
  CampaignTarget,
  StormTriggerData,
  PersonalizationContext,
  ExecutionResult,
} from "./outreach";

// =============================================================================
// PROPERTY SERVICE
// =============================================================================
export { propertyService } from "./property";
export type { PropertyDetails, PropertyLookupOptions, PropertySearchFilters } from "./property";

// =============================================================================
// PROPOSALS SERVICE
// =============================================================================
export {
  generateProposal,
  saveProposal,
  PricingCalculator,
  MATERIAL_OPTIONS,
  getMaterialByGrade,
  getMaterialById,
  formatCurrency,
} from "./proposals";
export type {
  ProposalGenerationRequest,
  ProposalGenerationResult,
  GeneratedProposal,
  LineItem,
  MaterialOption,
  PricingOption,
} from "./proposals";

// =============================================================================
// SCORING SERVICE
// =============================================================================
export {
  calculateCustomerScores,
  getUrgencyExplanation,
  getChurnExplanation,
} from "./scoring";

// =============================================================================
// WEATHER SERVICE
// =============================================================================
export { weatherService } from "./weather";
export type { WeatherAlert, StormEvent, WeatherLookupResult } from "./weather";
