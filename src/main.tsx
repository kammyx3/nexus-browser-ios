import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

class StartupBoundary extends React.Component<{ children: React.ReactNode }, { error: string }> {
  state = { error: '' };
  static getDerivedStateFromError(error: unknown) {
    return { error: error instanceof Error ? error.message : String(error) };
  }
  componentDidCatch(error: unknown) { console.error('Nexus startup failed', error); }
  render() {
    if (this.state.error) return <main className="startup-error"><div><strong>Nexus couldn’t start</strong><p>{this.state.error}</p><button onClick={() => location.reload()}>Try again</button></div></main>;
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <StartupBoundary><App /></StartupBoundary>
  </React.StrictMode>
);
