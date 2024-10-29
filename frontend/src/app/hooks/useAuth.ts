import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { toast } from 'sonner';
import {
  LoginResponse,
  LoginUserInput,
  RegisterUserInput,
} from '@/graphql/type';
import {
  CHECK_TOKEN_QUERY,
  LOGIN_MUTATION,
  REGISTER_MUTATION,
} from '@/graphql/request';
import { LocalStore } from '@/lib/storage';

export const useAuth = () => {
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

  const [register, { loading: registerLoading }] = useMutation<{
    registerUser: {
      username: string;
    };
  }>(REGISTER_MUTATION);

  useEffect(() => {
    validateToken();
  }, []);

  const validateToken = async () => {
    const token = localStorage.getItem(LocalStore.accessToken);
    if (!token) {
      setIsAuthenticated(false);
      return { success: false };
    }

    try {
      const { data } = await checkToken({
        input: { token },
      });

      if (data?.checkToken) {
        setIsAuthenticated(true);
        toast.success('Authentication validated');
        return { success: true };
      } else {
        localStorage.removeItem(LocalStore.accessToken);
        setIsAuthenticated(false);
        toast.error('Session expired, please login again');
        return { success: false, error: 'Session expired' };
      }
    } catch (error) {
      localStorage.removeItem(LocalStore.accessToken);
      setIsAuthenticated(false);
      toast.error('Authentication error, please login again');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Authentication error',
      };
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
        return { success: true };
      }
      return { success: false };
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Login failed');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Login failed',
      };
    }
  };

  const handleLogout = () => {
    localStorage.removeItem(LocalStore.accessToken);
    setIsAuthenticated(false);
    toast.success('Logged out successfully');
    return { success: true };
  };

  const handleRegister = async (credentials: {
    username: string;
    email: string;
    password: string;
  }) => {
    try {
      const { data } = await register({
        variables: {
          input: credentials,
        },
      });

      if (data?.registerUser?.username) {
        toast.success('Registration successful');
        return await handleLogin({
          username: credentials.username,
          password: credentials.password,
        });
      }
      return { success: false };
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Registration failed'
      );
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Registration failed',
      };
    }
  };

  return {
    isAuthenticated,
    isLoading: loginLoading || registerLoading,
    login: handleLogin,
    register: handleRegister,
    logout: handleLogout,
    validateToken,
  };
};
