import type { BrandingConfig } from '@/features/deck-generator/types/deck.types';
import type { InfographicAudience } from '../types/infographic.types';

// =============================================================================
// INFOGRAPHIC BRANDING CONFIGURATION
// =============================================================================

/**
 * Dark theme — used for internal/rep-facing infographics.
 * Navy + gold + teal brand palette on dark background.
 */
export const infographicBrandConfig: BrandingConfig = {
  colors: {
    primary: '#1E3A5F',      // Navy - primary brand color
    secondary: '#D4A656',    // Gold - accent/highlight
    accent: '#4A90A4',       // Teal - secondary accent
    background: '#0F1419',   // Dark background
    backgroundAlt: '#1A2332', // Slightly lighter background
    text: '#FFFFFF',         // Primary text
    textMuted: '#9CA3AF',    // Secondary text
    success: '#10B981',      // Green for positive
    warning: '#F59E0B',      // Amber for warnings
    danger: '#EF4444',       // Red for alerts
  },
  fonts: {
    heading: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    body: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    mono: "'JetBrains Mono', 'Fira Code', monospace",
  },
  logo: '/tradepulse-logo.svg',
  logoAlt: '/tradepulse-logo-light.svg',
  footer: 'Guardian Intel | Confidential — Internal Use Only',
  borderRadius: '8px',
};

/**
 * Light theme — used for customer-facing leave-behind infographics.
 * White background with navy text for professional handout appearance.
 */
export const infographicLightBrandConfig: BrandingConfig = {
  ...infographicBrandConfig,
  colors: {
    ...infographicBrandConfig.colors,
    background: '#FFFFFF',
    backgroundAlt: '#F8FAFC',
    text: '#1E3A5F',
    textMuted: '#64748B',
  },
  footer: 'Guardian Roofing & Siding | Protecting What Matters Most',
};

// =============================================================================
// BRAND REFERENCE IMAGES
// =============================================================================

/**
 * Base64 reference images for image generation prompts.
 * These are injected as reference images so the AI model
 * can match brand aesthetics (logo placement, watermark, etc.).
 */
export const brandReferenceImages = {
  /** Company logo — used for header placement in generated infographics */
  logo: '/tradepulse-logo.svg',
  /** Watermark — used for background watermark on customer-facing output */
  watermark: '/tradepulse-logo-light.svg',
} as const;

// =============================================================================
// HELPER
// =============================================================================

/**
 * Returns the appropriate branding configuration based on audience.
 * Customer-facing output uses light theme; internal uses dark theme.
 */
export function getBrandingForInfographic(audience: InfographicAudience): BrandingConfig {
  if (audience === 'customer-facing') {
    return infographicLightBrandConfig;
  }
  return infographicBrandConfig;
}
