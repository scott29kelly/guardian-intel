"use client";

import React from "react";
import { AlertTriangle, RefreshCw, Home, Bug, MessageSquare, ExternalLink } from "lucide-react";
import { Button } from "./ui/button";

// ============================================
// ERROR LOGGING SERVICE
// ============================================

export interface ErrorLogPayload {
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
export const errorLogger = ErrorLoggingService.getInstance();

// Example adapter for custom API endpoint
// errorLogger.registerAdapter(async (payload) => {
//   await fetch("/api/errors", { 
//     method: "POST", 
//     body: JSON.stringify(payload) 
//   });
// });

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
            <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-[hsl(var(--accent-danger)/0.1)] border border-[hsl(var(--accent-danger)/0.3)] flex items-center justify-center">
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
 * Suspense-compatible error boundary for async components
 */
export function AsyncErrorBoundary({
  children,
  fallback,
}: {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  return (
    <ErrorBoundary fallback={fallback}>
      <React.Suspense
        fallback={
          <div className="min-h-[200px] flex items-center justify-center">
            <div className="flex items-center gap-2 text-text-muted">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span className="text-sm">Loading...</span>
            </div>
          </div>
        }
      >
        {children}
      </React.Suspense>
    </ErrorBoundary>
  );
}

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

/**
 * Recoverable Error Boundary
 * 
 * Wraps a component with automatic recovery attempts.
 * Useful for components that might fail due to transient issues.
 */
export function RecoverableErrorBoundary({
  children,
  maxRetries = 3,
  retryDelay = 1000,
  onMaxRetriesExceeded,
}: {
  children: React.ReactNode;
  maxRetries?: number;
  retryDelay?: number;
  onMaxRetriesExceeded?: () => void;
}) {
  const [retryCount, setRetryCount] = React.useState(0);
  const [key, setKey] = React.useState(0);

  const handleError = React.useCallback(() => {
    if (retryCount < maxRetries) {
      setTimeout(() => {
        setRetryCount((c) => c + 1);
        setKey((k) => k + 1);
      }, retryDelay);
    } else {
      onMaxRetriesExceeded?.();
    }
  }, [retryCount, maxRetries, retryDelay, onMaxRetriesExceeded]);

  return (
    <ErrorBoundary
      key={key}
      onError={handleError}
      context={{ retryCount, maxRetries }}
      fallback={
        retryCount >= maxRetries ? (
          <div className="rounded-lg border border-accent-danger/30 bg-accent-danger/5 p-4 text-center">
            <AlertTriangle className="w-6 h-6 text-accent-danger mx-auto mb-2" />
            <p className="text-sm text-text-muted">
              Failed after {maxRetries} attempts
            </p>
            <button
              onClick={() => {
                setRetryCount(0);
                setKey((k) => k + 1);
              }}
              className="mt-2 text-xs text-accent-primary hover:underline"
            >
              Reset and try again
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-center p-4">
            <RefreshCw className="w-4 h-4 animate-spin text-text-muted" />
            <span className="ml-2 text-sm text-text-muted">
              Retrying... ({retryCount + 1}/{maxRetries})
            </span>
          </div>
        )
      }
    >
      {children}
    </ErrorBoundary>
  );
}

/**
 * Widget Error Boundary
 * 
 * Ultra-compact error display for dashboard widgets.
 * Keeps the widget visible but shows error state.
 */
export function WidgetErrorBoundary({
  children,
  widgetName,
}: {
  children: React.ReactNode;
  widgetName?: string;
}) {
  const [key, setKey] = React.useState(0);

  return (
    <ErrorBoundary
      key={key}
      context={{ widget: widgetName }}
      fallback={
        <div className="h-full min-h-[100px] flex flex-col items-center justify-center text-center p-4 bg-surface-secondary/50 rounded-lg border border-void-700/50">
          <AlertTriangle className="w-5 h-5 text-accent-warning mb-2" />
          <p className="text-xs text-text-muted mb-2">
            {widgetName || "Widget"} unavailable
          </p>
          <button
            onClick={() => setKey((k) => k + 1)}
            className="text-[10px] text-accent-primary hover:underline flex items-center gap-1"
          >
            <RefreshCw className="w-2.5 h-2.5" />
            Reload
          </button>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  );
}
