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
        <div className="min-h-screen flex items-center justify-center bg-[#F9FAFB] px-4 font-sans">
          <div className="max-w-[480px] w-full text-center space-y-8 p-12 rounded-[24px] border border-gray-100 bg-white shadow-[0_20px_50px_rgba(0,0,0,0.04)] animate-fade-in">
            <div className="flex justify-center">
              <div className="h-16 w-16 flex items-center justify-center rounded-full bg-[#FEF2F2]">
                <AlertTriangle className="h-8 w-8 text-[#EF4444]" strokeWidth={1.5} />
              </div>
            </div>
            
            <div className="space-y-4">
              <h1 className="text-[28px] font-bold tracking-tight text-[#111827]">Something went wrong</h1>
              <p className="text-[#6B7280] text-[16px] leading-[1.6] max-w-[340px] mx-auto">
                The application encountered an unexpected error. This usually happens due to a temporary connection issue or a data loading glitch.
              </p>
            </div>

            <div className="pt-2">
              <Button 
                onClick={() => window.location.reload()} 
                className="h-[52px] px-8 bg-[#10B981] hover:bg-[#059669] text-white font-semibold rounded-xl shadow-[0_4px_14px_0_rgba(16,185,129,0.39)] transition-all active:scale-95 flex items-center gap-2 mx-auto"
              >
                <RefreshCw className="h-5 w-5" />
                Reload Application
              </Button>
            </div>

            {process.env.NODE_ENV === "development" && (
              <div className="mt-8 p-4 bg-gray-50 rounded-xl text-left border border-gray-100">
                <p className="text-[10px] font-mono text-gray-400 break-all">
                  {this.state.error?.toString()}
                </p>
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
