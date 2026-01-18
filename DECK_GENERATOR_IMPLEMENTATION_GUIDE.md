# Guardian Intel: Slide Deck Generator Implementation Guide

> **For:** Claude Code (Opus 4.5) in Cursor
> **Project:** Guardian Intel Sales Intelligence Platform
> **Feature:** On-Demand Automated Slide Deck Generation
> **Created:** January 18, 2026

---

## 🎯 Feature Overview

Build an on-demand slide deck generation system that creates NanoBananaPro-style presentations from live Guardian Intel data. The system should support multiple templates for different use cases (sales prep, manager reports, market analysis) with AI-enhanced content generation.

### Core Value Proposition
- Sales reps get bespoke customer prep materials in seconds
- Managers get professional reports without manual assembly
- All decks pull live data from the existing Guardian Intel database
- AI generates contextual talking points and recommendations

---

## 📁 Folder Structure to Create

```
src/features/deck-generator/
├── components/
│   ├── DeckGeneratorModal.tsx
│   ├── DeckPreview.tsx
│   ├── DeckTemplateSelector.tsx
│   ├── DeckCustomizer.tsx
│   ├── DeckExportOptions.tsx
│   ├── slides/
│   │   ├── TitleSlide.tsx
│   │   ├── StatsSlide.tsx
│   │   ├── ListSlide.tsx
│   │   ├── TimelineSlide.tsx
│   │   ├── ImageSlide.tsx
│   │   ├── ChartSlide.tsx
│   │   └── TalkingPointsSlide.tsx
│   └── index.ts
├── templates/
│   ├── customer-cheat-sheet.ts
│   ├── project-timeline.ts
│   ├── market-analysis.ts
│   ├── insurance-prep.ts
│   ├── storm-deployment.ts
│   ├── team-performance.ts
│   └── index.ts
├── hooks/
│   ├── useDeckGeneration.ts
│   ├── useDeckTemplates.ts
│   ├── useDeckExport.ts
│   └── index.ts
├── utils/
│   ├── slideBuilder.ts
│   ├── dataAggregator.ts
│   ├── brandingConfig.ts
│   ├── pdfGenerator.ts
│   └── index.ts
├── api/
│   └── generate-deck.ts
├── types/
│   └── deck.types.ts
└── index.ts
```

---

## 📋 TypeScript Type Definitions

Create this file first: `src/features/deck-generator/types/deck.types.ts`

```typescript
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

export interface GeneratedSlide {
  id: string;
  type: SlideType;
  sectionId: string;
  content: SlideContent;
  aiGenerated: boolean;
  generatedAt: string;
}

export interface GeneratedDeck {
  id: string;
  templateId: string;
  templateName: string;
  generatedAt: string;
  generatedBy: string;
  context: {
    [key: string]: string | number | boolean | null;
  };
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
```

---

## 🎨 Branding Configuration

Create: `src/features/deck-generator/utils/brandingConfig.ts`

```typescript
import { BrandingConfig } from '../types/deck.types';

// Guardian Intel Brand Configuration
export const guardianBrandConfig: BrandingConfig = {
  colors: {
    primary: '#1E3A5F',      // Navy - primary brand color
    secondary: '#D4A656',    // Gold - accent/highlight
    accent: '#4A90A4',       // Teal - secondary accent
    background: '#0F1419',   // Dark background
    backgroundAlt: '#1A2332', // Slightly lighter background
    text: '#FFFFFF',         // Primary text
    textMuted: '#9CA3AF',    // Secondary text
    success: '#10B981',      // Green for positive
    warning: '#F59E0B',      // Amber for warnings
    danger: '#EF4444',       // Red for alerts
  },
  fonts: {
    heading: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    body: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    mono: "'JetBrains Mono', 'Fira Code', monospace",
  },
  logo: '/guardian-logo.svg',
  logoAlt: '/guardian-logo-light.svg',
  footer: 'Guardian Storm Repair | Confidential',
  borderRadius: '8px',
};

// Alternative light theme for customer-facing decks
export const guardianLightBrandConfig: BrandingConfig = {
  ...guardianBrandConfig,
  colors: {
    ...guardianBrandConfig.colors,
    background: '#FFFFFF',
    backgroundAlt: '#F8FAFC',
    text: '#1E3A5F',
    textMuted: '#64748B',
  },
};

// Export helper to get branding based on audience
export function getBrandingForAudience(audience: string): BrandingConfig {
  if (audience === 'customer') {
    return guardianLightBrandConfig;
  }
  return guardianBrandConfig;
}
```

---

## 📑 Template Definitions

### Customer Cheat Sheet Template

Create: `src/features/deck-generator/templates/customer-cheat-sheet.ts`

```typescript
import { DeckTemplate } from '../types/deck.types';
import { guardianBrandConfig } from '../utils/brandingConfig';

export const customerCheatSheetTemplate: DeckTemplate = {
  id: 'customer-cheat-sheet',
  name: 'Customer Interaction Prep',
  description: 'Bespoke talking points and intel for customer meetings. Includes property data, storm history, and AI-generated conversation starters.',
  icon: 'UserCircle',
  audience: 'rep',
  estimatedSlides: 5,
  estimatedGenerationTime: 8,
  requiredContext: [
    { 
      type: 'customer', 
      required: true,
      label: 'Customer',
      placeholder: 'Select a customer...'
    }
  ],
  sections: [
    {
      id: 'title',
      title: 'Cover Slide',
      type: 'title',
      dataSource: 'getCustomerTitleData',
      optional: false,
      aiEnhanced: false,
      defaultEnabled: true,
      description: 'Customer name, address, and prep date'
    },
    {
      id: 'customer-overview',
      title: 'Customer At-A-Glance',
      type: 'stats',
      dataSource: 'getCustomerOverviewStats',
      optional: false,
      aiEnhanced: false,
      defaultEnabled: true,
      description: 'Lead score, property value, roof age, storm exposure'
    },
    {
      id: 'property-intel',
      title: 'Property Intelligence',
      type: 'image',
      dataSource: 'getPropertyIntelData',
      optional: false,
      aiEnhanced: false,
      defaultEnabled: true,
      description: 'Street view image with property details'
    },
    {
      id: 'storm-history',
      title: 'Storm Exposure History',
      type: 'timeline',
      dataSource: 'getStormHistoryTimeline',
      optional: true,
      aiEnhanced: false,
      defaultEnabled: true,
      description: 'Recent storms affecting this property'
    },
    {
      id: 'talking-points',
      title: 'Recommended Talking Points',
      type: 'talking-points',
      dataSource: 'generateCustomerTalkingPoints',
      optional: false,
      aiEnhanced: true,
      defaultEnabled: true,
      description: 'AI-generated conversation starters and value props'
    },
    {
      id: 'objection-handlers',
      title: 'Objection Handlers',
      type: 'list',
      dataSource: 'generateObjectionHandlers',
      optional: false,
      aiEnhanced: true,
      defaultEnabled: true,
      description: 'Common objections with proven responses'
    },
    {
      id: 'next-steps',
      title: 'Recommended Next Steps',
      type: 'list',
      dataSource: 'getRecommendedNextSteps',
      optional: true,
      aiEnhanced: true,
      defaultEnabled: false,
      description: 'AI-suggested actions based on customer status'
    }
  ],
  branding: guardianBrandConfig,
  tags: ['sales', 'customer-prep', 'field-work'],
  category: 'sales'
};
```

### Project Timeline Template

Create: `src/features/deck-generator/templates/project-timeline.ts`

