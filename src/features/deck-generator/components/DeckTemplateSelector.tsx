"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Search,
  FileText,
  ChevronRight,
  Layers,
  Clock,
  Sparkles,
  Target,
  Settings,
  Crown,
  Users,
  UserCircle,
  Calendar,
  CloudLightning,
  FileCheck,
  TrendingUp,
} from 'lucide-react';
import type { DeckTemplate } from '../types/deck.types';
import { templateCategories } from '../templates';

// Icon mapping for dynamic icon rendering
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Target,
  Settings,
  Crown,
  Users,
  UserCircle,
  Calendar,
  CloudLightning,
  FileCheck,
  TrendingUp,
  FileText,
};

interface DeckTemplateSelectorProps {
  templates: DeckTemplate[];
  onSelect: (template: DeckTemplate) => void;
}

export function DeckTemplateSelector({ templates, onSelect }: DeckTemplateSelectorProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Filter templates
  const filteredTemplates = templates.filter(template => {
    const matchesCategory = !selectedCategory || template.category === selectedCategory;
    const matchesSearch = !searchQuery || 
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Get icon component dynamically
  const getIcon = (iconName: string) => {
    return iconMap[iconName] || FileText;
  };

  return (
    <div className="p-6">
      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
        <input
          type="text"
          placeholder="Search templates..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-surface-secondary border border-border rounded-lg text-text-primary placeholder-surface-400 focus:outline-none focus:ring-2 focus:ring-intel-500/50 focus:border-intel-500"
        />
      </div>

      {/* Category Filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setSelectedCategory(null)}
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
            selectedCategory === null
              ? 'bg-intel-500 text-void-900'
              : 'bg-surface-secondary text-text-secondary hover:bg-[hsl(var(--bg-hover))]'
          }`}
        >
          All
        </button>
        {templateCategories.map(category => {
          const CategoryIcon = getIcon(category.icon);
          return (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                selectedCategory === category.id
                  ? 'bg-intel-500 text-void-900'
                  : 'bg-surface-secondary text-text-secondary hover:bg-[hsl(var(--bg-hover))]'
              }`}
            >
              <CategoryIcon className="w-3.5 h-3.5" />
              {category.name}
            </button>
          );
        })}
      </div>

      {/* Template Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredTemplates.map((template, index) => {
          const TemplateIcon = getIcon(template.icon);
          return (
            <motion.button
              key={template.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => onSelect(template)}
              className="flex items-start gap-4 p-4 bg-surface-secondary/50 hover:bg-surface-secondary border border-border hover:border-intel-500/50 rounded-xl text-left transition-all group"
            >
              <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center bg-surface-hover group-hover:bg-intel-500/20 rounded-lg transition-colors">
                <TemplateIcon className="w-6 h-6 text-intel-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-text-primary group-hover:text-intel-300 transition-colors">
                  {template.name}
                </h3>
                <p className="text-sm text-text-muted mt-1 line-clamp-2">
                  {template.description}
                </p>
                <div className="flex items-center gap-3 mt-2 text-xs text-text-muted">
                  <span className="flex items-center gap-1">
                    <Layers className="w-3 h-3" />
                    ~{template.estimatedSlides} slides
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    ~{template.estimatedGenerationTime}s
                  </span>
                  {template.sections.some(s => s.aiEnhanced) && (
                    <span className="flex items-center gap-1 text-intel-400">
                      <Sparkles className="w-3 h-3" />
                      AI-enhanced
                    </span>
                  )}
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-text-muted group-hover:text-intel-400 transition-colors" />
            </motion.button>
          );
        })}
      </div>

      {filteredTemplates.length === 0 && (
        <div className="text-center py-12">
          <Search className="w-12 h-12 text-text-muted mx-auto mb-4" />
          <p className="text-text-muted">No templates match your search</p>
        </div>
      )}
    </div>
  );
}
