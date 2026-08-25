import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[350px] w-full flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-xl border border-rose-500/20 rounded-2xl shadow-2xl">
          <div className="max-w-md w-full text-center space-y-5">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/20 shadow-lg shadow-rose-500/5">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-bold text-slate-100">
                {this.props.fallbackTitle || 'Component Error Occurred'}
              </h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                An unexpected error prevented this view from loading cleanly. You can try refreshing the component.
              </p>
            </div>

            {this.state.error && (
              <div className="p-3.5 text-left bg-slate-950/80 border border-slate-800 rounded-xl overflow-x-auto text-xs text-rose-300 font-mono max-h-32 scrollbar-thin">
                {this.state.error.message || 'Unknown render error'}
              </div>
            )}

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={this.handleReset}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-semibold text-sm shadow-lg shadow-amber-500/20 transition-all duration-200 active:scale-95"
              >
                <RefreshCw className="w-4 h-4" />
                Retry View
              </button>
              <button
                onClick={() => (window.location.href = '/')}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-sm border border-slate-700 transition-all duration-200"
              >
                <Home className="w-4 h-4" />
                Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
