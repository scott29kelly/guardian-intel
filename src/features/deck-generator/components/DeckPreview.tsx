"use client";

import React, { useState, useRef, useImperativeHandle, forwardRef, useCallback } from 'react';
import {
  Sparkles,
  Target,
  Home,
  Calendar,
  Zap,
  DollarSign,
  CheckCircle,
  TrendingUp,
  Clock,
  FileText,
  Users,
  MapPin,
  Phone,
  Shield,
  AlertTriangle,
} from 'lucide-react';
import html2canvas from 'html2canvas';
import type { GeneratedDeck, GeneratedSlide } from '../types/deck.types';
import {
  enhanceStats,
  enhanceTalkingPoints,
  enhanceTimelineEvents,
  enhanceListItems,
  getRiskColors,
} from '../utils/contentEnhancer';

// Icon mapping for dynamic rendering
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Target,
  Home,
  Calendar,
  Zap,
  DollarSign,
  CheckCircle,
  TrendingUp,
  Clock,
  FileText,
  Users,
  MapPin,
  Phone,
  Shield,
  AlertTriangle,
  Sparkles,
};

interface DeckPreviewProps {
  deck: GeneratedDeck;
}

export interface ExportProgress {
  current: number;
  total: number;
  status: string;
}

export interface DeckPreviewRef {
  captureAllSlides: (onProgress?: (progress: ExportProgress) => void) => Promise<Blob[]>;
}

