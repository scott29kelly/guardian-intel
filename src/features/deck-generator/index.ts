// Components
export { DeckGeneratorModal } from './components';
export { DeckTemplateSelector } from './components';
export { DeckCustomizer } from './components';
export { DeckPreview } from './components';

// Hooks
export { useDeckGeneration } from './hooks';
export { useDeckTemplates } from './hooks';

// Templates
export { 
  deckTemplates,
  getTemplateById,
  getTemplatesByAudience,
  getTemplatesByCategory,
  getTemplatesByTag,
  templateCategories,
  customerCheatSheetTemplate,
  projectTimelineTemplate,
  projectTimelineCustomerTemplate,
  stormDeploymentTemplate,
  insurancePrepTemplate,
  teamPerformanceTemplate,
  marketAnalysisTemplate,
} from './templates';

// Types
export type {
  DeckTemplate,
  DeckGenerationRequest,
  DeckGenerationResponse,
  DeckGenerationProgress,
  GeneratedDeck,
  GeneratedSlide,
  SlideContent,
  TitleSlideContent,
  StatsSlideContent,
  ListSlideContent,
  TimelineSlideContent,
  ImageSlideContent,
  ChartSlideContent,
  TalkingPointsSlideContent,
  ComparisonSlideContent,
  MapSlideContent,
  QuoteSlideContent,
  BrandingConfig,
  ExportFormat,
  DeckAudience,
  SlideType,
  ContextType,
  ContextRequirement,
  SlideSection,
  DeckGeneratorState,
  DeckHistoryItem,
} from './types/deck.types';

// Utils
export { guardianBrandConfig, guardianLightBrandConfig, getBrandingForAudience } from './utils/brandingConfig';
export { fetchDataForSlide, dataSourceRegistry } from './utils/dataAggregator';
