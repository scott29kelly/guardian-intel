"use client";

import React from "react";
import { AlertTriangle, RefreshCw, Home, Bug, MessageSquare, ExternalLink } from "lucide-react";
import { Button } from "./ui/button";

// ============================================
// ERROR LOGGING SERVICE
// ============================================

interface ErrorLogPayload {
  message: string;
  stack?: string;
  componentStack?: string;
  url: string;
  userAgent: string;
  timestamp: string;
  context?: Record<string, unknown>;
}

/**
 * Error Logging Service
 *
 * Centralized error logging with support for external services.
 * Configure adapters for Sentry, LogRocket, Datadog, etc.
 */
class ErrorLoggingService {
  private static instance: ErrorLoggingService;
  private adapters: Array<(payload: ErrorLogPayload) => Promise<void>> = [];
  private isEnabled = true;

  static getInstance(): ErrorLoggingService {
    if (!ErrorLoggingService.instance) {
      ErrorLoggingService.instance = new ErrorLoggingService();
    }
    return ErrorLoggingService.instance;
  }

  /**
   * Register an error logging adapter
   * e.g., Sentry, LogRocket, custom API endpoint
   */
  registerAdapter(adapter: (payload: ErrorLogPayload) => Promise<void>) {
    this.adapters.push(adapter);
  }

  /**
   * Enable/disable error logging
   */
  setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
  }

  /**
   * Log an error with context
   */
  async logError(
    error: Error,
    componentStack?: string,
    context?: Record<string, unknown>
  ): Promise<void> {
    if (!this.isEnabled) return;

    const payload: ErrorLogPayload = {
      message: error.message,
      stack: error.stack,
      componentStack,
      url: typeof window !== "undefined" ? window.location.href : "",
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "",
      timestamp: new Date().toISOString(),
      context,
    };

    // Always log to console in development
    if (process.env.NODE_ENV === "development") {
      console.group("🔴 Error Logged");
      console.error("Message:", payload.message);
      console.error("Stack:", payload.stack);
      if (componentStack) console.error("Component Stack:", componentStack);
      if (context) console.log("Context:", context);
      console.groupEnd();
    }

    // Send to all registered adapters
    await Promise.allSettled(
      this.adapters.map((adapter) => adapter(payload))
    );
  }
}

// Singleton instance
const errorLogger = ErrorLoggingService.getInstance();

// ============================================
// ERROR BOUNDARY TYPES
// ============================================

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  /** Show a compact inline error instead of full-page */
  inline?: boolean;
  /** Custom error ID for tracking */
  errorId?: string;
  /** Additional context for error logging */
  context?: Record<string, unknown>;
  /** Show report issue button */
  showReportButton?: boolean;
  /** Custom report URL (defaults to GitHub issue template) */
  reportUrl?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  errorId: string;
  isReporting: boolean;
}

// ============================================
// MAIN ERROR BOUNDARY
// ============================================

/**
 * Error Boundary Component
 * 
 * Catches JavaScript errors in child components and displays
 * a fallback UI instead of crashing the entire app.
 * 
 * Features:
 * - Retry functionality
 * - Report issue integration
 * - Partial UI recovery
 * - Error logging service integration
 * 
 * Usage:
 * <ErrorBoundary>
 *   <ComponentThatMightError />
 * </ErrorBoundary>
 */
