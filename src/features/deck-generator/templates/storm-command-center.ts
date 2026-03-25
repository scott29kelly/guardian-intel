/**
 * Storm Response Command Center Template
 *
 * Rep-facing battle plan for post-storm canvassing. Includes property
 * vulnerability scoring, insurance filing deadlines, prioritized knock
 * list with door scripts, and route mapping.
 *
 * Differs from storm-deployment (manager-facing team coordination) by
 * focusing on what the individual rep needs at the door.
 */

import type { DeckTemplate } from '../types/deck.types';
import { guardianBrandConfig } from '../utils/brandingConfig';

export const stormCommandCenterTemplate: DeckTemplate = {
  id: 'storm-command-center',
  name: 'Storm Response Command Center',
  description: 'Per-territory battle plan: storm timeline, property vulnerability scoring, insurance filing deadlines, and a prioritized knock list with door scripts.',
  icon: 'Zap',
  audience: 'rep',
  estimatedSlides: 7,
  estimatedGenerationTime: 15,
  requiredContext: [
    {
      type: 'region',
      required: true,
      label: 'Storm-Affected Territory',
      placeholder: 'Select your territory...',
    },
    {
      type: 'date-range',
      required: false,
      label: 'Storm Date Range',
      placeholder: 'Last 7 days',
    },
  ],
  sections: [
    {
      id: 'title',
      title: 'Storm Command Center',
      type: 'title',
      dataSource: 'getStormCommandTitleData',
      optional: false,
      aiEnhanced: false,
      defaultEnabled: true,
      description: 'Storm event summary, territory, and rep assignment',
    },
    {
      id: 'vulnerability-scorecard',
      title: 'Storm Damage Scorecard',
      type: 'stats',
      dataSource: 'getStormVulnerabilityStats',
      optional: false,
      aiEnhanced: false,
      defaultEnabled: true,
      description: 'Properties affected, avg roof age in zone, severity, total opportunity $',
    },
    {
      id: 'knock-list',
      title: 'Prioritized Knock List',
      type: 'list',
      dataSource: 'getPrioritizedKnockList',
      optional: false,
      aiEnhanced: true,
      defaultEnabled: true,
      description: 'Top 15 customers ranked by vulnerability × profit potential, with address and one-line hook',
    },
    {
      id: 'insurance-deadlines',
      title: 'Insurance Filing Deadlines',
      type: 'stats',
      dataSource: 'getInsuranceDeadlineStats',
      optional: false,
      aiEnhanced: false,
      defaultEnabled: true,
      description: 'Filing windows by carrier, days remaining, urgency flags',
    },
    {
      id: 'route-map',
      title: 'Your Route Today',
      type: 'map',
      dataSource: 'getStormCanvassRouteMap',
      optional: true,
      aiEnhanced: false,
      defaultEnabled: true,
      description: 'Knock list addresses color-coded by priority on a map',
    },
    {
      id: 'door-scripts',
      title: 'Door Scripts',
      type: 'talking-points',
      dataSource: 'generateStormDoorScripts',
      optional: false,
      aiEnhanced: true,
      defaultEnabled: true,
      description: 'AI-generated scripts customized to storm type, property age, and insurance carrier',
    },
    {
      id: 'photo-checklist',
      title: 'What To Photograph',
      type: 'list',
      dataSource: 'getStormPhotoChecklist',
      optional: true,
      aiEnhanced: false,
      defaultEnabled: true,
      description: 'Damage documentation checklist specific to this storm type',
    },
  ],
  branding: guardianBrandConfig,
  tags: ['storm-response', 'field-work', 'canvassing', 'urgent'],
  category: 'sales',
};
