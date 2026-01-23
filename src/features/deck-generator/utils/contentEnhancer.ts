/**
 * Content Enhancement Layer
 *
 * Transforms AI-generated content into visually optimized structures
 * for presentation-quality rendering. Converts raw JSON into
 * "stunning Google Nano Banana Pro slides" rather than just data cards.
 */

// =============================================================================
// TYPES
// =============================================================================

export interface EnhancedStat {
  label: string;
  value: string;
  insight?: string;
  icon?: string;
  // Visual enhancements
  size: 'hero' | 'large' | 'standard';
  emphasis: 'primary' | 'secondary' | 'accent' | 'danger' | 'success';
  visualType: 'number' | 'percentage' | 'currency' | 'text';
  showProgressBar?: boolean;
  progressValue?: number;
}

export interface ScriptSegments {
  hook?: string;      // Opening hook - bold/emphasized
  evidence?: string;  // Supporting evidence - normal
  cta?: string;       // Call to action - highlighted
}

export interface EnhancedTalkingPoint {
  topic: string;
  script: string;
  priority?: 'high' | 'medium' | 'low';
  timing?: string;
  // Script breakdown for visual presentation
  segments: ScriptSegments;
}

export interface EnhancedTimelineEvent {
  date: string;
  title: string;
  description?: string;
  damageRisk?: 'high' | 'medium' | 'low';
  opportunity?: string;
  // Visual enhancements
  iconType: 'storm' | 'hail' | 'wind' | 'damage' | 'opportunity';
  visualWeight: 'critical' | 'important' | 'standard';
  connectorStyle: 'danger' | 'warning' | 'normal';
}

export interface EnhancedListItem {
  primary: string;
  secondary?: string;
  icon?: string;
  highlight?: boolean;
  // Visual enhancements
  visualWeight: 'hero' | 'important' | 'standard';
  badge?: { text: string; color: 'danger' | 'warning' | 'success' | 'info' };
}

// =============================================================================
// ENHANCEMENT FUNCTIONS
// =============================================================================

/**
 * Enhance stats for visual impact
 * - First stat becomes hero (massive number)
 * - Detects percentages/scores for progress bars
 * - Assigns emphasis based on content keywords
 */
export function enhanceStats(stats: Array<{
  label: string;
  value: string | number;
  insight?: string;
  icon?: string;
  trend?: string;
}>): EnhancedStat[] {
  return stats.map((stat, index) => {
    const valueStr = String(stat.value);
    const isPercentage = valueStr.includes('%');
    const isCurrency = valueStr.includes('$');
    const isNumber = /^\d/.test(valueStr);

    // First stat is hero, second is large, rest are standard
    const size: EnhancedStat['size'] = index === 0 ? 'hero' : index === 1 ? 'large' : 'standard';

    // Determine emphasis based on content
    let emphasis: EnhancedStat['emphasis'] = 'primary';
    const lowerLabel = stat.label.toLowerCase();
    const lowerInsight = (stat.insight || '').toLowerCase();

    if (lowerLabel.includes('risk') || lowerLabel.includes('urgent') || lowerInsight.includes('critical')) {
      emphasis = 'danger';
    } else if (lowerLabel.includes('score') || lowerLabel.includes('opportunity') || lowerInsight.includes('high')) {
      emphasis = 'success';
    } else if (lowerLabel.includes('value') || lowerLabel.includes('price') || isCurrency) {
      emphasis = 'accent';
    }

    // Parse numeric value for progress bar
    let progressValue: number | undefined;
    let showProgressBar = false;
    if (isPercentage) {
      progressValue = parseInt(valueStr);
      showProgressBar = !isNaN(progressValue);
    } else if (lowerLabel.includes('score') && isNumber) {
      progressValue = parseInt(valueStr);
      showProgressBar = !isNaN(progressValue) && progressValue <= 100;
    }

    return {
      label: stat.label,
      value: valueStr,
      insight: stat.insight,
      icon: stat.icon,
      size,
      emphasis,
      visualType: isCurrency ? 'currency' : isPercentage ? 'percentage' : isNumber ? 'number' : 'text',
      showProgressBar,
      progressValue,
    };
  });
}

/**
 * Break talking point scripts into visual segments
 * - Hook: Opening statement (first sentence)
 * - Evidence: Supporting content (middle sentences)
 * - CTA: Closing action (last sentence)
 */
export function enhanceTalkingPoints(points: Array<{
  topic: string;
  script: string;
  priority?: 'high' | 'medium' | 'low';
  timing?: string;
}>): EnhancedTalkingPoint[] {
  return points.map(point => {
    const segments = parseScriptSegments(point.script);
    return { ...point, segments };
  });
}

