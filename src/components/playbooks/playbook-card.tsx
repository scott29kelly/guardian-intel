"use client";

import { motion } from "framer-motion";
import {
  BookOpen,
  Clock,
  Target,
  Star,
  ChevronRight,
  CloudLightning,
  Shield,
  Phone,
  Users,
  MessageSquare,
  FileText,
  Presentation,
  RotateCcw,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Playbook } from "@/lib/hooks/use-playbooks";

interface PlaybookCardProps {
  playbook: Playbook;
  isSelected: boolean;
  isFavorited: boolean;
  onClick: () => void;
}

const categoryConfig: Record<string, { icon: typeof BookOpen; gradient: string }> = {
  storm: { icon: CloudLightning, gradient: "from-sky-500 to-blue-600" },
  "objection-handling": { icon: Shield, gradient: "from-amber-500 to-orange-600" },
  closing: { icon: Target, gradient: "from-emerald-500 to-green-600" },
  retention: { icon: Users, gradient: "from-violet-500 to-purple-600" },
  "cold-call": { icon: Phone, gradient: "from-rose-500 to-pink-600" },
  discovery: { icon: MessageSquare, gradient: "from-cyan-500 to-teal-600" },
  presentation: { icon: Presentation, gradient: "from-indigo-500 to-blue-600" },
  "follow-up": { icon: RotateCcw, gradient: "from-fuchsia-500 to-pink-600" },
};

const typeConfig: Record<string, { label: string; color: string }> = {
  script: { label: "Script", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
  checklist: { label: "Checklist", color: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
  guide: { label: "Guide", color: "bg-sky-500/20 text-sky-400 border-sky-500/30" },
  template: { label: "Template", color: "bg-violet-500/20 text-violet-400 border-violet-500/30" },
};

export function PlaybookCard({ playbook, isSelected, isFavorited, onClick }: PlaybookCardProps) {
  const config = categoryConfig[playbook.category] || { icon: BookOpen, gradient: "from-accent-primary to-accent-primary/70" };
  const CategoryIcon = config.icon;
  const typeInfo = typeConfig[playbook.type] || typeConfig.script;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`group cursor-pointer rounded-xl border transition-all ${
        isSelected
          ? "border-accent-primary/50 bg-accent-primary/10"
          : "border-border bg-surface-secondary/30 hover:border-text-muted"
      }`}
      onClick={onClick}
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${config.gradient} flex items-center justify-center flex-shrink-0`}>
            <CategoryIcon className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-medium text-text-primary truncate group-hover:text-accent-primary transition-colors">
                {playbook.title}
              </h3>
              {isFavorited && (
                <Star className="w-3.5 h-3.5 text-amber-400 fill-current flex-shrink-0" />
              )}
            </div>
            {playbook.description && (
              <p className="text-xs text-text-muted line-clamp-2 mt-1">
                {playbook.description}
              </p>
            )}
            <div className="flex items-center gap-3 mt-2">
              <Badge className={`text-[10px] ${typeInfo.color}`}>
                {typeInfo.label}
              </Badge>
              <span className="text-[10px] text-text-muted flex items-center gap-1">
                <Target className="w-3 h-3" />
                {playbook.usageCount} uses
              </span>
              {playbook.rating && (
                <span className="text-[10px] text-amber-400 flex items-center gap-1">
                  <Star className="w-3 h-3 fill-current" />
                  {playbook.rating.toFixed(1)}
                </span>
              )}
            </div>
          </div>
          <ChevronRight className={`w-4 h-4 text-text-muted transition-transform ${
            isSelected ? "rotate-90" : ""
          }`} />
        </div>
      </div>
    </motion.div>
  );
}

export function getCategoryInfo(category: string) {
  return categoryConfig[category] || { icon: BookOpen, gradient: "from-accent-primary to-accent-primary/70" };
}
