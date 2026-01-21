"use client";

type OutcomeType = "positive" | "neutral" | "negative" | null;

interface OutcomeSelectorProps {
  outcome: OutcomeType;
  onSelect: (outcome: OutcomeType) => void;
}

const outcomeOptions = [
  { id: "positive", label: "Positive", color: "bg-emerald-500/10 border-emerald-500/50 text-emerald-400", activeColor: "bg-emerald-500/20 border-emerald-500" },
  { id: "neutral", label: "Neutral", color: "bg-amber-500/10 border-amber-500/50 text-amber-400", activeColor: "bg-amber-500/20 border-amber-500" },
  { id: "negative", label: "Negative", color: "bg-red-500/10 border-red-500/50 text-red-400", activeColor: "bg-red-500/20 border-red-500" },
];

export function OutcomeSelector({ outcome, onSelect }: OutcomeSelectorProps) {
  return (
    <div>
      <label className="font-mono text-xs text-text-muted uppercase tracking-wider mb-3 block">
        Outcome
      </label>
      <div className="flex gap-2">
        {outcomeOptions.map((o) => (
          <button
            key={o.id}
            onClick={() => onSelect(o.id as OutcomeType)}
            className={`
              flex-1 px-4 py-3 rounded-lg border-2 font-mono text-xs font-medium transition-all
              ${outcome === o.id
                ? o.activeColor
                : "bg-surface-secondary border-transparent text-text-muted hover:text-text-secondary hover:bg-surface-hover"
              }
            `}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