```typescript
import { DeckTemplate } from '../types/deck.types';
import { guardianBrandConfig, guardianLightBrandConfig } from '../utils/brandingConfig';

export const projectTimelineTemplate: DeckTemplate = {
  id: 'project-timeline',
  name: 'Project Timeline Overview',
  description: 'Visual project status for managers or homeowner updates. Shows milestones, current status, and upcoming steps.',
  icon: 'Calendar',
  audience: 'manager',
  estimatedSlides: 4,
  estimatedGenerationTime: 6,
  requiredContext: [
    { 
      type: 'customer', 
      required: true,
      label: 'Customer/Project',
      placeholder: 'Select a project...'
    }
  ],
  sections: [
    {
      id: 'title',
      title: 'Cover Slide',
      type: 'title',
      dataSource: 'getProjectTitleData',
      optional: false,
      aiEnhanced: false,
      defaultEnabled: true,
      description: 'Project name, address, and current status'
    },
    {
      id: 'project-stats',
      title: 'Project Overview',
      type: 'stats',
      dataSource: 'getProjectStats',
      optional: false,
      aiEnhanced: false,
      defaultEnabled: true,
      description: 'Contract value, timeline, completion percentage'
    },
    {
      id: 'timeline',
      title: 'Project Timeline',
      type: 'timeline',
      dataSource: 'getProjectTimeline',
      optional: false,
      aiEnhanced: false,
      defaultEnabled: true,
      description: 'Visual milestone tracker'
    },
    {
      id: 'upcoming-tasks',
      title: 'Upcoming Tasks',
      type: 'list',
      dataSource: 'getUpcomingTasks',
      optional: true,
      aiEnhanced: false,
      defaultEnabled: true,
      description: 'Next steps and action items'
    },
    {
      id: 'weather-forecast',
      title: 'Weather Outlook',
      type: 'chart',
      dataSource: 'getWeatherForecast',
      optional: true,
      aiEnhanced: false,
      defaultEnabled: false,
      description: '7-day forecast for scheduling'
    }
  ],
  branding: guardianBrandConfig,
  tags: ['operations', 'project-management', 'customer-update'],
  category: 'operations'
};

// Customer-facing version with light theme
export const projectTimelineCustomerTemplate: DeckTemplate = {
  ...projectTimelineTemplate,
  id: 'project-timeline-customer',
  name: 'Project Update (Customer)',
  description: 'Professional project status update for homeowners.',
  audience: 'customer',
  branding: guardianLightBrandConfig,
  category: 'customer-facing'
};
```

### Storm Deployment Template

Create: `src/features/deck-generator/templates/storm-deployment.ts`

```typescript
import { DeckTemplate } from '../types/deck.types';
import { guardianBrandConfig } from '../utils/brandingConfig';

export const stormDeploymentTemplate: DeckTemplate = {
  id: 'storm-deployment',
  name: 'Storm Response Deployment Brief',
  description: 'Rapid deployment planning for post-storm canvassing. Includes affected areas, priority leads, and team assignments.',
  icon: 'CloudLightning',
  audience: 'manager',
  estimatedSlides: 6,
  estimatedGenerationTime: 12,
  requiredContext: [
    { 
      type: 'region', 
      required: true,
      label: 'Affected Region',
      placeholder: 'Select storm-affected area...'
    },
    {
      type: 'date-range',
      required: false,
      label: 'Storm Date Range',
      placeholder: 'Last 7 days'
    }
  ],
  sections: [
    {
      id: 'title',
      title: 'Storm Response Brief',
      type: 'title',
      dataSource: 'getStormBriefTitleData',
      optional: false,
      aiEnhanced: false,
      defaultEnabled: true,
      description: 'Storm event summary and response date'
    },
    {
      id: 'storm-stats',
      title: 'Storm Impact Summary',
      type: 'stats',
      dataSource: 'getStormImpactStats',
      optional: false,
      aiEnhanced: false,
      defaultEnabled: true,
      description: 'Properties affected, severity, opportunity size'
    },
    {
      id: 'affected-map',
      title: 'Affected Area Map',
      type: 'map',
      dataSource: 'getAffectedAreaMap',
      optional: false,
      aiEnhanced: false,
      defaultEnabled: true,
      description: 'Geographic visualization of impact'
    },
    {
      id: 'priority-leads',
      title: 'Priority Leads',
      type: 'list',
      dataSource: 'getPriorityStormLeads',
      optional: false,
      aiEnhanced: true,
      defaultEnabled: true,
      description: 'Top opportunities ranked by AI scoring'
    },
    {
      id: 'team-assignments',
      title: 'Team Deployment Plan',
      type: 'list',
      dataSource: 'getTeamAssignments',
      optional: true,
      aiEnhanced: true,
      defaultEnabled: true,
      description: 'Rep assignments based on location and capacity'
    },
    {
      id: 'talking-points',
      title: 'Storm Response Scripts',
      type: 'talking-points',
      dataSource: 'generateStormTalkingPoints',
      optional: false,
      aiEnhanced: true,
      defaultEnabled: true,
      description: 'AI-generated scripts for storm outreach'
    },
    {
      id: 'logistics',
      title: 'Logistics & Materials',
      type: 'list',
      dataSource: 'getLogisticsChecklist',
      optional: true,
      aiEnhanced: false,
      defaultEnabled: false,
      description: 'Equipment and material checklist'
    }
  ],
  branding: guardianBrandConfig,
  tags: ['storm-response', 'deployment', 'urgent'],
  category: 'operations'
};
```

### Insurance Prep Template

Create: `src/features/deck-generator/templates/insurance-prep.ts`

```typescript
import { DeckTemplate } from '../types/deck.types';
import { guardianBrandConfig } from '../utils/brandingConfig';

export const insurancePrepTemplate: DeckTemplate = {
  id: 'insurance-prep',
  name: 'Insurance Adjuster Prep Pack',
  description: 'Comprehensive preparation for insurance adjuster meetings. Includes documentation checklist, carrier intel, and negotiation points.',
  icon: 'FileCheck',
  audience: 'rep',
  estimatedSlides: 5,
  estimatedGenerationTime: 10,
  requiredContext: [
    { 
      type: 'customer', 
      required: true,
      label: 'Customer/Claim',
      placeholder: 'Select customer with active claim...'
    }
  ],
  sections: [
    {
      id: 'title',
      title: 'Adjuster Meeting Prep',
      type: 'title',
      dataSource: 'getInsurancePrepTitleData',
      optional: false,
      aiEnhanced: false,
      defaultEnabled: true,
      description: 'Customer, carrier, and meeting details'
    },
    {
      id: 'claim-overview',
      title: 'Claim Overview',
      type: 'stats',
      dataSource: 'getClaimOverviewStats',
      optional: false,
      aiEnhanced: false,
      defaultEnabled: true,
      description: 'Claim number, filed date, estimated value'
    },
    {
      id: 'damage-documentation',
      title: 'Documented Damage',
      type: 'list',
      dataSource: 'getDamageDocumentation',
      optional: false,
      aiEnhanced: false,
      defaultEnabled: true,
      description: 'Itemized damage with photo references'
    },
    {
      id: 'carrier-intel',
      title: 'Carrier Intelligence',
      type: 'stats',
      dataSource: 'getCarrierIntel',
      optional: true,
      aiEnhanced: true,
      defaultEnabled: true,
      description: 'Approval rates, common issues, adjuster patterns'
    },
    {
      id: 'negotiation-points',
      title: 'Key Negotiation Points',
      type: 'talking-points',
      dataSource: 'generateNegotiationPoints',
      optional: false,
      aiEnhanced: true,
      defaultEnabled: true,
      description: 'AI-generated points to maximize claim approval'
    },
    {
      id: 'documentation-checklist',
      title: 'Pre-Meeting Checklist',
      type: 'list',
      dataSource: 'getDocumentationChecklist',
      optional: true,
      aiEnhanced: false,
      defaultEnabled: true,
      description: 'Required documents and preparations'
    }
  ],
  branding: guardianBrandConfig,
  tags: ['insurance', 'claims', 'adjuster'],
  category: 'sales'
};
```

