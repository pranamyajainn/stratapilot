import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Dashboard } from './pages/Dashboard';
import { LandingPage } from './pages/LandingPage';

export const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        {/* Phase 1: Dashboard is still Home */}
        <Route path="/" element={<Dashboard />} />

        {/* The New Landing Page Area */}
        <Route path="/landing" element={<LandingPage />} />

        {/* Future-proofing: App specific route */}
        <Route path="/app" element={<Dashboard />} />

        {/* Catch-all redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
};