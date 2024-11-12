import { usePathname, useRouter } from 'next/navigation';
import { useQuery } from '@apollo/client';
import { CHECK_TOKEN_QUERY } from '@/graphql/request';
import { LocalStore } from '@/lib/storage';
import { useEffect, useState, useRef } from 'react';
import { useTheme } from 'next-themes';
import { Loader2 } from 'lucide-react';
import { LoadingPage } from '@/components/global-loading';

const VALIDATION_TIMEOUT = 5000;

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthorized, setIsAuthorized] = useState<boolean>(false);
  const [isChecking, setIsChecking] = useState(true);
  const publicRoutes = ['/login', '/register'];
  const isRedirectingRef = useRef(false);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const { refetch: checkToken } = useQuery(CHECK_TOKEN_QUERY, {
    skip: true,
  });

  useEffect(() => {
    let isMounted = true;

    const validateToken = async () => {
      if (isRedirectingRef.current) {
        return;
      }

      if (publicRoutes.includes(pathname)) {
        if (isMounted) {
          setIsAuthorized(true);
          setIsChecking(false);
        }
        return;
      }

      if (isMounted) {
        setIsChecking(true);
      }

      const token = localStorage.getItem(LocalStore.accessToken);

      if (!token) {
        isRedirectingRef.current = true;
        router.replace('/login');
        if (isMounted) {
          setIsChecking(false);
        }
        return;
      }

      timeoutRef.current = setTimeout(() => {
        if (isMounted && !isRedirectingRef.current) {
          console.error('Token validation timeout');
          localStorage.removeItem(LocalStore.accessToken);
          isRedirectingRef.current = true;
          router.replace('/login');
          setIsChecking(false);
        }
      }, VALIDATION_TIMEOUT);

      try {
        const { data } = await checkToken({
          input: { token },
        });

        if (isMounted) {
          if (!data?.checkToken) {
            localStorage.removeItem(LocalStore.accessToken);
            isRedirectingRef.current = true;
            router.replace('/login');
            setIsAuthorized(false);
          } else {
            setIsAuthorized(true);
          }
        }
      } catch (error) {
        if (isMounted && !isRedirectingRef.current) {
          console.error('Token validation error:', error);
          localStorage.removeItem(LocalStore.accessToken);
          isRedirectingRef.current = true;
          router.replace('/login');
          setIsAuthorized(false);
        }
      } finally {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        if (isMounted) {
          setIsChecking(false);
        }
      }
    };

    validateToken();

    return () => {
      isMounted = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [pathname]);

  useEffect(() => {
    if (publicRoutes.includes(pathname)) {
      isRedirectingRef.current = false;
    }
  }, [pathname]);

  if (publicRoutes.includes(pathname)) {
    return children;
  }

  if (isChecking) {
    return <LoadingPage />;
  }

  return isAuthorized ? children : <LoadingPage />;
};