### Team Performance Template

Create: `src/features/deck-generator/templates/team-performance.ts`

```typescript
import { DeckTemplate } from '../types/deck.types';
import { guardianBrandConfig } from '../utils/brandingConfig';

export const teamPerformanceTemplate: DeckTemplate = {
  id: 'team-performance',
  name: 'Team Performance Report',
  description: 'Comprehensive team analytics for leadership meetings. Includes leaderboards, trends, and coaching opportunities.',
  icon: 'Users',
  audience: 'leadership',
  estimatedSlides: 6,
  estimatedGenerationTime: 10,
  requiredContext: [
    { 
      type: 'team', 
      required: false,
      label: 'Team/Region',
      placeholder: 'All teams (default)'
    },
    {
      type: 'date-range',
      required: false,
      label: 'Report Period',
      placeholder: 'Last 30 days'
    }
  ],
  sections: [
    {
      id: 'title',
      title: 'Performance Report',
      type: 'title',
      dataSource: 'getTeamReportTitleData',
      optional: false,
      aiEnhanced: false,
      defaultEnabled: true,
      description: 'Report period and team scope'
    },
    {
      id: 'kpi-summary',
      title: 'Key Metrics',
      type: 'stats',
      dataSource: 'getTeamKPIStats',
      optional: false,
      aiEnhanced: false,
      defaultEnabled: true,
      description: 'Revenue, deals closed, conversion rate, avg deal size'
    },
    {
      id: 'revenue-trend',
      title: 'Revenue Trend',
      type: 'chart',
      dataSource: 'getRevenueTrendData',
      optional: false,
      aiEnhanced: false,
      defaultEnabled: true,
      description: 'Weekly/monthly revenue progression'
    },
    {
      id: 'leaderboard',
      title: 'Top Performers',
      type: 'list',
      dataSource: 'getLeaderboardData',
      optional: false,
      aiEnhanced: false,
      defaultEnabled: true,
      description: 'Ranked rep performance'
    },
    {
      id: 'coaching-opportunities',
      title: 'Coaching Opportunities',
      type: 'list',
      dataSource: 'getCoachingOpportunities',
      optional: true,
      aiEnhanced: true,
      defaultEnabled: true,
      description: 'AI-identified areas for improvement'
    },
    {
      id: 'pipeline-health',
      title: 'Pipeline Health',
      type: 'chart',
      dataSource: 'getPipelineHealthData',
      optional: true,
      aiEnhanced: false,
      defaultEnabled: true,
      description: 'Deals by stage with conversion rates'
    },
    {
      id: 'insights',
      title: 'AI Insights & Recommendations',
      type: 'talking-points',
      dataSource: 'generatePerformanceInsights',
      optional: true,
      aiEnhanced: true,
      defaultEnabled: false,
      description: 'Strategic recommendations from AI analysis'
    }
  ],
  branding: guardianBrandConfig,
  tags: ['leadership', 'analytics', 'team-management'],
  category: 'leadership'
};
```

### Market Analysis Template

Create: `src/features/deck-generator/templates/market-analysis.ts`

```typescript
import { DeckTemplate } from '../types/deck.types';
import { guardianBrandConfig } from '../utils/brandingConfig';

export const marketAnalysisTemplate: DeckTemplate = {
  id: 'market-analysis',
  name: 'Market Analysis Brief',
  description: 'Regional market intelligence for strategic planning. Includes storm trends, competitive landscape, and opportunity sizing.',
  icon: 'TrendingUp',
  audience: 'leadership',
  estimatedSlides: 5,
  estimatedGenerationTime: 15,
  requiredContext: [
    { 
      type: 'region', 
      required: false,
      label: 'Region',
      placeholder: 'All service areas (default)'
    },
    {
      type: 'date-range',
      required: false,
      label: 'Analysis Period',
      placeholder: 'Last 90 days'
    }
  ],
  sections: [
    {
      id: 'title',
      title: 'Market Analysis',
      type: 'title',
      dataSource: 'getMarketAnalysisTitleData',
      optional: false,
      aiEnhanced: false,
      defaultEnabled: true,
      description: 'Region and analysis period'
    },
    {
      id: 'market-stats',
      title: 'Market Overview',
      type: 'stats',
      dataSource: 'getMarketOverviewStats',
      optional: false,
      aiEnhanced: false,
      defaultEnabled: true,
      description: 'Total addressable market, penetration, growth'
    },
    {
      id: 'storm-activity',
      title: 'Storm Activity Trends',
      type: 'chart',
      dataSource: 'getStormActivityTrend',
      optional: false,
      aiEnhanced: false,
      defaultEnabled: true,
      description: 'Storm frequency and severity over time'
    },
    {
      id: 'opportunity-map',
      title: 'Opportunity Heat Map',
      type: 'map',
      dataSource: 'getOpportunityHeatMap',
      optional: true,
      aiEnhanced: false,
      defaultEnabled: true,
      description: 'Geographic opportunity distribution'
    },
    {
      id: 'competitive-landscape',
      title: 'Competitive Landscape',
      type: 'comparison',
      dataSource: 'getCompetitiveLandscape',
      optional: true,
      aiEnhanced: true,
      defaultEnabled: true,
      description: 'AI-analyzed competitor positioning'
    },
    {
      id: 'strategic-recommendations',
      title: 'Strategic Recommendations',
      type: 'talking-points',
      dataSource: 'generateStrategicRecommendations',
      optional: true,
      aiEnhanced: true,
      defaultEnabled: true,
      description: 'AI-generated strategic insights'
    }
  ],
  branding: guardianBrandConfig,
  tags: ['strategy', 'market-intel', 'planning'],
  category: 'leadership'
};
```

### Templates Index

Create: `src/features/deck-generator/templates/index.ts`

```typescript
import { DeckTemplate } from '../types/deck.types';
import { customerCheatSheetTemplate } from './customer-cheat-sheet';
import { projectTimelineTemplate, projectTimelineCustomerTemplate } from './project-timeline';
import { stormDeploymentTemplate } from './storm-deployment';
import { insurancePrepTemplate } from './insurance-prep';
import { teamPerformanceTemplate } from './team-performance';
import { marketAnalysisTemplate } from './market-analysis';

// All available templates
export const deckTemplates: DeckTemplate[] = [
  customerCheatSheetTemplate,
  projectTimelineTemplate,
  projectTimelineCustomerTemplate,
  stormDeploymentTemplate,
  insurancePrepTemplate,
  teamPerformanceTemplate,
  marketAnalysisTemplate,
];

// Export individual templates
export {
  customerCheatSheetTemplate,
  projectTimelineTemplate,
  projectTimelineCustomerTemplate,
  stormDeploymentTemplate,
  insurancePrepTemplate,
  teamPerformanceTemplate,
  marketAnalysisTemplate,
};

// Helper functions
export function getTemplateById(id: string): DeckTemplate | undefined {
  return deckTemplates.find(t => t.id === id);
}

export function getTemplatesByAudience(audience: string): DeckTemplate[] {
  return deckTemplates.filter(t => t.audience === audience);
}

export function getTemplatesByCategory(category: string): DeckTemplate[] {
  return deckTemplates.filter(t => t.category === category);
}

export function getTemplatesByTag(tag: string): DeckTemplate[] {
  return deckTemplates.filter(t => t.tags.includes(tag));
}

// Template categories for UI grouping
export const templateCategories = [
  { id: 'sales', name: 'Sales & Field', icon: 'Target' },
  { id: 'operations', name: 'Operations', icon: 'Settings' },
  { id: 'leadership', name: 'Leadership', icon: 'Crown' },
  { id: 'customer-facing', name: 'Customer-Facing', icon: 'Users' },
];
```