export const DeckPreview = forwardRef<DeckPreviewRef, DeckPreviewProps>(
  function DeckPreview({ deck }, ref) {
    const [exportSlideIndex, setExportSlideIndex] = useState<number | null>(null);
    const exportContainerRef = useRef<HTMLDivElement>(null);

    // Capture a single slide from the export container
    const captureSlide = useCallback(async (): Promise<Blob> => {
      if (!exportContainerRef.current) {
        throw new Error('Export container not available');
      }

      // Wait for render to complete
      await new Promise(resolve => setTimeout(resolve, 100));

      const canvas = await html2canvas(exportContainerRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: null,
        logging: false,
        width: 1280,
        height: 720,
      });

      return new Promise((resolve, reject) => {
        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob);
            else reject(new Error('Failed to create blob'));
          },
          'image/png',
          1.0
        );
      });
    }, []);

    // Expose method to capture all slides for export
    useImperativeHandle(ref, () => ({
      captureAllSlides: async (onProgress) => {
        const blobs: Blob[] = [];
        const total = deck.slides.length;

        for (let i = 0; i < total; i++) {
          onProgress?.({
            current: i + 1,
            total,
            status: `Capturing slide ${i + 1} of ${total}`
          });

          // Set the export slide index to render that slide
          setExportSlideIndex(i);

          // Wait for state update and render
          await new Promise(resolve => setTimeout(resolve, 150));

          try {
            const blob = await captureSlide();
            blobs.push(blob);
          } catch (error) {
            console.error(`Failed to capture slide ${i + 1}:`, error);
            throw error;
          }
        }

        // Reset export mode
        setExportSlideIndex(null);

        return blobs;
      }
    }), [deck.slides.length, captureSlide]);

    // Safety check for slides
    if (!deck.slides || deck.slides.length === 0) {
      return (
        <div className="p-6 text-center text-text-muted">
          <p>No slides generated. Please try again.</p>
        </div>
      );
    }

    return (
      <div className="p-4 space-y-6 max-h-[80vh] overflow-y-auto">
        {/* Sticky header with slide count */}
        <div className="sticky top-0 z-10 bg-bg-primary/95 backdrop-blur-sm py-3 px-4 rounded-xl border border-border/50 flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: `${deck.branding.colors.secondary}20` }}
            >
              <Sparkles className="w-4 h-4" style={{ color: deck.branding.colors.secondary }} />
            </div>
            <div>
              <span className="text-sm font-semibold text-text-primary">
                {deck.slides.length} slides generated
              </span>
              <span className="text-xs text-text-muted ml-2">
                ({deck.metadata.aiSlidesCount} AI-enhanced)
              </span>
            </div>
          </div>
          <span className="text-xs text-text-muted">
            Scroll to view all slides
          </span>
        </div>

        {/* All slides at full 16:9 size in scrollable list */}
        {deck.slides.map((slide, index) => (
          <div
            key={slide.id}
            data-slide-preview
            className="relative w-full rounded-xl overflow-hidden border-2 border-border/50 shadow-xl transition-all hover:border-intel-500/30"
            style={{
              backgroundColor: deck.branding.colors.background,
              aspectRatio: '16 / 9',
            }}
          >
            {/* Slide content with professional padding */}
            <div className="absolute inset-0 p-8 md:p-12 flex flex-col">
              <SlideRenderer slide={slide} branding={deck.branding} />
            </div>

            {/* Slide number badge */}
            <div className="absolute bottom-4 right-4 px-3 py-1.5 bg-black/70 backdrop-blur-sm rounded-full text-sm text-white font-medium">
              {index + 1} / {deck.slides.length}
            </div>

            {/* AI badge */}
            {slide.aiGenerated && (
              <div className="absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1.5 bg-intel-500/20 backdrop-blur-sm rounded-full text-xs text-intel-300 font-medium">
                <Sparkles className="w-3.5 h-3.5" />
                AI Generated
              </div>
            )}

            {/* Section label */}
            <div className="absolute top-4 left-4 px-3 py-1.5 bg-black/50 backdrop-blur-sm rounded-full text-xs text-text-muted font-medium">
              {slide.sectionId.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
            </div>
          </div>
        ))}

        {/* Hidden Export Container - Full size slide for capture */}
        {exportSlideIndex !== null && (
          <div
            className="fixed left-[-9999px] top-0"
            style={{ width: '1280px', height: '720px' }}
          >
            <div
              ref={exportContainerRef}
              style={{
                width: '1280px',
                height: '720px',
                backgroundColor: deck.branding.colors.background,
                padding: '48px',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <SlideRenderer
                slide={deck.slides[exportSlideIndex]}
                branding={deck.branding}
              />
            </div>
          </div>
        )}
      </div>
    );
  }
);

// Slide type-specific renderers
function SlideRenderer({
  slide,
  branding
}: {
  slide: GeneratedSlide;
  branding: GeneratedDeck['branding'];
}) {
  if (!slide || !slide.content) {
    return (
      <div className="h-full flex items-center justify-center">
        <p style={{ color: branding.colors.textMuted }}>No content available</p>
      </div>
    );
  }

  const { type, content } = slide;

  switch (type) {
    case 'title':
      return <TitleSlideRenderer content={content} branding={branding} />;
    case 'stats':
      return <StatsSlideRenderer content={content} branding={branding} />;
    case 'list':
      return <ListSlideRenderer content={content} branding={branding} />;
    case 'timeline':
      return <TimelineSlideRenderer content={content} branding={branding} />;
    case 'talking-points':
      return <TalkingPointsSlideRenderer content={content} branding={branding} />;
    case 'chart':
      return <ChartSlideRenderer content={content} branding={branding} />;
    case 'image':
      return <ImageSlideRenderer content={content} branding={branding} />;
    default:
      return <GenericSlideRenderer slide={slide} branding={branding} />;
  }
}

function TitleSlideRenderer({
  content,
  branding
}: {
  content: GeneratedSlide['content'];
  branding: GeneratedDeck['branding'];
}) {
  const data = content as {
    title?: string;
    subtitle?: string;
    date?: string;
    preparedFor?: string;
    preparedBy?: string;
    customerName?: string;
    address?: string;
  };

  const displayTitle = data.title || data.customerName || 'Customer Prep Deck';
  const displaySubtitle = data.subtitle || data.address || '';

  return (
    <div className="h-full flex flex-col relative overflow-hidden">
      {/* Large decorative gradient background */}
      <div
        className="absolute inset-0 opacity-30"
        style={{
          background: `radial-gradient(ellipse at 80% 20%, ${branding.colors.secondary}40 0%, transparent 50%),
                       radial-gradient(ellipse at 20% 80%, ${branding.colors.secondary}30 0%, transparent 50%)`
        }}
      />

      {/* Decorative blur shapes */}
      <div
        className="absolute top-0 right-0 w-96 h-96 rounded-full opacity-10"
        style={{
          backgroundColor: branding.colors.secondary,
          filter: 'blur(60px)'
        }}
      />
      <div
        className="absolute bottom-0 left-0 w-64 h-64 rounded-full opacity-5"
        style={{
          backgroundColor: branding.colors.secondary,
          filter: 'blur(40px)'
        }}
      />

      {/* Main content - centered */}
      <div className="flex-1 flex flex-col items-center justify-center relative z-10 text-center px-8">
        {/* Icon badge with glow */}
        <div
          className="w-20 h-20 rounded-2xl flex items-center justify-center mb-8 relative"
          style={{
            backgroundColor: `${branding.colors.secondary}20`,
            boxShadow: `0 0 40px ${branding.colors.secondary}30`
          }}
        >
          <Target className="w-10 h-10" style={{ color: branding.colors.secondary }} />
        </div>

        {/* Hero title - DRAMATIC */}
        <h1
          className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight leading-tight mb-4"
          style={{
            color: branding.colors.text,
            textShadow: `0 4px 30px ${branding.colors.background}`
          }}
        >
          {displayTitle}
        </h1>

        {/* Subtitle - elegant, lighter weight */}
        {displaySubtitle && (
          <p
            className="text-xl md:text-2xl font-light max-w-2xl mb-8"
            style={{ color: branding.colors.textMuted }}
          >
            {displaySubtitle}
          </p>
        )}

        {/* Decorative divider */}
        <div className="flex items-center gap-4 mb-8">
          <div
            className="w-16 h-0.5"
            style={{ backgroundColor: `${branding.colors.secondary}50` }}
          />
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: branding.colors.secondary }}
          />
          <div
            className="w-16 h-0.5"
            style={{ backgroundColor: `${branding.colors.secondary}50` }}
          />
        </div>

        {/* Meta info - clean pills */}
        <div className="flex flex-wrap items-center justify-center gap-3">
          {data.date && (
            <div
              className="flex items-center gap-2 px-4 py-2 rounded-full"
              style={{ backgroundColor: branding.colors.backgroundAlt }}
            >
              <Calendar className="w-4 h-4" style={{ color: branding.colors.secondary }} />
              <span className="text-sm" style={{ color: branding.colors.textMuted }}>{data.date}</span>
            </div>
          )}
          {data.preparedFor && (
            <div
              className="flex items-center gap-2 px-4 py-2 rounded-full"
              style={{ backgroundColor: branding.colors.backgroundAlt }}
            >
              <Users className="w-4 h-4" style={{ color: branding.colors.secondary }} />
              <span className="text-sm" style={{ color: branding.colors.textMuted }}>For: {data.preparedFor}</span>
            </div>
          )}
          {data.preparedBy && (
            <div
              className="flex items-center gap-2 px-4 py-2 rounded-full"
              style={{ backgroundColor: branding.colors.backgroundAlt }}
            >
              <FileText className="w-4 h-4" style={{ color: branding.colors.secondary }} />
              <span className="text-sm" style={{ color: branding.colors.textMuted }}>By: {data.preparedBy}</span>
            </div>
          )}
        </div>
      </div>

      {/* Footer branding */}
      <div className="relative z-10 text-center pb-6">
        <p
          className="text-xs tracking-widest uppercase"
          style={{ color: branding.colors.textMuted }}
        >
          {branding.footer || 'Guardian Storm Repair • Confidential'}
        </p>
      </div>
    </div>
  );
}

