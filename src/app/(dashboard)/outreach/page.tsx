"use client";

/**
 * Outreach Page
 * 
 * Manage automated SMS/email campaigns for post-storm outreach.
 */

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Plus,
  Cloud,
  MessageSquare,
  Mail,
  TrendingUp,
  Users,
  Zap,
  Filter,
  RefreshCw,
  Loader2,
  Search,
  Play,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CampaignCard, CreateCampaignModal } from "@/components/outreach";
import {
  useCampaigns,
  useUpdateCampaign,
  useExecuteCampaign,
  type Campaign,
} from "@/lib/hooks/use-outreach";
import { useToast } from "@/components/ui/toast";

type FilterType = "all" | "storm" | "manual" | "scheduled";

export default function OutreachPage() {
  const { showToast } = useToast();
  const [filter, setFilter] = useState<FilterType>("all");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);

  const { data, isLoading, refetch } = useCampaigns(
    filter !== "all" ? { triggerType: filter } : {}
  );
  const updateCampaign = useUpdateCampaign();

  const campaigns = data?.data || [];

  // Calculate stats
  const stats = {
    total: campaigns.length,
    active: campaigns.filter((c: Campaign) => c.isActive).length,
    totalSent: campaigns.reduce((sum: number, c: Campaign) => sum + c.totalSent, 0),
    totalDelivered: campaigns.reduce((sum: number, c: Campaign) => sum + c.totalDelivered, 0),
    stormCampaigns: campaigns.filter((c: Campaign) => c.triggerType === "storm").length,
  };

  const handleToggleActive = async (campaign: Campaign) => {
    try {
      await updateCampaign.mutateAsync({
        id: campaign.id,
        isActive: !campaign.isActive,
      });
      showToast(
        "success",
        campaign.isActive ? "Campaign Paused" : "Campaign Activated",
        `${campaign.name} is now ${campaign.isActive ? "paused" : "active"}`
      );
    } catch (error) {
      showToast("error", "Update Failed", "Could not update campaign status");
    }
  };

  const handleExecute = (campaign: Campaign) => {
    setSelectedCampaign(campaign);
    // For now, just show a toast - in a real implementation, this would open an execution modal
    showToast("info", "Execute Campaign", `Ready to run ${campaign.name}`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Outreach Campaigns</h1>
          <p className="text-sm text-text-muted">
            Automated SMS & email campaigns for post-storm customer outreach
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="w-4 h-4" />
            Create Campaign
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-5 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="panel p-4"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-accent-primary/20 flex items-center justify-center">
              <Zap className="w-5 h-5 text-accent-primary" />
            </div>
            <div>
              <div className="text-2xl font-bold text-text-primary">{stats.total}</div>
              <div className="text-xs text-text-muted">Total Campaigns</div>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="panel p-4"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
              <Play className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-emerald-400">{stats.active}</div>
              <div className="text-xs text-text-muted">Active</div>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="panel p-4"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-sky-500/20 flex items-center justify-center">
              <Cloud className="w-5 h-5 text-sky-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-sky-400">{stats.stormCampaigns}</div>
              <div className="text-xs text-text-muted">Storm Triggers</div>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="panel p-4"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-400">{stats.totalSent.toLocaleString()}</div>
              <div className="text-xs text-text-muted">Messages Sent</div>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="panel p-4"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-amber-400">
                {stats.totalSent > 0 
                  ? Math.round((stats.totalDelivered / stats.totalSent) * 100) 
                  : 0}%
              </div>
              <div className="text-xs text-text-muted">Delivery Rate</div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2">
        {[
          { id: "all", label: "All Campaigns", icon: Zap },
          { id: "storm", label: "Storm Triggers", icon: Cloud },
          { id: "manual", label: "Manual", icon: Play },
          { id: "scheduled", label: "Scheduled", icon: Clock },
        ].map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id as FilterType)}
            className={`
              px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors
              ${filter === f.id 
                ? "bg-accent-primary/20 text-accent-primary" 
                : "text-text-muted hover:text-text-primary hover:bg-surface-hover"
              }
            `}
          >
            <f.icon className="w-4 h-4" />
            {f.label}
          </button>
        ))}
      </div>

      {/* Campaigns List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-accent-primary animate-spin" />
        </div>
      ) : campaigns.length === 0 ? (
        <div className="panel p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-surface-secondary flex items-center justify-center mx-auto mb-4">
            <MessageSquare className="w-8 h-8 text-text-muted" />
          </div>
          <h3 className="text-lg font-medium text-text-primary mb-2">No Campaigns Yet</h3>
          <p className="text-sm text-text-muted mb-4">
            Create your first campaign to start reaching customers automatically after storms.
          </p>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="w-4 h-4" />
            Create Campaign
          </Button>
        </div>
      ) : (
        <div className="grid gap-4">
          {campaigns.map((campaign: Campaign, index: number) => (
            <motion.div
              key={campaign.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <CampaignCard
                campaign={campaign}
                onEdit={() => setSelectedCampaign(campaign)}
                onExecute={() => handleExecute(campaign)}
                onToggleActive={() => handleToggleActive(campaign)}
              />
            </motion.div>
          ))}
        </div>
      )}

      {/* Info Banner */}
      <div className="panel p-4 bg-gradient-to-r from-sky-500/10 to-purple-500/10 border-sky-500/20">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-lg bg-sky-500/20 flex items-center justify-center flex-shrink-0">
            <Cloud className="w-5 h-5 text-sky-400" />
          </div>
          <div>
            <h4 className="font-medium text-text-primary mb-1">How Storm-Triggered Campaigns Work</h4>
            <p className="text-sm text-text-muted">
              When the system detects a storm in your service area, it automatically identifies affected customers 
              by ZIP code and sends personalized SMS/email messages. Campaigns respect the "exclude recent" setting 
              to avoid over-messaging. Configure your Twilio and SendGrid API keys to enable live messaging.
            </p>
          </div>
        </div>
      </div>

      {/* Create Campaign Modal */}
      <CreateCampaignModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => refetch()}
      />
    </div>
  );
}