---

## 🔧 Data Aggregator Utility

Create: `src/features/deck-generator/utils/dataAggregator.ts`

```typescript
/**
 * Data Aggregator for Deck Generation
 * 
 * Each function fetches and formats data for specific slide types.
 * These should integrate with your existing Prisma models and API endpoints.
 */

import { 
  TitleSlideContent, 
  StatsSlideContent, 
  ListSlideContent,
  TimelineSlideContent,
  ImageSlideContent,
  TalkingPointsSlideContent,
  ChartSlideContent
} from '../types/deck.types';

// =============================================================================
// CUSTOMER CHEAT SHEET DATA FUNCTIONS
// =============================================================================

export async function getCustomerTitleData(customerId: string): Promise<TitleSlideContent> {
  // TODO: Fetch from your customer API/Prisma
  // Example implementation:
  const customer = await fetch(`/api/customers/${customerId}`).then(r => r.json());
  
  return {
    title: `Customer Prep: ${customer.name}`,
    subtitle: customer.address,
    date: new Date().toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    }),
    preparedFor: customer.assignedRep || 'Guardian Sales Team',
  };
}

export async function getCustomerOverviewStats(customerId: string): Promise<StatsSlideContent> {
  // TODO: Fetch customer metrics
  const customer = await fetch(`/api/customers/${customerId}`).then(r => r.json());
  
  return {
    title: 'Customer At-A-Glance',
    stats: [
      { 
        label: 'Lead Score', 
        value: customer.leadScore || 75, 
        trend: customer.leadScoreTrend || 'up',
        icon: 'Target'
      },
      { 
        label: 'Property Value', 
        value: `$${(customer.propertyValue || 0).toLocaleString()}`,
        icon: 'Home'
      },
      { 
        label: 'Roof Age', 
        value: `${customer.roofAge || 'Unknown'} years`,
        icon: 'Calendar'
      },
      { 
        label: 'Storm Exposure', 
        value: `${customer.stormExposureCount || 0} events (90 days)`,
        icon: 'CloudLightning'
      },
    ],
    footnote: `Last updated: ${new Date().toLocaleDateString()}`
  };
}

export async function getPropertyIntelData(customerId: string): Promise<ImageSlideContent> {
  const customer = await fetch(`/api/customers/${customerId}`).then(r => r.json());
  
  // Generate Google Street View URL
  const streetViewUrl = `https://maps.googleapis.com/maps/api/streetview?size=800x400&location=${encodeURIComponent(customer.address)}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`;
  
  return {
    title: 'Property Intelligence',
    imageUrl: streetViewUrl,
    altText: `Street view of ${customer.address}`,
    caption: `${customer.propertyType || 'Single Family'} | ${customer.squareFootage?.toLocaleString() || 'N/A'} sq ft | ${customer.roofType || 'Asphalt Shingle'} roof`,
    notes: [
      customer.roofAge ? `Roof installed ~${customer.roofAge} years ago` : null,
      customer.previousClaim ? `Previous claim: ${customer.previousClaimDate}` : null,
      customer.specialNotes || null,
    ].filter(Boolean) as string[],
  };
}

export async function getStormHistoryTimeline(customerId: string): Promise<TimelineSlideContent> {
  const storms = await fetch(`/api/customers/${customerId}/storms`).then(r => r.json());
  
  return {
    title: 'Storm Exposure History',
    events: storms.slice(0, 5).map((storm: any) => ({
      date: new Date(storm.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      title: storm.type, // e.g., "Hail Storm", "High Wind Event"
      description: storm.severity ? `Severity: ${storm.severity}` : undefined,
      status: storm.claimFiled ? 'completed' : 'upcoming',
      icon: storm.type.includes('Hail') ? 'CloudHail' : 'Wind',
    })),
  };
}

// =============================================================================
// AI-ENHANCED DATA FUNCTIONS
// =============================================================================

export async function generateCustomerTalkingPoints(customerId: string): Promise<TalkingPointsSlideContent> {
  // Call your AI endpoint to generate talking points
  const response = await fetch('/api/ai/generate-talking-points', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ customerId, type: 'customer-prep' }),
  }).then(r => r.json());
  
  return {
    title: 'Recommended Talking Points',
    aiGenerated: true,
    points: response.points || [
      {
        topic: 'Opening',
        script: 'Loading AI-generated content...',
        priority: 'high'
      }
    ],
  };
}

export async function generateObjectionHandlers(customerId: string): Promise<ListSlideContent> {
  const response = await fetch('/api/ai/generate-objections', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ customerId }),
  }).then(r => r.json());
  
  return {
    title: 'Objection Handlers',
    items: response.objections || [
      {
        primary: '"I need to think about it"',
        secondary: 'Absolutely. The inspection itself is completely free and no-obligation. It just gives you information about your home\'s condition.',
        highlight: true
      }
    ],
    numbered: false,
  };
}

// =============================================================================
// TEAM/LEADERSHIP DATA FUNCTIONS
// =============================================================================

export async function getTeamKPIStats(teamId?: string, dateRange?: { start: string; end: string }): Promise<StatsSlideContent> {
  const params = new URLSearchParams();
  if (teamId) params.set('teamId', teamId);
  if (dateRange) {
    params.set('startDate', dateRange.start);
    params.set('endDate', dateRange.end);
  }
  
  const data = await fetch(`/api/analytics/team-kpis?${params}`).then(r => r.json());
  
  return {
    title: 'Key Performance Metrics',
    stats: [
      { 
        label: 'Revenue MTD', 
        value: `$${(data.revenueMTD || 0).toLocaleString()}`,
        trend: data.revenueTrend || 'neutral',
        change: data.revenueChange || '+0%',
        icon: 'DollarSign'
      },
      { 
        label: 'Deals Closed', 
        value: data.dealsClosed || 0,
        trend: data.dealsTrend || 'neutral',
        icon: 'CheckCircle'
      },
      { 
        label: 'Conversion Rate', 
        value: `${data.conversionRate || 0}%`,
        trend: data.conversionTrend || 'neutral',
        icon: 'TrendingUp'
      },
      { 
        label: 'Avg Deal Size', 
        value: `$${(data.avgDealSize || 0).toLocaleString()}`,
        icon: 'Maximize'
      },
    ],
  };
}

export async function getLeaderboardData(teamId?: string): Promise<ListSlideContent> {
  const data = await fetch(`/api/analytics/leaderboard${teamId ? `?teamId=${teamId}` : ''}`).then(r => r.json());
  
  return {
    title: 'Top Performers',
    items: (data.leaders || []).slice(0, 5).map((rep: any, index: number) => ({
      primary: `${index + 1}. ${rep.name}`,
      secondary: `$${rep.revenue.toLocaleString()} | ${rep.deals} deals | ${rep.conversionRate}% close rate`,
      icon: index === 0 ? 'Trophy' : index < 3 ? 'Medal' : 'User',
      highlight: index === 0,
    })),
    numbered: false,
  };
}

export async function getRevenueTrendData(teamId?: string, dateRange?: { start: string; end: string }): Promise<ChartSlideContent> {
  const params = new URLSearchParams();
  if (teamId) params.set('teamId', teamId);
  if (dateRange) {
    params.set('startDate', dateRange.start);
    params.set('endDate', dateRange.end);
  }
  
  const data = await fetch(`/api/analytics/revenue-trend?${params}`).then(r => r.json());
  
  return {
    title: 'Revenue Trend',
    chartType: 'area',
    data: data.trend || [],
    xKey: 'date',
    yKey: 'revenue',
    footnote: 'Daily revenue for selected period',
  };
}

