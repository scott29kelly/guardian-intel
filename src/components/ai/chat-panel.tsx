"use client";

/**
 * AI Chat Panel Component
 * 
 * A slide-out panel for conversational AI interactions.
 * Features:
 * - Persistent conversation history
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
  MessageSquare,
  Zap,
  RefreshCw,
  Maximize2,
  PanelRightClose,
  Expand,
  Plus,
  Clock,
  Trash2,
  Search,
  ChevronLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";

// =============================================================================
// FORMAT AI RESPONSE - Aggressive formatter for clean, readable output
// =============================================================================

function formatAIResponse(content: string): string {
  let text = content;
  
  text = text.replace(/^[-•*]\s*\*?\*?PREAMBLE\*?\*?:?\s*/gim, '');
  text = text.replace(/^[-•*]\s*\*?\*?SECTIONS?\*?\*?:?\s*\n?/gim, '');
  text = text.replace(/^\*?\*?PREAMBLE\*?\*?:?\s*/gim, '');
  text = text.replace(/^\*?\*?SECTIONS?\*?\*?:?\s*\n?/gim, '');
  text = text.replace(/(?<![*])\*([^*\n]+)\*\*/g, '**$1**');
  text = text.replace(/\*\*([^*\n]+)\*(?![*])/g, '**$1**');
  text = text.replace(/\*\*([^*]+)\*\*\*+/g, '**$1**');
  text = text.replace(/\*\*([^*]+)\*\*\s*\*/g, '**$1**');
  text = text.replace(/\s•\s/g, '\n• ');
  text = text.replace(/\s·\s/g, '\n• ');
  text = text.replace(
    /^([\p{Emoji}\u{2600}-\u{27BF}]\s*\*\*[^*]+\*\*)\s*•\s*/gmu,
    '$1\n\n• '
  );
  
  const lines = text.split('\n');
  const output: string[] = [];
  let inSection = false;
  
  const isEmoji = (char: string): boolean => {
    if (!char) return false;
    const code = char.codePointAt(0) || 0;
    return (
      (code >= 0x1F300 && code <= 0x1F9FF) ||
      (code >= 0x2600 && code <= 0x27BF) ||
      (code >= 0x2300 && code <= 0x23FF) ||
      (code >= 0x1F600 && code <= 0x1F64F) ||
      (code >= 0x1F680 && code <= 0x1F6FF) ||
      (code >= 0x2B50 && code <= 0x2B55)
    );
  };
  
  const getFirstCodePoint = (str: string): string => {
    const cp = str.codePointAt(0);
    if (cp && cp > 0xFFFF) return String.fromCodePoint(cp);
    return str.charAt(0);
  };
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (!line) {
      if (output.length > 0 && output[output.length - 1] !== '') {
        output.push('');
      }
      inSection = false;
      continue;
    }
    
    const firstChar = getFirstCodePoint(line);
    
    if (isEmoji(firstChar)) {
      if (output.length > 0 && output[output.length - 1] !== '') {
        output.push('');
      }
      
      let header = line;
      header = header.replace(/^([\p{Emoji}\u{2600}-\u{27BF}])\s*[•\-\*]\s*/u, '$1 ');
      
      if (/^\p{Emoji}.*\*\*[^*]+$/u.test(header) && !header.endsWith('**')) {
        header = header + '**';
      }
      
      header = header.replace(/(?<![*])\*([^*\n]+)\*\*/g, '**$1**');
      header = header.replace(/\*\*([^*\n]+)\*(?![*])/g, '**$1**');
      header = header.replace(/\*\*([^*]+)\*\*\*+/g, '**$1**');
      header = header.replace(/\*\*([^*]+)\*\*\s*\*/g, '**$1**');
      
      output.push(header);
      output.push('');
      inSection = true;
      continue;
    }
    
    if (/^[•\-\*]\s/.test(line)) {
      const bulletContent = line.slice(2).trim();
      output.push(`- ${bulletContent}`);
      continue;
    }
    
    if (inSection && /^[A-Z]/.test(line)) {
      output.push(`- ${line}`);
      continue;
    }
    
    output.push(line);
  }
  
  let result = output.join('\n');
  result = result.replace(/\n{3,}/g, '\n\n');
  result = result.replace(/^\n+/, '').replace(/\n+$/, '');
  
  return result;
}

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

