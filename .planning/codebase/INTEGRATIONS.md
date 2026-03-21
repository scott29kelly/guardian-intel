# External Integrations

**Analysis Date:** 2026-03-21

## AI Services

**Multi-model AI routing** via `src/lib/services/ai/router.ts` (singleton `AIRouter` class). Adapters registered per model; falls back to Gemini if preferred model unavailable.

**Task-to-model routing (default config):**
- `chat` → `claude-sonnet-4.5`
- `tool_call` → `claude-sonnet-4.5`
- `simple_tool` → `claude-haiku-4.5`
- `research` → `gemini-2.0-flash-exp`
- `classify` → `claude-haiku-4.5`
- `parse` → `claude-haiku-4.5`
- `summarize` → `gemini-2.0-flash-exp`
- `image_generation` → `gemini-3.1-flash-image-preview`

**Google Gemini:**
- Adapter: `src/lib/services/ai/adapters/gemini.ts` (chat, tools, streaming)
- Adapter: `src/lib/services/ai/adapters/gemini-flash-image.ts` (image generation with web grounding, retry/backoff)
- API: `https://generativelanguage.googleapis.com/v1beta`
- Auth: `GOOGLE_API_KEY` or `GOOGLE_AI_API_KEY` or `GEMINI_API_KEY`
- Models: `gemini-2.0-flash-exp`, `gemini-1.5-pro`, `gemini-3.1-flash-image-preview`, `gemini-3-pro-image`

**Anthropic Claude:**
- Adapter: `src/lib/services/ai/adapters/claude.ts`
- Auth: `ANTHROPIC_API_KEY`
- Models: `claude-opus-4.5`, `claude-sonnet-4.5`, `claude-haiku-4.5`
- Capabilities: chat, streaming, classification, parsing, tool calling

**Perplexity (web research):**
- Adapter: `src/lib/services/ai/adapters/perplexity.ts`
- Auth: `PERPLEXITY_API_KEY`
- Model: `perplexity-sonar`
- Use case: research task type; returns answers with citations

**Moonshot Kimi K2:**
- Adapter: `src/lib/services/ai/adapters/kimi.ts`
- Auth: `MOONSHOT_API_KEY`
- Model: `kimi-k2`
- Use case: conversational chat; 1M token context window

**OpenAI:**
- Adapter: `src/lib/services/ai/adapters/openai.ts`
- Auth: `OPENAI_API_KEY`
- Model: `gpt-4o`
- Use case: fallback

**AI API Endpoints:**
- `src/app/api/ai/chat/` - Conversational AI with customer context
- `src/app/api/ai/analyze-damage/` - Photo damage analysis
- `src/app/api/ai/generate-slide/` - Deck slide content generation
- `src/app/api/ai/generate-slide-image/` - AI image generation for slides
- `src/app/api/ai/playbook-assist/` - Playbook contextual assistance
- `src/app/api/ai/roleplay/` - Sales roleplay scenarios

## Data Storage

**Primary Database:**
- Provider: PostgreSQL via Supabase
- Connection: `DATABASE_URL` (pooled), `DIRECT_URL` (for migrations)
- Client: Prisma ORM (`src/lib/prisma.ts`)
- Schema: `prisma/schema.prisma` — 30+ models covering customers, weather, claims, contracts, proposals, playbooks, outreach, analytics, AI conversations

**File Storage:**
- Provider: Supabase Storage
- Bucket: `deck-pdfs` (default; configurable via `SUPABASE_STORAGE_BUCKET`)
- Auth: `SUPABASE_SERVICE_ROLE_KEY` (server), `NEXT_PUBLIC_SUPABASE_ANON_KEY` (client)
- Use cases: generated PDF decks, photos

**Realtime:**
- Provider: Supabase Realtime
- Client: `src/lib/supabase.ts` — client-side only (guard: `typeof window === "undefined"`)
- Subscribed tables: `WeatherEvent`, `IntelItem`, `Customer`
- Hooks: `src/lib/hooks/use-realtime.ts`

**Caching:**
- Provider: Upstash Redis (optional; in-memory fallback for development)
- Client: `@upstash/redis` in `src/lib/cache.ts`
- Auth: `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`
- Namespaces: `guardian:cache:dashboard` (30s), `guardian:cache:weather` (5m), `guardian:cache:analytics` (1m), `guardian:cache:context` (5m), `guardian:cache:streetview` (1h)

**Rate Limiting:**
- Provider: Upstash Redis via `@upstash/ratelimit`
- Config: `src/lib/rate-limit.ts`
- Limits: AI 20 req/min, Auth 5 req/min, API 100 req/min, Weather 30 req/min

## Authentication & Identity

**Auth Provider:** NextAuth.js (custom credentials)
- Implementation: `src/lib/auth.ts`
- Strategy: JWT sessions (30-day expiry)
- Provider: `CredentialsProvider` — email/password with bcrypt verification
- Adapter: `@auth/prisma-adapter` — sessions, accounts, verification tokens stored in PostgreSQL
- Pages: `/login` (sign-in and error)
- Demo mode: time-limited tokens (5-minute expiry, single-use) via `generateDemoToken` / `validateDemoToken`
- API: `src/app/api/auth/[...nextauth]/`

## Weather APIs

**NOAA / National Weather Service (free, no API key):**
- Service: `src/lib/services/weather/noaa-service.ts`
- Endpoints used:
  - NWS Alerts API — real-time severe weather warnings
  - NWS Forecast API — location forecasts
  - NOAA Storm Events — historical hail/wind/tornado data
  - Storm Prediction Center — severe weather outlooks
  - NEXRAD Radar — radar imagery