// =============================================================================
// STORM DATA FUNCTIONS
// =============================================================================

export async function getStormImpactStats(regionId: string): Promise<StatsSlideContent> {
  const data = await fetch(`/api/storms/impact?regionId=${regionId}`).then(r => r.json());
  
  return {
    title: 'Storm Impact Summary',
    stats: [
      { label: 'Properties Affected', value: data.propertiesAffected || 0, icon: 'Home' },
      { label: 'Estimated Opportunity', value: `$${(data.estimatedOpportunity || 0).toLocaleString()}`, icon: 'DollarSign' },
      { label: 'Severity Level', value: data.severityLevel || 'Moderate', icon: 'AlertTriangle' },
      { label: 'Priority Leads', value: data.priorityLeads || 0, icon: 'Star' },
    ],
  };
}

export async function getPriorityStormLeads(regionId: string): Promise<ListSlideContent> {
  const data = await fetch(`/api/storms/priority-leads?regionId=${regionId}`).then(r => r.json());
  
  return {
    title: 'Priority Leads',
    items: (data.leads || []).slice(0, 10).map((lead: any) => ({
      primary: lead.name,
      secondary: `${lead.address} | Score: ${lead.score} | Est. Value: $${lead.estimatedValue?.toLocaleString()}`,
      icon: lead.score > 80 ? 'Flame' : 'Target',
      highlight: lead.score > 80,
    })),
    numbered: true,
  };
}

export async function generateStormTalkingPoints(regionId: string): Promise<TalkingPointsSlideContent> {
  const response = await fetch('/api/ai/generate-talking-points', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ regionId, type: 'storm-response' }),
  }).then(r => r.json());
  
  return {
    title: 'Storm Response Scripts',
    aiGenerated: true,
    points: response.points || [],
  };
}

// =============================================================================
// UTILITY: Data Source Registry
// =============================================================================

// Map of all data source functions for dynamic calling
export const dataSourceRegistry: Record<string, (context: any) => Promise<any>> = {
  // Customer Cheat Sheet
  getCustomerTitleData,
  getCustomerOverviewStats,
  getPropertyIntelData,
  getStormHistoryTimeline,
  generateCustomerTalkingPoints,
  generateObjectionHandlers,
  
  // Team Performance
  getTeamKPIStats,
  getLeaderboardData,
  getRevenueTrendData,
  
  // Storm Deployment
  getStormImpactStats,
  getPriorityStormLeads,
  generateStormTalkingPoints,
  
  // Add more as you implement them...
};

// Helper to call any data source by name
export async function fetchDataForSlide(
  dataSourceName: string, 
  context: Record<string, any>
): Promise<any> {
  const dataSource = dataSourceRegistry[dataSourceName];
  
  if (!dataSource) {
    console.warn(`Data source not found: ${dataSourceName}`);
    return null;
  }
  
  try {
    // Pass appropriate context based on data source requirements
    if (dataSourceName.includes('Customer') || dataSourceName.includes('Property') || dataSourceName.includes('Objection')) {
      return await dataSource(context.customerId);
    }
    if (dataSourceName.includes('Team') || dataSourceName.includes('Leaderboard') || dataSourceName.includes('Revenue')) {
      return await dataSource(context.teamId, context.dateRange);
    }
    if (dataSourceName.includes('Storm')) {
      return await dataSource(context.regionId);
    }
    
    // Default: pass entire context
    return await dataSource(context);
  } catch (error) {
    console.error(`Error fetching data for ${dataSourceName}:`, error);
    throw error;
  }
}
```

---

## 🪝 React Hooks

### Main Generation Hook

Create: `src/features/deck-generator/hooks/useDeckGeneration.ts`

```typescript
import { useState, useCallback } from 'react';
import {
  DeckTemplate,
  DeckGenerationRequest,
  DeckGenerationProgress,
  GeneratedDeck,
  GeneratedSlide,
} from '../types/deck.types';
import { fetchDataForSlide } from '../utils/dataAggregator';
import { v4 as uuidv4 } from 'uuid';

interface UseDeckGenerationReturn {
  isGenerating: boolean;
  progress: DeckGenerationProgress | null;
  generatedDeck: GeneratedDeck | null;
  error: string | null;
  generateDeck: (template: DeckTemplate, request: DeckGenerationRequest) => Promise<GeneratedDeck | null>;
  resetGeneration: () => void;
}

export function useDeckGeneration(): UseDeckGenerationReturn {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState<DeckGenerationProgress | null>(null);
  const [generatedDeck, setGeneratedDeck] = useState<GeneratedDeck | null>(null);
  const [error, setError] = useState<string | null>(null);

  const updateProgress = useCallback((update: Partial<DeckGenerationProgress>) => {
    setProgress(prev => prev ? { ...prev, ...update } : null);
  }, []);

  const generateDeck = useCallback(async (
    template: DeckTemplate,
    request: DeckGenerationRequest
  ): Promise<GeneratedDeck | null> => {
    const startTime = Date.now();
    setIsGenerating(true);
    setError(null);
    setGeneratedDeck(null);

    // Get enabled sections
    const enabledSections = template.sections.filter(
      s => request.options.enabledSections.includes(s.id)
    );

    const totalSteps = enabledSections.length + 2; // +2 for init and finalize

    try {
      // Step 1: Initialize
      setProgress({
        status: 'initializing',
        currentStep: 1,
        totalSteps,
        message: 'Preparing deck generation...',
        progress: 5,
      });

      await new Promise(resolve => setTimeout(resolve, 300)); // Small delay for UX

      // Step 2: Fetch data and generate slides
      const slides: GeneratedSlide[] = [];

      for (let i = 0; i < enabledSections.length; i++) {
        const section = enabledSections[i];
        
        setProgress({
          status: section.aiEnhanced ? 'ai-enhancement' : 'fetching-data',
          currentStep: i + 2,
          totalSteps,
          currentSlide: section.title,
          message: section.aiEnhanced 
            ? `Generating AI content for ${section.title}...`
            : `Fetching data for ${section.title}...`,
          progress: Math.round(((i + 1) / enabledSections.length) * 80) + 10,
        });

        try {
          // Fetch data for this slide
          const content = await fetchDataForSlide(section.dataSource, request.context);

          if (content) {
            slides.push({
              id: uuidv4(),
              type: section.type,
              sectionId: section.id,
              content,
              aiGenerated: section.aiEnhanced,
              generatedAt: new Date().toISOString(),
            });
          }
        } catch (slideError) {
          console.error(`Error generating slide ${section.id}:`, slideError);
          // Continue with other slides even if one fails
        }
      }

      // Step 3: Finalize
      setProgress({
        status: 'rendering',
        currentStep: totalSteps,
        totalSteps,
        message: 'Finalizing deck...',
        progress: 95,
      });

      const generationTimeMs = Date.now() - startTime;

      const deck: GeneratedDeck = {
        id: uuidv4(),
        templateId: template.id,
        templateName: template.name,
        generatedAt: new Date().toISOString(),
        generatedBy: 'current-user', // TODO: Get from auth context
        context: request.context,
        slides,
        branding: request.options.customBranding 
          ? { ...template.branding, ...request.options.customBranding }
          : template.branding,
        metadata: {
          totalSlides: slides.length,
          aiSlidesCount: slides.filter(s => s.aiGenerated).length,
          generationTimeMs,
          version: '1.0.0',
        },
      };

      setGeneratedDeck(deck);
      setProgress({
        status: 'complete',
        currentStep: totalSteps,
        totalSteps,
        message: 'Deck generated successfully!',
        progress: 100,
      });

      return deck;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate deck';
      setError(errorMessage);
      setProgress({
        status: 'error',
        currentStep: 0,
        totalSteps,
        message: errorMessage,
        progress: 0,
      });
      return null;

    } finally {
      setIsGenerating(false);
    }
  }, []);

  const resetGeneration = useCallback(() => {
    setIsGenerating(false);
    setProgress(null);
    setGeneratedDeck(null);
    setError(null);
  }, []);

  return {
    isGenerating,
    progress,
    generatedDeck,
    error,
    generateDeck,
    resetGeneration,
  };
}
```

### Templates Hook

Create: `src/features/deck-generator/hooks/useDeckTemplates.ts`

```typescript
import { useMemo } from 'react';
import { DeckTemplate } from '../types/deck.types';
import { 
  deckTemplates, 
  getTemplateById, 
  getTemplatesByAudience,
  getTemplatesByCategory,
  templateCategories 
} from '../templates';

