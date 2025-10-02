import { useState, useCallback, useMemo } from 'react';
import { useAuth } from './useAuth';
import AuthModal from '@/components/AuthModal';

export interface GoogleDriveRequirementHook {
  authStatus: any;
  requireAuth: (feature: string) => Promise<boolean>;
  GoogleDriveGuard: React.FC<{ feature: string; children: React.ReactNode }>;
}

export function useGoogleDriveRequirement(): GoogleDriveRequirementHook {
  const { authStatus, checkAuth } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [requiredFeature, setRequiredFeature] = useState<string>('');

  const requireAuth = useCallback(async (feature: string): Promise<boolean> => {
    // If already authenticated, allow access
    if (authStatus?.authenticated) {
      return true;
    }

    // Set the feature that requires authentication
    setRequiredFeature(feature);
    setShowAuthModal(true);
    return false;
  }, [authStatus]);

  const handleAuthSuccess = useCallback(async () => {
    setShowAuthModal(false);
    await checkAuth();
  }, [checkAuth]);

  const GoogleDriveGuard = useCallback(({ feature, children }: { feature: string; children: React.ReactNode }) => {
    // If authenticated, show the content
    if (authStatus?.authenticated) {
      return <>{children}</>;
    }

    // If not authenticated, show a message with auth button
    return (
      <div className="space-y-4">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <div className="text-yellow-600 text-xl mb-4">🔒</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Google Drive Authentication Required
          </h3>
          <p className="text-gray-600 mb-4">
            The <strong>{feature}</strong> feature requires Google Drive access to process files.
          </p>
          <button
            onClick={() => requireAuth(feature)}
            className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors inline-flex items-center"
          >
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" clipRule="evenodd" />
            </svg>
            Connect Google Drive
          </button>
        </div>

        {showAuthModal && (
          <AuthModal
            isOpen={showAuthModal}
            onClose={() => setShowAuthModal(false)}
            onSuccess={handleAuthSuccess}
          />
        )}
      </div>
    );
  }, [authStatus, showAuthModal, requireAuth, handleAuthSuccess]);

  return useMemo(() => ({
    authStatus,
    requireAuth,
    GoogleDriveGuard
  }), [authStatus, requireAuth, GoogleDriveGuard]);
}