/**
 * Deck Generator Templates Tests
 *
 * Tests for deck templates structure and validation.
 */

import { describe, it, expect } from 'vitest';
import {
  stormDeploymentTemplate,
  getTemplateById,
  getTemplatesByCategory,
  getTemplatesByAudience,
  deckTemplates,
} from '@/features/deck-generator/templates';
import type { DeckTemplate, SlideSection } from '@/features/deck-generator/types/deck.types';

describe('stormDeploymentTemplate', () => {
  it('should have correct id and name', () => {
    expect(stormDeploymentTemplate.id).toBe('storm-deployment');
    expect(stormDeploymentTemplate.name).toBe('Storm Response Deployment Brief');
  });

  it('should target manager audience', () => {
    expect(stormDeploymentTemplate.audience).toBe('manager');
  });

  it('should be categorized as operations', () => {
    expect(stormDeploymentTemplate.category).toBe('operations');
  });

  it('should require region context', () => {
    const regionContext = stormDeploymentTemplate.requiredContext.find(
      (ctx) => ctx.type === 'region'
    );
    expect(regionContext).toBeDefined();
    expect(regionContext?.required).toBe(true);
  });

  it('should have optional date-range context', () => {
    const dateRangeContext = stormDeploymentTemplate.requiredContext.find(
      (ctx) => ctx.type === 'date-range'
    );
    expect(dateRangeContext).toBeDefined();
    expect(dateRangeContext?.required).toBe(false);
  });

  it('should have all required sections', () => {
    const sectionIds = stormDeploymentTemplate.sections.map((s) => s.id);
    expect(sectionIds).toContain('title');
    expect(sectionIds).toContain('storm-stats');
    expect(sectionIds).toContain('affected-map');
    expect(sectionIds).toContain('priority-leads');
    expect(sectionIds).toContain('team-assignments');
    expect(sectionIds).toContain('talking-points');
    expect(sectionIds).toContain('logistics');
  });

  describe('sections', () => {
    it('should have title section as required', () => {
      const titleSection = stormDeploymentTemplate.sections.find((s) => s.id === 'title');
      expect(titleSection).toBeDefined();
      expect(titleSection?.type).toBe('title');
      expect(titleSection?.optional).toBe(false);
      expect(titleSection?.aiEnhanced).toBe(false);
    });

    it('should have storm-stats section', () => {
      const statsSection = stormDeploymentTemplate.sections.find((s) => s.id === 'storm-stats');
      expect(statsSection).toBeDefined();
      expect(statsSection?.type).toBe('stats');
      expect(statsSection?.dataSource).toBe('getStormImpactStats');
    });

    it('should have affected-map section with map type', () => {
      const mapSection = stormDeploymentTemplate.sections.find((s) => s.id === 'affected-map');
      expect(mapSection).toBeDefined();
      expect(mapSection?.type).toBe('map');
      expect(mapSection?.optional).toBe(false);
    });

    it('should have AI-enhanced priority-leads section', () => {
      const leadsSection = stormDeploymentTemplate.sections.find((s) => s.id === 'priority-leads');
      expect(leadsSection).toBeDefined();
      expect(leadsSection?.type).toBe('list');
      expect(leadsSection?.aiEnhanced).toBe(true);
    });

    it('should have AI-enhanced team-assignments section', () => {
      const assignmentsSection = stormDeploymentTemplate.sections.find(
        (s) => s.id === 'team-assignments'
      );
      expect(assignmentsSection).toBeDefined();
      expect(assignmentsSection?.aiEnhanced).toBe(true);
      expect(assignmentsSection?.optional).toBe(true);
    });

    it('should have AI-enhanced talking-points section', () => {
      const talkingPointsSection = stormDeploymentTemplate.sections.find(
        (s) => s.id === 'talking-points'
      );
      expect(talkingPointsSection).toBeDefined();
      expect(talkingPointsSection?.type).toBe('talking-points');
      expect(talkingPointsSection?.aiEnhanced).toBe(true);
      expect(talkingPointsSection?.dataSource).toBe('generateStormTalkingPoints');
    });

    it('should have optional logistics section', () => {
      const logisticsSection = stormDeploymentTemplate.sections.find((s) => s.id === 'logistics');
      expect(logisticsSection).toBeDefined();
      expect(logisticsSection?.optional).toBe(true);
      expect(logisticsSection?.defaultEnabled).toBe(false);
    });
  });

  it('should have storm-related tags', () => {
    expect(stormDeploymentTemplate.tags).toContain('storm-response');
    expect(stormDeploymentTemplate.tags).toContain('deployment');
    expect(stormDeploymentTemplate.tags).toContain('urgent');
  });

  it('should have valid branding configuration', () => {
    const { branding } = stormDeploymentTemplate;
    expect(branding.colors.primary).toBeDefined();
    expect(branding.colors.secondary).toBeDefined();
    expect(branding.colors.background).toBeDefined();
    expect(branding.fonts.heading).toBeDefined();
    expect(branding.footer).toBeDefined();
  });

  it('should have reasonable estimates', () => {
    expect(stormDeploymentTemplate.estimatedSlides).toBeGreaterThan(0);
    expect(stormDeploymentTemplate.estimatedGenerationTime).toBeGreaterThan(0);
  });
});

describe('Template Registry Functions', () => {
  it('getTemplateById should find storm-deployment template', () => {
    const template = getTemplateById('storm-deployment');
    expect(template).toBeDefined();
    expect(template?.id).toBe('storm-deployment');
  });

  it('getTemplateById should return undefined for non-existent template', () => {
    const template = getTemplateById('non-existent');
    expect(template).toBeUndefined();
  });

  it('getTemplatesByCategory should return operations templates', () => {
    const operationsTemplates = getTemplatesByCategory('operations');
    expect(operationsTemplates.length).toBeGreaterThan(0);
    expect(operationsTemplates.some((t) => t.id === 'storm-deployment')).toBe(true);
  });

  it('getTemplatesByAudience should return manager templates', () => {
    const managerTemplates = getTemplatesByAudience('manager');
    expect(managerTemplates.length).toBeGreaterThan(0);
    expect(managerTemplates.some((t) => t.id === 'storm-deployment')).toBe(true);
  });

  it('deckTemplates should include storm-deployment', () => {
    expect(deckTemplates.some((t) => t.id === 'storm-deployment')).toBe(true);
  });
});

describe('Template Structure Validation', () => {
  it('all templates should have unique ids', () => {
    const ids = deckTemplates.map((t) => t.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it('all templates should have valid section structure', () => {
    deckTemplates.forEach((template) => {
      expect(template.sections.length).toBeGreaterThan(0);
      template.sections.forEach((section) => {
        expect(section.id).toBeDefined();
        expect(section.title).toBeDefined();
        expect(section.type).toBeDefined();
        expect(section.dataSource).toBeDefined();
        expect(typeof section.optional).toBe('boolean');
        expect(typeof section.aiEnhanced).toBe('boolean');
      });
    });
  });

  it('all templates should have at least one required section', () => {
    deckTemplates.forEach((template) => {
      const requiredSections = template.sections.filter((s) => !s.optional);
      expect(requiredSections.length).toBeGreaterThan(0);
    });
  });

  it('all templates should have valid branding', () => {
    deckTemplates.forEach((template) => {
      expect(template.branding).toBeDefined();
      expect(template.branding.colors).toBeDefined();
      expect(template.branding.fonts).toBeDefined();
    });
  });
});
