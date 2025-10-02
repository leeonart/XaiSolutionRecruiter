import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import Layout from '@/components/Layout';
import Dashboard from '@/pages/Dashboard';
import Jobs from '@/pages/Jobs';
import Matches from '@/pages/Matches';
import Processing from '@/pages/Processing';
import JobProcessing from '@/pages/JobProcessing';
import JobDescriptionDownloads from '@/pages/JobDescriptionDownloads';
import JobFileOrganizer from '@/pages/JobFileOrganizer';
import JobRecovery from '@/pages/JobRecovery';
import MTBManagement from '@/pages/MTBManagement';
import ResumeManagement from '@/pages/ResumeManagement';
import AIResumeManagement from '@/pages/AIResumeManagement';
import AIResumeManagementNew from '@/pages/AIResumeManagementNew';
import Operations from '@/pages/Operations';
import Settings from '@/pages/Settings';
import AuthCallback from '@/pages/AuthCallback';
import Privacy from '@/pages/Privacy';
import { SettingsProvider } from '@/contexts/SettingsContext';
import { apiClient } from '@/lib/api';

// Component to handle OAuth callback detection
function OAuthCallbackHandler() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleOAuthCallback = async () => {
      console.log('OAuthCallbackHandler: Checking URL params...');
      console.log('Current location:', location);
      console.log('Current search:', location.search);
      
      const urlParams = new URLSearchParams(location.search);
      const code = urlParams.get('code');
      const error = urlParams.get('error');

      console.log('Extracted code:', code);
      console.log('Extracted error:', error);

      if (code) {
        try {
          console.log('OAuth callback detected, processing code:', code);
          const response = await apiClient.completeAuth(code);
          
          if (response.success) {
            console.log('OAuth authentication successful');
            // Remove the code from URL and redirect to dashboard
            const newUrl = window.location.pathname;
            window.history.replaceState({}, document.title, newUrl);
            
            // Trigger a page refresh to update auth status
            window.location.reload();
          } else {
            console.error('OAuth authentication failed');
          }
        } catch (err) {
          console.error('OAuth callback error:', err);
        }
      } else if (error) {
        console.error('OAuth error:', error);
      } else {
        console.log('No OAuth parameters found in URL');
      }
    };

    handleOAuthCallback();
  }, [location.search, navigate]);

  return null;
}

function App() {
  return (
    <SettingsProvider>
      <Router>
        <div className="min-h-screen bg-gray-50">
          <OAuthCallbackHandler />
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
                  <Route path="/job-recovery" element={<JobRecovery />} />
                  <Route path="/mtb-management" element={<MTBManagement />} />
                  <Route path="/job-processing" element={<JobProcessing />} />
                  <Route path="/resume-management" element={<AIResumeManagementNew />} />
                  <Route path="/operations" element={<Operations />} />
                  <Route path="/settings" element={<Settings />} />
                </Routes>
              </Layout>
            } />
          </Routes>
        </div>
      </Router>
    </SettingsProvider>
  );
}

export default App;
