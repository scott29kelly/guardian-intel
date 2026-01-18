import type { DeckTemplate } from '../types/deck.types';
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
