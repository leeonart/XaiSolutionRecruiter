import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AuthModal({ isOpen, onClose, onSuccess }: AuthModalProps) {
  const { authStatus, refreshAuth, clearError } = useAuth();
  const [authUrl, setAuthUrl] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [authCode, setAuthCode] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      generateAuthUrl();
      clearError();
    }
  }, [isOpen, clearError]);

  const generateAuthUrl = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.getAuthUrl();
      setAuthUrl(response.auth_url || '#');
    } catch (err: any) {
      setError(err.message || 'Failed to generate authentication URL');
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshClick = async () => {
    setIsRefreshing(true);
    try {
      const success = await refreshAuth();
      if (success) {
        onSuccess();
        onClose();
      } else {
        setError('Failed to refresh authentication. Please re-authenticate.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to refresh authentication');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleAuthClick = () => {
    if (authUrl) {
      // Open authentication URL in a new tab
      window.open(authUrl, '_blank');
      setShowManualEntry(true);
    }
  };

  const handleManualSubmit = async () => {
    if (!authCode.trim()) {
      setError('Please enter the authorization code');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.completeAuth(authCode);
      if (response.success) {
        onSuccess();
        onClose();
      } else {
        setError('Authentication failed');
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const getStatusMessage = () => {
    if (!authStatus) return 'Checking authentication status...';
    
    switch (authStatus.status) {
      case 'active':
        return 'Google Drive is connected and working properly';
      case 'expired':
        return 'Your Google Drive session has expired. Click "Refresh" to renew automatically.';
      case 'invalid':
        return 'Your Google Drive credentials are invalid. Please re-authenticate.';
      case 'missing':
        return 'Google Drive authentication is required to access your files.';
      case 'error':
        return 'There was an error checking your Google Drive connection.';
      default:
        return authStatus.message;
    }
  };

  const getStatusColor = () => {
    if (!authStatus) return 'text-gray-500';
    
    switch (authStatus.status) {
      case 'active':
        return 'text-green-600';
      case 'expired':
        return 'text-yellow-600';
      case 'invalid':
      case 'missing':
      case 'error':
        return 'text-red-600';
      default:
        return 'text-gray-500';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Google Drive Authentication</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Status Display */}
        <div className="mb-4 p-3 rounded-lg bg-gray-50">
          <div className={`text-sm font-medium ${getStatusColor()}`}>
            {getStatusMessage()}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          {/* Refresh Button - only show if authentication exists but is expired/invalid */}
          {authStatus?.needs_refresh && (
            <button
              onClick={handleRefreshClick}
              disabled={isRefreshing}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isRefreshing ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Refreshing...
                </>
              ) : (
                'Refresh Authentication'
              )}
            </button>
          )}

          {/* Authenticate Button - show if no authentication or refresh failed */}
          {(!authStatus?.authenticated || authStatus?.needs_reauth) && (
            <>
              <button
                onClick={handleAuthClick}
                disabled={loading || !authUrl}
                className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Generating...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                    Authenticate with Google Drive
                  </>
                )}
              </button>

              {/* Manual Code Entry */}
              {showManualEntry && (
                <div className="mt-4 p-4 border rounded-lg bg-gray-50">
                  <p className="text-sm text-gray-600 mb-3">
                    After authenticating, copy the authorization code from the browser and paste it below:
                  </p>
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={authCode}
                      onChange={(e) => setAuthCode(e.target.value)}
                      placeholder="Enter authorization code"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      onClick={handleManualSubmit}
                      disabled={loading || !authCode.trim()}
                      className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? 'Processing...' : 'Complete Authentication'}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Help Text */}
        <div className="mt-4 text-xs text-gray-500">
          <p>This authentication allows the application to access your Google Drive files for job processing.</p>
          <p className="mt-1">Your credentials are stored securely and only used for this application.</p>
        </div>
      </div>
    </div>
  );
}