"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Play,
  Pause,
  RotateCcw,
  Send,
  User,
  Bot,
  Lightbulb,
  Trophy,
  Timer,
  MessageSquare,
  ChevronRight,
  Loader2,
  Star,
  AlertTriangle,
  Target,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface RoleplayModalProps {
  isOpen: boolean;
  onClose: () => void;
  playbookId?: string;
  playbookTitle?: string;
}

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

interface Persona {
  id: string;
  name: string;
  description: string;
  traits: string[];
}

interface SessionSummary {
  score: number;
  strengths: string[];
  improvements: string[];
  nextFocus: string;
  messageCount: number;
}

type SessionState = "select_persona" | "roleplay" | "coaching" | "summary";

const personaIcons: Record<string, string> = {
  skeptical_homeowner: "🤨",
  price_conscious: "💰",
  insurance_hesitant: "😰",
  busy_professional: "⏰",
  comparison_shopper: "📋",
  storm_victim: "🌧️",
  elderly_homeowner: "👴",
  aggressive_negotiator: "💪",
};

export function RoleplayModal({
  isOpen,
  onClose,
  playbookId,
  playbookTitle,
}: RoleplayModalProps) {
  const [sessionState, setSessionState] = useState<SessionState>("select_persona");
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [selectedPersona, setSelectedPersona] = useState<Persona | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [systemPrompt, setSystemPrompt] = useState<string>("");
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [coachingFeedback, setCoachingFeedback] = useState<string>("");
  const [sessionSummary, setSessionSummary] = useState<SessionSummary | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch personas on mount
  useEffect(() => {
    if (isOpen && personas.length === 0) {
      fetchPersonas();
    }
  }, [isOpen]);

  // Timer for session duration
  useEffect(() => {
    if (sessionState === "roleplay" && !isPaused) {
      timerRef.current = setInterval(() => {
        setElapsedTime((prev) => prev + 1);
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [sessionState, isPaused]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input when roleplay starts
  useEffect(() => {
    if (sessionState === "roleplay") {
      inputRef.current?.focus();
    }
  }, [sessionState]);

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      setSessionState("select_persona");
      setSelectedPersona(null);
      setMessages([]);
      setSystemPrompt("");
      setInputValue("");
      setElapsedTime(0);
      setCoachingFeedback("");
      setSessionSummary(null);
      setIsPaused(false);
    }
  }, [isOpen]);

  const fetchPersonas = async () => {
    try {
      const response = await fetch("/api/ai/roleplay");
      const data = await response.json();
      if (data.success) {
        setPersonas(data.personas);
      }
    } catch (error) {
      console.error("Failed to fetch personas:", error);
    }
  };

  const startSession = async (persona: Persona) => {
    setIsLoading(true);
    setSelectedPersona(persona);

    try {
      const response = await fetch("/api/ai/roleplay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "start",
          persona: persona.id,
          playbookId,
          scenario: playbookTitle
            ? `A sales rep is calling about roof inspection services. They're using the "${playbookTitle}" approach.`
            : undefined,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setSystemPrompt(data.systemPrompt);
        setMessages([
          { role: "system", content: data.systemPrompt },
          { role: "assistant", content: data.message.content },
        ]);
        setSessionState("roleplay");
      }
    } catch (error) {
      console.error("Failed to start session:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage = inputValue.trim();
    setInputValue("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    try {
      const response = await fetch("/api/ai/roleplay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "continue",
          userMessage,
          messages,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setMessages((prev) => [...prev, { role: "assistant", content: data.message.content }]);
      }
    } catch (error) {
      console.error("Failed to send message:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getCoaching = async () => {
    setIsLoading(true);
    setSessionState("coaching");

    try {
      const response = await fetch("/api/ai/roleplay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "coach",
          messages,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setCoachingFeedback(data.feedback.content);
      }
    } catch (error) {
      console.error("Failed to get coaching:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const endSession = async () => {
    setIsLoading(true);
    setSessionState("summary");

    try {
      const response = await fetch("/api/ai/roleplay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "end",
          messages,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setSessionSummary(data.summary);
      }
    } catch (error) {
      console.error("Failed to end session:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="w-full max-w-3xl max-h-[85vh] bg-[hsl(var(--surface-primary))] border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border bg-gradient-to-r from-purple-500/10 to-violet-500/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="font-display font-bold text-text-primary flex items-center gap-2">
                  AI Roleplay Practice
                  {sessionState === "roleplay" && (
                    <Badge className="bg-emerald-500/20 text-emerald-400 text-xs">Live</Badge>
                  )}
                </h2>
                {selectedPersona && (
                  <p className="text-sm text-text-muted">
                    {personaIcons[selectedPersona.id]} {selectedPersona.name}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              {sessionState === "roleplay" && (
                <>
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-surface-secondary rounded-lg">
                    <Timer className="w-4 h-4 text-text-muted" />
                    <span className="text-sm font-mono text-text-primary">{formatTime(elapsedTime)}</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsPaused(!isPaused)}
                  >
                    {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                  </Button>
                </>
              )}
              <button
                onClick={onClose}
                className="p-2 hover:bg-surface-hover rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-text-muted" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden flex flex-col">
            {/* Persona Selection */}
            {sessionState === "select_persona" && (
              <div className="flex-1 overflow-y-auto p-6">
                <div className="text-center mb-6">
                  <h3 className="text-lg font-semibold text-text-primary mb-2">
                    Choose Your Practice Partner
                  </h3>
                  <p className="text-sm text-text-muted max-w-md mx-auto">
                    Select a customer persona to practice with. Each has unique traits and objections to help you improve.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {personas.map((persona) => (
                    <button
                      key={persona.id}
                      onClick={() => startSession(persona)}
                      disabled={isLoading}
                      className="p-4 bg-surface-secondary border border-border rounded-xl text-left hover:border-purple-500/50 hover:bg-purple-500/5 transition-all group"
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-2xl">{personaIcons[persona.id]}</span>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-text-primary group-hover:text-purple-400 transition-colors">
                            {persona.name}
                          </h4>
                          <p className="text-xs text-text-muted mt-1 line-clamp-2">
                            {persona.description}
                          </p>
                          <div className="flex flex-wrap gap-1 mt-2">
                            {persona.traits.slice(0, 2).map((trait) => (
                              <span
                                key={trait}
                                className="text-[10px] px-1.5 py-0.5 bg-surface-primary rounded text-text-muted"
                              >
                                {trait}
                              </span>
                            ))}
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-text-muted group-hover:text-purple-400 transition-colors" />
                      </div>
                    </button>
                  ))}
                </div>
                {isLoading && (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
                  </div>
                )}
              </div>
            )}

            {/* Roleplay Chat */}
            {sessionState === "roleplay" && (
              <>
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {messages
                    .filter((m) => m.role !== "system")
                    .map((message, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex gap-3 ${message.role === "user" ? "flex-row-reverse" : ""}`}
                      >
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                            message.role === "user"
                              ? "bg-accent-primary/20 text-accent-primary"
                              : "bg-purple-500/20 text-purple-400"
                          }`}
                        >
                          {message.role === "user" ? (
                            <User className="w-4 h-4" />
                          ) : (
                            <span>{selectedPersona ? personaIcons[selectedPersona.id] : <Bot className="w-4 h-4" />}</span>
                          )}
                        </div>
                        <div
                          className={`max-w-[75%] p-3 rounded-2xl ${
                            message.role === "user"
                              ? "bg-accent-primary/20 text-text-primary rounded-br-sm"
                              : "bg-surface-secondary text-text-primary rounded-bl-sm"
                          }`}
                        >
                          <p className="text-sm leading-relaxed">{message.content}</p>
                        </div>
                      </motion.div>
                    ))}
                  {isLoading && (
                    <div className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center">
                        <span>{selectedPersona ? personaIcons[selectedPersona.id] : "🤖"}</span>
                      </div>
                      <div className="bg-surface-secondary p-3 rounded-2xl rounded-bl-sm">
                        <div className="flex gap-1">
                          <span className="w-2 h-2 bg-text-muted rounded-full animate-bounce" />
                          <span className="w-2 h-2 bg-text-muted rounded-full animate-bounce [animation-delay:0.2s]" />
                          <span className="w-2 h-2 bg-text-muted rounded-full animate-bounce [animation-delay:0.4s]" />
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="p-4 border-t border-border bg-surface-secondary/30">
                  <div className="flex gap-2">
                    <input
                      ref={inputRef}
                      type="text"
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                      placeholder="Type your response..."
                      disabled={isLoading || isPaused}
                      className="flex-1 px-4 py-3 bg-surface-secondary border border-border rounded-xl text-text-primary placeholder:text-text-muted focus:outline-none focus:border-purple-500/50"
                    />
                    <Button
                      onClick={sendMessage}
                      disabled={!inputValue.trim() || isLoading}
                      className="px-4"
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <Button variant="outline" size="sm" onClick={getCoaching}>
                      <Lightbulb className="w-4 h-4" />
                      Get Coaching
                    </Button>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSessionState("select_persona");
                          setMessages([]);
                          setElapsedTime(0);
                        }}
                      >
                        <RotateCcw className="w-4 h-4" />
                        Restart
                      </Button>
                      <Button size="sm" onClick={endSession}>
                        <Trophy className="w-4 h-4" />
                        End & Review
                      </Button>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Coaching Feedback */}
            {sessionState === "coaching" && (
              <div className="flex-1 overflow-y-auto p-6">
                <div className="text-center mb-6">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center mx-auto mb-4">
                    <Lightbulb className="w-8 h-8 text-amber-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-text-primary">
                    Coaching Feedback
                  </h3>
                </div>
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
                  </div>
                ) : (
                  <Card>
                    <CardContent className="p-6">
                      <div className="prose prose-sm prose-invert max-w-none">
                        <div className="whitespace-pre-wrap text-text-secondary leading-relaxed">
                          {coachingFeedback}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
                <div className="flex justify-center mt-6 gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setSessionState("roleplay")}
                  >
                    <MessageSquare className="w-4 h-4" />
                    Continue Practice
                  </Button>
                  <Button onClick={endSession}>
                    <Trophy className="w-4 h-4" />
                    End Session
                  </Button>
                </div>
              </div>
            )}

            {/* Session Summary */}
            {sessionState === "summary" && (
              <div className="flex-1 overflow-y-auto p-6">
                {isLoading ? (
                  <div className="flex items-center justify-center py-16">
                    <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
                  </div>
                ) : sessionSummary ? (
                  <>
                    <div className="text-center mb-6">
                      <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500/20 to-violet-500/20 flex items-center justify-center mx-auto mb-4">
                        <Trophy className="w-10 h-10 text-purple-400" />
                      </div>
                      <h3 className="text-xl font-semibold text-text-primary mb-2">
                        Session Complete!
                      </h3>
                      <div className="flex items-center justify-center gap-4 text-sm text-text-muted">
                        <span className="flex items-center gap-1">
                          <Timer className="w-4 h-4" />
                          {formatTime(elapsedTime)}
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageSquare className="w-4 h-4" />
                          {sessionSummary.messageCount} exchanges
                        </span>
                      </div>
                    </div>

                    {/* Score */}
                    <div className="flex justify-center mb-6">
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`w-8 h-8 ${
                              star <= sessionSummary.score
                                ? "text-amber-400 fill-current"
                                : "text-surface-secondary"
                            }`}
                          />
                        ))}
                      </div>
                    </div>

                    <div className="grid gap-4">
                      {/* Strengths */}
                      <Card className="border-emerald-500/30 bg-emerald-500/5">
                        <CardContent className="p-4">
                          <h4 className="font-medium text-emerald-400 flex items-center gap-2 mb-3">
                            <Target className="w-4 h-4" />
                            What You Did Well
                          </h4>
                          <ul className="space-y-2">
                            {sessionSummary.strengths.map((strength, i) => (
                              <li key={i} className="text-sm text-text-secondary flex items-start gap-2">
                                <span className="text-emerald-400 mt-1">•</span>
                                {strength}
                              </li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>

                      {/* Improvements */}
                      <Card className="border-amber-500/30 bg-amber-500/5">
                        <CardContent className="p-4">
                          <h4 className="font-medium text-amber-400 flex items-center gap-2 mb-3">
                            <AlertTriangle className="w-4 h-4" />
                            Areas to Improve
                          </h4>
                          <ul className="space-y-2">
                            {sessionSummary.improvements.map((improvement, i) => (
                              <li key={i} className="text-sm text-text-secondary flex items-start gap-2">
                                <span className="text-amber-400 mt-1">•</span>
                                {improvement}
                              </li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>

                      {/* Next Focus */}
                      <Card className="border-purple-500/30 bg-purple-500/5">
                        <CardContent className="p-4">
                          <h4 className="font-medium text-purple-400 flex items-center gap-2 mb-2">
                            <Sparkles className="w-4 h-4" />
                            Next Practice Focus
                          </h4>
                          <p className="text-sm text-text-secondary">
                            {sessionSummary.nextFocus}
                          </p>
                        </CardContent>
                      </Card>
                    </div>

                    <div className="flex justify-center mt-6 gap-3">
                      <Button
                        variant="outline"
                        onClick={() => setSessionState("select_persona")}
                      >
                        <RotateCcw className="w-4 h-4" />
                        Practice Again
                      </Button>
                      <Button onClick={onClose}>
                        Done
                      </Button>
                    </div>
                  </>
                ) : null}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
