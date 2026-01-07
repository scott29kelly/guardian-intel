import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-US').format(num);
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatRelativeDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return `${Math.floor(diffDays / 365)} years ago`;
}

export function getDaysUntil(dateString: string): number {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = date.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export function getScoreColor(score: number): string {
  if (score >= 70) return 'text-risk-low';
  if (score >= 40) return 'text-risk-medium';
  return 'text-risk-high';
}

export function getScoreBgColor(score: number): string {
  if (score >= 70) return 'bg-risk-low';
  if (score >= 40) return 'bg-risk-medium';
  return 'bg-risk-high';
}

export function getRecommendationLabel(rec: 'hot' | 'warm' | 'cold'): string {
  switch (rec) {
    case 'hot': return '🔥 Hot Lead';
    case 'warm': return '☀️ Warm Lead';
    case 'cold': return '❄️ Cold Lead';
  }
}

export function getSeverityColor(severity: string): string {
  switch (severity) {
    case 'extreme': return 'text-risk-high';
    case 'severe': return 'text-risk-high';
    case 'moderate': return 'text-risk-medium';
    case 'minor': return 'text-risk-low';
    default: return 'text-guardian-400';
  }
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + '...';
}

export function getRoofMaterialLabel(material: string): string {
  const labels: Record<string, string> = {
    'asphalt-shingle': 'Asphalt Shingle',
    'metal': 'Metal',
    'tile': 'Tile',
    'slate': 'Slate',
    'wood-shake': 'Wood Shake',
    'tpo': 'TPO',
    'epdm': 'EPDM',
    'unknown': 'Unknown',
  };
  return labels[material] || material;
}

export function getRoofTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    'gable': 'Gable',
    'hip': 'Hip',
    'flat': 'Flat',
    'mansard': 'Mansard',
    'gambrel': 'Gambrel',
    'shed': 'Shed',
    'mixed': 'Mixed',
  };
  return labels[type] || type;
}
