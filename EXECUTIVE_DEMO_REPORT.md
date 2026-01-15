# Guardian Intel — Executive Demo Report

> **Prepared for:** Guardian Storm Repair Executive Team  
> **Date:** January 15, 2026  
> **Version:** 1.0  
> **Classification:** Internal

---

## Executive Summary

Guardian Intel is a comprehensive **Sales Intelligence Command Center** designed specifically for Guardian Storm Repair. The platform aggregates data from multiple sources to provide sales representatives with actionable insights, predictive analytics, and real-time weather intelligence—enabling faster response times, higher conversion rates, and maximized revenue from storm damage opportunities.

### Key Value Propositions

1. **Real-Time Storm Intelligence** — Automatic detection of hail, wind, and severe weather events with immediate customer impact analysis
2. **AI-Powered Lead Scoring** — Dynamic scoring based on 15+ signals including roof age, storm exposure, insurance readiness, and engagement patterns
3. **Unified Customer Intelligence** — Single view of customer data aggregated from weather APIs, property records, and CRM systems
4. **Sales Enablement** — Battle-tested playbooks, objection handlers, and AI-generated call scripts

---

## Current Features

### 1. Customer Intelligence Dashboard

The command center provides an at-a-glance view of critical business metrics and actionable opportunities.

**Key Capabilities:**
- **Live Metrics Display** — Revenue MTD, pipeline value, storm opportunity, and hot leads with real-time updates
- **Priority Customer Cards** — Expandable intel cards showing lead score, urgency indicators, profit potential, and recommended next actions
- **Alert System** — Real-time notifications for weather events, high-value opportunities, and time-sensitive actions
- **Quick Actions** — One-click access to storm canvass mode and dial-next-lead functionality

**Technical Implementation:**
- Server-Sent Events (SSE) for real-time updates
- TanStack Query v5 for optimized data fetching with caching
- 60-second polling with SSE overlay for critical updates

---

### 2. Advanced Lead Scoring Engine

Proprietary scoring algorithm that dynamically evaluates customer value and urgency.

**Scoring Dimensions:**

| Score Type | Range | Key Factors |
|------------|-------|-------------|
| **Lead Score** | 0-100 | Property value, roof condition, engagement, storm exposure |
| **Urgency Score** | 0-100 | Roof age, recent storms, claim window timing, contact recency |
| **Churn Risk** | 0-100 | Contact silence, quote age, competitor activity, objections |
| **Profit Potential** | $ | Square footage × regional rate × roof type multiplier |

**Scoring Signals:**
- Roof age vs. 20-year lifespan
- Days since last storm event (weighted by severity)
- Insurance claim window remaining (365-day countdown)
- Property value relative to regional average
- Pipeline stage progression
- Competitor mention detection in notes
- Objection pattern analysis

---

### 3. Storm Intelligence Center

Real-time weather monitoring integrated with NOAA and RainViewer for proactive opportunity identification.

**Features:**
- **Live Weather Radar** — Animated radar overlay showing precipitation, storm cells, and severe weather
- **Active Alert Management** — Filtered by severity (minor → catastrophic), type (hail, wind, tornado), and geography
- **Historical Storm Events** — 90-day lookback with affected customer mapping
- **Opportunity Calculator** — Automatic estimation of total addressable opportunity by storm event
- **Affected Customer Filtering** — One-click navigation to customers in storm-impacted areas

**Data Sources:**
- NOAA National Weather Service API
- RainViewer radar imagery
- US Census Geocoding API
- Storm event database

---

### 4. Customer Relationship Management

Full CRM functionality with intelligent automation and bulk operations.

**Customer Management:**
- **Add/Edit/Delete** customers with comprehensive property and insurance data
- **Advanced Search** — Full-text search on name, email, phone, and address
- **Multi-View Options** — Card view for detailed intel, table view for bulk operations
- **Stage Tracking** — New → Contacted → Qualified → Proposal → Negotiation → Closed

**Bulk Operations:**
- Multi-select with floating action bar
- Bulk status/stage updates
- Bulk assignment to representatives
- Bulk export to CSV
- Customer comparison modal (2-4 customers side-by-side)

**Activity Timeline:**
- Chronological view of all interactions, weather events, and stage changes
- Grouped by date (Today, Yesterday, This Week, etc.)
- Infinite scroll pagination for long histories

---

### 5. AI Assistant (Guardian Intel AI)

Multi-model AI assistant with customer context awareness and tool execution capabilities.

**Capabilities:**
- **Conversational Interface** — Natural language queries about customers, pipeline, and weather
- **Customer Context Integration** — Automatically enriched prompts with relevant customer data
- **Tool Execution** — AI can query database, check weather, and update records
- **Persistent Conversations** — History saved per user with search functionality
- **Suggested Prompts** — Pre-built prompts for common tasks

**Pre-Built AI Prompts:**
1. **Next Steps** — Recommended actions based on customer situation
2. **Weather Check** — Storm briefing and impact analysis
3. **Generate Script** — Personalized call script with opening, talking points, and close
4. **Objection Handling** — Predicted objections with tailored rebuttals

