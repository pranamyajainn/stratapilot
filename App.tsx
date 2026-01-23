import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Dashboard } from './pages/Dashboard';
import { LandingPage } from './pages/LandingPage';
import { CrossIndustryInsights } from './pages/CrossIndustryInsights';
import ErrorBoundary from './components/ErrorBoundary';

export const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <Router>
        <Routes>
          {/* Phase 1: Dashboard is still Home */}
          <Route path="/" element={<Dashboard />} />

          {/* The New Landing Page Area */}
          <Route path="/landing" element={<LandingPage />} />

          {/* Future-proofing: App specific route */}
          <Route path="/app" element={<Dashboard />} />

          {/* Cross-Industry Insights (NEW) */}
          <Route path="/insights/cross-industry" element={<CrossIndustryInsights />} />

          {/* Catch-all redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </ErrorBoundary>
  );
};