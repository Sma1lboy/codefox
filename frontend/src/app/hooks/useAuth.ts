import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { LoginResponse, LoginUserInput } from '@/graphql/type';
import { CHECK_TOKEN_QUERY, LOGIN_MUTATION } from '@/graphql/auth';
import { LocalStore } from '@/lib/storage';

export const useAuth = () => {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [login, { loading: loginLoading }] = useMutation<{
    login: LoginResponse;
  }>(LOGIN_MUTATION);

  const { refetch: checkToken } = useQuery<{ checkToken: boolean }>(
    CHECK_TOKEN_QUERY,
    {
      skip: true,
    }
  );

  useEffect(() => {
    validateToken();
  }, []);

  const validateToken = async () => {
    const token = localStorage.getItem(LocalStore.accessToken);
    if (!token) {
      setIsAuthenticated(false);
      router.push('/login');
      return;
    }
    try {
      const { data } = await checkToken({
        input: { token },
      });
      if (data?.checkToken) {
        setIsAuthenticated(true);
        toast.success('Authentication validated');
        router.push('/');
      } else {
        localStorage.removeItem(LocalStore.accessToken);
        setIsAuthenticated(false);
        toast.error('Session expired, please login again');
        router.push('/login');
      }
    } catch (error) {
      localStorage.removeItem(LocalStore.accessToken);
      setIsAuthenticated(false);
      toast.error('Authentication error, please login again');
      router.push('/login');
    }
  };
  const handleLogin = async (credentials: LoginUserInput) => {
    try {
      const { data } = await login({
        variables: {
          input: credentials,
        },
      });

      if (data?.login.accessToken) {
        localStorage.setItem(LocalStore.accessToken, data.login.accessToken);
        setIsAuthenticated(true);
        toast.success('Login successful');
        router.push('/');
        return true;
      }

      return false;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Login failed');
      return false;
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    setIsAuthenticated(false);
    router.push('/login');
    toast.success('Logged out successfully');
  };

  return {
    isAuthenticated,
    isLoading: loginLoading,
    login: handleLogin,
    logout: handleLogout,
    validateToken,
  };
};