**AI Models Supported:**
- Google Gemini (Primary)
- Claude (Anthropic) — Enhanced reasoning
- OpenAI GPT-4
- Perplexity — Web research
- Kimi K2 — Specialized chat

---

### 6. Sales Playbooks

Comprehensive knowledge base of sales scripts, objection handlers, and best practices.

**Categories:**
- Storm Response
- Objection Handling
- Closing Techniques
- Customer Retention
- Cold Calling
- Discovery
- Presentation
- Follow-up

**Features:**
- **Full CRUD** — Create, read, update, delete playbooks
- **Markdown Editor** — Rich text formatting with preview
- **Practice Mode** — Guided step-by-step walkthrough with progress tracking
- **Copy Script** — One-click copy of any script section
- **Favorites** — Star frequently used playbooks
- **Usage Tracking** — Analytics on playbook popularity
- **Feedback System** — Rate effectiveness and suggest improvements

---

### 7. Analytics & Manager Dashboard

Comprehensive performance analytics for managers and executives.

**KPI Dashboard:**
- Total Revenue vs. Target (with progress bar)
- Deals Closed vs. Goal
- Average Deal Size
- Pipeline Value and Count
- Team Conversion Rate
- At-Risk Deal Count

**Visualizations:**
- **Sales Pipeline Funnel** — Stage-by-stage value breakdown
- **Weekly Activity Chart** — Calls, appointments, and closures by day
- **Team Leaderboard** — Ranked by revenue with conversion rates and trends

**Manager Tools:**
- **Rep Coaching Modal** — View individual stats, schedule 1:1s, call/email directly
- **At-Risk Deals Panel** — Stalled opportunities requiring intervention
- **Top Performers Recognition** — Highlight and celebrate wins
- **Coaching Opportunities** — Identify reps trending down

**Daily Metrics Aggregation:**
- Automated daily rollup of all activity metrics
- Scheduled Vercel cron job (2:00 AM UTC)
- Manual backfill capability for historical data

---

### 8. Settings & Integrations

Comprehensive configuration options for users and administrators.

**Profile Settings:**
- Update personal information
- Change password with current password verification
- Avatar upload

**Notification Preferences:**
- Storm alerts toggle
- New lead assignments
- Claim status updates
- Task reminders
- Team activity

**CRM Integration:**
- **Leap CRM** — Primary integration (adapter ready)
- HubSpot connector (planned)
- Salesforce connector (planned)

**Data Source Status:**
- Weather Intelligence (NOAA) — Connected
- Property Data — Connected
- Mapping Service (RainViewer) — Connected

**API Management:**
- Generate/revoke API keys
- Webhook endpoint configuration
- Copy-to-clipboard functionality

**Appearance:**
- Theme selection: Dark, Slate, Light
- Persistent theme preference

---

### 9. Technical Architecture

**Frontend Stack:**
| Technology | Purpose |
|------------|---------|
| Next.js 15 | React framework with App Router |
| TypeScript | Type-safe development |
| Tailwind CSS | Utility-first styling |
| Radix UI | Accessible component primitives |
| Framer Motion | Smooth animations |
| TanStack Query v5 | Data fetching & caching |
| Zustand | Lightweight state management |
| Recharts | Data visualization |
| Leaflet + react-leaflet | Interactive mapping |

**Backend Stack:**
| Technology | Purpose |
|------------|---------|
| Next.js API Routes | Serverless functions |
| Prisma ORM | Type-safe database access |
| PostgreSQL | Primary database |
| NextAuth.js v4 | Authentication (JWT) |
| Zod | Runtime validation |

**Infrastructure:**
| Service | Purpose |
|---------|---------|
| Vercel | Hosting & deployment |
| Upstash Redis | Rate limiting & caching |
| Supabase | Real-time subscriptions (optional) |

**Testing:**
- Vitest — Unit tests
- Playwright — End-to-end tests

---

### 10. Security Features

- **Authentication** — Credentials-based with bcrypt password hashing
- **Session Management** — JWT tokens with secure HTTP-only cookies
- **Role-Based Access** — Rep, Manager, Admin roles
- **Rate Limiting** — Upstash Redis-based request throttling
- **Audit Logging** — Activity tracking for sensitive operations
- **Input Validation** — Zod schemas on all API endpoints
- **CSRF Protection** — NextAuth built-in protections

---

## Future Upgrade Roadmap

### Phase 1: Infrastructure Improvements

#### 1.1 Database Performance Optimization
- Add indexes on `Customer.assignedRepId`, `Customer.leadScore`, `WeatherEvent.eventDate`
- Composite index on `Customer(status, stage)` for filtered queries
- Query optimization for dashboard aggregations

#### 1.2 Enhanced Geocoding
- Replace hardcoded ZIP mappings with US Census Geocoder API
- Add coordinate caching to reduce API calls
- Fallback to approximate coordinates on API failure

