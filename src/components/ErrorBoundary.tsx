import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error inside ErrorBoundary:', error, errorInfo);
    
    // Auto-reload on chunk/dynamic import errors to get the latest files
    const errorMessage = error?.message || '';
    const isChunkError = errorMessage.includes('Failed to fetch') || 
                         errorMessage.includes('dynamically imported') || 
                         errorMessage.includes('loading chunk') ||
                         errorMessage.includes('MIME type');
                         
    if (isChunkError) {
      const reloadKey = 'chunk-error-reload';
      const lastReload = sessionStorage.getItem(reloadKey);
      const now = Date.now();
      
      // Prevent infinite reload loops (only reload if last auto-reload was > 10 seconds ago)
      if (!lastReload || (now - parseInt(lastReload, 10) > 10000)) {
        sessionStorage.setItem(reloadKey, now.toString());
        window.location.reload();
      }
    }
  }

  public render() {
    if (this.state.hasError) {
      const errorMessage = this.state.error?.message || '';
      const isChunkError = errorMessage.includes('Failed to fetch') || 
                           errorMessage.includes('dynamically imported') || 
                           errorMessage.includes('loading chunk');
      
      return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-slate-900 text-center">
          <div className="max-w-md w-full bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700">
            <span className="material-symbols-outlined text-red-500 text-5xl mb-4">warning</span>
            <h2 className="text-xl font-bold text-slate-950 dark:text-white mb-2">
              {isChunkError ? 'Connection / Cache Error' : 'Something went wrong'}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
              {isChunkError 
                ? 'The browser failed to retrieve the page files. This is usually resolved by reloading.' 
                : 'An unexpected application error occurred.'}
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              className="px-6 py-3 bg-primary text-white font-bold rounded-xl text-sm shadow-lg shadow-primary/30 hover:bg-opacity-90 transition-all w-full"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
