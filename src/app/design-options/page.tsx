"use client";

import Link from "next/link";

const DESIGN_OPTIONS = [
  {
    id: 1,
    slug: "option-1-clean-saas",
    title: "Clean SaaS",
    description: "Inspired by Linear, Vercel, Stripe — light, minimal, teal accents",
    preview: "Light gray background, white cards, teal highlights",
  },
  {
    id: 2,
    slug: "option-2-warm-professional",
    title: "Warm Professional",
    description: "Notion/Copper style — warm neutrals, soft shadows, approachable",
    preview: "Warm beige/cream tones, DM Sans font",
  },
  {
    id: 3,
    slug: "option-3-bold-brand",
    title: "Bold Brand-Forward",
    description: "HubSpot/Monday style — navy gradients, strong brand presence",
    preview: "Navy sidebar gradient, blue hero, Plus Jakarta Sans",
  },
  {
    id: 4,
    slug: "option-4-refined-dark",
    title: "Refined Dark",
    description: "GitHub Dark/Raycast style — sleek dark mode, subtle accents",
    preview: "Slate dark background, Inter font, minimal chrome",
  },
];

export default function DesignOptionsPage() {
  return (
    <div className="min-h-screen bg-bg-primary p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-semibold text-text-primary mb-2">
          UI Design Direction Mockups
        </h1>
        <p className="text-text-muted mb-8">
          Four dashboard redesign options. Click any card to open the full mockup in a new tab.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          {DESIGN_OPTIONS.map((opt) => (
            <Link
              key={opt.id}
              href={`/mockups/${opt.slug}.html`}
              target="_blank"
              rel="noopener noreferrer"
              className="block p-6 rounded-xl border border-border bg-surface-primary hover:bg-surface-hover hover:border-border-hover transition-colors text-left"
            >
              <div className="text-sm font-medium text-accent-primary mb-1">
                Option {opt.id}
              </div>
              <h2 className="text-lg font-semibold text-text-primary mb-2">
                {opt.title}
              </h2>
              <p className="text-sm text-text-secondary mb-3">
                {opt.description}
              </p>
              <p className="text-xs text-text-muted">{opt.preview}</p>
            </Link>
          ))}
        </div>

        <p className="mt-8 text-sm text-text-muted">
          <Link href="/" className="text-accent-primary hover:underline">
            ← Back to app
          </Link>
        </p>
      </div>
    </div>
  );
}
