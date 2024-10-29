'use client';
import { usePathname, useRouter } from 'next/navigation';
import { useQuery } from '@apollo/client';
import { CHECK_TOKEN_QUERY } from '@/graphql/request';
import { LocalStore } from '@/lib/storage';
import { useEffect, useState } from 'react';

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const [isChecking, setIsChecking] = useState(true);
  const publicRoutes = ['/login', '/register'];

  const { refetch: checkToken } = useQuery(CHECK_TOKEN_QUERY, {
    skip: true,
  });

  useEffect(() => {
    const validateToken = async () => {
      const token = localStorage.getItem(LocalStore.accessToken);

      if (!token && !publicRoutes.includes(pathname)) {
        router.push('/login');
        setIsChecking(false);
        return;
      }

      if (!token) {
        setIsChecking(false);
        return;
      }

      try {
        const { data } = await checkToken({
          input: { token },
        });

        if (!data?.checkToken && !publicRoutes.includes(pathname)) {
          localStorage.removeItem(LocalStore.accessToken);
          router.push('/login');
        }
      } catch (error) {
        if (!publicRoutes.includes(pathname)) {
          localStorage.removeItem(LocalStore.accessToken);
          router.push('/login');
        }
      } finally {
        setIsChecking(false);
      }
    };

    validateToken();
  }, [pathname]);

  if (isChecking) {
    return null;
  }

  return children;
};
