import React from 'react';
import { AlertTriangle } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // ── Security: Only log detailed errors in development mode.
    //              In production, component stacks reveal internal paths.
    if (import.meta.env.DEV) {
      console.error('ErrorBoundary caught an error', error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          backgroundColor: 'var(--bg-color)',
          color: 'var(--text-primary)',
          padding: '20px',
          textAlign: 'center'
        }}>
          <AlertTriangle size={64} color="var(--accent-color)" style={{ marginBottom: '20px' }} />
          <h2>Oops, something went wrong!</h2>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '500px', margin: '10px 0 30px' }}>
            The application encountered an unexpected error. This is usually caused by malformed markdown or a sudden disconnect.
          </p>
          <button 
            onClick={() => window.location.reload()}
            style={{
              background: 'var(--accent-color)',
              color: 'white',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: '500'
            }}
          >
            Reload Application
          </button>
        </div>
      );
    }

    return this.props.children; 
  }
}

export default ErrorBoundary;
