# Deck Generator Feature - PRD

## Group 0: Foundation

- [ ] **DECK-001: Create TypeScript Types** - Create `src/features/deck-generator/types/deck.types.ts` with all type definitions from DECK_GENERATOR_IMPLEMENTATION_GUIDE.md: DeckAudience, SlideType, ContextType, ExportFormat, ContextRequirement, SlideSection, BrandingConfig, DeckTemplate, all SlideContent variants, GeneratedSlide, GeneratedDeck, DeckGenerationRequest, DeckGenerationProgress, DeckGenerationResponse, DeckGeneratorState, DeckHistoryItem

- [ ] **DECK-002: Create Branding Config** - Create `src/features/deck-generator/utils/brandingConfig.ts` with guardianBrandConfig (dark: primary #1E3A5F, secondary #D4A656, accent #4A90A4, background #0F1419), guardianLightBrandConfig (light theme), and getBrandingForAudience() helper

## Group 1: Templates

- [ ] **DECK-003: Customer Cheat Sheet Template** - Create `src/features/deck-generator/templates/customer-cheat-sheet.ts` with sections: title, customer-overview, property-intel, storm-history, talking-points (aiEnhanced), objection-handlers (aiEnhanced), next-steps. Reference DECK_GENERATOR_IMPLEMENTATION_GUIDE.md

- [ ] **DECK-004: Project Timeline Template** - Create `src/features/deck-generator/templates/project-timeline.ts` with TWO exports: projectTimelineTemplate (manager, dark) and projectTimelineCustomerTemplate (customer, light). Sections: title, project-stats, timeline, upcoming-tasks, weather-forecast

- [ ] **DECK-005: Storm Deployment Template** - Create `src/features/deck-generator/templates/storm-deployment.ts` with sections: title, storm-stats, affected-map (type: map), priority-leads (aiEnhanced), team-assignments (aiEnhanced), talking-points (aiEnhanced), logistics

- [ ] **DECK-006: Insurance Prep + Team Performance Templates** - Create TWO files: `src/features/deck-generator/templates/insurance-prep.ts` (adjuster meeting prep) and `src/features/deck-generator/templates/team-performance.ts` (leadership reports). Reference DECK_GENERATOR_IMPLEMENTATION_GUIDE.md for sections

- [ ] **DECK-007: Market Analysis + Templates Index** - Create `src/features/deck-generator/templates/market-analysis.ts` and `src/features/deck-generator/templates/index.ts` barrel export with deckTemplates array, individual exports, and helpers: getTemplateById, getTemplatesByAudience, getTemplatesByCategory, templateCategories

## Group 2: Data Layer + Hooks

- [ ] **DECK-008: Data Aggregator** - Create `src/features/deck-generator/utils/dataAggregator.ts` with functions: getCustomerTitleData, getCustomerOverviewStats, getPropertyIntelData, getStormHistoryTimeline, generateCustomerTalkingPoints, generateObjectionHandlers, getTeamKPIStats, getLeaderboardData, getRevenueTrendData, getStormImpactStats, getPriorityStormLeads, generateStormTalkingPoints. Also dataSourceRegistry and fetchDataForSlide helper

- [ ] **DECK-009: Deck Generation Hook** - Create `src/features/deck-generator/hooks/useDeckGeneration.ts` returning: isGenerating, progress, generatedDeck, error, generateDeck(template, request), resetGeneration(). Loop through sections calling fetchDataForSlide

- [ ] **DECK-010: Templates Hook + Index** - Create `src/features/deck-generator/hooks/useDeckTemplates.ts` with templates, categories, getTemplate, getByAudience, getByCategory, searchTemplates. Create `src/features/deck-generator/hooks/index.ts` barrel export

## Group 3: UI Components

- [ ] **DECK-011: Template Selector** - Create `src/features/deck-generator/components/DeckTemplateSelector.tsx` with search input, category filter buttons, template grid with cards (icon, name, description, estimated slides, AI badge), framer-motion animations

- [ ] **DECK-012: Customizer Component** - Create `src/features/deck-generator/components/DeckCustomizer.tsx` with context dropdowns, section toggles with checkboxes, AI badges, required sections disabled, export format selector (PDF/PPTX/Link)

- [ ] **DECK-013: Preview Component** - Create `src/features/deck-generator/components/DeckPreview.tsx` with 16:9 aspect ratio preview, navigation arrows, slide counter, thumbnail strip, branding colors applied

## Group 4: Main Modal + Integration

- [ ] **DECK-014: Main Modal** - Create `src/features/deck-generator/components/DeckGeneratorModal.tsx` with multi-step flow (select-template → customize → generating → preview), AnimatePresence transitions, header/footer, progress indicator, error state, Download/Share buttons. Compose DeckTemplateSelector, DeckCustomizer, DeckPreview

- [ ] **DECK-015: Barrel Exports** - Create `src/features/deck-generator/components/index.ts`, `src/features/deck-generator/utils/index.ts`, and `src/features/deck-generator/index.ts` main feature export

## Group 5: Final Integration

- [ ] **DECK-016: Customer Card Integration** - Add "Generate Prep Deck" button to `src/components/customer-intel-card.tsx`. Import DeckGeneratorModal, add showDeckGenerator state, add button with Presentation icon, add modal with initialContext and initialTemplateId="customer-cheat-sheet". Run npm run build to verify
