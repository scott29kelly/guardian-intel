"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Variable,
  User,
  Home,
  Shield,
  Cloud,
  Settings,
  Eye,
  EyeOff,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  PLAYBOOK_VARIABLES,
  getVariablesByCategory,
  parseVariables,
  replaceVariables,
  getPreviewWithExamples,
  resolveCustomerVariables,
  type VariableValues,
} from "@/lib/services/playbooks/variables";

interface VariablePreviewProps {
  content: string;
  customerId?: string;
  onInsertVariable?: (variable: string) => void;
  showPreview?: boolean;
  compact?: boolean;
}

const categoryIcons: Record<string, typeof User> = {
  customer: User,
  property: Home,
  insurance: Shield,
  weather: Cloud,
  system: Settings,
};

const categoryLabels: Record<string, string> = {
  customer: "Customer",
  property: "Property",
  insurance: "Insurance",
  weather: "Weather",
  system: "System",
};

export function VariablePreview({
  content,
  customerId,
  onInsertVariable,
  showPreview = true,
  compact = false,
}: VariablePreviewProps) {
  const [isExpanded, setIsExpanded] = useState(!compact);
  const [previewMode, setPreviewMode] = useState<"example" | "customer">("example");
  const [customerValues, setCustomerValues] = useState<VariableValues>({});
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Parse variables in content
  const usedVariables = useMemo(() => parseVariables(content), [content]);
  const variablesByCategory = useMemo(() => getVariablesByCategory(), []);

  // Fetch customer data when switching to customer preview mode
  useEffect(() => {
    if (previewMode === "customer" && customerId && Object.keys(customerValues).length === 0) {
      setIsLoading(true);
      resolveCustomerVariables(customerId)
        .then((values) => {
          setCustomerValues(values);
        })
        .catch((error) => {
          console.error("Failed to resolve customer variables:", error);
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [previewMode, customerId, customerValues]);

  // Generate preview content
  const previewContent = useMemo(() => {
    if (previewMode === "example" || !customerId) {
      return getPreviewWithExamples(content);
    }
    return replaceVariables(content, customerValues, { highlightUnresolved: true });
  }, [content, previewMode, customerId, customerValues]);

  const handleCopyPreview = () => {
    navigator.clipboard.writeText(previewContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!content || usedVariables.length === 0) {
    if (compact) return null;
    
    return (
      <div className="p-4 bg-surface-secondary/30 rounded-lg border border-border">
        <div className="flex items-center gap-2 text-text-muted text-sm">
          <Variable className="w-4 h-4" />
          <span>No variables used in this playbook</span>
        </div>
        {onInsertVariable && (
          <p className="text-xs text-text-muted mt-2">
            Add variables like {"{CUSTOMER_NAME}"} to personalize content
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="bg-surface-secondary/30 rounded-lg border border-border overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-3 hover:bg-surface-hover transition-colors"
      >
        <div className="flex items-center gap-2">
          <Variable className="w-4 h-4 text-accent-primary" />
          <span className="text-sm font-medium text-text-primary">
            Variables ({usedVariables.length})
          </span>
          <div className="flex gap-1">
            {usedVariables.slice(0, 3).map((v) => (
              <Badge key={v} className="text-[10px] bg-accent-primary/20 text-accent-primary">
                {v}
              </Badge>
            ))}
            {usedVariables.length > 3 && (
              <Badge className="text-[10px] bg-surface-secondary text-text-muted">
                +{usedVariables.length - 3}
              </Badge>
            )}
          </div>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-text-muted" />
        ) : (
          <ChevronDown className="w-4 h-4 text-text-muted" />
        )}
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="p-3 pt-0 space-y-4">
              {/* Preview Toggle */}
              {showPreview && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {previewMode === "example" ? (
                      <Eye className="w-4 h-4 text-text-muted" />
                    ) : (
                      <User className="w-4 h-4 text-accent-primary" />
                    )}
                    <span className="text-xs text-text-muted">
                      {previewMode === "example" ? "Example Preview" : "Customer Preview"}
                    </span>
                  </div>
                  {customerId && (
                    <div className="flex gap-1">
                      <button
                        onClick={() => setPreviewMode("example")}
                        className={`px-2 py-1 text-xs rounded ${
                          previewMode === "example"
                            ? "bg-accent-primary/20 text-accent-primary"
                            : "text-text-muted hover:text-text-primary"
                        }`}
                      >
                        Example
                      </button>
                      <button
                        onClick={() => setPreviewMode("customer")}
                        className={`px-2 py-1 text-xs rounded ${
                          previewMode === "customer"
                            ? "bg-accent-primary/20 text-accent-primary"
                            : "text-text-muted hover:text-text-primary"
                        }`}
                      >
                        Customer
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Preview Content */}
              {showPreview && (
                <div className="relative">
                  {isLoading ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="w-5 h-5 text-accent-primary animate-spin" />
                    </div>
                  ) : (
                    <>
                      <div className="p-3 bg-surface-primary rounded-lg border border-border text-sm text-text-secondary whitespace-pre-wrap max-h-48 overflow-y-auto">
                        {previewContent.slice(0, 500)}
                        {previewContent.length > 500 && "..."}
                      </div>
                      <button
                        onClick={handleCopyPreview}
                        className="absolute top-2 right-2 p-1.5 bg-surface-secondary rounded hover:bg-surface-hover transition-colors"
                      >
                        {copied ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5 text-text-muted" />
                        )}
                      </button>
                    </>
                  )}
                </div>
              )}

              {/* Variable Insertion */}
              {onInsertVariable && (
                <div className="space-y-3">
                  <div className="text-xs font-medium text-text-muted">Insert Variable</div>
                  {Object.entries(variablesByCategory).map(([category, variables]) => {
                    if (variables.length === 0) return null;
                    const Icon = categoryIcons[category] || Variable;

                    return (
                      <div key={category}>
                        <div className="flex items-center gap-1.5 text-xs text-text-muted mb-1.5">
                          <Icon className="w-3 h-3" />
                          {categoryLabels[category]}
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {variables.map((v) => (
                            <button
                              key={v.name}
                              onClick={() => onInsertVariable(`{${v.name}}`)}
                              className="px-2 py-1 text-[10px] bg-surface-primary border border-border rounded hover:border-accent-primary/50 hover:bg-accent-primary/10 text-text-secondary hover:text-accent-primary transition-colors"
                              title={v.description}
                            >
                              {v.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Used Variables List */}
              {!onInsertVariable && usedVariables.length > 0 && (
                <div className="space-y-1">
                  <div className="text-xs font-medium text-text-muted mb-2">Used Variables</div>
                  <div className="grid grid-cols-2 gap-2">
                    {usedVariables.map((varName) => {
                      const def = PLAYBOOK_VARIABLES.find((v) => v.name === varName);
                      const value =
                        previewMode === "customer" && customerValues[varName]
                          ? String(customerValues[varName])
                          : def?.example;

                      return (
                        <div
                          key={varName}
                          className="p-2 bg-surface-primary rounded border border-border"
                        >
                          <div className="text-[10px] text-accent-primary font-mono">
                            {"{" + varName + "}"}
                          </div>
                          <div className="text-xs text-text-secondary mt-0.5 truncate">
                            {value || "[Not set]"}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