export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null,
      errorId: "",
      isReporting: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // Generate a unique error ID for tracking
    const errorId = `ERR-${Date.now().toString(36).toUpperCase()}`;
    return { hasError: true, error, errorId };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ errorInfo });
    
    // Log to error service
    errorLogger.logError(
      error, 
      errorInfo.componentStack || undefined, 
      {
        ...this.props.context,
        errorId: this.state.errorId,
      }
    );
    
    // Call optional error handler
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null, errorId: "" });
  };

  handleGoHome = () => {
    window.location.href = "/";
  };

  handleReportIssue = () => {
    const { error, errorId, errorInfo } = this.state;
    const { reportUrl } = this.props;
    
    if (reportUrl) {
      window.open(reportUrl, "_blank");
      return;
    }
    
    // Build GitHub issue template URL
    const issueTitle = encodeURIComponent(`[Bug] ${error?.message?.slice(0, 60) || "Application Error"}`);
    const issueBody = encodeURIComponent(
      `## Error Details\n` +
      `- **Error ID**: \`${errorId}\`\n` +
      `- **Message**: ${error?.message || "Unknown error"}\n` +
      `- **URL**: ${window.location.href}\n` +
      `- **Time**: ${new Date().toISOString()}\n\n` +
      `## Steps to Reproduce\n` +
      `1. \n2. \n3. \n\n` +
      `## Expected Behavior\n\n\n` +
      `## Stack Trace\n\`\`\`\n${error?.stack?.slice(0, 500) || "N/A"}\n\`\`\``
    );
    
    // Default to a generic issue URL - replace with your repo
    const githubUrl = `https://github.com/your-org/guardian-intel/issues/new?title=${issueTitle}&body=${issueBody}&labels=bug`;
    window.open(githubUrl, "_blank");
  };

  handleCopyErrorId = async () => {
    try {
      await navigator.clipboard.writeText(this.state.errorId);
    } catch {
      // Clipboard failed, ignore
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const { inline, showReportButton = true } = this.props;
      const { error, errorInfo, errorId } = this.state;

      // Inline/compact error display
      if (inline) {
        return (
          <div className="rounded-lg border border-accent-danger/30 bg-accent-danger/5 p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-accent-danger shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary">
                  This component failed to load
                </p>
                <p className="text-xs text-text-muted mt-1">
                  Error ID: <code className="font-mono">{errorId}</code>
                </p>
                <button
                  onClick={this.handleRetry}
                  className="mt-2 text-xs text-accent-primary hover:underline flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  Try again
                </button>
              </div>
            </div>
          </div>
        );
      }

      // Full error display
      return (
        <div className="min-h-[400px] flex items-center justify-center p-8">
          <div className="max-w-md w-full text-center">
            {/* Icon */}
            <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-accent-danger/10 border border-accent-danger/30 flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-accent-danger" />
            </div>

            {/* Title */}
            <h2 className="font-display text-xl font-bold text-text-primary mb-2">
              Something went wrong
            </h2>

            {/* Description */}
            <p className="text-text-muted text-sm mb-2">
              An unexpected error occurred. This has been logged and we&apos;ll look into it.
            </p>

            {/* Error ID */}
            <button
              onClick={this.handleCopyErrorId}
              className="inline-flex items-center gap-1 text-xs text-text-muted hover:text-text-secondary mb-6 font-mono"
              title="Click to copy error ID"
            >
              Error ID: {errorId}
            </button>

            {/* Error details (development only) */}
            {process.env.NODE_ENV === "development" && error && (
              <div className="mb-6 p-4 bg-surface-secondary rounded-lg text-left">
                <div className="flex items-center gap-2 mb-2">
                  <Bug className="w-4 h-4 text-accent-danger" />
                  <span className="font-mono text-xs text-accent-danger uppercase">
                    Debug Info
                  </span>
                </div>
                <p className="font-mono text-xs text-text-secondary break-all">
                  {error.message}
                </p>
                {errorInfo?.componentStack && (
                  <details className="mt-2">
                    <summary className="font-mono text-xs text-text-muted cursor-pointer">
                      Component Stack
                    </summary>
                    <pre className="mt-2 text-[10px] text-text-muted overflow-auto max-h-32">
                      {errorInfo.componentStack}
                    </pre>
                  </details>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <Button variant="outline" onClick={this.handleGoHome}>
                <Home className="w-4 h-4" />
                Go Home
              </Button>
              <Button onClick={this.handleRetry}>
                <RefreshCw className="w-4 h-4" />
                Try Again
              </Button>
              {showReportButton && (
                <Button variant="ghost" onClick={this.handleReportIssue}>
                  <MessageSquare className="w-4 h-4" />
                  Report Issue
                </Button>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// ============================================
// SPECIALIZED ERROR BOUNDARIES
// ============================================

/**
 * Section-level error boundary with compact display
 * Shows partial UI failure while keeping the rest of the app functional
 */
export function SectionErrorBoundary({
  children,
  sectionName,
  onRetry,
}: {
  children: React.ReactNode;
  sectionName?: string;
  onRetry?: () => void;
}) {
  const [key, setKey] = React.useState(0);

  const handleRetry = () => {
    setKey((k) => k + 1);
    onRetry?.();
  };

  return (
    <ErrorBoundary
      key={key}
      inline
      context={{ section: sectionName }}
      fallback={
        <div className="panel p-6 text-center">
          <AlertTriangle className="w-8 h-8 text-accent-warning mx-auto mb-3" />
          <p className="text-sm text-text-muted">
            {sectionName ? `${sectionName} failed to load` : "This section failed to load"}
          </p>
          <button
            onClick={handleRetry}
            className="mt-3 text-xs text-accent-primary hover:underline inline-flex items-center gap-1"
          >
            <RefreshCw className="w-3 h-3" />
            Try again
          </button>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  );
}

