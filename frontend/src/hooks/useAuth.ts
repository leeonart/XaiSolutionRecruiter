import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api';

export interface AuthStatus {
  authenticated: boolean;
  message: string;
  status: 'active' | 'expired' | 'invalid' | 'missing' | 'error';
  needs_refresh?: boolean;
  needs_reauth?: boolean;
}

export interface AuthContextType {
  authStatus: AuthStatus | null;
  isLoading: boolean;
  error: string | null;
  checkAuth: () => Promise<void>;
  refreshAuth: () => Promise<boolean>;
  resetAuth: () => Promise<boolean>;
  clearError: () => void;
}

export function useAuth(): AuthContextType {
  const [authStatus, setAuthStatus] = useState<AuthStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const checkAuth = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const authResponse = await apiClient.getAuthStatus();
      
      // Convert AuthResponse to AuthStatus
      const newAuthStatus: AuthStatus = {
        authenticated: authResponse.authenticated ?? authResponse.success,
        message: authResponse.message,
        status: authResponse.status as AuthStatus['status'] || 'error',
        needs_refresh: authResponse.needs_refresh,
        needs_reauth: authResponse.needs_reauth
      };
      
      // Only update state if the auth status has actually changed
      const hasAuthStatusChanged = !authStatus || 
        authStatus.authenticated !== newAuthStatus.authenticated ||
        authStatus.status !== newAuthStatus.status ||
        authStatus.message !== newAuthStatus.message;
      
      if (hasAuthStatusChanged) {
        setAuthStatus(newAuthStatus);
        
        // If authentication is expired or invalid, try to refresh automatically
        if (authResponse.needs_refresh && (authResponse.status === 'expired' || authResponse.status === 'invalid')) {
          console.log('Authentication needs refresh, attempting automatic refresh...');
          const refreshResult = await apiClient.refreshAuth();
          
          if (refreshResult.success) {
            console.log('Authentication refreshed successfully');
            setAuthStatus({
              authenticated: true,
              message: refreshResult.message,
              status: 'active' as const,
              needs_refresh: false,
              needs_reauth: false
            });
          } else {
            console.log('Automatic refresh failed, user needs to re-authenticate');
            setAuthStatus({
              ...newAuthStatus,
              needs_reauth: true
            });
          }
        }
      }
    } catch (err: any) {
      console.error('Auth check failed:', err);
      setError(err.message || 'Failed to check authentication status');
      setAuthStatus({
        authenticated: false,
        message: 'Failed to check authentication status',
        status: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  }, [authStatus]);

  const refreshAuth = useCallback(async (): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await apiClient.refreshAuth();
      
      if (result.success) {
        setAuthStatus({
          ...result,
          authenticated: true,
          status: 'active'
        });
        return true;
      } else {
        setAuthStatus({
          authenticated: false,
          message: result.message,
          status: 'error',
          needs_reauth: true
        });
        return false;
      }
    } catch (err: any) {
      console.error('Auth refresh failed:', err);
      setError(err.message || 'Failed to refresh authentication');
      setAuthStatus({
        authenticated: false,
        message: 'Failed to refresh authentication',
        status: 'error',
        needs_reauth: true
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const resetAuth = useCallback(async (): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await apiClient.resetAuth();
      
      if (result.success) {
        setAuthStatus({
          authenticated: false,
          message: result.message,
          status: 'missing',
          needs_reauth: true
        });
        return true;
      } else {
        setError(result.message || 'Failed to reset authentication');
        return false;
      }
    } catch (err: any) {
      console.error('Auth reset failed:', err);
      setError(err.message || 'Failed to reset authentication');
      setAuthStatus({
        authenticated: false,
        message: 'Failed to reset authentication',
        status: 'error',
        needs_reauth: true
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Auto-check authentication on mount
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Temporarily disable periodic auth checks to prevent twitching
  // useEffect(() => {
  //   const interval = setInterval(() => {
  //     if (authStatus?.authenticated && !isLoading) {
  //       checkAuth();
  //     }
  //   }, 10 * 60 * 1000); // 10 minutes

  //   return () => clearInterval(interval);
  // }, [authStatus?.authenticated, isLoading, checkAuth]);

  return {
    authStatus,
    isLoading,
    error,
    checkAuth,
    refreshAuth,
    resetAuth,
    clearError
  };
}
