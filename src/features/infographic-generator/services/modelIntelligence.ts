// =============================================================================
// MODEL INTELLIGENCE LAYER
// =============================================================================
//
// Autonomous model selection for infographic generation.
// Evaluates 3 scoring dimensions (audience, complexity, web search)
// and selects single models or chains for optimal quality.
//
// No rep-facing controls. Quality-first. Zero configuration.
// =============================================================================

import type { AIModel } from '@/lib/services/ai/types';
import type {
  ModelCapabilities,
  ModelChainStrategy,
  ScoringDimensions,
  ScoringResult,
  InfographicRequest,
  TopicModule,
} from '../types/infographic.types';

// =============================================================================
// MODEL REGISTRY
// =============================================================================

export class ModelRegistry {
  private models: Map<AIModel, ModelCapabilities> = new Map();

  register(model: ModelCapabilities): void {
    this.models.set(model.id, model);
  }

  get(id: AIModel): ModelCapabilities | undefined {
    return this.models.get(id);
  }

  getAll(): ModelCapabilities[] {
    return Array.from(this.models.values());
  }
}

// =============================================================================
// PRE-REGISTERED MODEL PROFILES
// =============================================================================

const NB2_CAPABILITIES: ModelCapabilities = {
  id: 'gemini-3.1-flash-image-preview' as AIModel,
  costPerImage1K: 0.067,
  maxResolution: '1K',
  webSearchGrounding: true,
  maxReferenceImages: 14,
  fidelityScore: 7,
  textRenderingScore: 7,
  complexCompositionScore: 6,
  chainable: 'source',
};

const NB_PRO_CAPABILITIES: ModelCapabilities = {
  id: 'gemini-3-pro-image' as AIModel,
  costPerImage1K: 0.27,
  maxResolution: '4K',
  webSearchGrounding: false,
  maxReferenceImages: 10,
  fidelityScore: 9,
  textRenderingScore: 9,
  complexCompositionScore: 9,
  chainable: 'finisher',
};

// =============================================================================
// CHAIN STRATEGIES
// =============================================================================

const CHAIN_A: ModelChainStrategy = {
  id: 'chain-a-web-grounded-quality',
  name: 'Web-Grounded Quality',
  trigger: 'Web search required + customer-facing OR high complexity',
  steps: [
    {
      model: 'gemini-3.1-flash-image-preview' as AIModel,
      role: 'generate',
      resolution: '1K',
      searchEnabled: true,
    },
    {
      model: 'gemini-3-pro-image' as AIModel,
      role: 'refine',
      resolution: '2K',
      searchEnabled: false,
    },
  ],
};

const CHAIN_B: ModelChainStrategy = {
  id: 'chain-b-complexity-upgrade',
  name: 'Complexity Upgrade',
  trigger: '7+ modules + internal + no web search',
  steps: [
    {
      model: 'gemini-3.1-flash-image-preview' as AIModel,
      role: 'generate',
      resolution: '1K',
      searchEnabled: false,
    },
    {
      model: 'gemini-3-pro-image' as AIModel,
      role: 'refine',
      resolution: '2K',
      searchEnabled: false,
    },
  ],
};

// =============================================================================
// SCORING ENGINE
// =============================================================================

/**
 * Scores an infographic request across 3 dimensions to determine
 * the optimal model or chain strategy.
 */
export function scoreRequest(
  request: InfographicRequest,
  modules: TopicModule[]
): ScoringResult {
  const scores = computeScores(request, modules);
  return selectModelOrChain(scores, modules);
}

function computeScores(
  request: InfographicRequest,
  modules: TopicModule[]
): ScoringDimensions {
  // Dimension 1: Audience
  // internal → moderate fidelity threshold (0.5)
  // customer-facing → maximum fidelity, resolution floor 2K (1.0)
  const audience = request.audience === 'customer-facing' ? 1.0 : 0.5;

  // Dimension 2: Data Complexity (based on module count)
  // Low (1-3): 0.3 — NB2 sufficient
  // Medium (4-6): 0.6 — NB Pro preferred
  // High (7+): 1.0 — NB Pro strongly favored
  const moduleCount = modules.length;
  let complexity: number;
  if (moduleCount <= 3) {
    complexity = 0.3;
  } else if (moduleCount <= 6) {
    complexity = 0.6;
  } else {
    complexity = 1.0;
  }

  // Dimension 3: Web Search Dependency — HARD CONSTRAINT
  // If any module has requiresWebSearch: true → 1.0 (must use web-capable model)
  const webSearch = modules.some(m => m.requiresWebSearch) ? 1.0 : 0.0;

  return { audience, complexity, webSearch };
}

