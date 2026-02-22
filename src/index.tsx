import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);

function ConfigError({ message }: { message: string }) {
  const isConfigMissing = message.includes('B2_BUDDY_CONFIG_MISSING');
  return (
    <div style={{
      padding: '2rem',
      maxWidth: '480px',
      margin: '2rem auto',
      fontFamily: 'system-ui, sans-serif',
      background: '#fef2f2',
      border: '1px solid #fecaca',
      borderRadius: '8px',
      color: '#991b1b',
    }}>
      <h2 style={{ margin: '0 0 0.75rem', fontSize: '1.25rem' }}>
        {isConfigMissing ? 'App not configured' : 'Something went wrong'}
      </h2>
      <p style={{ margin: 0, lineHeight: 1.5 }}>
        {isConfigMissing
          ? 'Firebase env vars (VITE_FIREBASE_*) were not set when this build was created. Add a .env.production (or .env) with your Firebase config, run npm run build, then redeploy.'
          : message}
      </p>
    </div>
  );
}

(async () => {
  try {
    const { default: App } = await import('./App');
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    root.render(<ConfigError message={message} />);
  }
})();
