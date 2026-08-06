import React, { Component, ErrorInfo, ReactNode } from "react";
import { Button } from "./ui/button";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background px-4">
          <div className="max-w-md w-full text-center space-y-6 p-8 rounded-2xl border border-border bg-gradient-card shadow-elegant animate-fade-in">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 text-destructive mb-2">
              <AlertTriangle className="h-8 w-8" />
            </div>
            <h1 className="font-display text-2xl font-bold tracking-tight">Something went wrong</h1>
            <p className="text-muted-foreground text-sm leading-relaxed">
              The application encountered an unexpected error. This usually happens due to a temporary connection issue or a data loading glitch.
            </p>
            <div className="pt-2">
              <Button 
                onClick={() => window.location.reload()} 
                className="bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Reload Application
              </Button>
            </div>
            {process.env.NODE_ENV === "development" && (
              <pre className="mt-4 p-4 bg-muted rounded-lg text-[10px] text-left overflow-auto max-h-40 text-muted-foreground border border-border">
                {this.state.error?.toString()}
              </pre>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