interface UseDeckTemplatesReturn {
  templates: DeckTemplate[];
  categories: typeof templateCategories;
  getTemplate: (id: string) => DeckTemplate | undefined;
  getByAudience: (audience: string) => DeckTemplate[];
  getByCategory: (category: string) => DeckTemplate[];
  searchTemplates: (query: string) => DeckTemplate[];
}

export function useDeckTemplates(): UseDeckTemplatesReturn {
  const searchTemplates = useMemo(() => {
    return (query: string): DeckTemplate[] => {
      if (!query.trim()) return deckTemplates;
      
      const lowerQuery = query.toLowerCase();
      return deckTemplates.filter(template => 
        template.name.toLowerCase().includes(lowerQuery) ||
        template.description.toLowerCase().includes(lowerQuery) ||
        template.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
      );
    };
  }, []);

  return {
    templates: deckTemplates,
    categories: templateCategories,
    getTemplate: getTemplateById,
    getByAudience: getTemplatesByAudience,
    getByCategory: getTemplatesByCategory,
    searchTemplates,
  };
}
```

### Hooks Index

Create: `src/features/deck-generator/hooks/index.ts`

```typescript
export { useDeckGeneration } from './useDeckGeneration';
export { useDeckTemplates } from './useDeckTemplates';
```

---

## 🖼️ React Components

### Main Modal Component

Create: `src/features/deck-generator/components/DeckGeneratorModal.tsx`

```typescript
'use client';

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  ChevronRight, 
  ChevronLeft,
  Loader2,
  Download,
  Share2,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { DeckTemplate, DeckGenerationRequest, ExportFormat } from '../types/deck.types';
import { useDeckGeneration } from '../hooks/useDeckGeneration';
import { useDeckTemplates } from '../hooks/useDeckTemplates';
import { DeckTemplateSelector } from './DeckTemplateSelector';
import { DeckCustomizer } from './DeckCustomizer';
import { DeckPreview } from './DeckPreview';

interface DeckGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  // Pre-selected context (e.g., when opening from a customer card)
  initialContext?: {
    customerId?: string;
    customerName?: string;
    projectId?: string;
    regionId?: string;
  };
  // Pre-selected template
  initialTemplateId?: string;
}

type Step = 'select-template' | 'customize' | 'generating' | 'preview';

