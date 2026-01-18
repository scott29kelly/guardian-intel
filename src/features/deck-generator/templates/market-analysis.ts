import type { DeckTemplate } from '../types/deck.types';
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
