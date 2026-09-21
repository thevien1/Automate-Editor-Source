import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from './Icons';

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
    console.error('Uncaught error in React component tree:', error, errorInfo);
  }

  public handleReload = () => {
    window.location.reload();
  };

  public handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-[#080d19] text-[#f1f5f9] p-6 select-none text-center">
          <div className="max-w-md w-full bg-[#0d1527] border border-[#1e293b] rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div>
              <h2 className="text-base font-bold text-white">Something went wrong</h2>
              <p className="text-xs text-[#94a3b8] mt-1 leading-relaxed">
                An unexpected UI error occurred. You can safely reload the application.
              </p>
            </div>

            {this.state.error && (
              <div className="text-[11px] font-mono text-red-400 bg-[#080d19] p-3 rounded-lg border border-red-950/50 text-left overflow-x-auto max-h-32">
                {this.state.error.message || String(this.state.error)}
              </div>
            )}

            <div className="flex items-center justify-center space-x-3 pt-2">
              <button
                onClick={this.handleReset}
                className="px-4 py-2 rounded-lg border border-[#1e293b] hover:bg-[#162238] text-xs text-[#cbd5e1] font-semibold cursor-pointer transition-colors"
              >
                Dismiss
              </button>
              <button
                onClick={this.handleReload}
                className="px-4 py-2 rounded-lg bg-[#1677ff] hover:bg-blue-600 text-xs text-white font-semibold flex items-center space-x-1.5 cursor-pointer shadow-xs transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reload App</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
