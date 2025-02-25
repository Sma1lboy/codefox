'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { useMutation, gql } from '@apollo/client';

const REFRESH_TOKEN = gql`
  mutation RefreshToken($refreshToken: String!) {
    refreshToken(refreshToken: $refreshToken) {
      accessToken
      refreshToken
    }
  }
`;

export const AuthContext = createContext({
  token: null,
  login: (accessToken: string, refreshToken: string) => {},
  logout: () => {},
  refreshAccessToken: async () => '',
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [token, setToken] = useState<string | null>(null);
  const [refreshTokenMutation] = useMutation(REFRESH_TOKEN);

  useEffect(() => {
    const storedToken = localStorage.getItem('accessToken');
    if (storedToken) setToken(storedToken);
  }, []);

  const login = (accessToken: string, refreshToken: string) => {
    setToken(accessToken);
    sessionStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
  };

  const logout = () => {
    setToken(null);
    sessionStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  };

  const refreshAccessToken = async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) return logout();

      const { data } = await refreshTokenMutation({
        variables: { refreshToken },
      });

      if (data?.refreshToken) {
        setToken(data.refreshToken.accessToken);
        sessionStorage.setItem('accessToken', data.refreshToken.accessToken);
        return data.refreshToken.accessToken;
      } else {
        logout();
      }
    } catch {
      logout();
    }
  };

  return (
    <AuthContext.Provider value={{ token, login, logout, refreshAccessToken }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
