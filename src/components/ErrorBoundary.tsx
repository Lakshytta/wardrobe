import { Component, type ReactNode } from 'react';

export class ErrorBoundary extends Component<{ children: ReactNode; resetKey: string }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidUpdate(prev: { resetKey: string }) { if (prev.resetKey !== this.props.resetKey && this.state.error) this.setState({ error: null }); }
  render() {
    if (!this.state.error) return this.props.children;
    const offline = typeof navigator !== 'undefined' && !navigator.onLine;
    return (
      <div className="empty card" role="alert">
        <h3>{offline ? "You're offline" : 'This screen could not open'}</h3>
        <p>{offline ? 'This screen needs the internet the first time. It will work once you are back online.' : 'Please try again.'}</p>
        <button className="btn primary" data-testid="error-retry" onClick={() => location.reload()}>Try again</button>
      </div>
    );
  }
}
