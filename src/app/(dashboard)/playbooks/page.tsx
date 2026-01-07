"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen,
  Search,
  Plus,
  ChevronRight,
  Clock,
  Target,
  CheckCircle2,
  AlertTriangle,
  Phone,
  Mail,
  Users,
  Home,
  CloudLightning,
  Shield,
  Copy,
  ThumbsUp,
  MessageSquare,
  FileText,
  Star,
  Zap,
  ArrowRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

// Playbook Categories with Icons
const categories = [
  { id: "all", label: "All Playbooks", icon: BookOpen },
  { id: "storm", label: "Storm Response", icon: CloudLightning },
  { id: "objections", label: "Objection Handling", icon: Shield },
  { id: "closing", label: "Closing Techniques", icon: Target },
  { id: "retention", label: "Customer Retention", icon: Users },
  { id: "cold-call", label: "Cold Calling", icon: Phone },
];

// Mock Playbooks Data
const playbooks = [
  {
    id: "1",
    title: "Storm Damage Discovery Call",
    category: "storm",
    description: "Script for initial contact after a storm event has been detected in the customer's area.",
    difficulty: "beginner",
    duration: "5-10 min",
    successRate: 78,
    timesUsed: 234,
    steps: [
      {
        title: "Opening Hook",
        content: `"Hi [Name], this is [Your Name] with Guardian Roofing. I'm reaching out because our weather monitoring system detected significant storm activity in your neighborhood on [Date]. Many homeowners in [Area] are discovering hidden damage to their roofs that could lead to costly water damage if not addressed. Do you have just 2 minutes to discuss how we can help protect your home?"`,
        tips: ["Speak with concern, not urgency", "Pause after the question"],
      },
      {
        title: "Establish Credibility",
        content: `"We've been helping homeowners in Central Ohio for over 15 years, and after major storms, we offer complimentary drone inspections to help identify any damage before it becomes a bigger problem. Insurance typically covers storm damage, so there's often no out-of-pocket cost to homeowners."`,
        tips: ["Mention local experience", "Lead with value, not sales"],
      },
      {
        title: "Schedule Inspection",
        content: `"Would tomorrow afternoon or Thursday morning work better for a quick 15-minute inspection? We'll document everything with photos and provide a detailed report you can use with your insurance company if needed."`,
        tips: ["Always offer two choices", "Confirm address before ending"],
      },
    ],
  },
  {
    id: "2",
    title: "Insurance Deductible Objection",
    category: "objections",
    description: "How to address concerns about insurance deductibles and out-of-pocket costs.",
    difficulty: "intermediate",
    duration: "3-5 min",
    successRate: 82,
    timesUsed: 189,
    steps: [
      {
        title: "Acknowledge & Validate",
        content: `"I completely understand your concern about the deductible. That's something many homeowners worry about, and it's a smart question to ask upfront."`,
        tips: ["Never dismiss their concern", "Use empathetic tone"],
      },
      {
        title: "Reframe the Value",
        content: `"Let me share some perspective: the average roof replacement costs between $12,000-$25,000 out of pocket. If your insurance approves the claim, you're only responsible for the deductible—typically $1,000-$2,500. That means you could be getting a brand new roof worth $20,000+ for a fraction of the cost."`,
        tips: ["Use specific numbers", "Frame as investment"],
      },
      {
        title: "Offer Solutions",
        content: `"We also offer flexible payment options for deductibles if needed. And here's something most people don't know: if we find that the damage isn't significant enough for a full replacement, we provide a complimentary maintenance package to extend your roof's life. Either way, you win."`,
        tips: ["Always provide alternatives", "End on positive note"],
      },
    ],
  },
  {
    id: "3",
    title: "The Competitor Price Match",
    category: "objections",
    description: "Handling situations when a customer has a lower quote from another contractor.",
    difficulty: "advanced",
    duration: "5-8 min",
    successRate: 65,
    timesUsed: 156,
    steps: [
      {
        title: "Express Interest",
        content: `"Thanks for sharing that with me. It's smart to get multiple quotes—that's exactly what I'd do too. Do you mind if I take a look at what they're proposing?"`,
        tips: ["Never badmouth competitors", "Ask to see the quote"],
      },
      {
        title: "Identify Differences",
        content: `"I see they're using [Product X]. Let me explain the difference: [Our Product] has a 50-year warranty vs their 25-year, is rated for higher wind speeds, and has a Class 4 impact rating. On a $20,000 roof, that extra $2,000 difference works out to about $6 per month over the life of the roof for significantly better protection."`,
        tips: ["Focus on value, not price", "Break down cost over time"],
      },
      {
        title: "Confidence Close",
        content: `"Here's my commitment: if you find anyone offering the exact same products, warranty, and installation quality for less, I'll match it. But I think you'll find that our quote represents the best value for protecting your biggest investment. What questions can I answer?"`,
        tips: ["Show confidence", "Offer price match on equal specs"],
      },
    ],
  },
  {
    id: "4",
    title: "Aging Roof Conversation",
    category: "retention",
    description: "Proactive outreach to customers with roofs approaching end of warranty.",
    difficulty: "beginner",
    duration: "5-7 min",
    successRate: 71,
    timesUsed: 98,
    steps: [
      {
        title: "Warm Opening",
        content: `"Hi [Name], this is [Your Name] from Guardian Roofing. We installed your roof back in [Year] and I wanted to personally reach out because it's approaching the 15-year mark. How has everything been holding up?"`,
        tips: ["Lead with relationship", "Ask open-ended question"],
      },
      {
        title: "Value Proposition",
        content: `"Great to hear! At this stage in a roof's life, we like to offer our customers a complimentary condition assessment. Even if everything looks fine from the ground, there can be wear patterns that only show up on closer inspection. We can catch small issues before they become expensive problems."`,
        tips: ["Position as service, not sale", "Emphasize prevention"],
      },
      {
        title: "Transition to Inspection",
        content: `"I have availability next week for a quick 20-minute inspection. We'll also check your gutters and flashing while we're up there. Would Tuesday or Wednesday work better for you?"`,
        tips: ["Add extra value", "Use alternative choice close"],
      },
    ],
  },
  {
    id: "5",
    title: "The Spousal Buy-In",
    category: "closing",
    description: "Techniques for when one decision-maker needs to consult with their spouse.",
    difficulty: "intermediate",
    duration: "5-10 min",
    successRate: 58,
    timesUsed: 212,
    steps: [
      {
        title: "Validate the Decision",
        content: `"Absolutely, this is a big decision and you should definitely discuss it together. In fact, I'd be concerned if you didn't want to! A roof is one of the biggest investments you'll make in your home."`,
        tips: ["Never pressure", "Validate their process"],
      },
      {
        title: "Arm Them with Information",
        content: `"Let me put together a summary that makes it easy to share with [Spouse Name]. I'll include the before/after photos, the detailed scope of work, the warranty information, and the financing options we discussed. What's the best email to send that to?"`,
        tips: ["Make their job easier", "Maintain control of materials"],
      },
      {
        title: "Set Follow-Up",
        content: `"When do you typically have time to discuss things like this together—evenings or weekends? I'll call you [Day] around [Time] to answer any questions that come up. And if you'd like, I'm happy to jump on a quick video call with both of you to walk through everything together."`,
        tips: ["Always schedule follow-up", "Offer joint presentation"],
      },
    ],
  },
  {
    id: "6",
    title: "Cold Call: New Move-In",
    category: "cold-call",
    description: "Script for reaching out to new homeowners who recently purchased.",
    difficulty: "beginner",
    duration: "3-5 min",
    successRate: 45,
    timesUsed: 178,
    steps: [
      {
        title: "Congratulatory Opening",
        content: `"Hi [Name], congratulations on your new home on [Street Name]! This is [Your Name] with Guardian Roofing. I'm reaching out to new homeowners in the neighborhood to offer a complimentary roof assessment—no strings attached."`,
        tips: ["Sound genuinely happy for them", "Mention specific street"],
      },
      {
        title: "Create Relevance",
        content: `"When you bought the home, you probably got a general inspection, but those typically don't include a detailed roof analysis. Since you're new to the property, it's a great time to establish a baseline for your roof's condition and understand what maintenance might be needed in the future."`,
        tips: ["Point out inspection gap", "Position as smart ownership"],
      },
      {
        title: "Low-Pressure Close",
        content: `"We're in your neighborhood next week working on a few projects. I could swing by Tuesday or Thursday for a quick look—takes about 15 minutes. Which works better for you?"`,
        tips: ["Mention proximity", "Keep time commitment low"],
      },
    ],
  },
];

