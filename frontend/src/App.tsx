import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from '@/components/Layout';
import Dashboard from '@/pages/Dashboard';
import Jobs from '@/pages/Jobs';
import Matches from '@/pages/Matches';
import Processing from '@/pages/Processing';
import JobProcessing from '@/pages/JobProcessing';
import JobDescriptionDownloads from '@/pages/JobDescriptionDownloads';
import JobFileOrganizer from '@/pages/JobFileOrganizer';
import MTBManagement from '@/pages/MTBManagement';
import ResumeManagement from '@/pages/ResumeManagement';
import AIResumeManagement from '@/pages/AIResumeManagement';
import AIResumeManagementNew from '@/pages/AIResumeManagementNew';
import CandidatesSearch from '@/pages/CandidatesSearch';
import Operations from '@/pages/Operations';
import Settings from '@/pages/Settings';
import AuthCallback from '@/pages/AuthCallback';
import Privacy from '@/pages/Privacy';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/auth-callback" element={<AuthCallback />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/*" element={
          <Layout>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/jobs" element={<Jobs />} />
              <Route path="/matches" element={<Matches />} />
              <Route path="/processing" element={<Processing />} />
              <Route path="/job-description-downloads" element={<JobDescriptionDownloads />} />
              <Route path="/job-file-organizer" element={<JobFileOrganizer />} />
              <Route path="/mtb-management" element={<MTBManagement />} />
              <Route path="/job-processing" element={<JobProcessing />} />
              <Route path="/resume-management" element={<AIResumeManagementNew />} />
              <Route path="/candidates-search" element={<CandidatesSearch />} />
              <Route path="/operations" element={<Operations />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </Layout>
        } />
      </Routes>
    </Router>
  );
}

export default App;