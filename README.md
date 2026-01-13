# 🛡️ Guardian Intel

> **Sales Intelligence Command Center** for Guardian Storm Repair

A real-time customer intelligence platform that aggregates data from multiple sources, providing sales reps with comprehensive, actionable insights and predictive analytics.

---

## ✨ Features

### 🎯 Customer Intel Dashboard
- **Expandable Intel Cards** - Deep-dive into any customer with one click
- **Lead Scoring** - AI-powered scoring based on 15+ signals
- **Urgency Indicators** - Know who to call first
- **Profit Potential** - See estimated deal value at a glance

### 🌩️ Storm Intelligence
- **Real-time Weather Alerts** - Automatic detection of hail, wind, and storm events
- **Geographic Mapping** - See affected properties on a map
- **Claim Readiness** - Pre-populated documentation for faster claims

### 📊 Analytics & Insights
- **Pipeline Visualization** - Track deals through every stage
- **Activity Trends** - Monitor calls, emails, and visits
- **Team Performance** - Manager dashboards for accountability
- **Daily Metrics Aggregation** - Automated daily stats with backfill support

### 🔗 Data Aggregation (Planned)
- CRM Integration (HubSpot, Salesforce, JobNimbus)
- Weather APIs (NOAA, Hail Trace)
- Property Data (Zillow, County Records)
- Insurance Carrier Intelligence

---

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Set up database
npx prisma generate
npx prisma db push

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

---

## 🏗️ Tech Stack

| Technology | Purpose |
|------------|---------|
| **Next.js 15** | React framework with App Router |
| **TypeScript** | Type-safe development |
| **Tailwind CSS** | Utility-first styling |
| **shadcn/ui** | Accessible component primitives |
| **Prisma** | Type-safe database ORM |
| **Recharts** | Data visualization |
| **Framer Motion** | Smooth animations |
| **Zustand** | State management |

---

## 📁 Project Structure

```
guardian-intel/
├── prisma/
│   └── schema.prisma      # Database schema
├── src/
│   ├── app/               # Next.js App Router
│   │   ├── layout.tsx     # Root layout
│   │   ├── page.tsx       # Dashboard
│   │   └── globals.css    # Global styles
│   ├── components/
│   │   ├── ui/            # Base UI components
│   │   ├── charts/        # Data visualizations
│   │   ├── customer-intel-card.tsx
│   │   └── sidebar.tsx
│   └── lib/
│       ├── utils.ts       # Utility functions
│       └── mock-data.ts   # Development data
├── package.json
└── tailwind.config.ts
```

---

## ⏰ Scheduled Jobs

### Daily Metrics Aggregation

The app includes a daily aggregation job that calculates metrics for analytics dashboards.

#### Vercel (Automatic)

When deployed to Vercel, the cron job runs automatically at 2:00 AM UTC daily (configured in `vercel.json`).

Set the `CRON_SECRET` environment variable in your Vercel project settings to secure the endpoint.

#### Self-Hosted / Manual

For self-hosted deployments, set up a cron job to call the aggregation endpoint:

```bash
# Daily at 2 AM - run aggregation for previous day
0 2 * * * curl -X POST "https://your-domain.com/api/analytics/aggregate" \
  -H "Authorization: Bearer YOUR_CRON_SECRET"

# Backfill historical data (one-time)
curl -X POST "https://your-domain.com/api/analytics/aggregate?backfill=true&startDate=2026-01-01&endDate=2026-01-13" \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

Alternatively, admins/managers can trigger aggregation from the browser when authenticated.

---

## 🎨 Design Philosophy

Guardian Intel uses a **dark command center aesthetic** designed for:
- **Data density** - See everything important at a glance
- **Visual hierarchy** - Critical intel stands out
- **Rapid scanning** - Optimize for busy sales reps
- **Delight** - Smooth animations and glowing accents

---

## 📝 License

Proprietary - Guardian Storm Repair © 2026
