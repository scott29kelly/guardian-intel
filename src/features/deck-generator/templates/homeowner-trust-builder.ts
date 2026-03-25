/**
 * Homeowner Trust Builder Template (Leave-Behind 2.0)
 *
 * Customer-facing infographic explaining their specific situation:
 * roof age, storm exposure, insurance process, and next steps.
 * Addresses the "am I getting scammed?" trust gap found across
 * r/Roofing and r/Insurance communities.
 *
 * Designed to be left behind after a first visit — builds credibility
 * with homeowner-friendly language and light branding.
 */

import type { DeckTemplate } from '../types/deck.types';
import { guardianLightBrandConfig } from '../utils/brandingConfig';

export const homeownerTrustBuilderTemplate: DeckTemplate = {
  id: 'homeowner-trust-builder',
  name: 'Homeowner Trust Builder',
  description: 'Customer-facing leave-behind explaining their specific situation — roof age, recent storms, insurance coverage, and a simple 3-step process. Builds trust and addresses homeowner concerns.',
  icon: 'ShieldCheck',
  audience: 'customer',
  estimatedSlides: 5,
  estimatedGenerationTime: 10,
  requiredContext: [
    {
      type: 'customer',
      required: true,
      label: 'Homeowner',
      placeholder: 'Select a customer...',
    },
  ],
  sections: [
    {
      id: 'title',
      title: 'Your Home, Our Priority',
      type: 'title',
      dataSource: 'getTrustBuilderTitleData',
      optional: false,
      aiEnhanced: false,
      defaultEnabled: true,
      description: 'Personalized greeting with customer name and property address',
    },
    {
      id: 'roof-story',
      title: "Your Roof's Story",
      type: 'stats',
      dataSource: 'getRoofStoryStats',
      optional: false,
      aiEnhanced: true,
      defaultEnabled: true,
      description: 'Roof age, condition, and recent storm exposure translated into homeowner-friendly language',
    },
    {
      id: 'assessment-findings',
      title: 'What We Found',
      type: 'list',
      dataSource: 'getInitialAssessmentFindings',
      optional: false,
      aiEnhanced: true,
      defaultEnabled: true,
      description: 'Initial observations from property intel and photos, written for homeowners (not contractors)',
    },
    {
      id: 'insurance-explainer',
      title: 'Insurance Made Simple',
      type: 'comparison',
      dataSource: 'getInsuranceProcessExplainer',
      optional: false,
      aiEnhanced: true,
      defaultEnabled: true,
      description: '"Without Help" vs "With Guardian" side-by-side of the insurance claim process',
    },
    {
      id: 'next-steps',
      title: 'What Happens Next',
      type: 'timeline',
      dataSource: 'getTrustBuilderNextSteps',
      optional: false,
      aiEnhanced: false,
      defaultEnabled: true,
      description: 'Simple 3-step process: inspection, claim filing, repair — with estimated timeline',
    },
  ],
  branding: guardianLightBrandConfig,
  tags: ['customer-facing', 'leave-behind', 'trust', 'first-visit'],
  category: 'customer-facing',
};
