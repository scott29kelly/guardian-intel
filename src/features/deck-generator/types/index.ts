// Barrel export for deck generator types
export type {
  // Core Types
  DeckAudience,
  SlideType,
  ContextType,
  ExportFormat,

  // Template Definition Types
  ContextRequirement,
  SlideSection,
  BrandingConfig,
  DeckTemplate,

  // Slide Content Types
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

  // Generated Deck Types
  GeneratedSlide,
  GeneratedDeck,

  // Generation Request/Response Types
  DeckGenerationRequest,
  DeckGenerationProgress,
  DeckGenerationResponse,

  // UI State Types
  DeckGeneratorState,
  DeckHistoryItem,
} from './deck.types';
