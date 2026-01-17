# Guardian Intel — Architecture Review & Future Value Brainstorm

> **Review Date:** January 15, 2026  
> **Purpose:** Comprehensive application analysis and strategic roadmap for continuous improvement

---

## Executive Summary

**Guardian Intel** is a Sales Intelligence Command Center built for Guardian Storm Repair—a roofing and storm damage repair company operating in the Mid-Atlantic region (PA, NJ, DE, MD, VA, NY). The platform aggregates data from multiple sources to provide sales reps with comprehensive, actionable insights and predictive analytics focused on storm-damage-driven sales opportunities.

---

## 1. Application Architecture Overview

### 1.1 Tech Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Frontend** | Next.js 15 (App Router) | React framework with SSR/SSG |
| **UI** | Tailwind CSS + Radix UI | Accessible, themeable components |
| **State** | TanStack Query v5 + Zustand | Server state + client state |
| **Database** | PostgreSQL + Prisma ORM | Type-safe database access |
| **Auth** | NextAuth.js v4 | JWT-based authentication |
| **AI** | Multi-model router | Gemini, Claude, OpenAI, Perplexity adapters |
| **Maps** | Leaflet + RainViewer | Weather radar & customer mapping |
| **Cache** | Upstash Redis | Rate limiting & API caching |
| **Real-time** | SSE (Server-Sent Events) | Live dashboard updates |
| **PWA** | next-pwa + Web Push | Offline support & notifications |

### 1.2 Core Domain Model

```
User (Sales Rep / Manager / Admin)
  │
  ├── Customer (Lead → Prospect → Customer → Closed)
  │     ├── Interactions (calls, emails, visits)
  │     ├── IntelItems (property data, insurance info, weather events)
  │     ├── WeatherEvents (hail, wind, storm damage)
  │     ├── Notes, Documents, Tasks
  │     └── InsuranceClaims
  │
  ├── Playbooks (sales scripts, objection handling)
  │
  └── Conversations (AI chat history)
```

### 1.3 Service Architecture

```
/src/lib/services/
├── ai/                 # Multi-model AI router with adapters
│   ├── adapters/       # Claude, Gemini, OpenAI, Perplexity, Kimi
│   ├── tools.ts        # AI function calling tools
│   ├── context.ts      # Customer context builder
│   └── router.ts       # Model routing logic
├── weather/            # NOAA + storm intelligence
│   ├── noaa-service.ts # NWS API integration
│   └── storm-intel-service.ts
├── scoring/            # Lead scoring algorithms
├── crm/                # CRM adapters (Leap, placeholder)
├── geocoding/          # Address-to-coordinates
├── property/           # Street View + property data
├── analytics/          # Daily metrics aggregation
└── audit/              # Activity logging
```

### 1.4 Key Features Currently Implemented

| Feature | Status | Notes |
|---------|--------|-------|
| Customer Intel Dashboard | ✅ Complete | Priority customers, lead scoring, urgency indicators |
| Storm Intelligence | ✅ Complete | Live radar, NOAA alerts, affected customer mapping |
| Analytics Dashboard | ✅ Complete | Revenue tracking, pipeline funnel, team leaderboard |
| AI Chat Assistant | ✅ Complete | Multi-model support, tool calling |
| Real-time Updates (SSE) | ✅ Complete | Dashboard auto-refresh on events |
| Activity Timeline | ✅ Complete | Chronological customer history |
| Bulk Actions | ✅ Complete | Multi-select, bulk update/delete/export |
| Keyboard Shortcuts | ✅ Complete | Power-user navigation |
| Push Notifications | ✅ Complete | Storm alerts to mobile |
| Playbooks | 🟡 Partial | UI exists, CRUD needs completion |
| CRM Sync | 🟡 Partial | Leap adapter exists, sync logic needed |
| Database Indexes | ✅ Complete | Performance optimized |

---

## 2. Strengths of Current Architecture

### 2.1 Domain-Driven Design
The application is deeply aligned with the storm repair business domain:
- **Weather-centric scoring**: Lead urgency increases after storm events
- **Insurance claim window tracking**: Countdown to 1-year claim deadline
- **Roof age & condition factors**: Property intelligence drives sales prioritization

### 2.2 Multi-Model AI Strategy
The AI router pattern allows:
- Provider redundancy (if Gemini fails, fall back to Claude)
- Task-specific model selection (Perplexity for research, Claude for reasoning)
- Easy addition of new models without refactoring

### 2.3 Real-time Architecture
- SSE provides instant updates without WebSocket complexity
- Graceful degradation to polling if SSE fails
- Visual connection status indicator

### 2.4 Type Safety
- Prisma generates TypeScript types from schema
- Zod validation on API inputs
- Shared types between frontend and backend

