import type { DeckTemplate } from '../types/deck.types';
import { guardianBrandConfig } from '../utils/brandingConfig';

export const stormPostmortemTemplate: DeckTemplate = {
  id: 'storm-postmortem',
  name: 'Storm Response Post-Mortem',
  description: 'After-action report for completed storm response campaigns. Includes leads generated, deals closed, lessons learned, and performance comparison to previous storms.',
  icon: 'ClipboardCheck',
  audience: 'leadership',
  estimatedSlides: 8,
  estimatedGenerationTime: 15,
  requiredContext: [
    { 
      type: 'region', 
      required: true,
      label: 'Storm Region',
      placeholder: 'Select the storm-affected region...'
    },
    {
      type: 'date-range',
      required: true,
      label: 'Storm Event Period',
      placeholder: 'Select storm date range...'
    }
  ],
  sections: [
    {
      id: 'title',
      title: 'Storm Post-Mortem',
      type: 'title',
      dataSource: 'getStormPostmortemTitleData',
      optional: false,
      aiEnhanced: false,
      defaultEnabled: true,
      description: 'Storm event name, region, and date range'
    },
    {
      id: 'response-summary',
      title: 'Response Summary',
      type: 'stats',
      dataSource: 'getStormResponseSummaryStats',
      optional: false,
      aiEnhanced: false,
      defaultEnabled: true,
      description: 'Total leads, inspections, deals closed, revenue'
    },
    {
      id: 'performance-chart',
      title: 'Performance Over Time',
      type: 'chart',
      dataSource: 'getStormPerformanceChart',
      optional: false,
      aiEnhanced: false,
      defaultEnabled: true,
      description: 'Daily/weekly performance during storm response'
    },
    {
      id: 'conversion-funnel',
      title: 'Conversion Funnel',
      type: 'chart',
      dataSource: 'getStormConversionFunnel',
      optional: false,
      aiEnhanced: false,
      defaultEnabled: true,
      description: 'Lead to close conversion breakdown'
    },
    {
      id: 'rep-performance',
      title: 'Rep Performance Breakdown',
      type: 'list',
      dataSource: 'getStormRepPerformance',
      optional: true,
      aiEnhanced: false,
      defaultEnabled: true,
      description: 'Individual rep performance during storm response'
    },
    {
      id: 'historical-comparison',
      title: 'Historical Storm Comparison',
      type: 'comparison',
      dataSource: 'getHistoricalStormComparison',
      optional: false,
      aiEnhanced: false,
      defaultEnabled: true,
      description: 'Performance vs previous storm events'
    },
    {
      id: 'lessons-learned',
      title: 'Lessons Learned',
      type: 'list',
      dataSource: 'getStormLessonsLearned',
      optional: false,
      aiEnhanced: true,
      defaultEnabled: true,
      description: 'AI-identified successes and areas for improvement'
    },
    {
      id: 'recommendations',
      title: 'Strategic Recommendations',
      type: 'talking-points',
      dataSource: 'generateStormPostmortemRecommendations',
      optional: true,
      aiEnhanced: true,
      defaultEnabled: true,
      description: 'AI-generated improvements for future storm responses'
    }
  ],
  branding: guardianBrandConfig,
  tags: ['storm-response', 'post-mortem', 'analytics', 'leadership'],
  category: 'leadership'
};
