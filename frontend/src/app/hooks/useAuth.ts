import { useLazyQuery, useMutation } from '@apollo/client';
import { GET_USER_INFO, CHECK_TOKEN_QUERY } from '@/graphql/request';
import { REFRESH_TOKEN_MUTATION } from '@/graphql/mutations/auth';
import { LocalStore } from '@/lib/storage';
import { useCallback, useEffect, useState } from 'react';
import { User } from '@/graphql/type';

// avoid using useAuth hook directly to prevent request repeatly, it could be use in some case that you want to check auth status in the component not cover by AuthProvider
export function useAuth() {
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  const [checkToken] = useLazyQuery<{ checkToken: boolean }>(CHECK_TOKEN_QUERY);
  const [refreshTokenMutation] = useMutation(REFRESH_TOKEN_MUTATION);
  const [getUserInfo] = useLazyQuery<{ me: User }>(GET_USER_INFO);

  const validateToken = useCallback(async () => {
    const storedToken = localStorage.getItem(LocalStore.accessToken);
    if (!storedToken) {
      setIsAuthorized(false);
      setUser(null);
      return false;
    }

    try {
      const { data } = await checkToken({
        variables: { input: { token: storedToken } },
      });

      if (data?.checkToken) {
        return true;
      }
      return false;
    } catch (error) {
      console.error('Token validation error:', error);
      return false;
    }
  }, [checkToken]);

  const refreshToken = useCallback(async () => {
    try {
      const refreshToken = localStorage.getItem(LocalStore.refreshToken);
      if (!refreshToken) {
        return false;
      }

      const { data } = await refreshTokenMutation({
        variables: { refreshToken },
      });

      if (data?.refreshToken) {
        localStorage.setItem(
          LocalStore.accessToken,
          data.refreshToken.accessToken
        );
        localStorage.setItem(
          LocalStore.refreshToken,
          data.refreshToken.refreshToken
        );
        return true;
      }
      return false;
    } catch (error) {
      console.error('Refresh token error:', error);
      return false;
    }
  }, [refreshTokenMutation]);

  const fetchUserInfo = useCallback(async () => {
    try {
      const { data } = await getUserInfo();
      if (data?.me) {
        setUser(data.me);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to fetch user info:', error);
      return false;
    }
  }, [getUserInfo]);

  const login = useCallback(
    (accessToken: string, refreshToken: string) => {
      localStorage.setItem(LocalStore.accessToken, accessToken);
      localStorage.setItem(LocalStore.refreshToken, refreshToken);
      setIsAuthorized(true);
      fetchUserInfo();
    },
    [fetchUserInfo]
  );

  const logout = useCallback(() => {
    localStorage.removeItem(LocalStore.accessToken);
    localStorage.removeItem(LocalStore.refreshToken);
    setIsAuthorized(false);
    setUser(null);
  }, []);

  useEffect(() => {
    const initAuth = async () => {
      setIsLoading(true);
      let isValid = await validateToken();

      if (!isValid) {
        isValid = await refreshToken();
      }

      if (isValid) {
        setIsAuthorized(true);
        await fetchUserInfo();
      } else {
        setIsAuthorized(false);
        setUser(null);
      }

      setIsLoading(false);
    };

    initAuth();
  }, [validateToken, refreshToken, fetchUserInfo]);

  return {
    isAuthorized,
    isLoading,
    user,
    login,
    logout,
    refreshToken,
    validateToken,
  };
}