---

## 3. Areas for Improvement

### 3.1 Data Gaps
- **Mock data in production paths**: Weather service still generates mock historical events
- **Property data enrichment**: Street View works but property values are simulated
- **Insurance carrier intelligence**: No real integration with carrier databases

### 3.2 AI Tool Completion
From `IMPROVEMENT_PLAN.md`, these AI tools need real database queries:
- `get_customer`: Returns mock data
- `search_customers`: Not connected to Prisma
- `update_customer_stage`: No activity logging
- `check_weather_events`: Mock implementation

### 3.3 Testing Coverage
- Unit tests exist for scoring & utils
- E2E tests for login & dashboard
- **Missing**: Integration tests for API routes, AI service tests

### 3.4 Caching Strategy
- Rate limiting uses Upstash Redis
- **Missing**: Dashboard response caching, Street View URL caching

---

## 4. Future Value Opportunities

### 4.1 🎯 Immediate High-Impact Features

#### A. **AI-Powered Daily Briefing**
Generate a personalized morning briefing for each sales rep:
- Today's priority customers (sorted by urgency × profit potential)
- Weather forecast for their territory
- Deals at risk of going cold
- Suggested talking points for scheduled calls

**Implementation**: New API endpoint `/api/ai/daily-brief` + scheduled job

#### B. **Predictive Storm Canvassing**
Use historical storm patterns + weather forecasts to predict:
- Which neighborhoods will be affected
- Pre-position reps before storms hit
- Auto-generate canvassing routes

**Implementation**: ML model trained on NOAA historical data + Google Routes API

#### C. **Insurance Carrier Intelligence**
Build a database of carrier-specific knowledge:
- Approval rates by carrier
- Average claim processing time
- Adjuster behavior patterns
- Supplement success rates

**Implementation**: New `InsuranceCarrier` model + AI-assisted data extraction

#### D. **Voice Call Intelligence**
Integrate with phone system to:
- Transcribe calls automatically
- Detect customer objections in real-time
- Suggest playbook responses
- Log call summaries to customer timeline

**Implementation**: Twilio integration + Whisper API for transcription

### 4.2 📈 Revenue-Driving Features

#### E. **Smart Proposal Generator**
AI-generated proposals based on:
- Property data (roof size, material, age)
- Storm damage assessment
- Insurance carrier policies
- Historical win rates for similar jobs

**Implementation**: Document generation with AI + templating

#### F. **Competitor Analysis Dashboard**
Track competitor activity:
- Which neighborhoods they're canvassing
- Their pricing patterns
- Win/loss analysis by competitor

**Implementation**: Rep input forms + AI pattern analysis

#### G. **Customer Referral Engine**
Automate referral requests:
- Identify satisfied customers (high NPS, completed jobs)
- AI-personalized referral request emails
- Track referral attribution

**Implementation**: NPS integration + automated email sequences

#### H. **Upsell Opportunity Detector**
Identify additional services for existing customers:
- Siding damage detected during roof inspection
- Gutter condition assessment
- Window replacement opportunities

**Implementation**: AI image analysis of inspection photos

### 4.3 🔧 Operational Efficiency Features

#### I. **Automated Follow-up Sequences**
Configure drip campaigns:
- Post-storm outreach sequences
- Quote follow-up automation
- Claim status check-ins

**Implementation**: Workflow engine + email/SMS integration

#### J. **Territory Management**
Visual territory assignment:
- Heat map of opportunity density
- Rep workload balancing
- Route optimization for site visits

**Implementation**: Enhanced map view + algorithm for distribution

#### K. **Document Management**
Centralized document hub:
- Photo uploads with AI damage detection
- Contract e-signatures
- Insurance document parsing

**Implementation**: AWS S3 + OCR + e-signature API

#### L. **Mobile-First Field App**
Dedicated mobile experience:
- Offline inspection forms
- Quick photo capture with GPS tagging
- Voice notes with transcription
- One-tap customer check-in

**Implementation**: React Native or enhanced PWA

### 4.4 🧠 Advanced AI Features

#### M. **Objection Handling Coach**
Real-time objection detection and response suggestions:
- "Too expensive" → Financing options playbook
- "Getting other quotes" → Value differentiation script
- "Need to think about it" → Urgency creation techniques

**Implementation**: Streaming AI analysis during calls

#### N. **Deal Risk Scoring**
Predict probability of deal closure:
- Customer engagement signals
- Response time patterns
- Competitor mentions
- Sentiment analysis from interactions

**Implementation**: ML model trained on historical win/loss data