export function DeckGeneratorModal({
  isOpen,
  onClose,
  initialContext,
  initialTemplateId,
}: DeckGeneratorModalProps) {
  const { templates, getTemplate } = useDeckTemplates();
  const { 
    isGenerating, 
    progress, 
    generatedDeck, 
    error, 
    generateDeck,
    resetGeneration 
  } = useDeckGeneration();

  // State
  const [step, setStep] = useState<Step>(initialTemplateId ? 'customize' : 'select-template');
  const [selectedTemplate, setSelectedTemplate] = useState<DeckTemplate | null>(
    initialTemplateId ? getTemplate(initialTemplateId) || null : null
  );
  const [context, setContext] = useState<DeckGenerationRequest['context']>(
    initialContext || {}
  );
  const [enabledSections, setEnabledSections] = useState<string[]>([]);
  const [exportFormat, setExportFormat] = useState<ExportFormat>('pdf');

  // Initialize enabled sections when template changes
  const handleTemplateSelect = useCallback((template: DeckTemplate) => {
    setSelectedTemplate(template);
    setEnabledSections(
      template.sections
        .filter(s => s.defaultEnabled !== false)
        .map(s => s.id)
    );
    setStep('customize');
  }, []);

  // Handle generation
  const handleGenerate = useCallback(async () => {
    if (!selectedTemplate) return;

    setStep('generating');

    const request: DeckGenerationRequest = {
      templateId: selectedTemplate.id,
      context,
      options: {
        enabledSections,
        includeAiContent: true,
        exportFormat,
      },
    };

    const deck = await generateDeck(selectedTemplate, request);
    
    if (deck) {
      setStep('preview');
    }
  }, [selectedTemplate, context, enabledSections, exportFormat, generateDeck]);

  // Handle close
  const handleClose = useCallback(() => {
    resetGeneration();
    setStep(initialTemplateId ? 'customize' : 'select-template');
    setSelectedTemplate(initialTemplateId ? getTemplate(initialTemplateId) || null : null);
    onClose();
  }, [initialTemplateId, getTemplate, resetGeneration, onClose]);

  // Handle back navigation
  const handleBack = useCallback(() => {
    if (step === 'customize') {
      setStep('select-template');
      setSelectedTemplate(null);
    } else if (step === 'preview') {
      setStep('customize');
      resetGeneration();
    }
  }, [step, resetGeneration]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-4xl max-h-[90vh] bg-slate-900 rounded-xl shadow-2xl border border-slate-700 overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
            <div className="flex items-center gap-3">
              {step !== 'select-template' && step !== 'generating' && (
                <button
                  onClick={handleBack}
                  className="p-1 rounded-lg hover:bg-slate-800 transition-colors"
                >
                  <ChevronLeft className="w-5 h-5 text-slate-400" />
                </button>
              )}
              <h2 className="text-lg font-semibold text-white">
                {step === 'select-template' && '📊 Generate Slide Deck'}
                {step === 'customize' && selectedTemplate?.name}
                {step === 'generating' && 'Generating Deck...'}
                {step === 'preview' && 'Deck Preview'}
              </h2>
            </div>
            <button
              onClick={handleClose}
              className="p-2 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>

          {/* Content */}
          <div className="overflow-y-auto max-h-[calc(90vh-140px)]">
            {/* Step 1: Template Selection */}
            {step === 'select-template' && (
              <DeckTemplateSelector
                templates={templates}
                onSelect={handleTemplateSelect}
              />
            )}

            {/* Step 2: Customization */}
            {step === 'customize' && selectedTemplate && (
              <DeckCustomizer
                template={selectedTemplate}
                context={context}
                onContextChange={setContext}
                enabledSections={enabledSections}
                onSectionsChange={setEnabledSections}
                exportFormat={exportFormat}
                onExportFormatChange={setExportFormat}
              />
            )}

            {/* Step 3: Generating */}
            {step === 'generating' && progress && (
              <div className="flex flex-col items-center justify-center py-16 px-8">
                <div className="relative mb-6">
                  <Loader2 className="w-16 h-16 text-amber-500 animate-spin" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">
                  {progress.message}
                </h3>
                {progress.currentSlide && (
                  <p className="text-slate-400 mb-4">
                    Processing: {progress.currentSlide}
                  </p>
                )}
                {/* Progress bar */}
                <div className="w-full max-w-md h-2 bg-slate-700 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-amber-500 to-amber-400"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress.progress}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
                <p className="text-sm text-slate-500 mt-2">
                  Step {progress.currentStep} of {progress.totalSteps}
                </p>
              </div>
            )}

            {/* Error State */}
            {error && (
              <div className="flex flex-col items-center justify-center py-16 px-8">
                <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">
                  Generation Failed
                </h3>
                <p className="text-slate-400 mb-6 text-center max-w-md">
                  {error}
                </p>
                <button
                  onClick={() => setStep('customize')}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                >
                  Try Again
                </button>
              </div>
            )}

            {/* Step 4: Preview */}
            {step === 'preview' && generatedDeck && (
              <DeckPreview deck={generatedDeck} />
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-700 bg-slate-900/50">
            <div className="text-sm text-slate-400">
              {step === 'customize' && selectedTemplate && (
                <>
                  ~{enabledSections.length} slides • Est. {selectedTemplate.estimatedGenerationTime}s
                </>
              )}
              {step === 'preview' && generatedDeck && (
                <>
                  {generatedDeck.metadata.totalSlides} slides • 
                  Generated in {(generatedDeck.metadata.generationTimeMs / 1000).toFixed(1)}s
                </>
              )}
            </div>
            <div className="flex items-center gap-3">
              {step === 'customize' && (
                <button
                  onClick={handleGenerate}
                  disabled={enabledSections.length === 0}
                  className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 disabled:bg-slate-600 disabled:cursor-not-allowed text-slate-900 font-medium rounded-lg transition-colors"
                >
                  Generate
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}
              {step === 'preview' && (
                <>
                  <button
                    className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                  >
                    <Share2 className="w-4 h-4" />
                    Share
                  </button>
                  <button
                    className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-medium rounded-lg transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Download PDF
                  </button>
                </>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
```

### Template Selector Component

Create: `src/features/deck-generator/components/DeckTemplateSelector.tsx`

```typescript
'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import * as Icons from 'lucide-react';
import { DeckTemplate } from '../types/deck.types';
import { templateCategories } from '../templates';

interface DeckTemplateSelectorProps {
  templates: DeckTemplate[];
  onSelect: (template: DeckTemplate) => void;
}

export function DeckTemplateSelector({ templates, onSelect }: DeckTemplateSelectorProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Filter templates
  const filteredTemplates = templates.filter(template => {
    const matchesCategory = !selectedCategory || template.category === selectedCategory;
    const matchesSearch = !searchQuery || 
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Get icon component dynamically
  const getIcon = (iconName: string) => {
    const IconComponent = (Icons as any)[iconName];
    return IconComponent || Icons.FileText;
  };

  return (
    <div className="p-6">
      {/* Search */}
      <div className="relative mb-6">
        <Icons.Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          type="text"
          placeholder="Search templates..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500"
        />
      </div>

      {/* Category Filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setSelectedCategory(null)}
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
            selectedCategory === null
              ? 'bg-amber-500 text-slate-900'
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
          }`}
        >
          All
        </button>
        {templateCategories.map(category => {
          const CategoryIcon = getIcon(category.icon);
          return (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                selectedCategory === category.id
                  ? 'bg-amber-500 text-slate-900'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <CategoryIcon className="w-3.5 h-3.5" />
              {category.name}
            </button>
          );
        })}
      </div>

      {/* Template Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredTemplates.map((template, index) => {
          const TemplateIcon = getIcon(template.icon);
          return (
            <motion.button
              key={template.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => onSelect(template)}
              className="flex items-start gap-4 p-4 bg-slate-800/50 hover:bg-slate-800 border border-slate-700 hover:border-amber-500/50 rounded-xl text-left transition-all group"
            >
              <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center bg-slate-700 group-hover:bg-amber-500/20 rounded-lg transition-colors">
                <TemplateIcon className="w-6 h-6 text-amber-500" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-white group-hover:text-amber-400 transition-colors">
                  {template.name}
                </h3>
                <p className="text-sm text-slate-400 mt-1 line-clamp-2">
                  {template.description}
                </p>
                <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <Icons.Layers className="w-3 h-3" />
                    ~{template.estimatedSlides} slides
                  </span>
                  <span className="flex items-center gap-1">
                    <Icons.Clock className="w-3 h-3" />
                    ~{template.estimatedGenerationTime}s
                  </span>
                  {template.sections.some(s => s.aiEnhanced) && (
                    <span className="flex items-center gap-1 text-amber-500">
                      <Icons.Sparkles className="w-3 h-3" />
                      AI-enhanced
                    </span>
                  )}
                </div>
              </div>
              <Icons.ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-amber-500 transition-colors" />
            </motion.button>
          );
        })}
      </div>

      {filteredTemplates.length === 0 && (
        <div className="text-center py-12">
          <Icons.Search className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400">No templates match your search</p>
        </div>
      )}
    </div>
  );
}
```

### Customizer Component

Create: `src/features/deck-generator/components/DeckCustomizer.tsx`

```typescript
'use client';

import React from 'react';
import { motion } from 'framer-motion';
import * as Icons from 'lucide-react';
import { DeckTemplate, ExportFormat } from '../types/deck.types';

interface DeckCustomizerProps {
  template: DeckTemplate;
  context: Record<string, any>;
  onContextChange: (context: Record<string, any>) => void;
  enabledSections: string[];
  onSectionsChange: (sections: string[]) => void;
  exportFormat: ExportFormat;
  onExportFormatChange: (format: ExportFormat) => void;
}

export function DeckCustomizer({
  template,
  context,
  onContextChange,
  enabledSections,
  onSectionsChange,
  exportFormat,
  onExportFormatChange,
}: DeckCustomizerProps) {
  const toggleSection = (sectionId: string) => {
    if (enabledSections.includes(sectionId)) {
      onSectionsChange(enabledSections.filter(id => id !== sectionId));
    } else {
      onSectionsChange([...enabledSections, sectionId]);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Context Selection */}
      <div>
        <h3 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
          <Icons.Settings className="w-4 h-4" />
          Context
        </h3>
        <div className="space-y-3">
          {template.requiredContext.map(ctx => (
            <div key={ctx.type}>
              <label className="block text-sm text-slate-400 mb-1">
                {ctx.label}
                {ctx.required && <span className="text-red-400 ml-1">*</span>}
              </label>
              {/* TODO: Replace with actual customer/project/team selector components */}
              <select
                value={context[`${ctx.type}Id`] || ''}
                onChange={e => onContextChange({ ...context, [`${ctx.type}Id`]: e.target.value })}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500"
              >
                <option value="">{ctx.placeholder}</option>
                {/* TODO: Populate with actual options from your data */}
                <option value="demo-id">Demo Selection</option>
              </select>
            </div>
          ))}
        </div>
      </div>

      {/* Section Selection */}
      <div>
        <h3 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
          <Icons.Layers className="w-4 h-4" />
          Slides to Include
        </h3>
        <div className="space-y-2">
          {template.sections.map((section, index) => {
            const isEnabled = enabledSections.includes(section.id);
            const isRequired = !section.optional;
            
            return (
              <motion.div
                key={section.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.03 }}
                className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                  isEnabled
                    ? 'bg-slate-800/80 border-amber-500/30'
                    : 'bg-slate-800/30 border-slate-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => !isRequired && toggleSection(section.id)}
                    disabled={isRequired}
                    className={`w-5 h-5 rounded flex items-center justify-center transition-colors ${
                      isEnabled
                        ? 'bg-amber-500 text-slate-900'
                        : 'bg-slate-700 text-slate-500'
                    } ${isRequired ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:bg-amber-400'}`}
                  >
                    {isEnabled && <Icons.Check className="w-3 h-3" />}
                  </button>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`font-medium ${isEnabled ? 'text-white' : 'text-slate-400'}`}>
                        {section.title}
                      </span>
                      {section.aiEnhanced && (
                        <span className="flex items-center gap-1 px-1.5 py-0.5 bg-amber-500/20 text-amber-400 text-xs rounded">
                          <Icons.Sparkles className="w-3 h-3" />
                          AI
                        </span>
                      )}
                      {isRequired && (
                        <span className="text-xs text-slate-500">(required)</span>
                      )}
                    </div>
                    {section.description && (
                      <p className="text-xs text-slate-500 mt-0.5">{section.description}</p>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Export Format */}
      <div>
        <h3 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
          <Icons.Download className="w-4 h-4" />
          Export Format
        </h3>
        <div className="flex gap-2">
          {(['pdf', 'pptx', 'link'] as ExportFormat[]).map(format => (
            <button
              key={format}
              onClick={() => onExportFormatChange(format)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                exportFormat === format
                  ? 'bg-amber-500 text-slate-900'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {format === 'pdf' && <Icons.FileText className="w-4 h-4" />}
              {format === 'pptx' && <Icons.Presentation className="w-4 h-4" />}
              {format === 'link' && <Icons.Link className="w-4 h-4" />}
              {format.toUpperCase()}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
```

### Preview Component (Stub)

Create: `src/features/deck-generator/components/DeckPreview.tsx`

```typescript
'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { GeneratedDeck } from '../types/deck.types';

interface DeckPreviewProps {
  deck: GeneratedDeck;
}

export function DeckPreview({ deck }: DeckPreviewProps) {
  const [currentSlide, setCurrentSlide] = useState(0);

  const goToSlide = (index: number) => {
    if (index >= 0 && index < deck.slides.length) {
      setCurrentSlide(index);
    }
  };

  const slide = deck.slides[currentSlide];

  return (
    <div className="p-6">
      {/* Slide Preview Area */}
      <div 
        className="relative aspect-[16/9] bg-slate-800 rounded-lg overflow-hidden mb-4"
        style={{ 
          backgroundColor: deck.branding.colors.background,
        }}
      >
        {/* TODO: Render actual slide content based on slide.type */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center p-8">
            <h2 
              className="text-2xl font-bold mb-2"
              style={{ color: deck.branding.colors.text }}
            >
              {(slide.content as any).title || `Slide ${currentSlide + 1}`}
            </h2>
            <p 
              className="text-sm"
              style={{ color: deck.branding.colors.textMuted }}
            >
              Slide Type: {slide.type}
              {slide.aiGenerated && ' • AI Generated'}
            </p>
          </div>
        </div>

        {/* Navigation Arrows */}
        <button
          onClick={() => goToSlide(currentSlide - 1)}
          disabled={currentSlide === 0}
          className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-black/50 hover:bg-black/70 disabled:opacity-30 rounded-full transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-white" />
        </button>
        <button
          onClick={() => goToSlide(currentSlide + 1)}
          disabled={currentSlide === deck.slides.length - 1}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-black/50 hover:bg-black/70 disabled:opacity-30 rounded-full transition-colors"
        >
          <ChevronRight className="w-5 h-5 text-white" />
        </button>

        {/* Slide Counter */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 bg-black/50 rounded-full text-white text-sm">
          {currentSlide + 1} / {deck.slides.length}
        </div>
      </div>

      {/* Slide Thumbnails */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {deck.slides.map((s, index) => (
          <button
            key={s.id}
            onClick={() => goToSlide(index)}
            className={`flex-shrink-0 w-24 h-14 rounded border-2 transition-colors ${
              index === currentSlide
                ? 'border-amber-500'
                : 'border-slate-700 hover:border-slate-600'
            }`}
            style={{ backgroundColor: deck.branding.colors.backgroundAlt }}
          >
            <div className="w-full h-full flex items-center justify-center text-xs text-slate-400">
              {index + 1}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
```

### Components Index

Create: `src/features/deck-generator/components/index.ts`

```typescript
export { DeckGeneratorModal } from './DeckGeneratorModal';
export { DeckTemplateSelector } from './DeckTemplateSelector';
export { DeckCustomizer } from './DeckCustomizer';
export { DeckPreview } from './DeckPreview';
```

---

## 📦 Feature Index

Create: `src/features/deck-generator/index.ts`

```typescript
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
  templateCategories,
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
  BrandingConfig,
  ExportFormat,
} from './types/deck.types';

// Utils
export { guardianBrandConfig, guardianLightBrandConfig } from './utils/brandingConfig';
export { fetchDataForSlide, dataSourceRegistry } from './utils/dataAggregator';
```

---

## 🚀 Integration Example

Add to an existing customer card component:

```typescript
import { useState } from 'react';
import { DeckGeneratorModal } from '@/features/deck-generator';
import { Presentation } from 'lucide-react';

function CustomerIntelCard({ customer }) {
  const [showDeckGenerator, setShowDeckGenerator] = useState(false);

  return (
    <div>
      {/* ... existing card content ... */}
      
      <button
        onClick={() => setShowDeckGenerator(true)}
        className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 rounded-lg transition-colors"
      >
        <Presentation className="w-4 h-4" />
        Generate Prep Deck
      </button>

      <DeckGeneratorModal
        isOpen={showDeckGenerator}
        onClose={() => setShowDeckGenerator(false)}
        initialContext={{
          customerId: customer.id,
          customerName: customer.name,
        }}
        initialTemplateId="customer-cheat-sheet"
      />
    </div>
  );
}
```

---

## 📋 Implementation Checklist

### Phase 1: Foundation (Week 1)
- [ ] Create folder structure
- [ ] Implement all TypeScript types (`deck.types.ts`)
- [ ] Create branding configuration
- [ ] Build `DeckTemplateSelector` component
- [ ] Build `DeckGeneratorModal` shell
- [ ] Create `customer-cheat-sheet` template
- [ ] Implement basic `useDeckGeneration` hook
- [ ] Add "Generate Deck" button to customer card

### Phase 2: Data & AI (Week 2)
- [ ] Implement `dataAggregator.ts` functions
- [ ] Connect to existing customer/property APIs
- [ ] Build AI talking points endpoint (`/api/ai/generate-talking-points`)
- [ ] Build AI objection handler endpoint
- [ ] Test generation flow end-to-end

### Phase 3: More Templates (Week 3)
- [ ] Add `project-timeline` template
- [ ] Add `storm-deployment` template  
- [ ] Add `insurance-prep` template
- [ ] Add `team-performance` template
- [ ] Add `market-analysis` template

### Phase 4: Export & Polish (Week 4)
- [ ] Implement PDF export with `@react-pdf/renderer`
- [ ] Implement PPTX export with `pptxgenjs`
- [ ] Build proper slide preview renderers
- [ ] Add shareable link generation
- [ ] Mobile optimization

### Phase 5: Integration (Week 5)
- [ ] Add to AI Assistant commands
- [ ] Add to Manager Dashboard
- [ ] Add deck history/library
- [ ] Analytics tracking
- [ ] Performance optimization

---

## 🛠️ Dependencies to Install

```bash
npm install uuid @react-pdf/renderer pptxgenjs
npm install -D @types/uuid
```

---

## 💡 Tips for Claude Code

1. **Start with types** - Build `deck.types.ts` first as it defines the contract for everything else

2. **Stub data functions** - The `dataAggregator.ts` functions can return mock data initially; replace with real API calls later

3. **Test incrementally** - Get one template working end-to-end before adding more

4. **Use existing patterns** - Match the existing Guardian Intel codebase style for components, hooks, and API routes

5. **AI endpoints can wait** - The AI-enhanced sections can return placeholder content initially; implement actual AI generation after the core flow works

---

*Document generated for Guardian Intel development - January 2026*
