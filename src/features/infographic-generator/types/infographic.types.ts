// =============================================================================
// INFOGRAPHIC GENERATOR TYPE DEFINITIONS
// =============================================================================

// -----------------------------------------------------------------------------
// Core Types
// -----------------------------------------------------------------------------

export type GenerationMode = 'preset' | 'custom' | 'conversational';

export type InfographicAudience = 'internal' | 'customer-facing';

export type UsageMoment = 'Parking Lot' | 'Post-Storm' | 'Meeting Prep' | 'Leave-Behind' | 'Batch';

// -----------------------------------------------------------------------------
// Topic Module Types
// -----------------------------------------------------------------------------

export interface TopicModule {
  id: string;
  label: string;
  /** Function name from dataAssembler to call */
  dataSource: string;
  /** Whether this module requires web search grounding */
  requiresWebSearch: boolean;
  /** Description of the visual element to render */
  visualElement: string;
}

export interface TopicModuleConfig {
  module: TopicModule;
  enabled: boolean;
  required: boolean;
}

// -----------------------------------------------------------------------------
// Preset / Template Types
// -----------------------------------------------------------------------------

export interface InfographicPreset {
  id: string;
  name: string;
  description: string;
  audience: InfographicAudience;
  modules: TopicModuleConfig[];
  usageMoment: UsageMoment;
  icon: string; // Lucide icon name
}

// -----------------------------------------------------------------------------
// Request / Response Types
// -----------------------------------------------------------------------------

export interface InfographicRequest {
  customerId: string;
  mode: GenerationMode;
  presetId?: string;
  selectedModules?: TopicModule[];
  conversationalPrompt?: string;
  audience?: InfographicAudience;
}

export interface InfographicResponse {
  imageData?: string;
  imageUrl?: string;
  jobId?: string;
  generationTimeMs: number;
  cached: boolean;
}

// -----------------------------------------------------------------------------
// Cache Types
// -----------------------------------------------------------------------------

export interface InfographicCacheEntry {
  customerId: string;
  presetId: string;
  imageUrl: string;
  generatedAt: Date;
  expiresAt: Date;
  pipeline: string;
}

// -----------------------------------------------------------------------------
// Batch Types
// -----------------------------------------------------------------------------

export interface BatchRequest {
  customerIds: string[];
  autoSelectPresets: boolean;
}

// -----------------------------------------------------------------------------
// Progress Types
// -----------------------------------------------------------------------------

export type GenerationPhase = 'data' | 'queued' | 'processing' | 'generating' | 'complete';

export interface GenerationProgress {
  phase: GenerationPhase;
  percent: number;
  /** Contextual message — no model names, ever */
  statusMessage: string;
}