#### 1.3 Caching Layer
- Dashboard response caching (30-second TTL)
- Street View image URL caching (1-hour TTL)
- Cache invalidation on relevant mutations
- Cache-control headers for CDN optimization

---

### Phase 2: AI Enhancements

#### 2.1 Complete AI Tool Implementations
- `get_customer` — Full customer profile with relations
- `search_customers` — Full-text search capability
- `update_customer_stage` — Stage changes with activity logging
- `schedule_followup` — Task creation from AI
- `check_weather_events` — Location/date range queries
- `get_storm_opportunities` — Aggregate storm-affected customers
- `get_pipeline_summary` — Stage aggregation with values
- `get_hot_leads` — High-score lead retrieval

#### 2.2 AI-Powered Features
- Automatic email/call summary generation
- Predictive churn alerts
- Optimal contact time recommendations
- Cross-sell/upsell opportunity detection

---

### Phase 3: Real-Time Capabilities

#### 3.1 Enhanced Real-Time Updates
- Server-Sent Events for storm alerts (sub-second latency)
- Supabase Realtime for database changes
- Visual connection status indicator
- Reconnection with exponential backoff

#### 3.2 Push Notifications
- Web Push for critical alerts (storm events, hot leads)
- Configurable notification preferences
- Mobile-friendly PWA support

---

### Phase 4: CRM Integration

#### 4.1 Leap CRM (Primary)
- Bi-directional contact sync
- Job/appointment synchronization
- Automatic activity logging
- Webhook-based real-time updates

#### 4.2 Additional CRMs (Future)
- HubSpot integration
- Salesforce connector
- JobNimbus adapter

---

### Phase 5: Advanced Analytics

#### 5.1 Predictive Analytics
- Revenue forecasting models
- Win probability scoring
- Optimal pricing recommendations
- Territory optimization

#### 5.2 Custom Reports
- Report builder interface
- Scheduled email reports
- PDF export capability
- Dashboard customization

---

### Phase 6: Mobile Experience

#### 6.1 Progressive Web App
- Offline capability
- Home screen installation
- Push notifications
- Camera integration for photos

#### 6.2 Field Mode
- Simplified mobile interface
- One-tap calling
- Quick note capture
- Location-based customer lookup

---

## Implementation Progress

### Completed Sessions ✅

| Session | Feature | Status |
|---------|---------|--------|
| 1 | Database Indexes & Geocoding | ✅ Complete |
| 4 | Real-Time Updates (SSE) | ✅ Complete |
| 5 | Customer Activity Timeline | ✅ Complete |
| 6 | Bulk Actions on Customers | ✅ Complete |
| 7 | Daily Metrics Aggregation | ✅ Complete |
| 9 | Playbooks CRUD System | ✅ Complete |
| 10 | Error Handling & Map Clustering | ✅ Complete |

### In Progress 🔄

| Session | Feature | Status |
|---------|---------|--------|
| 2 | Complete AI Tool Implementations | 🔄 Partial |
| 3 | Keyboard Shortcuts & Optimistic Updates | 🔄 Partial |
| 8 | Caching Layer | 🔄 Pending |

---

## Demo Highlights

### For Sales Reps
1. **Storm Alert Workflow** — Show real-time alert → affected customers → one-click filter
2. **AI Assistant** — Demonstrate call script generation for specific customer
3. **Customer Card** — Expand to show scoring breakdown and intel items
4. **Playbook Practice Mode** — Walk through objection handling script

### For Managers
1. **Leaderboard** — Show team rankings with coaching options
2. **At-Risk Deals** — Demonstrate intervention workflow
3. **Analytics Export** — Generate and download report
4. **Bulk Operations** — Select multiple customers, change stage

### For Executives
1. **Revenue Dashboard** — MTD vs. target with growth metrics
2. **Storm Opportunity** — Show total addressable market from recent events
3. **Pipeline Visualization** — Stage-by-stage funnel
4. **AI ROI** — Time saved per rep with automated scripts

---

## Appendix: Data Model Overview

### Core Entities
- **User** — Sales reps, managers, admins with performance metrics
- **Customer** — Full property, roof, insurance, and scoring data
- **Interaction** — Calls, emails, visits with outcomes
- **Task** — Follow-ups, reminders, scheduled activities

### Intelligence Entities
- **IntelItem** — Discovered insights from various sources
- **WeatherEvent** — Storm events with damage assessments
- **InsuranceClaim** — Claim tracking with financials
- **PropertyData** — External property records

### Analytics Entities
- **DailyMetrics** — Aggregated daily stats by user
- **Activity** — Audit log for compliance
- **Playbook** — Sales scripts and guides

### AI Entities
- **Conversation** — Chat history per user
- **Message** — Individual messages with model metadata

---

## Contact

**Technical Questions:**  
Contact the development team for implementation details.

**Business Questions:**  
Contact Guardian Intel product management.

---

*This document is confidential and intended for Guardian Storm Repair internal use only.*

---

**Document Version History:**

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-01-15 | AI Assistant | Initial executive demo report |
