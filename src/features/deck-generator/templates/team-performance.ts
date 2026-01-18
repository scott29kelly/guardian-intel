import type { DeckTemplate } from '../types/deck.types';
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
