'use client';

import { SessionProvider } from 'next-auth/react';
import { Component, ReactNode } from 'react';

// Custom Error Boundary to catch client-side errors
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

interface ErrorBoundaryProps {
  children: ReactNode;
}

class ClientErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Client error caught:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
          <div className="bg-gray-900 rounded-2xl p-8 max-w-md w-full text-center border border-gray-800">
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-red-500/20 flex items-center justify-center">
              <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white mb-3">Something went wrong</h1>
            <p className="text-gray-400 mb-6">
              An error occurred while loading the page.
            </p>
            <button
              onClick={this.handleReset}
              className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition-all"
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ClientErrorBoundary>
      <SessionProvider
        // Reduce frequency of session refetching to minimize CLIENT_FETCH_ERROR
        refetchInterval={5 * 60} // Refetch session every 5 minutes instead of constantly
        refetchOnWindowFocus={false} // Don't refetch when window regains focus
        refetchWhenOffline={false} // Don't refetch when offline
      >
        {children}
      </SessionProvider>
    </ClientErrorBoundary>
  );
}

