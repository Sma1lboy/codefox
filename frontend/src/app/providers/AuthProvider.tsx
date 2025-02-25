'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useLazyQuery, useMutation } from '@apollo/client';
import { CHECK_TOKEN_QUERY } from '@/graphql/request';
import { LoadingPage } from '@/components/global-loading';

// Replace this with your real RefreshToken mutation
import { gql } from '@apollo/client';
const REFRESH_TOKEN_MUTATION = gql`
  mutation RefreshToken($refreshToken: String!) {
    refreshToken(refreshToken: $refreshToken) {
      accessToken
      refreshToken
    }
  }
`;

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

  // 1) For validating the token
  const [checkToken] = useLazyQuery<{ checkToken: boolean }>(CHECK_TOKEN_QUERY);

  // 2) For refreshing the token
  const [refreshTokenMutation] = useMutation(REFRESH_TOKEN_MUTATION);

  // On mount, see if there's an access token in sessionStorage
  // (or localStorage if that's your choice)
  useEffect(() => {
    async function validateToken() {
      setIsChecking(true);

      const storedToken = sessionStorage.getItem('accessToken');
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

        if (data?.checkToken) {
          // valid
          setToken(storedToken);
          setIsAuthorized(true);
        } else {
          // invalid
          sessionStorage.removeItem('accessToken');
          setIsAuthorized(false);
        }
      } catch (error) {
        console.error('Token validation error:', error);
        sessionStorage.removeItem('accessToken');
        setIsAuthorized(false);
      } finally {
        setIsChecking(false);
      }
    }

    validateToken();
  }, [checkToken]);

  // Called after user logs in
  function login(accessToken: string, refreshToken: string) {
    // Store the access token in sessionStorage (or localStorage if you prefer)
    sessionStorage.setItem('accessToken', accessToken);
    // Store the refresh token in localStorage if you want it long-lived
    localStorage.setItem('refreshToken', refreshToken);

    // Update state
    setToken(accessToken);
    setIsAuthorized(true);
  }

  // Called to log out user
  function logout() {
    setToken(null);
    setIsAuthorized(false);
    sessionStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  }

  // Called to refresh access token
  async function refreshAccessToken() {
    try {
      const rToken = localStorage.getItem('refreshToken');
      if (!rToken) {
        logout();
        return;
      }

      const { data } = await refreshTokenMutation({
        variables: { refreshToken: rToken },
      });

      if (data?.refreshToken) {
        const newAccess = data.refreshToken.accessToken;
        const newRefresh = data.refreshToken.refreshToken;

        // Update sessionStorage & localStorage
        sessionStorage.setItem('accessToken', newAccess);
        if (newRefresh) {
          localStorage.setItem('refreshToken', newRefresh);
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
