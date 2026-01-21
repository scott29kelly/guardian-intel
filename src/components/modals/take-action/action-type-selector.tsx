"use client";

import { Phone, Mail, Calendar, FileText, Clock } from "lucide-react";

export type ActionType = "call" | "email" | "meeting" | "note" | "task";

const actions = [
  { id: "call", label: "Log Call", icon: Phone, color: "accent-primary" },
  { id: "email", label: "Send Email", icon: Mail, color: "accent-secondary" },
  { id: "meeting", label: "Schedule", icon: Calendar, color: "accent-warning" },
  { id: "note", label: "Add Note", icon: FileText, color: "text-secondary" },
  { id: "task", label: "Create Task", icon: Clock, color: "accent-danger" },
] as const;

interface ActionTypeSelectorProps {
  selectedAction: ActionType;
  onSelect: (action: ActionType) => void;
}

export function ActionTypeSelector({ selectedAction, onSelect }: ActionTypeSelectorProps) {
  return (
    <div>
      <label className="font-mono text-xs text-text-muted uppercase tracking-wider mb-3 block">
        Action Type
      </label>
      <div className="grid grid-cols-5 gap-2">
        {actions.map((action) => {
          const Icon = action.icon;
          const isSelected = selectedAction === action.id;
          return (
            <button
              key={action.id}
              onClick={() => onSelect(action.id)}
              className={`
                flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all
                ${isSelected
                  ? "bg-[hsl(var(--accent-primary)/0.1)] border-accent-primary text-accent-primary"
                  : "bg-surface-secondary border-transparent text-text-muted hover:text-text-secondary hover:bg-surface-hover"
                }
              `}
            >
              <Icon className="w-5 h-5" />
              <span className="font-mono text-[10px] uppercase leading-tight text-center">
                {action.label.split(' ')[0]}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export { actions };
