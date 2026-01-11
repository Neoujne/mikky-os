import { Routes, Route, Navigate } from 'react-router-dom';
import { SignedIn, SignedOut } from '@clerk/clerk-react';
import { AppShell } from '@/components/shell';
import {
  DashboardPage,
  TargetsPage,
  OperationsPage,
  IntelPage,
  VulnsPage,
  SettingsPage,
  LandingPage,
} from '@/pages';
import {
  FeaturesPage,
  DocsPage,
  BlogPage,
  PricingPage,
} from '@/pages/public';

function App() {
  const handleEngage = () => {
    console.log('ENGAGE clicked - Will be wired to Convex mutation');
  };

  const handleLogout = () => {
    // Clerk handles logout via UserButton
  };

  return (
    <>
      {/* Public routes - show landing page when signed out */}
      <SignedOut>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/features" element={<FeaturesPage />} />
          <Route path="/docs" element={<DocsPage />} />
          <Route path="/blog" element={<BlogPage />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </SignedOut>

      {/* Protected routes - show dashboard when signed in */}
      <SignedIn>
        <Routes>
          {/* Public pages accessible when signed in too */}
          <Route path="/features" element={<FeaturesPage />} />
          <Route path="/docs" element={<DocsPage />} />
          <Route path="/blog" element={<BlogPage />} />
          <Route path="/pricing" element={<PricingPage />} />

          {/* Dashboard routes wrapped in AppShell */}
          <Route
            path="/*"
            element={
              <AppShell
                onEngage={handleEngage}
                onLogout={handleLogout}
              >
                <Routes>
                  <Route path="/" element={<Navigate to="/dashboard" replace />} />
                  <Route path="/dashboard" element={<DashboardPage />} />
                  <Route path="/targets" element={<TargetsPage />} />
                  <Route path="/operations" element={<OperationsPage />} />
                  <Route path="/intel" element={<IntelPage />} />
                  <Route path="/vulns" element={<VulnsPage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                  <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </Routes>
              </AppShell>
            }
          />
        </Routes>
      </SignedIn>
    </>
  );
}

export default App;
