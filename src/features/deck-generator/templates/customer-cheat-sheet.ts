import type { DeckTemplate } from '../types/deck.types';
import { guardianBrandConfig } from '../utils/brandingConfig';

export const customerCheatSheetTemplate: DeckTemplate = {
  id: 'customer-cheat-sheet',
  name: 'Customer Interaction Prep',
  description: 'Bespoke talking points and intel for customer meetings. Includes property data, storm history, and AI-generated conversation starters.',
  icon: 'UserCircle',
  audience: 'rep',
  estimatedSlides: 5,
  estimatedGenerationTime: 8,
  requiredContext: [
    { 
      type: 'customer', 
      required: true,
      label: 'Customer',
      placeholder: 'Select a customer...'
    }
  ],
  sections: [
    {
      id: 'title',
      title: 'Cover Slide',
      type: 'title',
      dataSource: 'getCustomerTitleData',
      optional: true,
      aiEnhanced: false,
      defaultEnabled: true,
      description: 'Customer name, address, and prep date'
    },
    {
      id: 'customer-overview',
      title: 'Customer At-A-Glance',
      type: 'stats',
      dataSource: 'getCustomerOverviewStats',
      optional: true,
      aiEnhanced: false,
      defaultEnabled: true,
      description: 'Lead score, property value, roof age, storm exposure'
    },
    {
      id: 'property-intel',
      title: 'Property Intelligence',
      type: 'image',
      dataSource: 'getPropertyIntelData',
      optional: true,
      aiEnhanced: false,
      defaultEnabled: true,
      description: 'Street view image with property details'
    },
    {
      id: 'storm-history',
      title: 'Storm Exposure History',
      type: 'timeline',
      dataSource: 'getStormHistoryTimeline',
      optional: true,
      aiEnhanced: false,
      defaultEnabled: true,
      description: 'Recent storms affecting this property'
    },
    {
      id: 'talking-points',
      title: 'Recommended Talking Points',
      type: 'talking-points',
      dataSource: 'generateCustomerTalkingPoints',
      optional: true,
      aiEnhanced: true,
      defaultEnabled: true,
      description: 'AI-generated conversation starters and value props'
    },
    {
      id: 'objection-handlers',
      title: 'Objection Handlers',
      type: 'list',
      dataSource: 'generateObjectionHandlers',
      optional: true,
      aiEnhanced: true,
      defaultEnabled: true,
      description: 'Common objections with proven responses'
    },
    {
      id: 'next-steps',
      title: 'Recommended Next Steps',
      type: 'list',
      dataSource: 'getRecommendedNextSteps',
      optional: true,
      aiEnhanced: true,
      defaultEnabled: false,
      description: 'AI-suggested actions based on customer status'
    }
  ],
  branding: guardianBrandConfig,
  tags: ['sales', 'customer-prep', 'field-work'],
  category: 'sales'
};
