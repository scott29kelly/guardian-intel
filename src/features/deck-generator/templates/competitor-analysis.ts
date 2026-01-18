import type { DeckTemplate } from '../types/deck.types';
import { guardianBrandConfig } from '../utils/brandingConfig';

export const competitorAnalysisTemplate: DeckTemplate = {
  id: 'competitor-analysis',
  name: 'Competitive Intelligence Report',
  description: 'Comprehensive competitive landscape analysis for a specific region. Includes win/loss analysis, pricing intel, and AI-generated differentiation strategies.',
  icon: 'Swords',
  audience: 'manager',
  estimatedSlides: 7,
  estimatedGenerationTime: 15,
  requiredContext: [
    { 
      type: 'region', 
      required: true,
      label: 'Market Region',
      placeholder: 'Select a region...'
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
      title: 'Competitive Intelligence',
      type: 'title',
      dataSource: 'getCompetitorAnalysisTitleData',
      optional: false,
      aiEnhanced: false,
      defaultEnabled: true,
      description: 'Region and analysis period overview'
    },
    {
      id: 'market-position',
      title: 'Market Position Overview',
      type: 'stats',
      dataSource: 'getMarketPositionStats',
      optional: false,
      aiEnhanced: false,
      defaultEnabled: true,
      description: 'Market share, win rate, competitive density'
    },
    {
      id: 'competitor-map',
      title: 'Competitor Landscape',
      type: 'comparison',
      dataSource: 'getCompetitorLandscapeData',
      optional: false,
      aiEnhanced: false,
      defaultEnabled: true,
      description: 'Key competitors with strengths and weaknesses'
    },
    {
      id: 'win-loss-analysis',
      title: 'Win/Loss Analysis',
      type: 'chart',
      dataSource: 'getWinLossAnalysisData',
      optional: false,
      aiEnhanced: false,
      defaultEnabled: true,
      description: 'Win/loss breakdown by competitor and reason'
    },
    {
      id: 'pricing-intel',
      title: 'Pricing Intelligence',
      type: 'stats',
      dataSource: 'getPricingIntelData',
      optional: true,
      aiEnhanced: false,
      defaultEnabled: true,
      description: 'Competitive pricing trends and benchmarks'
    },
    {
      id: 'loss-reasons',
      title: 'Top Loss Reasons',
      type: 'list',
      dataSource: 'getTopLossReasons',
      optional: true,
      aiEnhanced: true,
      defaultEnabled: true,
      description: 'AI-analyzed reasons for lost deals'
    },
    {
      id: 'differentiation-strategy',
      title: 'Competitive Differentiation',
      type: 'talking-points',
      dataSource: 'generateDifferentiationStrategy',
      optional: false,
      aiEnhanced: true,
      defaultEnabled: true,
      description: 'AI-generated competitive positioning and battle cards'
    },
    {
      id: 'action-items',
      title: 'Recommended Actions',
      type: 'list',
      dataSource: 'getCompetitiveActionItems',
      optional: true,
      aiEnhanced: true,
      defaultEnabled: false,
      description: 'Strategic actions to improve competitive position'
    }
  ],
  branding: guardianBrandConfig,
  tags: ['competitive-intel', 'strategy', 'market-analysis'],
  category: 'leadership'
};
