import type { DeckTemplate } from '../types/deck.types';
import { customerCheatSheetTemplate } from './customer-cheat-sheet';
import { projectTimelineTemplate, projectTimelineCustomerTemplate } from './project-timeline';
import { stormDeploymentTemplate } from './storm-deployment';
import { insurancePrepTemplate } from './insurance-prep';
import { teamPerformanceTemplate } from './team-performance';
import { marketAnalysisTemplate } from './market-analysis';

// All available templates
export const deckTemplates: DeckTemplate[] = [
  customerCheatSheetTemplate,
  projectTimelineTemplate,
  projectTimelineCustomerTemplate,
  stormDeploymentTemplate,
  insurancePrepTemplate,
  teamPerformanceTemplate,
  marketAnalysisTemplate,
];

// Export individual templates
export {
  customerCheatSheetTemplate,
  projectTimelineTemplate,
  projectTimelineCustomerTemplate,
  stormDeploymentTemplate,
  insurancePrepTemplate,
  teamPerformanceTemplate,
  marketAnalysisTemplate,
};

// Helper functions
export function getTemplateById(id: string): DeckTemplate | undefined {
  return deckTemplates.find(t => t.id === id);
}

export function getTemplatesByAudience(audience: string): DeckTemplate[] {
  return deckTemplates.filter(t => t.audience === audience);
}

export function getTemplatesByCategory(category: string): DeckTemplate[] {
  return deckTemplates.filter(t => t.category === category);
}

export function getTemplatesByTag(tag: string): DeckTemplate[] {
  return deckTemplates.filter(t => t.tags.includes(tag));
}

// Template categories for UI grouping
export const templateCategories = [
  { id: 'sales', name: 'Sales & Field', icon: 'Target' },
  { id: 'operations', name: 'Operations', icon: 'Settings' },
  { id: 'leadership', name: 'Leadership', icon: 'Crown' },
  { id: 'customer-facing', name: 'Customer-Facing', icon: 'Users' },
] as const;
