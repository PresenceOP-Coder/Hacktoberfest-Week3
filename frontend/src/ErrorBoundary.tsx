import { Component, type ErrorInfo, type ReactNode } from 'react';
import { SnorlaxBlocking } from './components/snorlax/SnorlaxSVGs';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            padding: '40px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              maxWidth: '560px',
              width: '100%',
              background: 'var(--surface)',
              border: '3px solid var(--berry-spicy)',
              borderRadius: 'var(--radius-xl)',
              padding: '28px',
              boxShadow: 'var(--shadow-chunky)',
              textAlign: 'center',
            }}
          >
            <div style={{ display: 'inline-block', marginBottom: '16px' }}>
              <SnorlaxBlocking size={140} />
            </div>

            <h2
              style={{
                fontFamily: 'var(--font-heading)',
                fontSize: '22px',
                fontWeight: 800,
                color: 'var(--berry-spicy)',
                marginBottom: '8px',
              }}
            >
              Route blocked! Snorlax fell asleep here.
            </h2>

            <p style={{ fontSize: '16px', color: 'var(--muted)', marginBottom: '16px', lineHeight: 1.5 }}>
              A UI component encountered an unexpected error during rendering:
            </p>

            <pre
              style={{
                background: 'var(--surface-alt)',
                border: '2px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                padding: '12px',
                fontSize: '13px',
                color: 'var(--berry-spicy)',
                fontFamily: 'monospace',
                textAlign: 'left',
                overflowX: 'auto',
                marginBottom: '20px',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
            >
              {this.state.error?.message || 'Unknown runtime error'}
            </pre>

            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                height: '46px',
                padding: '0 24px',
                background: 'var(--accent)',
                color: '#FFFFFF',
                fontFamily: 'var(--font-heading)',
                fontSize: '16px',
                fontWeight: 800,
                borderRadius: 'var(--radius-md)',
                border: '3px solid var(--border)',
                boxShadow: 'var(--shadow-btn)',
                cursor: 'pointer',
              }}
            >
              🪈 Play Poké Flute (Reload)
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
