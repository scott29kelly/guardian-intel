import type { DeckTemplate } from '../types/deck.types';
import { guardianLightBrandConfig } from '../utils/brandingConfig';

export const customerProposalTemplate: DeckTemplate = {
  id: 'customer-proposal',
  name: 'Customer Proposal',
  description: 'Professional customer-facing proposal deck with property assessment, scope of work, pricing options, and company credentials.',
  icon: 'FileSignature',
  audience: 'customer',
  estimatedSlides: 8,
  estimatedGenerationTime: 12,
  requiredContext: [
    { 
      type: 'customer', 
      required: true,
      label: 'Customer',
      placeholder: 'Select a customer...'
    },
    {
      type: 'project',
      required: false,
      label: 'Project/Estimate',
      placeholder: 'Latest estimate (default)'
    }
  ],
  sections: [
    {
      id: 'title',
      title: 'Proposal Cover',
      type: 'title',
      dataSource: 'getProposalTitleData',
      optional: false,
      aiEnhanced: false,
      defaultEnabled: true,
      description: 'Customer name, property address, date'
    },
    {
      id: 'company-intro',
      title: 'About Guardian Storm Repair',
      type: 'stats',
      dataSource: 'getCompanyCredentialsStats',
      optional: false,
      aiEnhanced: false,
      defaultEnabled: true,
      description: 'Years in business, projects completed, certifications'
    },
    {
      id: 'property-assessment',
      title: 'Property Assessment',
      type: 'image',
      dataSource: 'getPropertyAssessmentData',
      optional: false,
      aiEnhanced: false,
      defaultEnabled: true,
      description: 'Property photos and damage assessment summary'
    },
    {
      id: 'scope-of-work',
      title: 'Scope of Work',
      type: 'list',
      dataSource: 'getScopeOfWorkData',
      optional: false,
      aiEnhanced: false,
      defaultEnabled: true,
      description: 'Detailed work items and materials'
    },
    {
      id: 'pricing-options',
      title: 'Investment Options',
      type: 'comparison',
      dataSource: 'getPricingOptionsData',
      optional: false,
      aiEnhanced: false,
      defaultEnabled: true,
      description: 'Good/Better/Best pricing tiers'
    },
    {
      id: 'financing',
      title: 'Financing Options',
      type: 'stats',
      dataSource: 'getFinancingOptionsData',
      optional: true,
      aiEnhanced: false,
      defaultEnabled: true,
      description: 'Payment plans and financing terms'
    },
    {
      id: 'testimonials',
      title: 'Customer Success Stories',
      type: 'list',
      dataSource: 'getTestimonialsData',
      optional: true,
      aiEnhanced: false,
      defaultEnabled: true,
      description: 'Reviews and testimonials from satisfied customers'
    },
    {
      id: 'warranty',
      title: 'Our Guarantee',
      type: 'list',
      dataSource: 'getWarrantyData',
      optional: false,
      aiEnhanced: false,
      defaultEnabled: true,
      description: 'Warranty coverage and satisfaction guarantee'
    },
    {
      id: 'next-steps',
      title: 'Next Steps',
      type: 'timeline',
      dataSource: 'getProposalNextSteps',
      optional: false,
      aiEnhanced: false,
      defaultEnabled: true,
      description: 'Project timeline and how to proceed'
    }
  ],
  branding: guardianLightBrandConfig,
  tags: ['customer-facing', 'proposal', 'sales'],
  category: 'customer-facing'
};