- PWA cache: 30-minute NetworkFirst cache in `next.config.ts`
- API routes: `src/app/api/weather/alerts/`, `src/app/api/weather/forecast/`, `src/app/api/weather/heatmap/`, `src/app/api/weather/predictions/`

**US Census Geocoder (free, no API key):**
- Service: `src/lib/services/geocoding/index.ts`
- Use case: address-to-coordinates conversion
- Fallback: hardcoded ZIP centroid table for Mid-Atlantic/Ohio region

## Maps

**Google Maps:**
- Auth: `GOOGLE_MAPS_API_KEY` / `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`
- Use case: property Street View imagery
- Configured as allowed remote image pattern in `next.config.ts`

**OpenStreetMap tile servers:**
- No auth required; used with Leaflet for base map tiles
- Configured as allowed remote image pattern in `next.config.ts`

## CRM Integration

**Leap CRM (home improvement industry):**
- Adapter: `src/lib/services/crm/leap-adapter.ts`
- API docs: `https://developer.leaptodigital.com/`
- Auth: `LEAP_API_KEY`, `LEAP_COMPANY_ID`
- Base URL: `LEAP_BASE_URL` (default `https://api.leapcrm.com`)
- Entities synced: Customers, Jobs, Appointments, Estimates/Proposals
- Webhook endpoint: `src/app/api/webhooks/leap/` — incoming Leap events
- Webhook secret: `LEAP_WEBHOOK_SECRET`
- Enable: set `CRM_PROVIDER=leap`
- Sync logs stored in `CrmSyncLog` and `CrmFieldMapping` Prisma models

**SalesRabbit (canvassing / door-to-door sales):**
- Webhook endpoint: `src/app/api/webhooks/salesrabbit/` — receives `lead.created`, `lead.updated` events
- Webhook signature verification: HMAC-SHA256 via `SALESRABBIT_WEBHOOK_SECRET`
- Data stored in `CanvassingPin`, `CanvassingRoute`, `CanvassingSyncLog` models
- Carrier API route: `src/app/api/carriers/[code]/sync` and `/webhook`

## Outreach (SMS & Email)

**Twilio (SMS):**
- Provider: `src/lib/services/outreach/providers/twilio.ts`
- Auth: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`
- API: `https://api.twilio.com/2010-04-01/Accounts/{SID}/Messages.json`
- Mock mode: active when env vars missing; logs to console
- Features: send SMS, MMS (mediaUrl), status lookup

**SendGrid (Email):**
- Provider: `src/lib/services/outreach/providers/sendgrid.ts`
- Auth: `SENDGRID_API_KEY`, `SENDGRID_FROM_EMAIL`, `SENDGRID_FROM_NAME`
- API: `https://api.sendgrid.com/v3`
- Mock mode: active when env vars missing

**Outreach API routes:**
- `src/app/api/outreach/campaigns/` — CRUD for outreach campaigns
- `src/app/api/outreach/campaigns/[id]/execute/` — trigger a campaign
- `src/app/api/outreach/templates/` — message templates
- `src/app/api/outreach/trigger/` — manual/storm-triggered outreach
- `src/app/api/outreach/preview/` — preview rendered templates

## Push Notifications

**Web Push API:**
- Library: `web-push` 3.6
- VAPID keys: managed server-side
- Subscriptions stored in `PushSubscription` Prisma model
- API routes: `src/app/api/notifications/vapid-key/`, `src/app/api/notifications/subscribe/`, `src/app/api/notifications/send/`

## CI/CD & Deployment

**Hosting:** Vercel
- Config: `vercel.json`
- Cron job: `GET /api/analytics/aggregate` — runs daily at 02:00 UTC

**CI Pipeline:** Not detected

## Webhooks & Callbacks

**Incoming:**
- `POST /api/webhooks/leap` — Leap CRM events (HMAC-SHA256 verified via `LEAP_WEBHOOK_SECRET`)
- `POST /api/webhooks/salesrabbit` — SalesRabbit canvassing events (HMAC-SHA256 verified via `SALESRABBIT_WEBHOOK_SECRET`)
- `POST /api/carriers/[code]/webhook` — insurance carrier callbacks

**Outgoing:**
- Twilio SMS delivery status callbacks — configured on Twilio side, tracked in `OutreachMessage.externalMessageId`
- SendGrid email delivery events — tracked in `OutreachMessage`

## Environment Configuration

**Required:**
- `DATABASE_URL` — Supabase PostgreSQL (pooled)
- `NEXTAUTH_SECRET` — min 32 chars

**AI (at least one):**
- `GOOGLE_API_KEY` / `GOOGLE_AI_API_KEY` / `GEMINI_API_KEY`
- `ANTHROPIC_API_KEY`
- `OPENAI_API_KEY`
- `PERPLEXITY_API_KEY`
- `MOONSHOT_API_KEY`

**Supabase:**
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_STORAGE_BUCKET` (default: `deck-pdfs`)

**CRM:**
- `CRM_PROVIDER=leap`
- `LEAP_API_KEY`, `LEAP_COMPANY_ID`, `LEAP_BASE_URL`, `LEAP_WEBHOOK_SECRET`
- `SALESRABBIT_WEBHOOK_SECRET`

**Outreach:**
- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`
- `SENDGRID_API_KEY`, `SENDGRID_FROM_EMAIL`, `SENDGRID_FROM_NAME`

**Caching/Rate Limiting:**
- `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`
- `RATE_LIMIT_ENABLED` (default: `true`)

**Maps:**
- `GOOGLE_MAPS_API_KEY`, `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`

**Cron:**
- `CRON_SECRET` — shared secret for authenticating cron requests

**Secrets location:** `.env.local` (gitignored); template at `.env.example`

---

*Integration audit: 2026-03-21*