#### O. **Market Intelligence Feed**
Curated industry news relevant to each rep's territory:
- Local storm reports
- Competitor news
- Insurance policy changes
- Material price fluctuations

**Implementation**: Perplexity API for research + relevance filtering

#### P. **AI Meeting Prep**
Before customer meetings, generate:
- Customer history summary
- Likely objections and responses
- Personalized value propositions
- Suggested next steps

**Implementation**: Context-aware AI prompt with customer data

### 4.5 🔗 Integration Opportunities

| Integration | Value |
|-------------|-------|
| **Leap CRM** | Full bi-directional sync (partially implemented) |
| **JobNimbus** | Alternative CRM for some roofing companies |
| **EagleView** | Aerial roof measurement API |
| **HOVER** | 3D property modeling from photos |
| **Xactimate** | Insurance estimating software |
| **QuickBooks** | Invoice and payment tracking |
| **Calendly** | Appointment scheduling |
| **RingCentral/Twilio** | Phone system integration |
| **DocuSign** | Contract e-signatures |
| **Mailchimp/SendGrid** | Email marketing automation |
| **Google Workspace** | Calendar, Drive, Gmail integration |
| **Slack/Teams** | Team notifications |

### 4.6 📊 Analytics Enhancements

#### Q. **Cohort Analysis**
Track customer cohorts by:
- Lead source (canvassing, referral, storm, online)
- Storm event (compare performance by storm)
- Rep (identify top performers' patterns)

#### R. **Attribution Modeling**
Understand which touchpoints drive conversions:
- First-touch vs last-touch attribution
- Multi-touch journey analysis
- Channel ROI calculation

#### S. **Forecasting Dashboard**
Predict future performance:
- Revenue forecast by rep/team
- Pipeline velocity trends
- Seasonal adjustment models

### 4.7 🛡️ Quality & Compliance

#### T. **Audit Trail Enhancement**
Complete activity logging for:
- All customer data changes
- Document access
- Price quote modifications
- User permission changes

#### U. **Data Quality Dashboard**
Identify and fix data issues:
- Missing customer information
- Stale records (no activity > 90 days)
- Duplicate detection
- Invalid addresses

#### V. **Compliance Checklist**
Ensure regulatory compliance:
- Required disclosures tracking
- License verification
- Insurance certificate management

---

## 5. Prioritized Implementation Roadmap

### Phase 1: Foundation Completion (Current Sprint)
1. ✅ Complete Playbooks CRUD system
2. ✅ Wire AI tools to real database queries
3. ✅ Implement dashboard caching layer
4. ✅ Add comprehensive API tests

### Phase 2: AI Enhancement
1. Daily briefing generation
2. AI meeting prep assistant
3. Objection handling coach
4. Call transcription integration

### Phase 3: Automation
1. Follow-up sequence builder
2. Smart proposal generator
3. Referral engine
4. Territory management

### Phase 4: Advanced Analytics
1. Predictive deal scoring
2. Cohort analysis
3. Forecasting dashboard
4. Attribution modeling

### Phase 5: Ecosystem Expansion
1. Mobile field app
2. CRM bi-directional sync
3. EagleView/HOVER integration
4. E-signature integration

---

## 6. Technical Debt to Address

| Item | Priority | Effort |
|------|----------|--------|
| Replace mock weather data with real NOAA historical queries | High | Medium |
| Complete AI tool implementations | High | Medium |
| Add integration tests for API routes | Medium | Medium |
| Implement Street View caching | Medium | Low |
| Add error boundary to all pages | Low | Low |
| Migrate to Next.js 15 stable patterns | Low | High |

---

## 7. Success Metrics

### Business Metrics
- **Lead conversion rate**: Target 35%+ (from qualified to closed)
- **Response time**: < 2 hours to new leads
- **Storm opportunity capture**: 80%+ of affected customers contacted within 48 hours
- **Rep productivity**: 15%+ increase in deals per rep

### Technical Metrics
- **Page load time**: < 2 seconds (P95)
- **API response time**: < 500ms (P95)
- **Uptime**: 99.9%
- **Error rate**: < 0.1%

---

## Conclusion

Guardian Intel has a solid foundation with domain-specific intelligence that differentiates it from generic CRMs. The multi-model AI architecture, real-time updates, and storm-centric design create a powerful platform for storm repair sales teams.

The highest-value opportunities lie in:
1. **AI-powered automation** (daily briefings, meeting prep, call coaching)
2. **Predictive analytics** (deal scoring, storm canvassing)
3. **Integration depth** (CRM sync, phone system, document management)

Each feature should be evaluated against the core mission: **Help sales reps close more storm damage deals faster by providing actionable intelligence at the right moment.**

---

*Document maintained by the Guardian Intel development team.*
