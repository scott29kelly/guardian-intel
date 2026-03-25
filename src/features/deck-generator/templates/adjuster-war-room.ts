/**
 * Adjuster Meeting War Room Template
 *
 * Data-heavy prep deck for insurance adjuster meetings. Unlike the
 * simpler insurance-prep template (checklist + basic carrier intel),
 * the War Room provides carrier approval rates by zip code, comparable
 * approved properties, supplement success rates, and AI-generated
 * negotiation ammunition backed by historical data.
 */

import type { DeckTemplate } from '../types/deck.types';
import { guardianBrandConfig } from '../utils/brandingConfig';

export const adjusterWarRoomTemplate: DeckTemplate = {
  id: 'adjuster-war-room',
  name: 'Adjuster Meeting War Room',
  description: 'Data-heavy prep for adjuster meetings: carrier approval rates by zip, comparable approved properties, supplement strategy, and AI-generated negotiation points.',
  icon: 'Crosshair',
  audience: 'rep',
  estimatedSlides: 7,
  estimatedGenerationTime: 15,
  requiredContext: [
    {
      type: 'customer',
      required: true,
      label: 'Customer / Active Claim',
      placeholder: 'Select customer with active claim...',
    },
  ],
  sections: [
    {
      id: 'title',
      title: 'Adjuster War Room',
      type: 'title',
      dataSource: 'getWarRoomTitleData',
      optional: false,
      aiEnhanced: false,
      defaultEnabled: true,
      description: 'Customer name, carrier, claim number, and adjuster name',
    },
    {
      id: 'carrier-approval',
      title: 'Carrier Approval Landscape',
      type: 'stats',
      dataSource: 'getCarrierApprovalStats',
      optional: false,
      aiEnhanced: false,
      defaultEnabled: true,
      description: 'This carrier\'s approval rate in this zip, avg approved value, supplement success rate',
    },
    {
      id: 'comparable-approvals',
      title: 'Comparable Approved Properties',
      type: 'list',
      dataSource: 'getComparableApprovals',
      optional: false,
      aiEnhanced: false,
      defaultEnabled: true,
      description: 'Nearby properties with same carrier that were approved — with values and roof specs',
    },
    {
      id: 'claim-comparison',
      title: 'Your Claim vs Carrier Averages',
      type: 'comparison',
      dataSource: 'getClaimVsAverageComparison',
      optional: false,
      aiEnhanced: false,
      defaultEnabled: true,
      description: 'Side-by-side of this claim specs vs carrier typical approval thresholds',
    },
    {
      id: 'negotiation-points',
      title: 'Negotiation Ammunition',
      type: 'talking-points',
      dataSource: 'generateAdjusterNegotiationPoints',
      optional: false,
      aiEnhanced: true,
      defaultEnabled: true,
      description: 'AI-generated negotiation points using comparable data and carrier patterns',
    },
    {
      id: 'supplement-strategy',
      title: 'Supplement Strategy',
      type: 'list',
      dataSource: 'getSupplementStrategy',
      optional: true,
      aiEnhanced: true,
      defaultEnabled: true,
      description: 'Common supplement items for this carrier, success rates, and documentation requirements',
    },
    {
      id: 'pre-meeting-checklist',
      title: 'Pre-Meeting Checklist',
      type: 'list',
      dataSource: 'getWarRoomChecklist',
      optional: true,
      aiEnhanced: false,
      defaultEnabled: true,
      description: 'Required documents, photos, and preparations for the adjuster meeting',
    },
  ],
  branding: guardianBrandConfig,
  tags: ['insurance', 'adjuster', 'negotiation', 'claims'],
  category: 'sales',
};
