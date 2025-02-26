'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useLazyQuery, useMutation } from '@apollo/client';
import { CHECK_TOKEN_QUERY } from '@/graphql/request';
import { LoadingPage } from '@/components/global-loading';

// Replace this with your real RefreshToken mutation
import { gql } from '@apollo/client';
import { REFRESH_TOKEN_MUTATION } from '@/graphql/mutations/auth';
import { LocalStore } from '@/lib/storage';

interface AuthContextValue {
  isAuthorized: boolean;
  isChecking: boolean;
  token: string | null;
  login: (accessToken: string, refreshToken: string) => void;
  logout: () => void;
  refreshAccessToken: () => Promise<string | void>;
}

const AuthContext = createContext<AuthContextValue>({
  isAuthorized: false,
  isChecking: false,
  token: null,
  login: () => {},
  logout: () => {},
  refreshAccessToken: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  const [checkToken] = useLazyQuery<{ checkToken: boolean }>(CHECK_TOKEN_QUERY);

  const [refreshTokenMutation] = useMutation(REFRESH_TOKEN_MUTATION);

  useEffect(() => {
    async function validateToken() {
      setIsChecking(true);

      const storedToken = localStorage.getItem(LocalStore.accessToken);
      if (!storedToken) {
        // No token => not authorized
        setIsAuthorized(false);
        setIsChecking(false);
        return;
      }

      try {
        // Check if the token is valid on the server
        const { data } = await checkToken({
          variables: { input: { token: storedToken } },
        });
        console.log('check:', data);

        if (data?.checkToken) {
          // valid
          setToken(storedToken);
          setIsAuthorized(true);
        } else {
          refreshAccessToken();
        }
      } catch (error) {
        console.error('Token validation error:', error);
        localStorage.removeItem(LocalStore.accessToken);
        setIsAuthorized(false);
      } finally {
        setIsChecking(false);
      }
    }

    validateToken();
  }, [checkToken]);

  // Called after user logs in
  function login(accessToken: string, refreshToken: string) {
    localStorage.setItem(LocalStore.accessToken, accessToken);
    localStorage.setItem(LocalStore.refreshToken, refreshToken);

    // Update state
    setToken(accessToken);
    setIsAuthorized(true);
  }

  /**
   * logout the account, remove all refreshtoken and accesstoken
   */
  function logout() {
    setToken(null);
    setIsAuthorized(false);
    localStorage.removeItem(LocalStore.accessToken);
    localStorage.removeItem(LocalStore.refreshToken);
  }

  // Called to refresh access token
  async function refreshAccessToken() {
    try {
      const refreshToken = localStorage.getItem(LocalStore.refreshToken);
      if (!refreshToken) {
        logout();
        return;
      }

      const { data } = await refreshTokenMutation({
        variables: { refreshToken },
      });

      if (data?.refreshToken) {
        const newAccess = data.refreshToken.accessToken;
        const newRefresh = data.refreshToken.refreshToken;

        localStorage.setItem(LocalStore.accessToken, newAccess);
        if (newRefresh) {
          localStorage.setItem(LocalStore.refreshToken, newRefresh);
        }

        setToken(newAccess);
        setIsAuthorized(true);
        return newAccess;
      } else {
        logout();
      }
    } catch (error) {
      console.error('Refresh token error:', error);
      logout();
    }
  }

  // Show loading screen while checking token on mount
  if (isChecking) {
    return <LoadingPage />;
  }

  return (
    <AuthContext.Provider
      value={{
        isAuthorized,
        isChecking,
        token,
        login,
        logout,
        refreshAccessToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  return useContext(AuthContext);
}
