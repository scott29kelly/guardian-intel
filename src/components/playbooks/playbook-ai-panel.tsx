"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Send,
  Loader2,
  FileText,
  MessageSquare,
  AlertCircle,
  Lightbulb,
  Target,
  Shield,
  Zap,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  X,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

interface PlaybookAIPanelProps {
  title: string;
  category: string;
  type: string;
  stage: string;
  content: string;
  onInsert: (text: string) => void;
  onClose: () => void;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

type QuickAction = {
  id: string;
  label: string;
  icon: React.ElementType;
  action: string;
  description: string;
};

const quickActions: QuickAction[] = [
  {
    id: "opening",
    label: "Generate Opening",
    icon: MessageSquare,
    action: "add_opening",
    description: "Create a compelling opening script",
  },
  {
    id: "objections",
    label: "Add Objections",
    icon: Shield,
    action: "add_objections",
    description: "Generate objection handlers",
  },
  {
    id: "closing",
    label: "Write Closing",
    icon: Target,
    action: "add_closing",
    description: "Create closing scripts",
  },
  {
    id: "tips",
    label: "Pro Tips",
    icon: Lightbulb,
    action: "add_tips",
    description: "Generate actionable pro tips",
  },
  {
    id: "insurance",
    label: "Insurance Context",
    icon: FileText,
    action: "add_insurance_context",
    description: "Add insurance-specific content",
  },
  {
    id: "brainstorm",
    label: "Brainstorm Ideas",
    icon: Zap,
    action: "brainstorm",
    description: "Generate creative approaches",
  },
];

export function PlaybookAIPanel({
  title,
  category,
  type,
  stage,
  content,
  onInsert,
  onClose,
}: PlaybookAIPanelProps) {
  const { showToast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showQuickActions, setShowQuickActions] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/ai/playbook-assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "enhance",
          title,
          category,
          type,
          stage,
          existingContent: content,
          additionalContext: input.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to get AI response");
      }

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: data.content,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      showToast(
        "error",
        "AI Error",
        error instanceof Error ? error.message : "Failed to get response"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickAction = async (action: QuickAction) => {
    setIsLoading(true);
    setShowQuickActions(false);

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: `Generate: ${action.label}`,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);

    try {
      const response = await fetch("/api/ai/playbook-assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: action.action,
          title,
          category,
          type,
          stage,
          existingContent: content,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to get AI response");
      }

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: data.content,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      showToast(
        "error",
        "AI Error",
        error instanceof Error ? error.message : "Failed to generate content"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async (messageId: string, content: string) => {
    await navigator.clipboard.writeText(content);
    setCopiedId(messageId);
    showToast("success", "Copied", "Content copied to clipboard");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleInsert = (content: string) => {
    onInsert(content);
    showToast("success", "Inserted", "Content added to playbook");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="flex flex-col h-full bg-surface-primary border-l border-border">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20">
            <Sparkles className="w-4 h-4 text-purple-400" />
          </div>
          <div>
            <h3 className="font-semibold text-text-primary text-sm">AI Assistant</h3>
            <p className="text-xs text-text-muted">Playbook helper</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-surface-hover text-text-muted hover:text-text-primary transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Quick Actions (Collapsible) */}
      <div className="border-b border-border flex-shrink-0">
        <button
          onClick={() => setShowQuickActions(!showQuickActions)}
          className="w-full flex items-center justify-between px-4 py-2 text-sm text-text-secondary hover:bg-surface-hover transition-colors"
        >
          <span className="flex items-center gap-2">
            <Zap className="w-3.5 h-3.5" />
            Quick Actions
          </span>
          {showQuickActions ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </button>
        <AnimatePresence>
          {showQuickActions && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="grid grid-cols-2 gap-2 p-3">
                {quickActions.map((action) => (
                  <button
                    key={action.id}
                    onClick={() => handleQuickAction(action)}
                    disabled={isLoading}
                    className="flex items-center gap-2 p-2 text-left rounded-lg bg-surface-secondary hover:bg-surface-hover border border-border/50 hover:border-accent-primary/30 transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <action.icon className="w-4 h-4 text-text-muted group-hover:text-accent-primary transition-colors flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-text-primary truncate">
                        {action.label}
                      </p>
                      <p className="text-[10px] text-text-muted truncate">
                        {action.description}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 mb-3">
              <Sparkles className="w-6 h-6 text-purple-400" />
            </div>
            <h4 className="font-medium text-text-primary mb-1">
              How can I help?
            </h4>
            <p className="text-sm text-text-muted max-w-[200px]">
              Use quick actions above or ask me anything about your playbook.
            </p>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[90%] rounded-lg p-3 ${
                    message.role === "user"
                      ? "bg-accent-primary text-white"
                      : "bg-surface-secondary border border-border"
                  }`}
                >
                  <div
                    className={`text-sm whitespace-pre-wrap ${
                      message.role === "assistant" ? "text-text-primary" : ""
                    }`}
                  >
                    {message.content}
                  </div>
                  {message.role === "assistant" && (
                    <div className="flex items-center gap-2 mt-3 pt-2 border-t border-border">
                      <button
                        onClick={() => handleCopy(message.id, message.content)}
                        className="flex items-center gap-1 px-2 py-1 text-xs text-text-muted hover:text-text-primary rounded hover:bg-surface-hover transition-colors"
                      >
                        {copiedId === message.id ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            Copy
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => handleInsert(message.content)}
                        className="flex items-center gap-1 px-2 py-1 text-xs text-accent-primary hover:bg-accent-primary/10 rounded transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                        Insert into Playbook
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-surface-secondary border border-border rounded-lg p-3">
                  <div className="flex items-center gap-2 text-text-muted">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm">Generating...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-3 border-t border-border flex-shrink-0">
        <div className="relative">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your playbook..."
            rows={2}
            className="w-full px-3 py-2 pr-12 bg-surface-secondary border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-primary resize-none text-sm"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="absolute right-2 bottom-2 p-1.5 rounded-lg bg-accent-primary text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-accent-primary/90 transition-colors"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
        <p className="text-[10px] text-text-muted mt-1 text-center">
          Press Enter to send, Shift+Enter for new line
        </p>
      </form>
    </div>
  );
}
