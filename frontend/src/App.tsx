import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { OverviewPage } from './pages/OverviewPage';
import { ComingSoonPage } from './pages/ComingSoonPage';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<OverviewPage />} />
          <Route path="/patients" element={<ComingSoonPage />} />
          <Route path="/assessment" element={<ComingSoonPage />} />
          <Route path="/referrals" element={<ComingSoonPage />} />
          <Route path="/follow-ups" element={<ComingSoonPage />} />
          <Route path="/reports" element={<ComingSoonPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};

export default App;
