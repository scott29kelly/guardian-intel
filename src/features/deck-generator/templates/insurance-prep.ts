import type { DeckTemplate } from '../types/deck.types';
import { guardianBrandConfig } from '../utils/brandingConfig';

export const insurancePrepTemplate: DeckTemplate = {
  id: 'insurance-prep',
  name: 'Insurance Adjuster Prep Pack',
  description: 'Comprehensive preparation for insurance adjuster meetings. Includes documentation checklist, carrier intel, and negotiation points.',
  icon: 'FileCheck',
  audience: 'rep',
  estimatedSlides: 5,
  estimatedGenerationTime: 10,
  requiredContext: [
    { 
      type: 'customer', 
      required: true,
      label: 'Customer/Claim',
      placeholder: 'Select customer with active claim...'
    }
  ],
  sections: [
    {
      id: 'title',
      title: 'Adjuster Meeting Prep',
      type: 'title',
      dataSource: 'getInsurancePrepTitleData',
      optional: false,
      aiEnhanced: false,
      defaultEnabled: true,
      description: 'Customer, carrier, and meeting details'
    },
    {
      id: 'claim-overview',
      title: 'Claim Overview',
      type: 'stats',
      dataSource: 'getClaimOverviewStats',
      optional: false,
      aiEnhanced: false,
      defaultEnabled: true,
      description: 'Claim number, filed date, estimated value'
    },
    {
      id: 'damage-documentation',
      title: 'Documented Damage',
      type: 'list',
      dataSource: 'getDamageDocumentation',
      optional: false,
      aiEnhanced: false,
      defaultEnabled: true,
      description: 'Itemized damage with photo references'
    },
    {
      id: 'carrier-intel',
      title: 'Carrier Intelligence',
      type: 'stats',
      dataSource: 'getCarrierIntel',
      optional: true,
      aiEnhanced: true,
      defaultEnabled: true,
      description: 'Approval rates, common issues, adjuster patterns'
    },
    {
      id: 'negotiation-points',
      title: 'Key Negotiation Points',
      type: 'talking-points',
      dataSource: 'generateNegotiationPoints',
      optional: false,
      aiEnhanced: true,
      defaultEnabled: true,
      description: 'AI-generated points to maximize claim approval'
    },
    {
      id: 'documentation-checklist',
      title: 'Pre-Meeting Checklist',
      type: 'list',
      dataSource: 'getDocumentationChecklist',
      optional: true,
      aiEnhanced: false,
      defaultEnabled: true,
      description: 'Required documents and preparations'
    }
  ],
  branding: guardianBrandConfig,
  tags: ['insurance', 'claims', 'adjuster'],
  category: 'sales'
};
