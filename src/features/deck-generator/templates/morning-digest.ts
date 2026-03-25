/**
 * Morning Briefing Digest Template
 *
 * Single consolidated deck covering the rep's day: 5-8 slides, one per
 * priority customer, with key talking point, risk signal, and recommended
 * action. Unlike the daily-briefing (day-planner with calls/weather),
 * this is a per-customer intelligence digest.
 *
 * This is a rep-scoped template — it does not require a customerId.
 * Instead it fetches the rep's top priority customers automatically.
 */

import type { DeckTemplate } from '../types/deck.types';
import { guardianBrandConfig } from '../utils/brandingConfig';

export const morningDigestTemplate: DeckTemplate = {
  id: 'morning-digest',
  name: 'Morning Briefing Digest',
  description: 'Consolidated per-customer intelligence deck — one slide per priority customer with everything you need: talking point, risk signal, and recommended action.',
  icon: 'Coffee',
  audience: 'rep',
  estimatedSlides: 7,
  estimatedGenerationTime: 12,
  requiredContext: [
    {
      type: 'team',
      required: false,
      label: 'Sales Rep',
      placeholder: 'Current user (default)',
    },
  ],
  sections: [
    {
      id: 'title',
      title: 'Morning Digest',
      type: 'title',
      dataSource: 'getDigestTitleData',
      optional: false,
      aiEnhanced: false,
      defaultEnabled: true,
      description: 'Personalized greeting, date, and headline stat',
    },
    {
      id: 'overview-stats',
      title: "Today's Numbers",
      type: 'stats',
      dataSource: 'getDigestOverviewStats',
      optional: false,
      aiEnhanced: false,
      defaultEnabled: true,
      description: 'Pipeline value, customers needing action, new intel since yesterday',
    },
    {
      id: 'customer-1',
      title: 'Priority Customer #1',
      type: 'list',
      dataSource: 'getCustomerBriefingSlide',
      optional: false,
      aiEnhanced: true,
      defaultEnabled: true,
      description: 'Deep-dive: recent interactions, intel, next action, key scores',
    },
    {
      id: 'customer-2',
      title: 'Priority Customer #2',
      type: 'list',
      dataSource: 'getCustomerBriefingSlide',
      optional: false,
      aiEnhanced: true,
      defaultEnabled: true,
      description: 'Deep-dive: recent interactions, intel, next action, key scores',
    },
    {
      id: 'customer-3',
      title: 'Priority Customer #3',
      type: 'list',
      dataSource: 'getCustomerBriefingSlide',
      optional: false,
      aiEnhanced: true,
      defaultEnabled: true,
      description: 'Deep-dive: recent interactions, intel, next action, key scores',
    },
    {
      id: 'quick-hits',
      title: 'Quick Hits',
      type: 'list',
      dataSource: 'getQuickHitsDigest',
      optional: true,
      aiEnhanced: false,
      defaultEnabled: true,
      description: 'Remaining priority customers as one-liners — name, signal, action',
    },
    {
      id: 'daily-playbook',
      title: "Today's Playbook",
      type: 'talking-points',
      dataSource: 'generateDigestPlaybook',
      optional: true,
      aiEnhanced: true,
      defaultEnabled: true,
      description: 'AI-generated day strategy: what to focus on and why',
    },
  ],
  branding: guardianBrandConfig,
  tags: ['daily', 'morning', 'digest', 'per-customer', 'productivity'],
  category: 'sales',
};
