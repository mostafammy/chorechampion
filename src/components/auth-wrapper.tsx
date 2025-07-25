/**
 * Authentication wrapper component for client-side token refresh
 * 
 * This component ensures that when a page loads without an access token
 * but with a refresh token, it attempts to refresh before showing content.
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface AuthWrapperProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function AuthWrapper({ children, fallback = <AuthLoadingSpinner /> }: AuthWrapperProps) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const router = useRouter();

  useEffect(() => {
    let mounted = true;

    async function checkAndRefreshAuth() {
      try {
        // Check if we have a refresh token
        const hasRefreshToken = document.cookie.includes('refresh_token=');
        
        if (!hasRefreshToken) {
          console.log('[AuthWrapper] No refresh token found, redirecting to login');
          router.push('/login');
          return;
        }

        // Try to refresh the token
        const { fetchWithAuth } = await import('@/lib/auth/fetchWithAuth');
        
        // Make a test request to trigger token refresh if needed
        const response = await fetchWithAuth('/api/debug/refresh', {
          method: 'GET',
          maxRetries: 1,
          enableRefresh: true,
          onSessionExpired: () => {
            if (mounted) {
              console.log('[AuthWrapper] Session expired, redirecting to login');
              router.push('/login');
            }
          },
          onRefreshError: (error) => {
            console.warn('[AuthWrapper] Refresh failed:', error);
            if (mounted) {
              router.push('/login');
            }
          }
        });

        if (response.ok) {
          console.log('[AuthWrapper] Authentication successful');
          if (mounted) {
            setIsAuthenticated(true);
          }
        } else {
          console.log('[AuthWrapper] Authentication failed, redirecting to login');
          if (mounted) {
            router.push('/login');
          }
        }
      } catch (error) {
        console.error('[AuthWrapper] Error during authentication check:', error);
        if (mounted) {
          router.push('/login');
        }
      }
    }

    checkAndRefreshAuth();

    return () => {
      mounted = false;
    };
  }, [router]);

  // Still checking authentication
  if (isAuthenticated === null) {
    return <>{fallback}</>;
  }

  // Authentication failed
  if (isAuthenticated === false) {
    return <>{fallback}</>;
  }

  // Authenticated successfully
  return <>{children}</>;
}

function AuthLoadingSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <p className="text-gray-600">Authenticating...</p>
      </div>
    </div>
  );
}

/**
 * Alternative hook-based approach for authentication checking
 */
export function useAuthGuard() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const router = useRouter();

  useEffect(() => {
    let mounted = true;

    async function checkAuth() {
      try {
        const { fetchWithAuth } = await import('@/lib/auth/fetchWithAuth');
        
        const response = await fetchWithAuth('/api/debug/refresh', {
          method: 'GET',
          enableRefresh: true,
          throwOnSessionExpiry: false,
        });

        if (mounted) {
          setIsAuthenticated(response.ok);
          if (!response.ok) {
            router.push('/login');
          }
        }
      } catch (error) {
        if (mounted) {
          setIsAuthenticated(false);
          router.push('/login');
        }
      }
    }

    checkAuth();

    return () => {
      mounted = false;
    };
  }, [router]);

  return { isAuthenticated, isLoading: isAuthenticated === null };
}
