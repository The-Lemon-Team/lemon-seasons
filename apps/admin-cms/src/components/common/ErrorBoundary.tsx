import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from 'antd';

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
    console.error('[AdminCMS ErrorBoundary] Uncaught render error:', error, errorInfo);
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
        <div className="min-h-[380px] w-full flex items-center justify-center p-8 bg-[#121414]/90 backdrop-blur-xl border border-rose-500/20 rounded-2xl shadow-2xl m-4 max-w-2xl mx-auto">
          <div className="max-w-lg w-full text-center space-y-5">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/20 shadow-lg shadow-rose-500/5">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-bold text-slate-100">
                {this.props.fallbackTitle || 'Ошибка отображения компонента'}
              </h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Во время отрисовки этого блока произошла ошибка. Ваши введенные данные не затронуты на сервере.
              </p>
            </div>

            {this.state.error && (
              <div className="p-3.5 text-left bg-black/60 border border-rose-900/40 rounded-xl overflow-x-auto text-xs text-rose-300 font-mono max-h-36 scrollbar-thin">
                {this.state.error.message || 'Неизвестная ошибка рендеринга'}
              </div>
            )}

            <div className="flex items-center justify-center gap-3 pt-2">
              <Button
                type="primary"
                icon={<RefreshCw className="w-4 h-4 inline mr-1" />}
                onClick={this.handleReset}
                className="bg-[#c9cd58] text-slate-900 font-semibold hover:!bg-[#b8bc48]"
              >
                Повторить
              </Button>
              <Button
                icon={<Home className="w-4 h-4 inline mr-1" />}
                onClick={() => (window.location.href = '/')}
                className="bg-slate-800 border-slate-700 text-slate-200 hover:!bg-slate-700 hover:!text-white"
              >
                На главную
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