const getDifficultyColor = (difficulty: string) => {
  switch (difficulty) {
    case "beginner":
      return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
    case "intermediate":
      return "bg-amber-500/20 text-amber-400 border-amber-500/30";
    case "advanced":
      return "bg-rose-500/20 text-rose-400 border-rose-500/30";
    default:
      return "bg-surface-500/20 text-surface-400 border-surface-500/30";
  }
};

const getCategoryIcon = (category: string) => {
  const cat = categories.find((c) => c.id === category);
  return cat?.icon || BookOpen;
};

const getCategoryColor = (category: string) => {
  switch (category) {
    case "storm":
      return "from-sky-500 to-blue-600";
    case "objections":
      return "from-amber-500 to-orange-600";
    case "closing":
      return "from-emerald-500 to-green-600";
    case "retention":
      return "from-violet-500 to-purple-600";
    case "cold-call":
      return "from-rose-500 to-pink-600";
    default:
      return "from-guardian-500 to-guardian-600";
  }
};

export default function PlaybooksPage() {
  const { showToast } = useToast();
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPlaybook, setSelectedPlaybook] = useState<string | null>(null);
  const [copiedStep, setCopiedStep] = useState<string | null>(null);
  const [favorited, setFavorited] = useState<Set<string>>(new Set());

  const handleCreatePlaybook = () => {
    showToast("info", "Create Playbook", "Opening playbook editor...");
  };

  const handleFavorite = (playbookId: string, playbookTitle: string) => {
    const newFavorited = new Set(favorited);
    if (newFavorited.has(playbookId)) {
      newFavorited.delete(playbookId);
      showToast("info", "Removed from Favorites", `${playbookTitle} removed from favorites`);
    } else {
      newFavorited.add(playbookId);
      showToast("success", "Added to Favorites", `${playbookTitle} added to favorites`);
    }
    setFavorited(newFavorited);
  };

  const handlePracticeMode = (playbookTitle: string) => {
    showToast("info", "Practice Mode", `Starting practice session for "${playbookTitle}"...`);
  };

  const handleFeedback = (type: "positive" | "improvement" | "notes", playbookTitle: string) => {
    const messages = {
      positive: `Thanks for the feedback! "${playbookTitle}" marked as effective`,
      improvement: `Opening feedback form for "${playbookTitle}"...`,
      notes: `Opening notes editor for "${playbookTitle}"...`
    };
    showToast(type === "positive" ? "success" : "info", "Feedback Recorded", messages[type]);
  };

  const filteredPlaybooks = playbooks.filter((playbook) => {
    const matchesCategory = selectedCategory === "all" || playbook.category === selectedCategory;
    const matchesSearch = searchQuery === "" || 
      playbook.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      playbook.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const activePlaybook = playbooks.find((p) => p.id === selectedPlaybook);

  const handleCopyStep = (stepContent: string, stepId: string) => {
    navigator.clipboard.writeText(stepContent);
    setCopiedStep(stepId);
    setTimeout(() => setCopiedStep(null), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="h-full"
    >
      <div className="flex gap-6 h-[calc(100vh-8rem)]">
        {/* Left Sidebar - Categories & Playbook List */}
        <div className="w-96 flex flex-col">
          {/* Header */}
          <div className="mb-6">
            <h1 className="font-display text-3xl font-bold text-white mb-2">
              Sales Playbooks
            </h1>
            <p className="text-surface-400">
              Battle-tested scripts and techniques for every situation
            </p>
          </div>

          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
            <input
              type="text"
              placeholder="Search playbooks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-surface-800/50 border border-surface-700 rounded-lg text-sm text-white placeholder:text-surface-500 focus:outline-none focus:border-guardian-500/50 focus:ring-1 focus:ring-guardian-500/25 transition-all"
            />
          </div>

          {/* Categories */}
          <div className="flex flex-wrap gap-2 mb-4">
            {categories.map((cat) => {
              const Icon = cat.icon;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all ${
                    selectedCategory === cat.id
                      ? "bg-guardian-500/20 text-guardian-400 border border-guardian-500/30"
                      : "text-surface-400 hover:text-white hover:bg-surface-800/50"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {cat.label}
                </button>
              );
            })}
          </div>

          {/* Playbook List */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-2 -mr-2">
            {filteredPlaybooks.map((playbook) => {
              const CategoryIcon = getCategoryIcon(playbook.category);
              return (
                <motion.div
                  key={playbook.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className={`group cursor-pointer rounded-xl border transition-all ${
                    selectedPlaybook === playbook.id
                      ? "border-guardian-500/50 bg-guardian-500/10"
                      : "border-surface-700/50 bg-surface-800/30 hover:border-surface-600"
                  }`}
                  onClick={() => setSelectedPlaybook(playbook.id)}
                >
                  <div className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${getCategoryColor(playbook.category)} flex items-center justify-center flex-shrink-0`}>
                        <CategoryIcon className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-white truncate group-hover:text-guardian-400 transition-colors">
                          {playbook.title}
                        </h3>
                        <p className="text-xs text-surface-400 line-clamp-2 mt-1">
                          {playbook.description}
                        </p>
                        <div className="flex items-center gap-3 mt-2">
                          <Badge className={`text-[10px] ${getDifficultyColor(playbook.difficulty)}`}>
                            {playbook.difficulty}
                          </Badge>
                          <span className="text-[10px] text-surface-500 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {playbook.duration}
                          </span>
                          <span className="text-[10px] text-surface-500 flex items-center gap-1">
                            <Target className="w-3 h-3" />
                            {playbook.successRate}%
                          </span>
                        </div>
                      </div>
                      <ChevronRight className={`w-4 h-4 text-surface-500 transition-transform ${
                        selectedPlaybook === playbook.id ? "rotate-90" : ""
                      }`} />
                    </div>
                  </div>
                </motion.div>
              );
            })}

            {filteredPlaybooks.length === 0 && (
              <div className="text-center py-8">
                <BookOpen className="w-12 h-12 text-surface-600 mx-auto mb-3" />
                <p className="text-surface-400">No playbooks found</p>
              </div>
            )}
          </div>

          {/* Add New Button */}
          <Button className="mt-4 w-full" onClick={handleCreatePlaybook}>
            <Plus className="w-4 h-4" />
            Create Custom Playbook
          </Button>
        </div>

        {/* Right Panel - Playbook Details */}
        <div className="flex-1 overflow-hidden">
          <AnimatePresence mode="wait">
            {activePlaybook ? (
              <motion.div
                key={activePlaybook.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="h-full flex flex-col"
              >
                {/* Playbook Header */}
                <Card className="mb-4">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${getCategoryColor(activePlaybook.category)} flex items-center justify-center shadow-lg shadow-guardian-500/20`}>
                          {(() => {
                            const Icon = getCategoryIcon(activePlaybook.category);
                            return <Icon className="w-7 h-7 text-white" />;
                          })()}
                        </div>
                        <div>
                          <h2 className="text-2xl font-bold text-white mb-1">
                            {activePlaybook.title}
                          </h2>
                          <p className="text-surface-400 max-w-2xl">
                            {activePlaybook.description}
                          </p>
                          <div className="flex items-center gap-4 mt-3">
                            <Badge className={getDifficultyColor(activePlaybook.difficulty)}>
                              {activePlaybook.difficulty}
                            </Badge>
                            <span className="text-sm text-surface-400 flex items-center gap-1.5">
                              <Clock className="w-4 h-4" />
                              {activePlaybook.duration}
                            </span>
                            <span className="text-sm text-emerald-400 flex items-center gap-1.5">
                              <Target className="w-4 h-4" />
                              {activePlaybook.successRate}% success rate
                            </span>
                            <span className="text-sm text-surface-400 flex items-center gap-1.5">
                              <Users className="w-4 h-4" />
                              Used {activePlaybook.timesUsed} times
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleFavorite(activePlaybook.id, activePlaybook.title)}
                          className={favorited.has(activePlaybook.id) ? "bg-amber-500/20 border-amber-500/50 text-amber-400" : ""}
                        >
                          <Star className={`w-4 h-4 ${favorited.has(activePlaybook.id) ? "fill-current" : ""}`} />
                          {favorited.has(activePlaybook.id) ? "Favorited" : "Favorite"}
                        </Button>
                        <Button size="sm" onClick={() => handlePracticeMode(activePlaybook.title)}>
                          <Zap className="w-4 h-4" />
                          Practice Mode
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Steps */}
                <div className="flex-1 overflow-y-auto pr-2 -mr-2 space-y-4">
                  {activePlaybook.steps.map((step, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <Card className="overflow-hidden">
                        <div className={`h-1 bg-gradient-to-r ${getCategoryColor(activePlaybook.category)}`} />
                        <CardContent className="p-6">
                          <div className="flex items-start gap-4">
                            <div className="w-10 h-10 rounded-full bg-surface-700/50 flex items-center justify-center flex-shrink-0 text-guardian-400 font-bold">
                              {index + 1}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-3">
                                <h3 className="text-lg font-semibold text-white">
                                  {step.title}
                                </h3>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleCopyStep(step.content, `${activePlaybook.id}-${index}`)}
                                  className="text-surface-400 hover:text-white"
                                >
                                  {copiedStep === `${activePlaybook.id}-${index}` ? (
                                    <>
                                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                      Copied!
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="w-4 h-4" />
                                      Copy Script
                                    </>
                                  )}
                                </Button>
                              </div>
                              
                              {/* Script Content */}
                              <div className="bg-surface-800/50 rounded-lg p-4 border border-surface-700/50 mb-4">
                                <p className="text-surface-200 leading-relaxed whitespace-pre-wrap">
                                  {step.content}
                                </p>
                              </div>

                              {/* Tips */}
                              {step.tips && step.tips.length > 0 && (
                                <div className="flex items-start gap-2 text-sm">
                                  <div className="w-5 h-5 rounded bg-amber-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                                    <AlertTriangle className="w-3 h-3 text-amber-400" />
                                  </div>
                                  <div className="flex flex-wrap gap-2">
                                    {step.tips.map((tip, tipIndex) => (
                                      <span
                                        key={tipIndex}
                                        className="px-2 py-1 bg-amber-500/10 text-amber-400 rounded text-xs"
                                      >
                                        {tip}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Arrow to next step */}
                          {index < activePlaybook.steps.length - 1 && (
                            <div className="flex justify-center mt-4">
                              <ArrowRight className="w-5 h-5 text-surface-600 rotate-90" />
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}

                  {/* Feedback Section */}
                  <Card className="mt-6">
                    <CardContent className="p-6">
                      <div className="text-center">
                        <h4 className="text-lg font-medium text-white mb-2">
                          How did this playbook work?
                        </h4>
                        <p className="text-sm text-surface-400 mb-4">
                          Your feedback helps improve our playbooks for everyone
                        </p>
                        <div className="flex justify-center gap-3">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleFeedback("positive", activePlaybook.title)}
                          >
                            <ThumbsUp className="w-4 h-4" />
                            Worked Great
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleFeedback("improvement", activePlaybook.title)}
                          >
                            <MessageSquare className="w-4 h-4" />
                            Suggest Improvement
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleFeedback("notes", activePlaybook.title)}
                          >
                            <FileText className="w-4 h-4" />
                            Add Notes
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="h-full flex items-center justify-center"
              >
                <div className="text-center max-w-md">
                  <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-guardian-500/20 to-guardian-600/20 flex items-center justify-center mx-auto mb-6 border border-guardian-500/30">
                    <BookOpen className="w-12 h-12 text-guardian-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">
                    Select a Playbook
                  </h3>
                  <p className="text-surface-400 mb-6">
                    Choose a playbook from the list to view detailed scripts, objection handlers, and proven closing techniques.
                  </p>
                  <div className="flex justify-center gap-3">
                    <Badge className="bg-emerald-500/20 text-emerald-400">
                      {playbooks.length} Playbooks
                    </Badge>
                    <Badge className="bg-violet-500/20 text-violet-400">
                      {categories.length - 1} Categories
                    </Badge>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
