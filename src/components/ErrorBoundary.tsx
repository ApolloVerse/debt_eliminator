import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          backgroundColor: '#F8FAFC',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
          fontFamily: 'Inter, sans-serif',
        }}>
          <div style={{
            backgroundColor: '#fff',
            border: '2px solid #EF4444',
            padding: '32px',
            borderRadius: '24px',
            maxWidth: '448px',
            width: '100%',
            textAlign: 'center',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
            <h1 style={{ fontSize: '22px', fontWeight: 900, color: '#0F172A', marginBottom: '8px' }}>
              Ops! Algo deu errado.
            </h1>
            <p style={{ fontSize: '13px', color: '#64748B', marginBottom: '24px', lineHeight: '1.6' }}>
              {this.state.error?.message || 'Ocorreu um erro inesperado. Por favor, atualize a página.'}
            </p>
            <button
              onClick={() => window.location.reload()}
              style={{
                width: '100%',
                backgroundColor: '#7F3DFF',
                color: '#fff',
                border: 'none',
                padding: '14px 24px',
                borderRadius: '16px',
                fontSize: '14px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Atualizar Página
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