interface ConversationSummary {
  id: string;
  title: string;
  customerId: string | null;
  messageCount: number;
  lastMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

type ViewMode = "panel" | "expanded" | "fullscreen";

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
    prompt: "[NEXT_STEPS] What are the recommended next steps for this customer?",
  },
  {
    icon: CloudLightning,
    label: "Weather check",
    prompt: "[WEATHER_INTEL] Give me a weather briefing for this customer. What storm events have affected their area? How does this impact their roof and our sales approach?",
  },
  {
    icon: FileText,
    label: "Generate script",
    prompt: "[CALL_SCRIPT] Write me a phone call script for this specific customer. Include an opening, key talking points based on their situation, and a strong close. Use their name and reference their specific circumstances.",
  },
  {
    icon: Sparkles,
    label: "Objection handling",
    prompt: "[OBJECTION_HANDLER] Based on this customer's profile and interaction history, what objections are they likely to raise? Give me specific rebuttals I can use.",
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
  const [viewMode, setViewMode] = useState<ViewMode>("panel");
  
  // Conversation persistence state
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoadingConversations, setIsLoadingConversations] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Reset state and focus input when panel opens
  useEffect(() => {
    if (isOpen) {
      setViewMode("panel");
      setShowHistory(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Load conversations when panel opens
  useEffect(() => {
    if (isOpen) {
      loadConversations();
    }
  }, [isOpen]);

  // Handle initial prompt
  useEffect(() => {
    if (isOpen && initialPrompt && messages.length === 0 && !conversationId) {
      handleSendMessage(initialPrompt);
    }
  }, [isOpen, initialPrompt, messages.length, conversationId]);

  const loadConversations = async () => {
    setIsLoadingConversations(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set("search", searchQuery);
      if (customerId) params.set("customerId", customerId);
      
      const response = await fetch(`/api/conversations?${params}`);
      if (response.ok) {
        const data = await response.json();
        setConversations(data.conversations || []);
      }
    } catch (err) {
      console.error("Failed to load conversations:", err);
    } finally {
      setIsLoadingConversations(false);
    }
  };

  const loadConversation = async (id: string) => {
    try {
      const response = await fetch(`/api/conversations/${id}`);
      if (response.ok) {
        const data = await response.json();
        setConversationId(id);
        setMessages(
          data.conversation.messages.map((m: { id: string; role: string; content: string; createdAt: string; model?: string; toolCalls?: string }) => ({
            id: m.id,
            role: m.role as "user" | "assistant" | "system",
            content: m.content,
            timestamp: new Date(m.createdAt),
            model: m.model,
            toolCalls: m.toolCalls ? JSON.parse(m.toolCalls) : undefined,
          }))
        );
        setShowHistory(false);
      }
    } catch (err) {
      console.error("Failed to load conversation:", err);
    }
  };

  const createConversation = async (): Promise<string | null> => {
    try {
      const response = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId }),
      });
      if (response.ok) {
        const data = await response.json();
        return data.conversation.id;
      }
    } catch (err) {
      console.error("Failed to create conversation:", err);
    }
    return null;
  };

  const saveMessage = async (convId: string, role: string, content: string, model?: string, toolCalls?: unknown[]) => {
    try {
      await fetch(`/api/conversations/${convId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, content, model, toolCalls }),
      });
    } catch (err) {
      console.error("Failed to save message:", err);
    }
  };

  const deleteConversation = async (id: string) => {
    try {
      await fetch(`/api/conversations/${id}`, { method: "DELETE" });
      setConversations(prev => prev.filter(c => c.id !== id));
      if (conversationId === id) {
        handleClearChat();
      }
    } catch (err) {
      console.error("Failed to delete conversation:", err);
    }
  };

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

    // Create conversation if needed
    let convId = conversationId;
    if (!convId) {
      convId = await createConversation();
      if (convId) {
        setConversationId(convId);
      }
    }

    // Save user message
    if (convId) {
      saveMessage(convId, "user", content.trim());
    }

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

      const assistantContent = data.message.content;
      const toolCalls = data.toolResults?.map((tr: { name: string; result: unknown }) => ({
        name: tr.name,
        status: "complete" as const,
        result: tr.result,
      }));

      // Update assistant message with response
      setMessages(prev =>
        prev.map(m =>
          m.id === assistantId
            ? {
                ...m,
                content: assistantContent,
                isStreaming: false,
                model: data.model,
                toolCalls,
              }
            : m
        )
      );

      // Save assistant message
      if (convId) {
        saveMessage(convId, "assistant", assistantContent, data.model, toolCalls);
      }

      // Refresh conversation list
      loadConversations();

      if (data.warning) {
        console.warn("[AI Chat]", data.warning);
      }
    } catch (err) {
      console.error("Chat error:", err);
      setError(err instanceof Error ? err.message : "Failed to send message");
      setMessages(prev => prev.filter(m => m.id !== assistantId));
    } finally {
      setIsLoading(false);
    }
  }, [messages, customerId, isLoading, conversationId]);

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
    setConversationId(null);
    setError(null);
  };

  const handleNewChat = () => {
    handleClearChat();
    setShowHistory(false);
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
            className={cn(
              "fixed inset-0 z-40",
              viewMode === "panel" 
                ? "bg-black/40 backdrop-blur-sm" 
                : "bg-black/60 backdrop-blur-md"
            )}
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, x: viewMode === "panel" ? "100%" : 0, scale: viewMode !== "panel" ? 0.95 : 1 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: viewMode === "panel" ? "100%" : 0, scale: viewMode !== "panel" ? 0.95 : 1 }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className={cn(
              "fixed bg-[hsl(var(--surface-primary))] border border-border shadow-2xl z-50 flex flex-col",
              viewMode === "panel" && "right-0 top-0 bottom-0 w-full max-w-lg border-l rounded-none",
              viewMode === "expanded" && "inset-0 m-auto w-[90vw] max-w-4xl h-[80vh] max-h-[800px] rounded-xl",
              viewMode === "fullscreen" && "inset-4 rounded-xl"
            )}
          >
            {/* History Sidebar */}
            <AnimatePresence>
              {showHistory && (
                <motion.div
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: 280, opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  className="border-r border-border flex flex-col overflow-hidden"
                >
                  <div className="p-3 border-b border-border">
                    <div className="flex items-center gap-2 mb-3">
                      <button
                        onClick={() => setShowHistory(false)}
                        className="p-1.5 hover:bg-surface-secondary rounded"
                      >
                        <ChevronLeft className="w-4 h-4 text-text-muted" />
                      </button>
                      <h3 className="font-medium text-text-primary">History</h3>
                    </div>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => {
                          setSearchQuery(e.target.value);
                          loadConversations();
                        }}
                        placeholder="Search conversations..."
                        className="w-full pl-9 pr-3 py-2 bg-surface-secondary border border-border rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-intel-500/50"
                      />
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    {isLoadingConversations ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-5 h-5 animate-spin text-text-muted" />
                      </div>
                    ) : conversations.length === 0 ? (
                      <p className="text-center text-text-muted text-sm py-8">No conversations yet</p>
                    ) : (
                      conversations.map((conv) => (
                        <div
                          key={conv.id}
                          className={cn(
                            "p-3 rounded-lg cursor-pointer group transition-colors",
                            conversationId === conv.id
                              ? "bg-intel-500/20 border border-intel-500/30"
                              : "hover:bg-surface-secondary"
                          )}
                          onClick={() => loadConversation(conv.id)}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-text-primary truncate">
                                {conv.title}
                              </p>
                              <p className="text-xs text-text-muted truncate mt-0.5">
                                {conv.lastMessage || "No messages"}
                              </p>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteConversation(conv.id);
                              }}
                              className="p-1 opacity-0 group-hover:opacity-100 hover:bg-rose-500/20 rounded transition-opacity"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                            </button>
                          </div>
                          <div className="flex items-center gap-1 mt-1.5 text-xs text-text-muted">
                            <Clock className="w-3 h-3" />
                            {new Date(conv.updatedAt).toLocaleDateString()}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col min-w-0">
              {/* Header */}
              <div className={cn(
                "flex items-center justify-between p-4 border-b border-border bg-[hsl(var(--surface-secondary))]",
                viewMode !== "panel" && !showHistory && "rounded-t-xl"
              )}>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setShowHistory(!showHistory)}
                    className={cn(
                      "p-2 rounded-lg transition-colors",
                      showHistory ? "bg-intel-500/20 text-intel-400" : "hover:bg-surface-hover text-text-muted"
                    )}
                    title="Conversation history"
                  >
                    <MessageSquare className="w-5 h-5" />
                  </button>
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
                
                {/* View Mode Controls */}
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" onClick={handleNewChat} title="New chat">
                    <Plus className="w-4 h-4" />
                  </Button>
                  
                  <div className="flex items-center border border-border rounded-lg p-0.5 mr-2">
                    <button
                      onClick={() => setViewMode("panel")}
                      className={cn(
                        "p-1.5 rounded transition-colors",
                        viewMode === "panel" 
                          ? "bg-intel-500/20 text-intel-400" 
                          : "text-text-muted hover:text-text-primary"
                      )}
                      title="Side panel"
                    >
                      <PanelRightClose className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setViewMode("expanded")}
                      className={cn(
                        "p-1.5 rounded transition-colors",
                        viewMode === "expanded" 
                          ? "bg-intel-500/20 text-intel-400" 
                          : "text-text-muted hover:text-text-primary"
                      )}
                      title="Expanded view"
                    >
                      <Expand className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setViewMode("fullscreen")}
                      className={cn(
                        "p-1.5 rounded transition-colors",
                        viewMode === "fullscreen" 
                          ? "bg-intel-500/20 text-intel-400" 
                          : "text-text-muted hover:text-text-primary"
                      )}
                      title="Fullscreen"
                    >
                      <Maximize2 className="w-4 h-4" />
                    </button>
                  </div>
                  
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
                  Powered by multi-model AI • Conversations are saved automatically
                </p>
              </div>
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

function cleanDisplayMessage(content: string): string {
  return content.replace(/^\[(NEXT_STEPS|WEATHER_INTEL|CALL_SCRIPT|OBJECTION_HANDLER)\]\s*/i, '');
}

function ChatMessage({ message }: { message: Message }) {
  const isAssistant = message.role === "assistant";
  
  const displayContent = isAssistant 
    ? formatAIResponse(message.content)
    : cleanDisplayMessage(message.content);

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
            <div className="ai-response-content text-sm text-text-primary leading-relaxed">
              <ReactMarkdown
                components={{
                  p: ({children}) => <p className="my-3">{children}</p>,
                  strong: ({children}) => <strong className="text-intel-300 font-semibold">{children}</strong>,
                  ul: ({children}) => <ul className="my-2 ml-4 space-y-1">{children}</ul>,
                  ol: ({children}) => <ol className="my-2 ml-4 space-y-1 list-decimal">{children}</ol>,
                  li: ({children}) => <li className="text-text-primary">{children}</li>,
                  h2: ({children}) => <h2 className="text-base font-bold mt-4 mb-2 text-text-primary">{children}</h2>,
                  h3: ({children}) => <h3 className="text-sm font-semibold mt-3 mb-1 text-text-primary">{children}</h3>,
                }}
              >
                {displayContent}
              </ReactMarkdown>
            </div>
            
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
