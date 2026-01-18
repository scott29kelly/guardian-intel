import type { DeckTemplate } from '../types/deck.types';
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
