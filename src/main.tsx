import React, { StrictMode, Component, ReactNode, ErrorInfo } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Simple Error Boundary for runtime errors
class ErrorBoundary extends React.Component<{ children: ReactNode }, { hasError: boolean; error: Error | null }> {
  state: { hasError: boolean; error: Error | null } = { hasError: false, error: null };

  constructor(props: { children: ReactNode }) {
    super(props);
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-red-50 p-10 font-sans">
          <div className="max-w-md w-full bg-white p-8 rounded-3xl shadow-xl border border-red-100 text-center">
            <h1 className="text-2xl font-bold text-red-600 mb-4 font-serif italic">Scholeduc System Error</h1>
            <p className="text-gray-600 mb-6 text-sm leading-relaxed">
              {this.state.error?.message || 'A critical error occurred while initializing the architecture.'}
            </p>
            <button 
              onClick={() => window.location.reload()}
              className="w-full bg-brand-text text-white py-3 rounded-xl font-bold hover:bg-black transition-colors"
            >
              Restart Environment
            </button>
            <p className="mt-4 text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em]">
              Debug Terminal: F12 / Inspect
            </p>
          </div>
        </div>
      );
    }

    const self: any = this;
    return self.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
