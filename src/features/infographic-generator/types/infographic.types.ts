// =============================================================================
// INFOGRAPHIC GENERATOR TYPE DEFINITIONS
// =============================================================================

import type { AIModel } from '@/lib/services/ai/types';

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
// Model Intelligence Types
// -----------------------------------------------------------------------------

export type ChainRole = 'source' | 'finisher' | 'standalone';

export interface ModelCapabilities {
  id: AIModel;
  costPerImage1K: number;
  maxResolution: string;
  webSearchGrounding: boolean;
  maxReferenceImages: number;
  fidelityScore: number;
  textRenderingScore: number;
  complexCompositionScore: number;
  chainable: ChainRole;
}

export interface ModelChainStep {
  model: AIModel;
  role: 'generate' | 'refine';
  resolution: string;
  searchEnabled: boolean;
}

export interface ModelChainStrategy {
  id: string;
  name: string;
  /** Description of when this chain is triggered */
  trigger: string;
  steps: ModelChainStep[];
}

export interface ScoringDimensions {
  /** Audience score: internal (moderate fidelity) vs customer-facing (max fidelity) */
  audience: number;
  /** Complexity score based on module count */
  complexity: number;
  /** Web search dependency: hard constraint if any module requires web search */
  webSearch: number;
}

export interface ScoringResult {
  selectedModel?: ModelCapabilities;
  selectedChain?: ModelChainStrategy;
  scores: ScoringDimensions;
  reasoning: string;
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
  imageData: string; // base64
  imageUrl?: string;
  /** Model used — internal telemetry only, never exposed to reps */
  model: string;
  chainUsed: boolean;
  generationTimeMs: number;
  cached: boolean;
}

// -----------------------------------------------------------------------------
// Cache Types
// -----------------------------------------------------------------------------

export interface InfographicCacheEntry {
  customerId: string;
  presetId: string;
  imageData: string;
  generatedAt: Date;
  expiresAt: Date;
  /** Internal telemetry — never exposed to reps */
  modelStrategy: string;
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

export type GenerationPhase = 'data' | 'scoring' | 'generating' | 'refining' | 'complete';

export interface GenerationProgress {
  phase: GenerationPhase;
  percent: number;
  /** Contextual message — no model names, ever */
  statusMessage: string;
}
