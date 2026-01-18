import type { DeckTemplate } from '../types/deck.types';
import { guardianBrandConfig } from '../utils/brandingConfig';

export const dailyBriefingTemplate: DeckTemplate = {
  id: 'daily-briefing',
  name: 'Daily Sales Briefing',
  description: 'Personalized morning briefing for sales reps. Includes priority customers, weather forecast, deals at risk, and AI-generated talking points.',
  icon: 'Sunrise',
  audience: 'rep',
  estimatedSlides: 6,
  estimatedGenerationTime: 10,
  requiredContext: [
    { 
      type: 'team', 
      required: false,
      label: 'Sales Rep',
      placeholder: 'Current user (default)'
    },
    {
      type: 'date-range',
      required: false,
      label: 'Date',
      placeholder: 'Today'
    }
  ],
  sections: [
    {
      id: 'title',
      title: 'Morning Briefing',
      type: 'title',
      dataSource: 'getDailyBriefingTitleData',
      optional: false,
      aiEnhanced: false,
      defaultEnabled: true,
      description: 'Personalized greeting and date'
    },
    {
      id: 'daily-stats',
      title: 'Your Day At-A-Glance',
      type: 'stats',
      dataSource: 'getDailyStats',
      optional: false,
      aiEnhanced: false,
      defaultEnabled: true,
      description: 'Scheduled calls, pending follow-ups, deals in pipeline'
    },
    {
      id: 'weather-outlook',
      title: 'Weather & Storm Activity',
      type: 'chart',
      dataSource: 'getDailyWeatherForecast',
      optional: false,
      aiEnhanced: false,
      defaultEnabled: true,
      description: '7-day forecast with storm opportunity alerts'
    },
    {
      id: 'priority-customers',
      title: 'Priority Customers Today',
      type: 'list',
      dataSource: 'getPriorityCustomersToday',
      optional: false,
      aiEnhanced: true,
      defaultEnabled: true,
      description: 'AI-ranked customers requiring immediate attention'
    },
    {
      id: 'at-risk-deals',
      title: 'Deals At Risk',
      type: 'list',
      dataSource: 'getAtRiskDeals',
      optional: true,
      aiEnhanced: true,
      defaultEnabled: true,
      description: 'Deals that may be stalling or at risk of loss'
    },
    {
      id: 'scheduled-calls',
      title: 'Scheduled Calls & Meetings',
      type: 'timeline',
      dataSource: 'getScheduledCallsTimeline',
      optional: false,
      aiEnhanced: false,
      defaultEnabled: true,
      description: 'Today\'s appointments and call schedule'
    },
    {
      id: 'daily-talking-points',
      title: 'AI Talking Points',
      type: 'talking-points',
      dataSource: 'generateDailyTalkingPoints',
      optional: true,
      aiEnhanced: true,
      defaultEnabled: true,
      description: 'AI-generated talking points for scheduled calls'
    }
  ],
  branding: guardianBrandConfig,
  tags: ['daily', 'sales', 'morning-prep', 'productivity'],
  category: 'sales'
};
