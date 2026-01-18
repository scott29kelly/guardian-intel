"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  BookOpen,
  Star,
  Clock,
  Target,
  Play,
  ChevronRight,
  Loader2,
  Sparkles,
  MessageSquare,
  History,
  Lightbulb,
  Users,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  useRecommendedPlaybooks,
  useLogPlaybookUsage,
  type Playbook,
} from "@/lib/hooks/use-playbooks";
import { useQuery } from "@tanstack/react-query";
import { RoleplayModal } from "@/components/playbooks/roleplay-modal";

interface CustomerPlaybooksTabProps {
  customerId: string;
  customerName: string;
  customerStage: string;
}

const categoryConfig: Record<string, { icon: typeof BookOpen; color: string }> = {
  storm: { icon: BookOpen, color: "from-sky-500 to-blue-600" },
  "objection-handling": { icon: BookOpen, color: "from-amber-500 to-orange-600" },
  closing: { icon: Target, color: "from-emerald-500 to-green-600" },
  retention: { icon: Users, color: "from-violet-500 to-purple-600" },
  "cold-call": { icon: BookOpen, color: "from-rose-500 to-pink-600" },
  discovery: { icon: MessageSquare, color: "from-cyan-500 to-teal-600" },
  presentation: { icon: BookOpen, color: "from-indigo-500 to-blue-600" },
  "follow-up": { icon: Clock, color: "from-fuchsia-500 to-pink-600" },
};

// Fetch usage history for this customer
async function fetchCustomerPlaybookHistory(customerId: string) {
  // This would need a dedicated endpoint in production
  // For now, we'll use the existing data
  return { data: [] };
}

export function CustomerPlaybooksTab({
  customerId,
  customerName,
  customerStage,
}: CustomerPlaybooksTabProps) {
  const [selectedPlaybook, setSelectedPlaybook] = useState<Playbook | null>(null);
  const [showRoleplay, setShowRoleplay] = useState(false);

  const { data: recommendations, isLoading: loadingRecs } = useRecommendedPlaybooks({
    customerId,
    limit: 6,
  });

  const { data: history, isLoading: loadingHistory } = useQuery({
    queryKey: ["customer-playbook-history", customerId],
    queryFn: () => fetchCustomerPlaybookHistory(customerId),
  });

  const logUsage = useLogPlaybookUsage();

  const handleUsePlaybook = async (playbook: Playbook) => {
    await logUsage.mutateAsync({
      playbookId: playbook.id,
      customerId,
      context: "customer_call",
      completed: true,
    });
    setSelectedPlaybook(playbook);
  };

  const handlePractice = (playbook: Playbook) => {
    setSelectedPlaybook(playbook);
    setShowRoleplay(true);
  };

  const recommendedPlaybooks = recommendations?.data || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-text-primary flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-400" />
            Recommended for {customerName}
          </h3>
          <p className="text-sm text-text-muted">
            Playbooks matched to {customerStage} stage
          </p>
        </div>
      </div>

      {/* Recommendations */}
      {loadingRecs ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 text-accent-primary animate-spin" />
        </div>
      ) : recommendedPlaybooks.length > 0 ? (
        <div className="grid grid-cols-2 gap-3">
          {recommendedPlaybooks.map((playbook) => {
            const config = categoryConfig[playbook.category] || {
              icon: BookOpen,
              color: "from-accent-primary to-accent-primary/70",
            };
            const Icon = config.icon;

            return (
              <motion.div
                key={playbook.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="group"
              >
                <Card className="border-border hover:border-purple-500/50 transition-all cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-10 h-10 rounded-lg bg-gradient-to-br ${config.color} flex items-center justify-center flex-shrink-0`}
                      >
                        <Icon className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-text-primary text-sm truncate group-hover:text-purple-400 transition-colors">
                          {playbook.title}
                        </h4>
                        <p className="text-xs text-purple-400 mt-1">
                          {playbook.recommendationReason}
                        </p>
                        <div className="flex items-center gap-3 mt-2">
                          {playbook.rating && (
                            <span className="text-[10px] text-amber-400 flex items-center gap-1">
                              <Star className="w-3 h-3 fill-current" />
                              {playbook.rating.toFixed(1)}
                            </span>
                          )}
                          <span className="text-[10px] text-text-muted">
                            {playbook.usageCount} uses
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 text-xs"
                        onClick={() => handleUsePlaybook(playbook)}
                      >
                        <Play className="w-3 h-3" />
                        Use Now
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-xs text-purple-400 hover:text-purple-300"
                        onClick={() => handlePractice(playbook)}
                      >
                        <MessageSquare className="w-3 h-3" />
                        Practice
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="p-6 text-center">
            <BookOpen className="w-10 h-10 text-text-muted mx-auto mb-3" />
            <p className="text-text-muted text-sm">
              No specific recommendations for this customer yet
            </p>
          </CardContent>
        </Card>
      )}

      {/* Quick Tips */}
      <Card className="bg-purple-500/5 border-purple-500/30">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center flex-shrink-0">
              <Lightbulb className="w-4 h-4 text-purple-400" />
            </div>
            <div>
              <h4 className="text-sm font-medium text-purple-400 mb-1">
                Stage-Specific Tips
              </h4>
              <p className="text-xs text-text-muted">
                {customerStage === "new" &&
                  "Focus on discovery playbooks to understand their needs and pain points."}
                {customerStage === "contacted" &&
                  "Use objection handling playbooks to address early concerns."}
                {customerStage === "qualified" &&
                  "Presentation playbooks work well to showcase your value proposition."}
                {customerStage === "proposal" &&
                  "Closing techniques and objection handlers are most effective now."}
                {customerStage === "negotiation" &&
                  "Focus on closing playbooks and handling price objections."}
                {customerStage === "closed" &&
                  "Use retention playbooks to ensure customer satisfaction."}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Selected Playbook Preview */}
      {selectedPlaybook && !showRoleplay && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="border-accent-primary/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-text-primary">
                  {selectedPlaybook.title}
                </h4>
                <Badge className="bg-emerald-500/20 text-emerald-400 text-xs">
                  Logged
                </Badge>
              </div>
              <p className="text-sm text-text-muted mb-3">
                {selectedPlaybook.description || "Ready to use with this customer."}
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  onClick={() => window.open(`/playbooks?id=${selectedPlaybook.id}`, "_blank")}
                >
                  <BookOpen className="w-4 h-4" />
                  View Full Playbook
                </Button>
                <Button
                  size="sm"
                  onClick={() => setSelectedPlaybook(null)}
                >
                  Done
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Roleplay Modal */}
      <RoleplayModal
        isOpen={showRoleplay}
        onClose={() => {
          setShowRoleplay(false);
          setSelectedPlaybook(null);
        }}
        playbookId={selectedPlaybook?.id}
        playbookTitle={selectedPlaybook?.title}
      />
    </div>
  );
}