function parseScriptSegments(script: string): ScriptSegments {
  // Split on sentence-ending punctuation followed by whitespace
  const sentences = script.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 0);

  if (sentences.length === 0) {
    return { hook: script };
  }

  if (sentences.length === 1) {
    return { hook: sentences[0] };
  }

  if (sentences.length === 2) {
    return { hook: sentences[0], cta: sentences[1] };
  }

  // 3+ sentences: first is hook, middle is evidence, last is CTA
  return {
    hook: sentences[0],
    evidence: sentences.slice(1, -1).join(' '),
    cta: sentences[sentences.length - 1],
  };
}

/**
 * Enhance timeline events for infographic-style display
 */
export function enhanceTimelineEvents(events: Array<{
  date: string;
  title: string;
  description?: string;
  damageRisk?: 'high' | 'medium' | 'low';
  opportunity?: string;
}>): EnhancedTimelineEvent[] {
  return events.map(event => {
    const titleLower = event.title.toLowerCase();
    const descLower = (event.description || '').toLowerCase();

    // Determine icon type based on content
    let iconType: EnhancedTimelineEvent['iconType'] = 'storm';
    if (titleLower.includes('hail') || descLower.includes('hail')) {
      iconType = 'hail';
    } else if (titleLower.includes('wind') || descLower.includes('wind')) {
      iconType = 'wind';
    } else if (titleLower.includes('damage') || descLower.includes('damage')) {
      iconType = 'damage';
    } else if (titleLower.includes('opportunity') || titleLower.includes('claim') ||
               descLower.includes('opportunity') || descLower.includes('claim')) {
      iconType = 'opportunity';
    }

    // Visual weight based on risk
    const visualWeight: EnhancedTimelineEvent['visualWeight'] =
      event.damageRisk === 'high' ? 'critical' :
      event.damageRisk === 'medium' ? 'important' : 'standard';

    const connectorStyle: EnhancedTimelineEvent['connectorStyle'] =
      event.damageRisk === 'high' ? 'danger' :
      event.damageRisk === 'medium' ? 'warning' : 'normal';

    return {
      ...event,
      iconType,
      visualWeight,
      connectorStyle,
    };
  });
}

/**
 * Enhance list items with visual weight
 */
export function enhanceListItems(items: Array<{
  primary: string;
  secondary?: string;
  icon?: string;
  highlight?: boolean;
  priority?: string;
}>): EnhancedListItem[] {
  // Count highlighted items
  const highlightedCount = items.filter(i => i.highlight || i.priority === 'high').length;

  return items.map((item, index) => {
    // First item becomes hero if no items are explicitly highlighted
    const isHero = item.highlight || item.priority === 'high' ||
                   (index === 0 && highlightedCount === 0);

    const visualWeight: EnhancedListItem['visualWeight'] =
      isHero && index === items.findIndex(i => i.highlight || i.priority === 'high' || (highlightedCount === 0 && true))
        ? 'hero'
        : item.highlight || item.priority === 'high'
        ? 'important'
        : 'standard';

    let badge: EnhancedListItem['badge'] | undefined;
    if (item.priority === 'high' || item.highlight) {
      badge = { text: 'PRIORITY', color: 'warning' };
    }

    return {
      primary: item.primary,
      secondary: item.secondary,
      icon: item.icon,
      highlight: item.highlight,
      visualWeight,
      badge,
    };
  });
}

// =============================================================================
// UTILITY HELPERS
// =============================================================================

/**
 * Format large numbers with K/M suffixes for display
 */
export function formatLargeNumber(value: number): string {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  return value.toString();
}

/**
 * Get progress bar color based on value
 */
export function getProgressColor(value: number): string {
  if (value >= 80) return '#10B981'; // Success green
  if (value >= 50) return '#F59E0B'; // Warning amber
  return '#EF4444'; // Danger red
}

/**
 * Get risk color for timeline events
 */
export function getRiskColors(risk: 'high' | 'medium' | 'low' | undefined): {
  bg: string;
  border: string;
  text: string;
} {
  switch (risk) {
    case 'high':
      return { bg: 'rgba(239, 68, 68, 0.15)', border: '#EF4444', text: '#EF4444' };
    case 'medium':
      return { bg: 'rgba(245, 158, 11, 0.15)', border: '#F59E0B', text: '#F59E0B' };
    case 'low':
    default:
      return { bg: 'rgba(16, 185, 129, 0.15)', border: '#10B981', text: '#10B981' };
  }
}
