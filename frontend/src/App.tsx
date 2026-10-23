import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { Layout } from './components/Layout';
import { OverviewPage } from './pages/OverviewPage';
import { LogTodayPage } from './pages/LogTodayPage';
import { MyKidneyHealthPage } from './pages/MyKidneyHealthPage';
import { LanguageHelpPage } from './pages/LanguageHelpPage';
import { PatientsPage } from './pages/PatientsPage';
import { ClinicianPatientViewPage } from './pages/ClinicianPatientViewPage';
import { PatientIntakePage } from './pages/PatientIntakePage';
import { ReferralQueuePage } from './pages/ReferralQueuePage';
import { FollowUpsPage } from './pages/FollowUpsPage';
import { ReportsPage } from './pages/ReportsPage';

export const App: React.FC = () => {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            {/* Patient Routes */}
            <Route path="/" element={<OverviewPage />} />
            <Route path="/home" element={<Navigate to="/" replace />} />
            <Route path="/log-today" element={<LogTodayPage />} />
            <Route path="/my-kidney-health" element={<MyKidneyHealthPage />} />
            <Route path="/language-help" element={<LanguageHelpPage />} />

            {/* Care Team Routes */}
            <Route path="/patients" element={<PatientsPage />} />
            <Route path="/patients/:id" element={<ClinicianPatientViewPage />} />
            <Route path="/patient-intake" element={<PatientIntakePage />} />
            <Route path="/referral-queue" element={<ReferralQueuePage />} />
            <Route path="/referrals" element={<ReferralQueuePage />} />
            <Route path="/follow-ups" element={<FollowUpsPage />} />
            <Route path="/reports" element={<ReportsPage />} />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AppProvider>
  );
};

export default App;
