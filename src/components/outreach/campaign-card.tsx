"use client";

/**
 * CampaignCard Component
 * 
 * Displays campaign summary with stats and quick actions.
 */

import { motion } from "framer-motion";
import {
  Cloud,
  Mail,
  MessageSquare,
  Play,
  Pause,
  Settings,
  TrendingUp,
  Users,
  Zap,
  Clock,
  Target,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { type Campaign } from "@/lib/hooks/use-outreach";
import { formatDistanceToNow } from "@/lib/utils";

interface CampaignCardProps {
  campaign: Campaign;
  onEdit: () => void;
  onExecute: () => void;
  onToggleActive: () => void;
}

const triggerConfig = {
  storm: { icon: Cloud, color: "text-sky-400", bg: "bg-sky-500/20", label: "Storm Trigger" },
  manual: { icon: Play, color: "text-purple-400", bg: "bg-purple-500/20", label: "Manual" },
  scheduled: { icon: Clock, color: "text-amber-400", bg: "bg-amber-500/20", label: "Scheduled" },
};

export function CampaignCard({ campaign, onEdit, onExecute, onToggleActive }: CampaignCardProps) {
  const trigger = triggerConfig[campaign.triggerType] || triggerConfig.manual;
  const TriggerIcon = trigger.icon;

  const deliveryRate = campaign.totalSent > 0
    ? Math.round((campaign.totalDelivered / campaign.totalSent) * 100)
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="panel p-4 hover:border-border-hover transition-colors"
    >
      <div className="flex items-start justify-between gap-4">
        {/* Left: Campaign Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <div className={`w-8 h-8 rounded-lg ${trigger.bg} flex items-center justify-center`}>
              <TriggerIcon className={`w-4 h-4 ${trigger.color}`} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-text-primary truncate">{campaign.name}</h3>
              <p className="text-xs text-text-muted truncate">{trigger.label}</p>
            </div>
            <Badge
              variant={campaign.isActive ? "default" : "secondary"}
              className={campaign.isActive ? "bg-emerald-500/20 text-emerald-400" : ""}
            >
              {campaign.isActive ? "Active" : "Paused"}
            </Badge>
          </div>

          {/* Description */}
          {campaign.description && (
            <p className="text-sm text-text-muted mb-3 line-clamp-2">{campaign.description}</p>
          )}

          {/* Channels & Targeting */}
          <div className="flex flex-wrap gap-2 mb-3">
            {campaign.enableSms && (
              <Badge variant="outline" className="text-xs">
                <MessageSquare className="w-3 h-3 mr-1" /> SMS
              </Badge>
            )}
            {campaign.enableEmail && (
              <Badge variant="outline" className="text-xs">
                <Mail className="w-3 h-3 mr-1" /> Email
              </Badge>
            )}
            {campaign.stormTypes.length > 0 && (
              <Badge variant="outline" className="text-xs">
                <Zap className="w-3 h-3 mr-1" /> {campaign.stormTypes.join(", ")}
              </Badge>
            )}
            {campaign.targetZipCodes.length > 0 && (
              <Badge variant="outline" className="text-xs">
                <Target className="w-3 h-3 mr-1" /> {campaign.targetZipCodes.length} ZIPs
              </Badge>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-3">
            <div className="text-center">
              <div className="text-lg font-semibold text-text-primary">{campaign.totalSent}</div>
              <div className="text-[10px] text-text-muted uppercase">Sent</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-emerald-400">{campaign.totalDelivered}</div>
              <div className="text-[10px] text-text-muted uppercase">Delivered</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-accent-primary">{campaign.totalOpened}</div>
              <div className="text-[10px] text-text-muted uppercase">Opened</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-purple-400">{deliveryRate}%</div>
              <div className="text-[10px] text-text-muted uppercase">Rate</div>
            </div>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex flex-col gap-2">
          <Button size="sm" onClick={onExecute} disabled={!campaign.isActive}>
            <Play className="w-4 h-4" />
            Run
          </Button>
          <Button size="sm" variant="outline" onClick={onToggleActive}>
            {campaign.isActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            {campaign.isActive ? "Pause" : "Enable"}
          </Button>
          <Button size="sm" variant="ghost" onClick={onEdit}>
            <Settings className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Execution Count */}
      {campaign.executionCount > 0 && (
        <div className="mt-3 pt-3 border-t border-border flex items-center justify-between text-xs text-text-muted">
          <span>{campaign.executionCount} execution(s)</span>
          <span>Updated {formatDistanceToNow(new Date(campaign.updatedAt))}</span>
        </div>
      )}
    </motion.div>
  );
}

export default CampaignCard;
