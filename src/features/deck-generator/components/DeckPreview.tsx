"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
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
import type { GeneratedDeck, GeneratedSlide, SlideType } from '../types/deck.types';

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

export function DeckPreview({ deck }: DeckPreviewProps) {
  const [currentSlide, setCurrentSlide] = useState(0);

  const goToSlide = (index: number) => {
    if (index >= 0 && index < deck.slides.length) {
      setCurrentSlide(index);
    }
  };

  const slide = deck.slides[currentSlide];

  return (
    <div className="p-6">
      {/* Slide Preview Area */}
      <div 
        className="relative aspect-[16/9] rounded-lg overflow-hidden mb-4 border border-surface-700"
        style={{ 
          backgroundColor: deck.branding.colors.background,
        }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={slide.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="absolute inset-0 p-8"
          >
            <SlideRenderer slide={slide} branding={deck.branding} />
          </motion.div>
        </AnimatePresence>

        {/* Navigation Arrows */}
        <button
          onClick={() => goToSlide(currentSlide - 1)}
          disabled={currentSlide === 0}
          className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-black/50 hover:bg-black/70 disabled:opacity-30 disabled:cursor-not-allowed rounded-full transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-white" />
        </button>
        <button
          onClick={() => goToSlide(currentSlide + 1)}
          disabled={currentSlide === deck.slides.length - 1}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-black/50 hover:bg-black/70 disabled:opacity-30 disabled:cursor-not-allowed rounded-full transition-colors"
        >
          <ChevronRight className="w-5 h-5 text-white" />
        </button>

        {/* Slide Counter */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 bg-black/50 rounded-full text-white text-sm flex items-center gap-2">
          {slide.aiGenerated && <Sparkles className="w-3 h-3 text-accent-400" />}
          {currentSlide + 1} / {deck.slides.length}
        </div>
      </div>

      {/* Slide Thumbnails */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {deck.slides.map((s, index) => (
          <button
            key={s.id}
            onClick={() => goToSlide(index)}
            className={`flex-shrink-0 w-24 h-14 rounded border-2 transition-colors relative overflow-hidden ${
              index === currentSlide
                ? 'border-accent-500'
                : 'border-surface-700 hover:border-surface-600'
            }`}
            style={{ backgroundColor: deck.branding.colors.backgroundAlt }}
          >
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-xs text-surface-400 font-medium">{index + 1}</span>
            </div>
            {s.aiGenerated && (
              <div className="absolute top-1 right-1">
                <Sparkles className="w-2.5 h-2.5 text-accent-400" />
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

// Slide type-specific renderers
function SlideRenderer({ 
  slide, 
  branding 
}: { 
  slide: GeneratedSlide; 
  branding: GeneratedDeck['branding'];
}) {
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
  };

  return (
    <div className="h-full flex flex-col items-center justify-center text-center">
      <h1 
        className="text-3xl font-bold mb-2"
        style={{ color: branding.colors.text }}
      >
        {data.title || 'Untitled Deck'}
      </h1>
      {data.subtitle && (
        <p 
          className="text-lg mb-4"
          style={{ color: branding.colors.textMuted }}
        >
          {data.subtitle}
        </p>
      )}
      <div 
        className="text-sm mt-4"
        style={{ color: branding.colors.textMuted }}
      >
        {data.date && <p>{data.date}</p>}
        {data.preparedFor && <p className="mt-1">Prepared for: {data.preparedFor}</p>}
        {data.preparedBy && <p className="mt-1">By: {data.preparedBy}</p>}
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
    }>;
    footnote?: string;
  };

  return (
    <div className="h-full flex flex-col">
      <h2 
        className="text-xl font-bold mb-6"
        style={{ color: branding.colors.text }}
      >
        {data.title || 'Statistics'}
      </h2>
      <div className="flex-1 grid grid-cols-2 gap-4">
        {data.stats?.map((stat, index) => {
          const IconComponent = stat.icon ? iconMap[stat.icon] : null;
          return (
            <div 
              key={index}
              className="p-4 rounded-lg"
              style={{ backgroundColor: branding.colors.backgroundAlt }}
            >
              <div className="flex items-center gap-2 mb-2">
                {IconComponent && (
                  <span style={{ color: branding.colors.secondary }}>
                    <IconComponent className="w-4 h-4" />
                  </span>
                )}
                <span 
                  className="text-sm"
                  style={{ color: branding.colors.textMuted }}
                >
                  {stat.label}
                </span>
              </div>
              <div 
                className="text-2xl font-bold"
                style={{ color: branding.colors.text }}
              >
                {stat.value}
              </div>
              {stat.trend && (
                <div className={`text-xs mt-1 ${
                  stat.trend === 'up' ? 'text-emerald-400' :
                  stat.trend === 'down' ? 'text-rose-400' : 
                  'text-surface-400'
                }`}>
                  {stat.trend === 'up' ? '↑' : stat.trend === 'down' ? '↓' : '→'}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {data.footnote && (
        <p 
          className="text-xs mt-4"
          style={{ color: branding.colors.textMuted }}
        >
          {data.footnote}
        </p>
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
    }>;
    numbered?: boolean;
  };

  return (
    <div className="h-full flex flex-col">
      <h2 
        className="text-xl font-bold mb-4"
        style={{ color: branding.colors.text }}
      >
        {data.title || 'List'}
      </h2>
      <div className="flex-1 space-y-2 overflow-auto">
        {data.items?.map((item, index) => {
          const IconComponent = item.icon ? iconMap[item.icon] : null;
          return (
            <div 
              key={index}
              className={`p-3 rounded-lg ${item.highlight ? 'ring-1 ring-accent-500/50' : ''}`}
              style={{ backgroundColor: branding.colors.backgroundAlt }}
            >
              <div className="flex items-start gap-3">
                {data.numbered ? (
                  <span 
                    className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{ 
                      backgroundColor: branding.colors.secondary,
                      color: branding.colors.background
                    }}
                  >
                    {index + 1}
                  </span>
                ) : IconComponent ? (
                  <span style={{ color: branding.colors.secondary }}>
                    <IconComponent className="w-5 h-5 mt-0.5" />
                  </span>
                ) : null}
                <div className="flex-1">
                  <p 
                    className="font-medium text-sm"
                    style={{ color: branding.colors.text }}
                  >
                    {item.primary}
                  </p>
                  {item.secondary && (
                    <p 
                      className="text-xs mt-0.5"
                      style={{ color: branding.colors.textMuted }}
                    >
                      {item.secondary}
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
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
    }>;
  };

  return (
    <div className="h-full flex flex-col">
      <h2 
        className="text-xl font-bold mb-4"
        style={{ color: branding.colors.text }}
      >
        {data.title || 'Timeline'}
      </h2>
      <div className="flex-1 overflow-auto">
        <div className="relative pl-6">
          {/* Timeline line */}
          <div 
            className="absolute left-2 top-2 bottom-2 w-0.5"
            style={{ backgroundColor: branding.colors.secondary + '40' }}
          />
          {data.events?.map((event, index) => (
            <div key={index} className="relative mb-4 last:mb-0">
              {/* Timeline dot */}
              <div 
                className={`absolute -left-4 w-4 h-4 rounded-full border-2 ${
                  event.status === 'completed' ? 'bg-emerald-500' :
                  event.status === 'current' ? 'bg-accent-500' : 
                  'bg-surface-600'
                }`}
                style={{ 
                  borderColor: event.status === 'current' ? branding.colors.secondary : 'transparent'
                }}
              />
              <div 
                className="p-3 rounded-lg ml-2"
                style={{ backgroundColor: branding.colors.backgroundAlt }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span 
                    className="text-xs font-medium"
                    style={{ color: branding.colors.secondary }}
                  >
                    {event.date}
                  </span>
                  {event.status === 'current' && (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-accent-500/20 text-accent-400">
                      Current
                    </span>
                  )}
                </div>
                <p 
                  className="font-medium text-sm"
                  style={{ color: branding.colors.text }}
                >
                  {event.title}
                </p>
                {event.description && (
                  <p 
                    className="text-xs mt-1"
                    style={{ color: branding.colors.textMuted }}
                  >
                    {event.description}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
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
    }>;
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-2 mb-4">
        <h2 
          className="text-xl font-bold"
          style={{ color: branding.colors.text }}
        >
          {data.title || 'Talking Points'}
        </h2>
        {data.aiGenerated && (
          <span className="flex items-center gap-1 px-2 py-0.5 bg-accent-500/20 text-accent-400 text-xs rounded">
            <Sparkles className="w-3 h-3" />
            AI Generated
          </span>
        )}
      </div>
      <div className="flex-1 space-y-3 overflow-auto">
        {data.points?.map((point, index) => (
          <div 
            key={index}
            className={`p-3 rounded-lg border-l-4 ${
              point.priority === 'high' ? 'border-amber-500' :
              point.priority === 'medium' ? 'border-blue-500' :
              'border-surface-600'
            }`}
            style={{ backgroundColor: branding.colors.backgroundAlt }}
          >
            <div className="flex items-center gap-2 mb-1">
              <span 
                className="text-xs font-semibold uppercase tracking-wide"
                style={{ color: branding.colors.secondary }}
              >
                {point.topic}
              </span>
              {point.priority === 'high' && (
                <span className="text-xs px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400">
                  Priority
                </span>
              )}
            </div>
            <p 
              className="text-sm leading-relaxed"
              style={{ color: branding.colors.text }}
            >
              "{point.script}"
            </p>
          </div>
        ))}
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

function GenericSlideRenderer({ 
  slide, 
  branding 
}: { 
  slide: GeneratedSlide; 
  branding: GeneratedDeck['branding'];
}) {
  const content = slide.content as { title?: string };

  return (
    <div className="h-full flex items-center justify-center">
      <div className="text-center">
        <h2 
          className="text-2xl font-bold mb-2"
          style={{ color: branding.colors.text }}
        >
          {content.title || `Slide: ${slide.type}`}
        </h2>
        <p 
          className="text-sm"
          style={{ color: branding.colors.textMuted }}
        >
          Slide Type: {slide.type}
          {slide.aiGenerated && ' • AI Generated'}
        </p>
      </div>
    </div>
  );
}