/**
 * Selects the optimal model or chain based on computed scores.
 *
 * Decision logic:
 * 1. Web search required → must start with NB2 (hard constraint)
 * 2. Customer-facing + web search → Chain A (NB2@1K → NB Pro@2K)
 * 3. Customer-facing (no web) → NB Pro directly
 * 4. High complexity (7+ modules) + web search → Chain A
 * 5. High complexity (no web) → Chain B (NB2@1K → NB Pro@2K)
 * 6. Low/medium complexity + internal → NB2 (cost-efficient, sufficient quality)
 */
function selectModelOrChain(
  scores: ScoringDimensions,
  modules: TopicModule[]
): ScoringResult {
  const requiresWebSearch = scores.webSearch > 0;
  const isCustomerFacing = scores.audience >= 1.0;
  const isHighComplexity = scores.complexity >= 1.0;
  const moduleCount = modules.length;

  // Case 1: Web search + customer-facing → Chain A
  if (requiresWebSearch && isCustomerFacing) {
    return {
      selectedChain: {
        ...CHAIN_A,
        steps: CHAIN_A.steps.map(step =>
          step.role === 'refine'
            ? { ...step, resolution: moduleCount > 6 ? '4K' : '2K' }
            : step
        ),
      },
      scores: { audience: scores.audience, complexity: scores.complexity, webSearch: scores.webSearch },
      reasoning: `Customer-facing with web search modules → Chain A (NB2 for data + NB Pro for visual polish). ${moduleCount} modules.`,
    };
  }

  // Case 2: Customer-facing, no web search → NB Pro directly
  if (isCustomerFacing && !requiresWebSearch) {
    return {
      selectedModel: NB_PRO_CAPABILITIES,
      scores: { audience: scores.audience, complexity: scores.complexity, webSearch: scores.webSearch },
      reasoning: `Customer-facing without web search → NB Pro direct (maximum fidelity). ${moduleCount} modules.`,
    };
  }

  // Case 3: High complexity + web search → Chain A
  if (isHighComplexity && requiresWebSearch) {
    return {
      selectedChain: CHAIN_A,
      scores: { audience: scores.audience, complexity: scores.complexity, webSearch: scores.webSearch },
      reasoning: `High complexity (${moduleCount} modules) with web search → Chain A (NB2 data grounding + NB Pro composition).`,
    };
  }

  // Case 4: High complexity, no web → Chain B
  if (isHighComplexity && !requiresWebSearch) {
    return {
      selectedChain: CHAIN_B,
      scores: { audience: scores.audience, complexity: scores.complexity, webSearch: scores.webSearch },
      reasoning: `High complexity (${moduleCount} modules), internal, no web → Chain B (NB2 draft + NB Pro refinement).`,
    };
  }

  // Case 5: Web search required, low/medium complexity, internal → NB2
  if (requiresWebSearch) {
    return {
      selectedModel: NB2_CAPABILITIES,
      scores: { audience: scores.audience, complexity: scores.complexity, webSearch: scores.webSearch },
      reasoning: `Internal with web search, ${moduleCount} modules → NB2 (web grounding + cost-efficient).`,
    };
  }

  // Case 6: Default — low/medium complexity, internal, no web → NB2
  return {
    selectedModel: NB2_CAPABILITIES,
    scores: { audience: scores.audience, complexity: scores.complexity, webSearch: scores.webSearch },
    reasoning: `Internal, ${moduleCount} modules, no web search → NB2 (sufficient quality, cost-efficient).`,
  };
}

// =============================================================================
// SINGLETON
// =============================================================================

let instance: ModelIntelligence | null = null;

class ModelIntelligence {
  readonly registry: ModelRegistry;

  constructor() {
    this.registry = new ModelRegistry();
    this.registry.register(NB2_CAPABILITIES);
    this.registry.register(NB_PRO_CAPABILITIES);
  }

  scoreRequest(request: InfographicRequest, modules: TopicModule[]): ScoringResult {
    return scoreRequest(request, modules);
  }
}

export function getModelIntelligence(): ModelIntelligence {
  if (!instance) {
    instance = new ModelIntelligence();
  }
  return instance;
}