function StatsSlideRenderer({
  content,
  branding
}: {
  content: GeneratedSlide['content'];
  branding: GeneratedDeck['branding'];
}) {
  const data = content as {
    title?: string;
    stats?: Array<{
      label: string;
      value: string | number;
      trend?: 'up' | 'down' | 'neutral';
      icon?: string;
      insight?: string;
    }>;
    footnote?: string;
    bottomLine?: string;
  };

  const stats = data.stats || [];

  if (stats.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center">
        <Target className="w-16 h-16 mb-6" style={{ color: branding.colors.secondary }} />
        <h2 className="text-2xl font-bold" style={{ color: branding.colors.text }}>
          {data.title || 'Customer Overview'}
        </h2>
        <p className="text-sm mt-2" style={{ color: branding.colors.textMuted }}>
          Loading statistics...
        </p>
      </div>
    );
  }

  // Enhance stats for visual impact
  const enhancedStats = enhanceStats(stats);
  const heroStat = enhancedStats[0];
  const supportingStats = enhancedStats.slice(1, 4);

  return (
    <div className="h-full flex flex-col">
      {/* Title */}
      <h2
        className="text-2xl font-bold mb-6 tracking-tight"
        style={{ color: branding.colors.text }}
      >
        {data.title || 'Key Metrics'}
      </h2>

      <div className="flex-1 flex flex-col gap-6">
        {/* HERO STAT - Takes center stage */}
        {heroStat && (
          <div
            className="flex-1 flex items-center justify-center rounded-2xl relative overflow-hidden"
            style={{ backgroundColor: branding.colors.backgroundAlt }}
          >
            {/* Decorative gradient overlay */}
            <div
              className="absolute inset-0 opacity-20"
              style={{
                background: `radial-gradient(ellipse at center, ${branding.colors.secondary} 0%, transparent 70%)`
              }}
            />

            <div className="relative z-10 text-center px-8">
              {/* Hero number - MASSIVE */}
              <div
                className="text-6xl md:text-7xl lg:text-8xl font-black tracking-tighter leading-none mb-3"
                style={{
                  color: branding.colors.secondary,
                  textShadow: `0 0 60px ${branding.colors.secondary}40`
                }}
              >
                {heroStat.value}
              </div>

              {/* Label - uppercase tracking */}
              <div
                className="text-lg font-semibold uppercase tracking-widest mb-4"
                style={{ color: branding.colors.textMuted }}
              >
                {heroStat.label}
              </div>

              {/* Insight */}
              {heroStat.insight && (
                <div
                  className="text-sm max-w-md mx-auto leading-relaxed"
                  style={{ color: branding.colors.text }}
                >
                  {heroStat.insight}
                </div>
              )}

              {/* Progress bar for scores */}
              {heroStat.showProgressBar && heroStat.progressValue !== undefined && (
                <div className="mt-5 w-56 mx-auto">
                  <div
                    className="h-3 rounded-full overflow-hidden"
                    style={{ backgroundColor: `${branding.colors.secondary}20` }}
                  >
                    <div
                      className="h-full rounded-full transition-all duration-1000 ease-out"
                      style={{
                        width: `${Math.min(heroStat.progressValue, 100)}%`,
                        backgroundColor: branding.colors.secondary
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* SUPPORTING STATS - 3-column row */}
        {supportingStats.length > 0 && (
          <div className="grid grid-cols-3 gap-4">
            {supportingStats.map((stat, index) => {
              const IconComponent = stat.icon ? iconMap[stat.icon] : Target;
              return (
                <div
                  key={index}
                  className="p-4 rounded-xl text-center relative overflow-hidden"
                  style={{ backgroundColor: branding.colors.backgroundAlt }}
                >
                  {/* Accent line at top */}
                  <div
                    className="absolute top-0 left-0 right-0 h-1"
                    style={{ backgroundColor: branding.colors.secondary }}
                  />

                  {/* Icon */}
                  {IconComponent && (
                    <div className="flex justify-center mb-2">
                      <IconComponent className="w-5 h-5" style={{ color: branding.colors.secondary }} />
                    </div>
                  )}

                  {/* Value - 3xl */}
                  <div
                    className="text-2xl md:text-3xl font-bold mb-1"
                    style={{ color: branding.colors.text }}
                  >
                    {stat.value}
                  </div>

                  {/* Label */}
                  <div
                    className="text-xs font-medium uppercase tracking-wide"
                    style={{ color: branding.colors.textMuted }}
                  >
                    {stat.label}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Bottom line - key takeaway */}
      {(data.bottomLine || data.footnote) && (
        <div
          className="mt-5 p-4 rounded-xl border-l-4 flex items-start gap-3"
          style={{
            backgroundColor: `${branding.colors.secondary}10`,
            borderLeftColor: branding.colors.secondary,
          }}
        >
          <Zap className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: branding.colors.secondary }} />
          <div>
            <div
              className="text-xs font-bold uppercase tracking-wide mb-1"
              style={{ color: branding.colors.secondary }}
            >
              Key Takeaway
            </div>
            <p
              className="text-sm font-medium leading-relaxed"
              style={{ color: branding.colors.text }}
            >
              {data.bottomLine || data.footnote}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function ListSlideRenderer({
  content,
  branding
}: {
  content: GeneratedSlide['content'];
  branding: GeneratedDeck['branding'];
}) {
  const data = content as {
    title?: string;
    items?: Array<{
      primary: string;
      secondary?: string;
      icon?: string;
      highlight?: boolean;
      priority?: string;
    }>;
    numbered?: boolean;
    proactiveTip?: string;
    primaryGoal?: string;
    fallbackPlan?: string;
  };

  const items = data.items || [];

  if (items.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center">
        <Shield className="w-16 h-16 mb-6" style={{ color: branding.colors.secondary }} />
        <h2 className="text-2xl font-bold" style={{ color: branding.colors.text }}>
          {data.title || 'Action Items'}
        </h2>
        <p className="text-sm mt-2" style={{ color: branding.colors.textMuted }}>
          Loading content...
        </p>
      </div>
    );
  }

  // Enhance list items
  const enhancedItems = enhanceListItems(items);
  const heroItem = enhancedItems.find(i => i.visualWeight === 'hero');
  const regularItems = enhancedItems.filter(i => i.visualWeight !== 'hero');

  return (
    <div className="h-full flex flex-col">
      <h2
        className="text-2xl font-bold mb-4 tracking-tight"
        style={{ color: branding.colors.text }}
      >
        {data.title || 'Action Items'}
      </h2>

      {/* Proactive tip banner */}
      {data.proactiveTip && (
        <div
          className="mb-4 p-3 rounded-xl flex items-center gap-3"
          style={{
            background: `linear-gradient(90deg, rgba(16, 185, 129, 0.15) 0%, transparent 100%)`,
            border: `1px solid rgba(16, 185, 129, 0.3)`
          }}
        >
          <Zap className="w-5 h-5 flex-shrink-0" style={{ color: '#10B981' }} />
          <div>
            <span className="text-xs font-bold uppercase" style={{ color: '#10B981' }}>Pro Tip: </span>
            <span className="text-sm" style={{ color: branding.colors.text }}>{data.proactiveTip}</span>
          </div>
        </div>
      )}

      {/* Primary goal callout */}
      {data.primaryGoal && (
        <div
          className="mb-4 p-3 rounded-xl"
          style={{
            background: `linear-gradient(135deg, ${branding.colors.secondary}15 0%, ${branding.colors.secondary}05 100%)`,
            border: `1px solid ${branding.colors.secondary}30`
          }}
        >
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5" style={{ color: branding.colors.secondary }} />
            <span className="text-xs font-bold uppercase" style={{ color: branding.colors.secondary }}>
              Primary Goal:
            </span>
            <span className="text-sm font-medium" style={{ color: branding.colors.text }}>
              {data.primaryGoal}
            </span>
          </div>
        </div>
      )}

      <div className="flex-1 flex gap-4">
        {/* Hero item - large left column with gradient background */}
        {heroItem && (
          <div
            className="w-2/5 rounded-xl p-5 flex flex-col"
            style={{
              background: `linear-gradient(135deg, ${branding.colors.secondary}20 0%, ${branding.colors.secondary}05 100%)`,
              border: `2px solid ${branding.colors.secondary}40`
            }}
          >
            {data.numbered && (
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center text-xl font-black mb-4"
                style={{ backgroundColor: branding.colors.secondary, color: branding.colors.background }}
              >
                1
              </div>
            )}

            {heroItem.badge && (
              <div
                className="inline-flex self-start px-2.5 py-1 rounded-full text-[10px] font-bold uppercase mb-3"
                style={{ backgroundColor: '#F59E0B', color: '#000' }}
              >
                {heroItem.badge.text}
              </div>
            )}

            <h3
              className="text-lg font-bold mb-3"
              style={{ color: branding.colors.text }}
            >
              {heroItem.primary}
            </h3>

            {heroItem.secondary && (
              <p
                className="text-sm leading-relaxed flex-1"
                style={{ color: branding.colors.textMuted }}
              >
                {heroItem.secondary}
              </p>
            )}
          </div>
        )}

        {/* Regular items - right column, compact list */}
        <div className="flex-1 space-y-2 overflow-auto">
          {regularItems.slice(0, 4).map((item, index) => {
            const IconComponent = item.icon ? iconMap[item.icon] : CheckCircle;
            const itemNumber = heroItem ? index + 2 : index + 1;

            return (
              <div
                key={index}
                className="p-3 rounded-xl flex items-start gap-3"
                style={{ backgroundColor: branding.colors.backgroundAlt }}
              >
                {data.numbered ? (
                  <span
                    className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                    style={{ backgroundColor: `${branding.colors.secondary}30`, color: branding.colors.secondary }}
                  >
                    {itemNumber}
                  </span>
                ) : (
                  <IconComponent
                    className="w-5 h-5 flex-shrink-0 mt-0.5"
                    style={{ color: branding.colors.secondary }}
                  />
                )}

                <div className="flex-1 min-w-0">
                  <p
                    className="font-semibold text-sm"
                    style={{ color: branding.colors.text }}
                  >
                    {item.primary}
                  </p>
                  {item.secondary && (
                    <p
                      className="text-xs mt-1 leading-relaxed"
                      style={{ color: branding.colors.textMuted }}
                    >
                      {item.secondary}
                    </p>
                  )}
                </div>

                {item.badge && (
                  <span
                    className="text-[9px] px-2 py-1 rounded-full font-bold uppercase flex-shrink-0"
                    style={{ backgroundColor: 'rgba(245, 158, 11, 0.3)', color: '#F59E0B' }}
                  >
                    {item.badge.text}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Fallback plan at bottom */}
      {data.fallbackPlan && (
        <div
          className="mt-4 p-3 rounded-xl"
          style={{ backgroundColor: branding.colors.backgroundAlt }}
        >
          <p className="text-xs" style={{ color: branding.colors.textMuted }}>
            <span className="font-bold">Fallback Plan:</span> {data.fallbackPlan}
          </p>
        </div>
      )}
    </div>
  );
}

function TimelineSlideRenderer({
  content,
  branding
}: {
  content: GeneratedSlide['content'];
  branding: GeneratedDeck['branding'];
}) {
  const data = content as {
    title?: string;
    events?: Array<{
      date: string;
      title: string;
      description?: string;
      status?: 'completed' | 'current' | 'upcoming';
      damageRisk?: 'high' | 'medium' | 'low';
      opportunity?: string;
    }>;
    summary?: {
      totalEvents?: number;
      highRiskEvents?: number;
      claimOpportunity?: string;
      urgencyLevel?: string;
      recommendation?: string;
    };
  };

  const events = data.events || [];

  if (events.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center">
        <Calendar className="w-16 h-16 mb-6" style={{ color: branding.colors.secondary }} />
        <h2 className="text-2xl font-bold" style={{ color: branding.colors.text }}>
          {data.title || 'Storm History'}
        </h2>
        <p className="text-sm mt-2" style={{ color: branding.colors.textMuted }}>
          No storm events recorded for this property
        </p>
      </div>
    );
  }

  // Enhance timeline events
  const enhancedEvents = enhanceTimelineEvents(events).slice(0, 4);

  return (
    <div className="h-full flex flex-col">
      {/* Header with urgency badge */}
      <div className="flex items-center justify-between mb-6">
        <h2
          className="text-2xl font-bold tracking-tight"
          style={{ color: branding.colors.text }}
        >
          {data.title || 'Storm Timeline'}
        </h2>
        {data.summary?.urgencyLevel && (
          <div
            className="px-4 py-2 rounded-full font-bold text-sm"
            style={{
              backgroundColor: data.summary.urgencyLevel === 'Critical' || data.summary.urgencyLevel === 'High'
                ? 'rgba(239, 68, 68, 0.2)' : 'rgba(245, 158, 11, 0.2)',
              color: data.summary.urgencyLevel === 'Critical' || data.summary.urgencyLevel === 'High'
                ? '#EF4444' : '#F59E0B',
            }}
          >
            {data.summary.urgencyLevel} Urgency
          </div>
        )}
      </div>

      {/* HORIZONTAL timeline - infographic style */}
      <div className="flex-1 flex flex-col">
        <div className="relative py-6 flex-1">
          {/* Horizontal track line */}
          <div
            className="absolute left-8 right-8 top-1/2 h-1 -translate-y-1/2 rounded-full"
            style={{ backgroundColor: `${branding.colors.secondary}30` }}
          />

          {/* Events positioned along timeline */}
          <div className="relative flex justify-between px-8 h-full">
            {enhancedEvents.map((event, index) => {
              const colors = getRiskColors(event.damageRisk);
              const isEven = index % 2 === 0;

              return (
                <div
                  key={index}
                  className="flex flex-col items-center justify-center relative"
                  style={{ width: `${90 / enhancedEvents.length}%` }}
                >
                  {/* Event card - alternating top/bottom */}
                  <div
                    className={`w-full rounded-xl p-3 ${isEven ? 'order-1 mb-3' : 'order-3 mt-3'}`}
                    style={{
                      backgroundColor: colors.bg,
                      border: `2px solid ${colors.border}`
                    }}
                  >
                    <div
                      className="text-xs font-bold mb-1"
                      style={{ color: colors.text }}
                    >
                      {event.date}
                    </div>
                    <div
                      className="text-sm font-semibold mb-1 line-clamp-2"
                      style={{ color: branding.colors.text }}
                    >
                      {event.title}
                    </div>
                    {(event.description || event.opportunity) && (
                      <div
                        className="text-xs line-clamp-2"
                        style={{ color: branding.colors.textMuted }}
                      >
                        {event.description || event.opportunity}
                      </div>
                    )}
                  </div>

                  {/* Connector line */}
                  <div
                    className="w-0.5 h-4 order-2"
                    style={{ backgroundColor: colors.border }}
                  />

                  {/* Timeline node - large with glow effect */}
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center order-2 relative z-10 flex-shrink-0"
                    style={{
                      backgroundColor: colors.bg,
                      border: `3px solid ${colors.border}`,
                      boxShadow: `0 0 20px ${colors.border}50`
                    }}
                  >
                    {event.damageRisk === 'high' ? (
                      <AlertTriangle className="w-5 h-5" style={{ color: colors.text }} />
                    ) : event.damageRisk === 'medium' ? (
                      <Zap className="w-5 h-5" style={{ color: colors.text }} />
                    ) : (
                      <Calendar className="w-5 h-5" style={{ color: colors.text }} />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recommendation callout */}
        {data.summary?.recommendation && (
          <div
            className="p-4 rounded-xl"
            style={{
              background: `linear-gradient(135deg, ${branding.colors.secondary}15 0%, transparent 100%)`,
              border: `1px solid ${branding.colors.secondary}30`,
            }}
          >
            <div className="flex items-start gap-3">
              <Zap className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: branding.colors.secondary }} />
              <div>
                <div
                  className="text-xs font-bold uppercase tracking-wide mb-1"
                  style={{ color: branding.colors.secondary }}
                >
                  Recommendation
                </div>
                <p
                  className="text-sm font-medium leading-relaxed"
                  style={{ color: branding.colors.text }}
                >
                  {data.summary.recommendation}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function TalkingPointsSlideRenderer({
  content,
  branding
}: {
  content: GeneratedSlide['content'];
  branding: GeneratedDeck['branding'];
}) {
  const data = content as {
    title?: string;
    aiGenerated?: boolean;
    points?: Array<{
      topic: string;
      script: string;
      priority?: 'high' | 'medium' | 'low';
      timing?: string;
    }>;
    keyInsight?: string;
  };

  const points = data.points || [];

  if (points.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center">
        <Sparkles className="w-16 h-16 mb-6" style={{ color: branding.colors.secondary }} />
        <h2 className="text-2xl font-bold" style={{ color: branding.colors.text }}>
          {data.title || 'Talking Points'}
        </h2>
        <p className="text-sm mt-2" style={{ color: branding.colors.textMuted }}>
          Generating conversation scripts...
        </p>
      </div>
    );
  }

  // Enhance points with script breakdown
  const enhancedPoints = enhanceTalkingPoints(points);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <h2
          className="text-2xl font-bold tracking-tight"
          style={{ color: branding.colors.text }}
        >
          {data.title || 'Conversation Guide'}
        </h2>
        <div
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
          style={{ backgroundColor: `${branding.colors.secondary}20` }}
        >
          <Sparkles className="w-4 h-4" style={{ color: branding.colors.secondary }} />
          <span
            className="text-xs font-medium"
            style={{ color: branding.colors.secondary }}
          >
            AI-Powered Scripts
          </span>
        </div>
      </div>

      {/* Key insight callout */}
      {data.keyInsight && (
        <div
          className="mb-5 p-4 rounded-xl"
          style={{
            background: `linear-gradient(135deg, ${branding.colors.secondary}15 0%, ${branding.colors.secondary}05 100%)`,
            border: `1px solid ${branding.colors.secondary}30`
          }}
        >
          <div className="flex items-start gap-3">
            <Target className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: branding.colors.secondary }} />
            <div>
              <div
                className="text-xs font-bold uppercase tracking-wide mb-1"
                style={{ color: branding.colors.secondary }}
              >
                Key Insight
              </div>
              <p
                className="text-sm font-medium leading-relaxed"
                style={{ color: branding.colors.text }}
              >
                {data.keyInsight}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Talking points with script breakdown */}
      <div className="flex-1 space-y-4 overflow-auto">
        {enhancedPoints.slice(0, 3).map((point, index) => {
          const isPriority = point.priority === 'high';

          return (
            <div
              key={index}
              className="rounded-xl overflow-hidden"
              style={{
                backgroundColor: branding.colors.backgroundAlt,
                border: isPriority ? `2px solid rgba(245, 158, 11, 0.5)` : `1px solid ${branding.colors.backgroundAlt}`
              }}
            >
              {/* Topic header */}
              <div
                className="px-4 py-3 flex items-center justify-between"
                style={{
                  backgroundColor: isPriority ? 'rgba(245, 158, 11, 0.15)' : `${branding.colors.secondary}10`
                }}
              >
                <div className="flex items-center gap-3">
                  <span
                    className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                    style={{ backgroundColor: branding.colors.secondary, color: branding.colors.background }}
                  >
                    {index + 1}
                  </span>
                  <span
                    className="text-sm font-bold uppercase tracking-wide"
                    style={{ color: branding.colors.secondary }}
                  >
                    {point.topic}
                  </span>
                </div>
                {isPriority && (
                  <span
                    className="text-[10px] px-2.5 py-1 rounded-full font-bold"
                    style={{ backgroundColor: '#F59E0B', color: '#000' }}
                  >
                    PRIORITY
                  </span>
                )}
              </div>

              {/* Script breakdown - Open/Build/Close sections */}
              <div className="p-4 space-y-3">
                {point.segments.hook && (
                  <div className="flex items-start gap-3">
                    <span
                      className="text-[10px] font-bold uppercase px-2 py-1 rounded mt-0.5 flex-shrink-0"
                      style={{ backgroundColor: 'rgba(16, 185, 129, 0.2)', color: '#10B981' }}
                    >
                      Open
                    </span>
                    <p
                      className="text-sm font-semibold leading-relaxed flex-1"
                      style={{ color: branding.colors.text }}
                    >
                      "{point.segments.hook}"
                    </p>
                  </div>
                )}

                {point.segments.evidence && (
                  <div className="flex items-start gap-3">
                    <span
                      className="text-[10px] font-bold uppercase px-2 py-1 rounded mt-0.5 flex-shrink-0"
                      style={{ backgroundColor: `${branding.colors.textMuted}20`, color: branding.colors.textMuted }}
                    >
                      Build
                    </span>
                    <p
                      className="text-sm leading-relaxed flex-1"
                      style={{ color: branding.colors.textMuted }}
                    >
                      "{point.segments.evidence}"
                    </p>
                  </div>
                )}

                {point.segments.cta && (
                  <div className="flex items-start gap-3">
                    <span
                      className="text-[10px] font-bold uppercase px-2 py-1 rounded mt-0.5 flex-shrink-0"
                      style={{ backgroundColor: `${branding.colors.secondary}20`, color: branding.colors.secondary }}
                    >
                      Close
                    </span>
                    <p
                      className="text-sm font-medium leading-relaxed flex-1"
                      style={{ color: branding.colors.secondary }}
                    >
                      "{point.segments.cta}"
                    </p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ChartSlideRenderer({
  content,
  branding
}: {
  content: GeneratedSlide['content'];
  branding: GeneratedDeck['branding'];
}) {
  const data = content as {
    title?: string;
    chartType?: string;
    data?: Array<Record<string, string | number>>;
    xKey?: string;
    yKey?: string;
    footnote?: string;
  };

  // Simple bar chart visualization
  const maxValue = data.data
    ? Math.max(...data.data.map(d => Number(d[data.yKey || 'value']) || 0))
    : 100;

  return (
    <div className="h-full flex flex-col">
      <h2
        className="text-xl font-bold mb-4"
        style={{ color: branding.colors.text }}
      >
        {data.title || 'Chart'}
      </h2>
      <div className="flex-1 flex items-end gap-2 pb-8">
        {data.data?.map((item, index) => {
          const value = Number(item[data.yKey || 'value']) || 0;
          const height = (value / maxValue) * 100;
          const label = String(item[data.xKey || 'label']);

          return (
            <div key={index} className="flex-1 flex flex-col items-center">
              <div
                className="w-full rounded-t transition-all"
                style={{
                  height: `${height}%`,
                  backgroundColor: branding.colors.secondary,
                  minHeight: '8px'
                }}
              />
              <span
                className="text-xs mt-2 text-center"
                style={{ color: branding.colors.textMuted }}
              >
                {label}
              </span>
            </div>
          );
        })}
      </div>
      {data.footnote && (
        <p
          className="text-xs"
          style={{ color: branding.colors.textMuted }}
        >
          {data.footnote}
        </p>
      )}
    </div>
  );
}

function ImageSlideRenderer({
  content,
  branding
}: {
  content: GeneratedSlide['content'];
  branding: GeneratedDeck['branding'];
}) {
  const data = content as {
    title?: string;
    imageUrl?: string;
    caption?: string;
    details?: Array<{ label: string; value: string }>;
  };

  return (
    <div className="h-full flex flex-col">
      <h2
        className="text-xl font-bold mb-4"
        style={{ color: branding.colors.text }}
      >
        {data.title || 'Property Details'}
      </h2>
      <div className="flex-1 flex gap-4">
        {/* Image placeholder or actual image */}
        <div
          className="flex-1 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: branding.colors.backgroundAlt }}
        >
          {data.imageUrl ? (
            <img
              src={data.imageUrl}
              alt={data.title || 'Property'}
              className="w-full h-full object-cover rounded-lg"
            />
          ) : (
            <div className="text-center p-4">
              <Home className="w-16 h-16 mx-auto mb-2" style={{ color: branding.colors.secondary }} />
              <p style={{ color: branding.colors.textMuted }}>Property Image</p>
            </div>
          )}
        </div>
        {/* Details panel */}
        {data.details && data.details.length > 0 && (
          <div className="w-48 space-y-2">
            {data.details.map((detail, index) => (
              <div
                key={index}
                className="p-2 rounded"
                style={{ backgroundColor: branding.colors.backgroundAlt }}
              >
                <p className="text-xs" style={{ color: branding.colors.textMuted }}>
                  {detail.label}
                </p>
                <p className="font-semibold text-sm" style={{ color: branding.colors.text }}>
                  {detail.value}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
      {data.caption && (
        <p className="text-xs mt-3" style={{ color: branding.colors.textMuted }}>
          {data.caption}
        </p>
      )}
    </div>
  );
}

function GenericSlideRenderer({
  slide,
  branding
}: {
  slide: GeneratedSlide;
  branding: GeneratedDeck['branding'];
}) {
  const content = slide.content as { title?: string; [key: string]: unknown };

  return (
    <div className="h-full flex flex-col items-center justify-center">
      <div className="text-center max-w-lg">
        <h2
          className="text-2xl font-bold mb-4"
          style={{ color: branding.colors.text }}
        >
          {content.title || `Slide: ${slide.type}`}
        </h2>
        {slide.aiGenerated && (
          <div className="flex items-center justify-center gap-2 mb-4">
            <Sparkles className="w-4 h-4" style={{ color: branding.colors.secondary }} />
            <span style={{ color: branding.colors.secondary }}>AI Generated Content</span>
          </div>
        )}
        <p
          className="text-sm"
          style={{ color: branding.colors.textMuted }}
        >
          {slide.sectionId}
        </p>
      </div>
    </div>
  );
}
