/**
 * Branding Configuration Tests
 *
 * Tests for the deck generator branding configuration utilities.
 */

import { describe, it, expect } from 'vitest';
import {
  guardianBrandConfig,
  guardianLightBrandConfig,
  getBrandingForAudience,
} from '@/features/deck-generator/utils/brandingConfig';
import type { DeckAudience } from '@/features/deck-generator/types/deck.types';

describe('guardianBrandConfig', () => {
  it('should have the correct primary colors', () => {
    expect(guardianBrandConfig.colors.primary).toBe('#1E3A5F');
    expect(guardianBrandConfig.colors.secondary).toBe('#D4A656');
    expect(guardianBrandConfig.colors.accent).toBe('#4A90A4');
  });

  it('should have dark theme background colors', () => {
    expect(guardianBrandConfig.colors.background).toBe('#0F1419');
    expect(guardianBrandConfig.colors.backgroundAlt).toBe('#1A2332');
  });

  it('should have white text for dark theme', () => {
    expect(guardianBrandConfig.colors.text).toBe('#FFFFFF');
  });

  it('should have status colors defined', () => {
    expect(guardianBrandConfig.colors.success).toBe('#10B981');
    expect(guardianBrandConfig.colors.warning).toBe('#F59E0B');
    expect(guardianBrandConfig.colors.danger).toBe('#EF4444');
  });

  it('should have font families defined', () => {
    expect(guardianBrandConfig.fonts.heading).toContain('Inter');
    expect(guardianBrandConfig.fonts.body).toContain('Inter');
    expect(guardianBrandConfig.fonts.mono).toContain('JetBrains Mono');
  });

  it('should have logo paths configured', () => {
    expect(guardianBrandConfig.logo).toBe('/guardian-logo.svg');
    expect(guardianBrandConfig.logoAlt).toBe('/guardian-logo-light.svg');
  });

  it('should have footer text', () => {
    expect(guardianBrandConfig.footer).toBe('Guardian Storm Repair | Confidential');
  });

  it('should have border radius defined', () => {
    expect(guardianBrandConfig.borderRadius).toBe('8px');
  });
});

describe('guardianLightBrandConfig', () => {
  it('should inherit primary brand colors from dark theme', () => {
    expect(guardianLightBrandConfig.colors.primary).toBe('#1E3A5F');
    expect(guardianLightBrandConfig.colors.secondary).toBe('#D4A656');
    expect(guardianLightBrandConfig.colors.accent).toBe('#4A90A4');
  });

  it('should have light theme background colors', () => {
    expect(guardianLightBrandConfig.colors.background).toBe('#FFFFFF');
    expect(guardianLightBrandConfig.colors.backgroundAlt).toBe('#F8FAFC');
  });

  it('should have dark text for light theme', () => {
    expect(guardianLightBrandConfig.colors.text).toBe('#1E3A5F');
    expect(guardianLightBrandConfig.colors.textMuted).toBe('#64748B');
  });

  it('should inherit fonts from dark theme', () => {
    expect(guardianLightBrandConfig.fonts).toEqual(guardianBrandConfig.fonts);
  });

  it('should inherit logo and footer from dark theme', () => {
    expect(guardianLightBrandConfig.logo).toBe(guardianBrandConfig.logo);
    expect(guardianLightBrandConfig.footer).toBe(guardianBrandConfig.footer);
  });
});

describe('getBrandingForAudience', () => {
  it('should return light theme for customer audience', () => {
    const branding = getBrandingForAudience('customer');
    expect(branding).toBe(guardianLightBrandConfig);
    expect(branding.colors.background).toBe('#FFFFFF');
  });

  it('should return dark theme for rep audience', () => {
    const branding = getBrandingForAudience('rep');
    expect(branding).toBe(guardianBrandConfig);
    expect(branding.colors.background).toBe('#0F1419');
  });

  it('should return dark theme for manager audience', () => {
    const branding = getBrandingForAudience('manager');
    expect(branding).toBe(guardianBrandConfig);
  });

  it('should return dark theme for leadership audience', () => {
    const branding = getBrandingForAudience('leadership');
    expect(branding).toBe(guardianBrandConfig);
  });

  it('should handle all DeckAudience types', () => {
    const audiences: DeckAudience[] = ['rep', 'manager', 'leadership', 'customer'];

    audiences.forEach((audience) => {
      const branding = getBrandingForAudience(audience);
      expect(branding).toBeDefined();
      expect(branding.colors).toBeDefined();
      expect(branding.fonts).toBeDefined();
    });
  });
});
