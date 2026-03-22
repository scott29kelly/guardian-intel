"use client";

/**
 * ConversationalInput Component
 *
 * Provides a natural language textarea with suggested topic chips for the
 * "Ask AI" tab in the infographic generator modal. Reps describe what they
 * need in plain English, and the system handles all intelligence routing.
 *
 * No model names or technical details are exposed.
 */

import { useState } from "react";
import { motion } from "framer-motion";
import { MessageSquare, Sparkles } from "lucide-react";

interface ConversationalInputProps {
  prompt: string;
  onPromptChange: (prompt: string) => void;
}

const SUGGESTED_TOPICS = [
  "Prep me for my next appointment",
  "Storm damage summary for this area",
  "Customer leave-behind for a meeting",
  "Insurance deadline overview",
  "Competitive analysis for this neighborhood",
] as const;

export function ConversationalInput({
  prompt,
  onPromptChange,
}: ConversationalInputProps) {
  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <MessageSquare className="h-4 w-4 text-text-secondary" />
        <span className="text-sm font-medium text-text-secondary">
          Describe what you need
        </span>
      </div>

      {/* Textarea */}
      <textarea
        value={prompt}
        onChange={(e) => onPromptChange(e.target.value)}
        placeholder="e.g., Prep me for the Johnson meeting tomorrow"
        className="bg-surface-secondary border border-border rounded-lg p-3 resize-none h-24 text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-primary w-full"
      />

      {/* Suggested topic chips */}
      <div className="flex flex-wrap gap-2">
        {SUGGESTED_TOPICS.map((topic, index) => (
          <motion.button
            key={topic}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05, duration: 0.2 }}
            onClick={() => onPromptChange(topic)}
            className="rounded-full px-3 py-1.5 text-sm bg-surface-secondary border border-border hover:bg-surface-hover text-text-secondary transition-colors"
          >
            <span className="flex items-center gap-1.5">
              <Sparkles className="h-3 w-3" />
              {topic}
            </span>
          </motion.button>
        ))}
      </div>

      {/* Helper text */}
      <p className="text-xs text-text-muted">
        Our AI will select the best topics and format for your request
      </p>
    </div>
  );
}
