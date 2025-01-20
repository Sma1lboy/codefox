import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { toast } from 'sonner';
import {
  LoginResponse,
  LoginUserInput,
  RegisterUserInput,
  User,
} from '@/graphql/type';
import {
  CHECK_TOKEN_QUERY,
  LOGIN_MUTATION,
  REGISTER_MUTATION,
  GET_USER_INFO,
} from '@/graphql/request';
import { LocalStore } from '@/lib/storage';

export const useAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  const { data: userData, refetch: refetchUser } = useQuery<{ me: User }>(
    GET_USER_INFO,
    {
      skip: !isAuthenticated,
      onCompleted: (data) => {
        if (data?.me) {
          setUser(data.me);
          // Store user info in localStorage
          localStorage.setItem('user', JSON.stringify(data.me));
        }
      },
    }
  );

  const [login, { loading: loginLoading }] = useMutation<{
    login: LoginResponse;
  }>(LOGIN_MUTATION);

  const { refetch: checkToken } = useQuery<{ checkToken: boolean }>(
    CHECK_TOKEN_QUERY,
    {
      variables: {
        input: {
          token: "",
        },
      },
      skip: true,
    }
  );

  const [register, { loading: registerLoading }] = useMutation<{
    registerUser: User;
  }>(REGISTER_MUTATION);

  useEffect(() => {
    validateToken();
    // Try to load user from localStorage
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const validateToken = async () => {
    const token = localStorage.getItem(LocalStore.accessToken);
    if (!token) {
      setIsAuthenticated(false);
      setUser(null);
      return { success: false };
    }

    try {
      const { data } = await checkToken({
        input: { token },
      });
      if (data?.checkToken) {
        setIsAuthenticated(true);
        // Fetch user info after successful token validation
        await refetchUser();
        return { success: true };
      } else {
        handleLogout();
        return { success: false, error: 'Session expired' };
      }
    } catch (error) {
      handleLogout();
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
        await refetchUser();
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
    localStorage.removeItem('user');
    setIsAuthenticated(false);
    setUser(null);
    toast.success('Logged out successfully');
    return { success: true };
  };

  const handleRegister = async (credentials: RegisterUserInput) => {
    try {
      const { data } = await register({
        variables: {
          input: credentials,
        },
      });
      if (data?.registerUser) {
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
    user,
    login: handleLogin,
    register: handleRegister,
    logout: handleLogout,
    validateToken,
    refetchUser,
  };
};
