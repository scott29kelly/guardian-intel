"use client";

/**
 * AI Chat Panel Component
 * 
 * A slide-out panel for conversational AI interactions.
 * Features:
 * - Streaming responses
 * - Customer context integration
 * - Tool call visualization
 * - Suggested actions
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Send,
  Bot,
  User,
  Loader2,
  Sparkles,
  CloudLightning,
  Target,
  FileText,
  ChevronRight,
  MessageSquare,
  Zap,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// =============================================================================
// TYPES
// =============================================================================

interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
  model?: string;
  toolCalls?: Array<{
    name: string;
    status: "pending" | "running" | "complete" | "error";
    result?: unknown;
  }>;
}

interface AIChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  customerId?: string;
  customerName?: string;
  initialPrompt?: string;
}

// =============================================================================
// SUGGESTED PROMPTS
// =============================================================================

const SUGGESTED_PROMPTS = [
  {
    icon: Target,
    label: "Next steps",
    prompt: "What are the recommended next steps for this customer?",
  },
  {
    icon: CloudLightning,
    label: "Weather check",
    prompt: "Check for recent storm activity near this customer's location",
  },
  {
    icon: FileText,
    label: "Generate script",
    prompt: "Generate a follow-up call script for this customer",
  },
  {
    icon: Sparkles,
    label: "Objection handling",
    prompt: "How should I handle price objections for this customer?",
  },
];

// =============================================================================
// COMPONENT
// =============================================================================

export function AIChatPanel({
  isOpen,
  onClose,
  customerId,
  customerName,
  initialPrompt,
}: AIChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Handle initial prompt
  useEffect(() => {
    if (isOpen && initialPrompt && messages.length === 0) {
      handleSendMessage(initialPrompt);
    }
  }, [isOpen, initialPrompt]);

  const handleSendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isLoading) return;

    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      role: "user",
      content: content.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);
    setError(null);

    // Add placeholder assistant message for streaming
    const assistantId = `msg-${Date.now() + 1}`;
    setMessages(prev => [
      ...prev,
      {
        id: assistantId,
        role: "assistant",
        content: "",
        timestamp: new Date(),
        isStreaming: true,
      },
    ]);

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMessage].map(m => ({
            role: m.role,
            content: m.content,
          })),
          customerId,
          task: "chat",
          enableTools: true,
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to get response");
      }

      // Update assistant message with response
      setMessages(prev =>
        prev.map(m =>
          m.id === assistantId
            ? {
                ...m,
                content: data.message.content,
                isStreaming: false,
                model: data.model,
                toolCalls: data.toolResults?.map((tr: { name: string; result: unknown }) => ({
                  name: tr.name,
                  status: "complete" as const,
                  result: tr.result,
                })),
              }
            : m
        )
      );

      // Show warning if in mock mode
      if (data.warning) {
        console.warn("[AI Chat]", data.warning);
      }
    } catch (err) {
      console.error("Chat error:", err);
      setError(err instanceof Error ? err.message : "Failed to send message");
      
      // Remove the placeholder message on error
      setMessages(prev => prev.filter(m => m.id !== assistantId));
    } finally {
      setIsLoading(false);
    }
  }, [messages, customerId, isLoading]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(inputValue);
    }
  };

  const handleSuggestedPrompt = (prompt: string) => {
    handleSendMessage(prompt);
  };

  const handleClearChat = () => {
    setMessages([]);
    setError(null);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-lg bg-[hsl(var(--surface-primary))] border-l border-border shadow-2xl z-50 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border bg-[hsl(var(--surface-secondary))]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-intel-500 to-guardian-500 flex items-center justify-center">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="font-display font-bold text-text-primary">Guardian Intel</h2>
                  <p className="text-xs text-text-muted">
                    {customerName ? `Discussing: ${customerName}` : "AI Assistant"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {messages.length > 0 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleClearChat}
                    title="Clear chat"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                )}
                <Button variant="ghost" size="icon" onClick={onClose}>
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
              {messages.length === 0 ? (
                <EmptyState onSuggestedPrompt={handleSuggestedPrompt} />
              ) : (
                messages.map(message => (
                  <ChatMessage key={message.id} message={message} />
                ))
              )}
              {error && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-400 text-sm">
                  {error}
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-border bg-[hsl(var(--surface-secondary))]">
              <div className="relative">
                <textarea
                  ref={inputRef}
                  value={inputValue}
                  onChange={e => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask me anything about this customer..."
                  className="w-full px-4 py-3 pr-12 bg-[hsl(var(--surface-primary))] border border-border rounded-lg text-text-primary placeholder:text-text-muted resize-none focus:outline-none focus:ring-2 focus:ring-intel-500/50"
                  rows={2}
                  disabled={isLoading}
                />
                <Button
                  size="icon"
                  className="absolute right-2 bottom-2"
                  onClick={() => handleSendMessage(inputValue)}
                  disabled={!inputValue.trim() || isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>
              <p className="text-[10px] text-text-muted mt-2 text-center">
                Powered by multi-model AI • Kimi K2 for chat • Claude for tools • Gemini Flash fallback
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

function EmptyState({ onSuggestedPrompt }: { onSuggestedPrompt: (prompt: string) => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-4">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-intel-500/20 to-guardian-500/20 flex items-center justify-center mb-4">
        <Sparkles className="w-8 h-8 text-intel-400" />
      </div>
      <h3 className="font-display text-lg font-bold text-text-primary mb-2">
        How can I help you today?
      </h3>
      <p className="text-sm text-text-secondary mb-6 max-w-xs">
        I can research customers, suggest next steps, generate scripts, and more.
      </p>
      <div className="grid grid-cols-2 gap-2 w-full max-w-sm">
        {SUGGESTED_PROMPTS.map((item, index) => (
          <button
            key={index}
            onClick={() => onSuggestedPrompt(item.prompt)}
            className="flex items-center gap-2 p-3 bg-[hsl(var(--surface-secondary))] hover:bg-[hsl(var(--surface-hover))] border border-border rounded-lg text-left transition-colors group"
          >
            <item.icon className="w-4 h-4 text-intel-400 group-hover:text-intel-300" />
            <span className="text-sm text-text-secondary group-hover:text-text-primary">
              {item.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function ChatMessage({ message }: { message: Message }) {
  const isAssistant = message.role === "assistant";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "flex gap-3",
        isAssistant ? "flex-row" : "flex-row-reverse"
      )}
    >
      <div
        className={cn(
          "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
          isAssistant
            ? "bg-gradient-to-br from-intel-500 to-guardian-500"
            : "bg-surface-700"
        )}
      >
        {isAssistant ? (
          <Bot className="w-4 h-4 text-white" />
        ) : (
          <User className="w-4 h-4 text-text-primary" />
        )}
      </div>
      <div
        className={cn(
          "flex-1 rounded-lg p-3",
          isAssistant
            ? "bg-[hsl(var(--surface-secondary))] border border-border"
            : "bg-intel-500/10 border border-intel-500/30"
        )}
      >
        {message.isStreaming && !message.content ? (
          <div className="flex items-center gap-2 text-text-muted">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Thinking...</span>
          </div>
        ) : (
          <>
            <div className="prose prose-sm prose-invert max-w-none">
              <div className="text-text-primary whitespace-pre-wrap text-sm">
                {message.content}
              </div>
            </div>
            
            {/* Tool Calls */}
            {message.toolCalls && message.toolCalls.length > 0 && (
              <div className="mt-3 pt-3 border-t border-border space-y-2">
                {message.toolCalls.map((tool, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 text-xs text-text-muted"
                  >
                    <Zap className="w-3 h-3 text-amber-400" />
                    <span className="font-mono">{tool.name}</span>
                    {tool.status === "complete" && (
                      <span className="text-emerald-400">✓</span>
                    )}
                  </div>
                ))}
              </div>
            )}
            
            {/* Model indicator for mock mode */}
            {message.model === "mock" && (
              <div className="mt-2 flex items-center gap-1.5 text-[10px] text-amber-500/80">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                Demo Mode - Add API keys for real AI
              </div>
            )}
          </>
        )}
        <p className="text-[10px] text-text-muted mt-2">
          {message.timestamp.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      </div>
    </motion.div>
  );
}

// =============================================================================
// EXPORTS
// =============================================================================

export default AIChatPanel;
