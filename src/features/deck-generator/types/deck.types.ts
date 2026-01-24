// =============================================================================
// DECK GENERATOR TYPE DEFINITIONS
// =============================================================================

// -----------------------------------------------------------------------------
// Core Types
// -----------------------------------------------------------------------------

export type DeckAudience = 'rep' | 'manager' | 'leadership' | 'customer';

export type SlideType = 
  | 'title' 
  | 'stats' 
  | 'list' 
  | 'timeline' 
  | 'map' 
  | 'chart' 
  | 'image' 
  | 'talking-points'
  | 'comparison'
  | 'quote';

export type ContextType = 'customer' | 'project' | 'region' | 'team' | 'date-range';

export type ExportFormat = 'pdf' | 'pptx' | 'png' | 'link';

// -----------------------------------------------------------------------------
// Template Definition Types
// -----------------------------------------------------------------------------

export interface ContextRequirement {
  type: ContextType;
  required: boolean;
  label: string;
  placeholder?: string;
}

export interface SlideSection {
  id: string;
  title: string;
  type: SlideType;
  dataSource: string; // Function name in dataAggregator to call
  optional: boolean;
  aiEnhanced: boolean;
  defaultEnabled?: boolean;
  description?: string;
}

export interface BrandingConfig {
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    backgroundAlt: string;
    text: string;
    textMuted: string;
    success: string;
    warning: string;
    danger: string;
  };
  fonts: {
    heading: string;
    body: string;
    mono: string;
  };
  logo: string;
  logoAlt?: string;
  footer: string;
  borderRadius: string;
}

export interface DeckTemplate {
  id: string;
  name: string;
  description: string;
  icon: string; // Lucide icon name
  audience: DeckAudience;
  estimatedSlides: number;
  estimatedGenerationTime: number; // seconds
  requiredContext: ContextRequirement[];
  sections: SlideSection[];
  branding: BrandingConfig;
  tags: string[];
  category: 'sales' | 'operations' | 'leadership' | 'customer-facing';
}

// -----------------------------------------------------------------------------
// Generated Deck Types
// -----------------------------------------------------------------------------

export interface SlideContent {
  [key: string]: unknown;
}

export interface TitleSlideContent extends SlideContent {
  title: string;
  subtitle?: string;
  date: string;
  preparedFor?: string;
  preparedBy?: string;
  logoUrl?: string;
}

export interface StatsSlideContent extends SlideContent {
  title: string;
  stats: Array<{
    label: string;
    value: string | number;
    trend?: 'up' | 'down' | 'neutral';
    change?: string;
    icon?: string;
  }>;
  footnote?: string;
}

export interface ListSlideContent extends SlideContent {
  title: string;
  items: Array<{
    primary: string;
    secondary?: string;
    icon?: string;
    highlight?: boolean;
  }>;
  numbered?: boolean;
}

export interface TimelineSlideContent extends SlideContent {
  title: string;
  events: Array<{
    date: string;
    title: string;
    description?: string;
    status?: 'completed' | 'current' | 'upcoming';
    icon?: string;
  }>;
}

export interface ImageSlideContent extends SlideContent {
  title: string;
  imageUrl: string;
  caption?: string;
  notes?: string[];
  altText: string;
}

export interface ChartSlideContent extends SlideContent {
  title: string;
  chartType: 'bar' | 'line' | 'pie' | 'area';
  data: Array<{ [key: string]: string | number }>;
  xKey: string;
  yKey: string;
  footnote?: string;
}

export interface TalkingPointsSlideContent extends SlideContent {
  title: string;
  aiGenerated: boolean;
  points: Array<{
    topic: string;
    script: string;
    notes?: string;
    priority?: 'high' | 'medium' | 'low';
  }>;
}

export interface ComparisonSlideContent extends SlideContent {
  title: string;
  columns: Array<{
    header: string;
    items: string[];
  }>;
}

export interface MapSlideContent extends SlideContent {
  title: string;
  center: {
    lat: number;
    lng: number;
  };
  zoom: number;
  markers: Array<{
    lat: number;
    lng: number;
    label?: string;
    color?: 'primary' | 'secondary' | 'danger' | 'success' | 'warning';
    icon?: string;
  }>;
  regions?: Array<{
    coordinates: Array<{ lat: number; lng: number }>;
    color?: string;
    label?: string;
  }>;
  footnote?: string;
}

export interface QuoteSlideContent extends SlideContent {
  title: string;
  quote: string;
  author: string;
  role?: string;
  company?: string;
  imageUrl?: string;
}

// -----------------------------------------------------------------------------
// Generated Deck Types
// -----------------------------------------------------------------------------

export interface GeneratedSlide {
  id: string;
  type: SlideType;
  sectionId: string;
  content: SlideContent;
  aiGenerated: boolean;
  generatedAt: string;
  imageData?: string; // Base64 PNG from Nano Banana Pro (Gemini 3 Pro Image)
  imageError?: string; // Error message if image generation failed
}

export interface GeneratedDeck {
  id: string;
  templateId: string;
  templateName: string;
  generatedAt: string;
  generatedBy: string;
  context: DeckGenerationRequest['context'];
  slides: GeneratedSlide[];
  branding: BrandingConfig;
  metadata: {
    totalSlides: number;
    aiSlidesCount: number;
    generationTimeMs: number;
    version: string;
  };
}

// -----------------------------------------------------------------------------
// Generation Request/Response Types
// -----------------------------------------------------------------------------

export interface DeckGenerationRequest {
  templateId: string;
  context: {
    customerId?: string;
    customerName?: string;
    projectId?: string;
    regionId?: string;
    teamId?: string;
    dateRange?: {
      start: string;
      end: string;
    };
  };
  options: {
    enabledSections: string[];
    includeAiContent: boolean;
    exportFormat: ExportFormat;
    customBranding?: Partial<BrandingConfig>;
  };
}

export interface DeckGenerationProgress {
  status: 'initializing' | 'fetching-data' | 'generating-slides' | 'ai-enhancement' | 'rendering' | 'complete' | 'error';
  currentStep: number;
  totalSteps: number;
  currentSlide?: string;
  message: string;
  progress: number; // 0-100
}

export interface DeckGenerationResponse {
  success: boolean;
  deck?: GeneratedDeck;
  downloadUrl?: string;
  shareableLink?: string;
  error?: string;
  generationTimeMs: number;
}

// -----------------------------------------------------------------------------
// UI State Types
// -----------------------------------------------------------------------------

export interface DeckGeneratorState {
  isOpen: boolean;
  selectedTemplate: DeckTemplate | null;
  context: DeckGenerationRequest['context'];
  options: DeckGenerationRequest['options'];
  progress: DeckGenerationProgress | null;
  generatedDeck: GeneratedDeck | null;
  error: string | null;
}

export interface DeckHistoryItem {
  id: string;
  templateId: string;
  templateName: string;
  generatedAt: string;
  contextSummary: string;
  slideCount: number;
  downloadUrl?: string;
}
