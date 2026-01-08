# Guardian Intel - Architecture Documentation

> This document describes how the application works inside and out.

## Overview

Guardian Intel is a **Sales Intelligence Command Center** for Guardian Storm Repair. It aggregates data from weather APIs, CRM systems, and property databases to help sales reps identify and prioritize storm-damaged properties.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| UI Components | Radix UI primitives (via shadcn/ui) |
| Database | SQLite (via Prisma) |
| Auth | NextAuth.js |
| Charts | Recharts |
| Animations | Framer Motion |
| State | Zustand |

---

## Directory Structure

```
src/
├── app/                     # Next.js App Router
│   ├── (auth)/              # Auth routes (login)
│   ├── (dashboard)/         # Main app routes
│   │   ├── page.tsx         # Command Center dashboard
│   │   ├── analytics/       # Analytics page
│   │   ├── customers/       # Customer list
│   │   ├── playbooks/       # Sales playbooks
│   │   ├── settings/        # User settings
│   │   └── storms/          # Storm intelligence
│   ├── api/                 # API routes
│   │   ├── auth/            # NextAuth endpoints
│   │   └── weather/         # Weather data endpoints
│   └── layout.tsx           # Root layout
├── components/
│   ├── ui/                  # Base UI components (shadcn)
│   ├── charts/              # Data visualization
│   ├── modals/              # Modal dialogs
│   ├── customer-intel-card.tsx  # Customer card component
│   └── sidebar.tsx          # Navigation sidebar
├── lib/
│   ├── services/            # External service integrations
│   │   ├── crm/             # CRM adapters (Leap, etc.)
│   │   ├── weather/         # Weather APIs (NOAA)
│   │   └── property/        # Property data APIs
│   ├── mock-data.ts         # Development mock data
│   ├── auth.ts              # Auth configuration
│   ├── prisma.ts            # Database client
│   └── utils.ts             # Utility functions
└── types/                   # TypeScript declarations
```

---

## Data Flow

### 1. Weather Intelligence
```
NOAA API → WeatherService → API Routes → Dashboard
```
- `lib/services/weather/index.ts` - Main weather service
- `lib/services/weather/noaa-service.ts` - NOAA API integration
- `app/api/weather/` - REST endpoints

### 2. CRM Integration
```
Leap CRM → CRM Adapter → Database (sync) → UI Components
```
- `lib/services/crm/index.ts` - Factory for CRM adapters
- `lib/services/crm/leap-adapter.ts` - Leap CRM specific
- `lib/services/crm/placeholder-adapter.ts` - Mock for development

### 3. Customer Data
```
Database (Prisma) → React Query → Components
```
- `prisma/schema.prisma` - Database schema
- Currently using mock data (`lib/mock-data.ts`)

---

## Database Schema (Key Models)

| Model | Purpose |
|-------|---------|
| `User` | Sales reps and managers |
| `Customer` | Leads and customers with property data |
| `WeatherEvent` | Storm events linked to locations |
| `IntelItem` | Intelligence items (actionable insights) |
| `InsuranceClaim` | Insurance claim tracking |
| `Interaction` | Call/email/visit logs |
| `Playbook` | Sales scripts and guides |

---

## Authentication

- **Provider**: NextAuth.js with credentials
- **Session**: JWT-based
- **Protected routes**: All `/dashboard/*` routes

---

## Current State

### Working Features
- ✅ Dashboard UI with mock data
- ✅ Customer intel cards with expandable details
- ✅ Weather radar visualization (simulated)
- ✅ Lead scoring display
- ✅ Theme toggle (dark/light)
- ✅ Modal system for profiles/actions

### Planned/Mock
- 🔶 Real NOAA API integration (service exists, needs wiring)
- 🔶 Leap CRM sync (adapter exists, needs credentials)
- 🔶 Database persistence (schema ready, using mock data)
- 🔶 User authentication (configured, not enforced)

---

## Environment Variables

```env
# Database
DATABASE_URL="file:./prisma/guardian.db"

# Auth
NEXTAUTH_SECRET="your-secret"
NEXTAUTH_URL="http://localhost:3000"

# CRM (Leap)
CRM_PROVIDER="leap"
LEAP_API_KEY=""
LEAP_COMPANY_ID=""
LEAP_BASE_URL=""
```

---

## Key Components

### CustomerIntelCard
Location: `src/components/customer-intel-card.tsx`
- Expandable card showing customer details
- Displays lead score, urgency, retention metrics
- Shows storm events and intel items
- Links to profile modal and action modal

### Dashboard (Command Center)
Location: `src/app/(dashboard)/page.tsx`
- Real-time metrics display
- Alert ticker with rotating alerts
- Priority targets (top leads)
- Weather radar preview
- Quick action buttons

---

## Development Notes

1. **Mock Data**: Most data comes from `lib/mock-data.ts`. Real API calls are stubbed.
2. **No Database Yet**: Prisma schema is defined but DB is not seeded.
3. **Services Ready**: Weather and CRM services are architected but need credentials.

---

*Last updated: January 2026*
