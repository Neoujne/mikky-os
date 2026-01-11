import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ClerkProvider } from '@clerk/clerk-react';
import { dark } from '@clerk/themes';
import { ConvexProviderWithClerk } from 'convex/react-clerk';
import { ConvexReactClient } from 'convex/react';
import { useAuth } from '@clerk/clerk-react';
import './index.css';
import App from './App.tsx';

// Get environment variables
const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
const CONVEX_URL = import.meta.env.VITE_CONVEX_URL;

// Create root element
const rootElement = document.getElementById('root')!;
const root = createRoot(rootElement);

// Check for required environment variables
if (!CLERK_PUBLISHABLE_KEY) {
  root.render(
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      background: '#09090b',
      color: '#71717a',
      fontFamily: 'monospace',
      textAlign: 'center',
      padding: '2rem'
    }}>
      <h1 style={{ color: '#ef4444', marginBottom: '1rem' }}>Configuration Error</h1>
      <p>Missing <code style={{ color: '#22d3ee' }}>VITE_CLERK_PUBLISHABLE_KEY</code> environment variable.</p>
      <p style={{ marginTop: '0.5rem', fontSize: '0.875rem' }}>
        Add it to <code>.env.local</code> and restart the dev server.
      </p>
    </div>
  );
} else if (!CONVEX_URL) {
  root.render(
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      background: '#09090b',
      color: '#71717a',
      fontFamily: 'monospace',
      textAlign: 'center',
      padding: '2rem'
    }}>
      <h1 style={{ color: '#ef4444', marginBottom: '1rem' }}>Configuration Error</h1>
      <p>Missing <code style={{ color: '#22d3ee' }}>VITE_CONVEX_URL</code> environment variable.</p>
      <p style={{ marginTop: '0.5rem', fontSize: '0.875rem' }}>
        Run <code>npx convex dev</code> to set up your Convex deployment.
      </p>
    </div>
  );
} else {
  // All environment variables present - render the app
  const convex = new ConvexReactClient(CONVEX_URL);

  root.render(
    <StrictMode>
      <ClerkProvider
        publishableKey={CLERK_PUBLISHABLE_KEY}
        signInForceRedirectUrl="/dashboard"
        signUpForceRedirectUrl="/dashboard"
        appearance={{
          baseTheme: dark,
          variables: {
            colorPrimary: '#22d3ee',
            colorBackground: '#09090b',
            colorText: 'white'
          },
          elements: {
            card: 'border border-cyan-900 bg-zinc-950'
          }
        }}
      >
        <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </ConvexProviderWithClerk>
      </ClerkProvider>
    </StrictMode>
  );
}
