"use client";

import { useMemo, useCallback } from 'react';
import type { DeckTemplate } from '../types/deck.types';
import { 
  deckTemplates, 
  getTemplateById, 
  getTemplatesByAudience,
  getTemplatesByCategory,
  templateCategories 
} from '../templates';

interface UseDeckTemplatesReturn {
  templates: DeckTemplate[];
  categories: typeof templateCategories;
  getTemplate: (id: string) => DeckTemplate | undefined;
  getByAudience: (audience: string) => DeckTemplate[];
  getByCategory: (category: string) => DeckTemplate[];
  searchTemplates: (query: string) => DeckTemplate[];
}

export function useDeckTemplates(): UseDeckTemplatesReturn {
  const searchTemplates = useCallback((query: string): DeckTemplate[] => {
    if (!query.trim()) return deckTemplates;
    
    const lowerQuery = query.toLowerCase();
    return deckTemplates.filter(template => 
      template.name.toLowerCase().includes(lowerQuery) ||
      template.description.toLowerCase().includes(lowerQuery) ||
      template.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
    );
  }, []);

  const memoizedGetTemplate = useCallback((id: string) => getTemplateById(id), []);
  const memoizedGetByAudience = useCallback((audience: string) => getTemplatesByAudience(audience), []);
  const memoizedGetByCategory = useCallback((category: string) => getTemplatesByCategory(category), []);

  return useMemo(() => ({
    templates: deckTemplates,
    categories: templateCategories,
    getTemplate: memoizedGetTemplate,
    getByAudience: memoizedGetByAudience,
    getByCategory: memoizedGetByCategory,
    searchTemplates,
  }), [memoizedGetTemplate, memoizedGetByAudience, memoizedGetByCategory, searchTemplates]);
}
