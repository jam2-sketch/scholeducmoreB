import React, { StrictMode, useState, useEffect, ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

console.log('[main.tsx] Script started');

// Simple Error Boundary using functional component
function ErrorBoundary({ children }: { children: ReactNode }) {
  const [hasError, setHasError] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      console.error('Caught error:', event.error);
      setHasError(true);
      setError(event.error);
      event.preventDefault();
    };

    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  if (hasError && error) {
    return (
      <div style={{ padding: '20px', fontFamily: 'sans-serif', background: '#fee2e2', minHeight: '100vh' }}>
        <h1 style={{ color: '#dc2626' }}>Error: {error.message}</h1>
        <button onClick={() => window.location.reload()}>Reload</button>
      </div>
    );
  }

  return children;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
