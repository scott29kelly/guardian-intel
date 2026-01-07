# Guardian Intel

> Transform scattered customer data into visual, actionable intelligence before every engagement.

A mobile-first sales intelligence app designed for roofing sales reps at Guardian. This pre-engagement dashboard consolidates property records, storm history, neighborhood context, customer data, and insurance intel into a single, actionable interface.

![Guardian Intel](https://img.shields.io/badge/React-18-blue) ![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-06B6D4) ![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6)

## Features

### 📊 Property Intelligence Card
- Aerial/satellite imagery with key property stats
- Roof age estimate with replacement window indicators
- Square footage, materials, and feature detection (solar, skylights, chimney)
- Last known roof work from permit history
- Estimated property and roof values

### ⛈️ Storm History Visualization
- Timeline of recent storm events (hail, wind, tornado)
- Damage probability scoring per event
- Hail size tracking with severity indicators
- Insurance claim deadline countdown
- "High Impact Zone" detection

### 📍 Neighborhood Context
- Map of nearby Guardian projects (social proof)
- Active claims count in the area
- Competitor yard sign/activity tracking
- Average roof age in neighborhood

### 👤 Customer History Snapshot
- Previous interactions timeline
- Rep notes and outcomes
- Referral source tracking
- Preferred contact method
- Do-not-contact flags

### 🛡️ Insurance Intel Card
- Known carrier identification
- Typical deductible ranges
- Carrier-specific adjuster notes
- Claim filing deadline with countdown
- Approval likelihood scoring

### 💬 Conversation Prep
- AI-generated conversation starters
- Objection handling with data-backed responses
- Key talking points prioritized by impact
- Relevant testimonials and case studies

## Views

### Nano Report (30-Second Glance)
Quick summary view for reviewing while walking up the driveway:
- Property thumbnail with key stats
- Top 3 talking points
- Risk/opportunity score
- One "did you know" insight

### Full Brief (Detailed Prep)
Comprehensive view for scheduled appointments:
- All intelligence cards expanded
- Before/after project comparisons
- Hail damage reference guide
- Insurance claims process walkthrough

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

```bash
# Clone the repository
cd guardian-intel

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

### Development

```bash
# Run development server
npm run dev

# Type checking
npm run typecheck

# Linting
npm run lint

# Build production bundle
npm run build

# Preview production build
npm run preview
```

## Tech Stack

- **Framework:** React 18 with TypeScript
- **Styling:** Tailwind CSS v4
- **UI Components:** Radix UI primitives
- **Icons:** Lucide React
- **Build Tool:** Vite 7

## Data Sources (Planned Integration)

| Data Type | Potential Source | Status |
|-----------|-----------------|--------|
| Property records | County assessor APIs, Zillow | Planned |
| Storm history | NOAA, Weather Underground | Planned |
| Aerial imagery | Google Maps API, Nearmap | Planned |
| CRM data | JobNimbus API | Planned |
| Permit history | Local municipality databases | Planned |
| Insurance patterns | Internal Guardian data | Planned |

## Project Structure

```
src/
├── components/
│   ├── cards/          # Intelligence card components
│   ├── views/          # Page-level view components
│   └── ui/             # Reusable UI primitives
├── data/               # Mock data for development
├── lib/                # Utility functions
├── types/              # TypeScript type definitions
└── hooks/              # Custom React hooks
```

## Mobile-First Design

Guardian Intel is designed with a mobile-first approach:
- Touch-optimized interactions
- Safe area support for notched devices
- Responsive layouts that scale to tablet/desktop
- PWA-ready configuration

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is proprietary software for Guardian.

---

Built with ❤️ for Guardian sales teams
