import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
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

  public componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
  }

  private handleReset = (): void => {
    this.setState({ hasError: false, error: null });
  };

  public render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div className="min-h-[240px] flex flex-col items-center justify-center p-8 bg-white border border-rose-300 rounded shadow-sm text-center">
          <div className="w-12 h-12 mb-3 text-rose-500 flex items-center justify-center rounded-full bg-rose-50">
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h2 className="text-sm font-bold text-slate-800 mb-1">
            Bileşen yüklenirken bir sorun oluştu
          </h2>
          <p className="text-xs text-slate-500 max-w-md mb-4 font-mono">
            {this.state.error?.message || 'Beklenmedik bir hata meydana geldi.'}
          </p>
          <button
            onClick={this.handleReset}
            className="px-4 py-1.5 bg-[#090A0F] hover:bg-slate-800 text-white text-xs font-semibold rounded transition-colors"
          >
            Yeniden Dene
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
