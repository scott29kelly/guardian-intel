# Deck Generation Feature - Setup Instructions

## 1. Add NPM Script

Add this to your `package.json` scripts section:

```json
{
  "scripts": {
    "deck-worker": "tsx scripts/deck-worker.ts",
    "deck-worker:once": "tsx scripts/deck-worker.ts --once"
  }
}
```

## 2. Environment Variables

Add these to your `.env.local`:

```bash
# NotebookLM Configuration
NOTEBOOKLM_NOTEBOOK_ID=ed6b52aa-95a6-41b7-9d8a-b8135afcd490
NOTEBOOKLM_CLI=notebooklm

# Supabase (you should already have these)
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Optional worker config
DECK_WORKER_INTERVAL=60
SUPABASE_STORAGE_BUCKET=deck-pdfs
```

## 3. Create Supabase Storage Bucket

In your Supabase dashboard:
1. Go to Storage
2. Create a new bucket called `deck-pdfs`
3. Set the bucket policy based on your needs:
   - Public: Anyone can download (simpler)
   - Private: Requires signed URLs (more secure)

For now, I recommend Public for easier testing.

## 4. Run Database Migration

If you want to add the new fields (pdfUrl, etc.):

```bash
npx prisma migrate dev --name add_deck_pdf_fields
```

Or manually run the SQL in `prisma/migrations/add_deck_pdf_fields/migration.sql`

## 5. Update Prisma Schema

Add these fields to your ScheduledDeck model in `prisma/schema.prisma`:

```prisma
model ScheduledDeck {
  // ... existing fields ...
  
  // Add these new fields
  pdfUrl          String?   // Public or signed URL to the generated PDF
  pdfStoragePath  String?   // Supabase Storage path
  notebookId      String?   // NotebookLM notebook ID used
  notebookSourceId String?  // ID of the customer source added
}
```

Then run: `npx prisma generate`

## 6. Usage

### Run Worker (Continuous)
```bash
npm run deck-worker
```

### Run Worker (Once)
```bash
npm run deck-worker:once
```

### Run Worker (Custom Duration)
```bash
npm run deck-worker -- --duration=2h
```

### Run Worker (Custom Interval)
```bash
npm run deck-worker -- --interval=30
```

## 7. Integrate the Button

Import and use the PrepDeckButton in your customer profile component:

```tsx
import { PrepDeckButton } from "@/components/customer/prep-deck-button";

// In your component:
<PrepDeckButton 
  customerId={customer.id} 
  customerName={`${customer.firstName} ${customer.lastName}`}
/>
```

For card views, use the compact mode:
```tsx
<PrepDeckButton 
  customerId={customer.id} 
  customerName={customerName}
  compact
/>
```

Or just show a status badge:
```tsx
import { DeckStatusBadge } from "@/components/customer/prep-deck-button";

<DeckStatusBadge customerId={customer.id} />
```
