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

  // Update query to include proper types
  const { data: userData, refetch: refetchUser } = useQuery<{ me: User }>(
    GET_USER_INFO,
    {
      skip: !isAuthenticated,
      onCompleted: (data) => {
        if (data?.me) {
          setUser(data.me);
          localStorage.setItem('user', JSON.stringify(data.me));
        }
      },
    }
  );

  const [login] = useMutation<{ login: LoginResponse }>(LOGIN_MUTATION);
  const [register] = useMutation<{ registerUser: User }>(REGISTER_MUTATION);

  // Fix token validation query
  const { refetch: checkToken } = useQuery<{ checkToken: boolean }>(
    CHECK_TOKEN_QUERY,
    {
      skip: true, // Skip initial query
    }
  );

  const validateToken = async () => {
    const token = localStorage.getItem(LocalStore.accessToken);
    if (!token) {
      setIsAuthenticated(false);
      setUser(null);
      return { success: false };
    }

    try {
      const { data } = await checkToken({
        variables: {
          input: { token },
        },
      });

      if (data?.checkToken) {
        setIsAuthenticated(true);
        await refetchUser();
        return { success: true };
      }
      
      handleLogout();
      return { success: false, error: 'Session expired' };
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
      const errorMessage = error instanceof Error ? error.message : 'Login failed';
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }
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
        return handleLogin({
          email: credentials.email,
          password: credentials.password,
        });
      }

      return { success: false };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Registration failed';
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
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

  useEffect(() => {
    validateToken();
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  return {
    isAuthenticated,
    user,
    login: handleLogin,
    register: handleRegister,
    logout: handleLogout,
    validateToken,
    refetchUser,
  };
};
