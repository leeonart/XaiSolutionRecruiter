import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { apiClient, SystemStatus } from '@/lib/api';
import AuthModal from '@/components/AuthModal';
import HelpSection from '@/components/HelpSection';
import { useAuth } from '@/hooks/useAuth';

export default function Dashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { authStatus, checkAuth } = useAuth();
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Handle OAuth callback
  useEffect(() => {
    const handleOAuthCallback = async () => {
      console.log('Dashboard: Checking for OAuth callback...');
      console.log('Current location:', location);
      console.log('Current search:', location.search);
      
      const urlParams = new URLSearchParams(location.search);
      const code = urlParams.get('code');
      const error = urlParams.get('error');

      console.log('Extracted error:', error);

      if (code) {
        try {
          console.log('OAuth callback detected in Dashboard, processing code:', code);
          const response = await apiClient.completeAuth(code);
          
          if (response.success) {
            console.log('OAuth authentication successful');
            // Remove the code from URL
            const newUrl = window.location.pathname;
            window.history.replaceState({}, document.title, newUrl);
            
            // Close auth modal and refresh auth status
            setShowAuthModal(false);
            await checkAuth();
          } else {
            console.error('OAuth authentication failed');
          }
        } catch (err) {
          console.error('OAuth callback error:', err);
        }
      } else if (error) {
        console.error('OAuth error:', error);
      }
    };

    handleOAuthCallback();
  }, [location.search, checkAuth]);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const systemStatus = await apiClient.getStatus();
        setStatus(systemStatus);
      } catch (err) {
        setError('Failed to fetch system status');
        console.error('Error fetching status:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();
  }, []);

  // Show auth modal if not authenticated
  useEffect(() => {
    if (authStatus && !authStatus.authenticated && !showAuthModal) {
      setShowAuthModal(true);
    }
  }, [authStatus, showAuthModal]);

  const handleAuthSuccess = () => {
    setShowAuthModal(false);
    // Re-check auth status
    checkAuth();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">AI Job Processing Platform</h1>
              <p className="mt-1 text-sm text-gray-500">
                Dashboard - {status?.version || 'v1.0.0'} | Mode: {status?.mode || 'unknown'}
              </p>
            </div>
            <div className="flex items-center space-x-4">
              {/* Auth Status Indicator */}
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${
                  authStatus?.authenticated ? 'bg-green-500' : 'bg-red-500'
                }`}></div>
                <span className="text-sm text-gray-600">
                  {authStatus?.authenticated ? 'Google Drive Connected' : 'Google Drive Disconnected'}
                </span>
              </div>
              <button
                onClick={() => navigate('/settings')}
                className="bg-gray-200 text-gray-700 px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-300"
              >
                Settings
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* System Status Card */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">System Status</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Status:</span>
                <span className={`font-medium ${
                  status?.status === 'operational' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {status?.status || 'Unknown'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Database:</span>
                <span className="font-medium text-green-600">{status?.database || 'Unknown'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Current AI Agent:</span>
                <span className="font-medium text-blue-600">{status?.current_ai_agent || 'Unknown'}</span>
              </div>
            </div>
          </div>

          {/* Quick Actions Card */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <button
                onClick={() => navigate('/processing')}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
              >
                Process Jobs
              </button>
              <button
                onClick={() => navigate('/jobs')}
                className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 transition-colors"
              >
                View Jobs
              </button>
              <button
                onClick={() => navigate('/resumes')}
                className="w-full bg-purple-600 text-white py-2 px-4 rounded-md hover:bg-purple-700 transition-colors"
              >
                Manage Resumes
              </button>
            </div>
          </div>

          {/* Authentication Status Card */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Authentication</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Google Drive:</span>
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${
                    authStatus?.authenticated ? 'bg-green-500' : 'bg-red-500'
                  }`}></div>
                  <span className={`text-sm font-medium ${
                    authStatus?.authenticated ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {authStatus?.authenticated ? 'Connected' : 'Disconnected'}
                  </span>
                </div>
              </div>
              {authStatus && (
                <div className="text-xs text-gray-500">
                  {authStatus.message}
                </div>
              )}
              {!authStatus?.authenticated && (
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors text-sm"
                >
                  Connect Google Drive
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="mt-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
            <div className="text-gray-500 text-center py-8">
              <p>No recent activity to display</p>
              <p className="text-sm mt-2">Start by processing some jobs or uploading resumes</p>
            </div>
          </div>
        </div>

        {/* Help Section */}
        <HelpSection
          title="Dashboard Overview"
          description="The dashboard provides a central hub for monitoring your AI Job Processing Platform status and accessing key functions quickly. This is your starting point for all platform operations."
          features={[
            "View system status and health indicators for all platform components",
            "Monitor Google Drive authentication status and connectivity",
            "Access quick action buttons for common workflow tasks",
            "Check database connectivity and AI agent status",
            "View recent activity and processing history with detailed metrics"
          ]}
          endResults={[
            "Complete system health overview with operational status",
            "Verified Google Drive connectivity for file operations",
            "Quick access to all platform modules and functions",
            "Current AI agent and database status monitoring",
            "Processing history and activity tracking for workflow management"
          ]}
          workflow={[
            "Check system status to ensure all components are operational",
            "Verify Google Drive connection for file download and upload operations",
            "Use quick actions to navigate to specific workflow functions",
            "Monitor the current AI agent and database status for optimal performance",
            "Review recent processing activity and system metrics"
          ]}
        />
      </main>

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={handleAuthSuccess}
      />
    </div>
  );
}