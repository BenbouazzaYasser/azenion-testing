"use client";

import React, { Component, type ReactNode } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-2xl border border-rose-500/20 bg-rose-500/[0.04] p-6 text-center my-4">
          <h3 className="mb-2 text-lg font-medium text-rose-200">
            {this.props.fallbackTitle ?? "Component failed to render"}
          </h3>
          <p className="mb-4 text-sm text-ink-400">
            {this.props.fallbackMessage ?? "An unexpected error occurred in this section. You can try reloading it."}
          </p>
          <Button
            size="sm"
            onClick={() => this.setState({ hasError: false, error: undefined })}
            variant="secondary"
          >
            <RefreshCw size={14} className="mr-2" />
            Retry
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
