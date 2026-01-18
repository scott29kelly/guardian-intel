import type { DeckTemplate } from '../types/deck.types';
import { guardianBrandConfig } from '../utils/brandingConfig';

export const weeklyPipelineTemplate: DeckTemplate = {
  id: 'weekly-pipeline',
  name: 'Weekly Pipeline Review',
  description: 'Manager\'s comprehensive weekly pipeline review. Includes deals by stage, at-risk opportunities, forecasting, and AI-generated coaching recommendations.',
  icon: 'Kanban',
  audience: 'manager',
  estimatedSlides: 7,
  estimatedGenerationTime: 12,
  requiredContext: [
    { 
      type: 'team', 
      required: false,
      label: 'Team/Rep',
      placeholder: 'All team members (default)'
    },
    {
      type: 'date-range',
      required: false,
      label: 'Review Period',
      placeholder: 'This week'
    }
  ],
  sections: [
    {
      id: 'title',
      title: 'Pipeline Review',
      type: 'title',
      dataSource: 'getWeeklyPipelineTitleData',
      optional: false,
      aiEnhanced: false,
      defaultEnabled: true,
      description: 'Week of and team scope'
    },
    {
      id: 'pipeline-summary',
      title: 'Pipeline Summary',
      type: 'stats',
      dataSource: 'getPipelineSummaryStats',
      optional: false,
      aiEnhanced: false,
      defaultEnabled: true,
      description: 'Total value, deal count, win probability, forecast'
    },
    {
      id: 'deals-by-stage',
      title: 'Deals by Stage',
      type: 'chart',
      dataSource: 'getDealsByStageChart',
      optional: false,
      aiEnhanced: false,
      defaultEnabled: true,
      description: 'Visual pipeline breakdown by stage'
    },
    {
      id: 'stage-movements',
      title: 'Week-over-Week Movement',
      type: 'stats',
      dataSource: 'getStageMovementStats',
      optional: true,
      aiEnhanced: false,
      defaultEnabled: true,
      description: 'Deals advanced, stalled, and closed this week'
    },
    {
      id: 'at-risk-opportunities',
      title: 'At-Risk Opportunities',
      type: 'list',
      dataSource: 'getAtRiskOpportunities',
      optional: false,
      aiEnhanced: true,
      defaultEnabled: true,
      description: 'AI-identified deals requiring intervention'
    },
    {
      id: 'hot-deals',
      title: 'Hot Deals to Close',
      type: 'list',
      dataSource: 'getHotDealsToClose',
      optional: false,
      aiEnhanced: true,
      defaultEnabled: true,
      description: 'High-probability deals ready to close'
    },
    {
      id: 'forecast',
      title: 'Revenue Forecast',
      type: 'chart',
      dataSource: 'getRevenueForecastChart',
      optional: true,
      aiEnhanced: true,
      defaultEnabled: true,
      description: 'Projected revenue based on pipeline health'
    },
    {
      id: 'coaching-recommendations',
      title: 'Coaching Recommendations',
      type: 'talking-points',
      dataSource: 'generatePipelineCoachingPoints',
      optional: true,
      aiEnhanced: true,
      defaultEnabled: true,
      description: 'AI-generated coaching points for each rep'
    }
  ],
  branding: guardianBrandConfig,
  tags: ['pipeline', 'forecasting', 'management', 'weekly'],
  category: 'operations'
};
