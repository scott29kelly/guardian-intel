import type { BrandingConfig, DeckAudience } from '../types/deck.types';

// Guardian Intel Brand Configuration (Dark Theme)
export const guardianBrandConfig: BrandingConfig = {
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
  logo: '/guardian-logo.svg',
  logoAlt: '/guardian-logo-light.svg',
  footer: 'Guardian Storm Repair | Confidential',
  borderRadius: '8px',
};

// Alternative light theme for customer-facing decks
export const guardianLightBrandConfig: BrandingConfig = {
  ...guardianBrandConfig,
  colors: {
    ...guardianBrandConfig.colors,
    background: '#FFFFFF',
    backgroundAlt: '#F8FAFC',
    text: '#1E3A5F',
    textMuted: '#64748B',
  },
};

// Export helper to get branding based on audience
export function getBrandingForAudience(audience: DeckAudience): BrandingConfig {
  if (audience === 'customer') {
    return guardianLightBrandConfig;
  }
  return guardianBrandConfig;
}
