// auth-context.tsx
"use client";

import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { useLazyQuery } from "@apollo/client";
import { CHECK_TOKEN_QUERY } from "@/graphql/request";
import { LoadingPage } from "@/components/global-loading";

interface AuthContextValue {
  isAuthorized: boolean;
  isChecking: boolean;
  setIsAuthorized: React.Dispatch<React.SetStateAction<boolean>>;
}

const AuthContext = createContext<AuthContextValue>({
  isAuthorized: false,
  isChecking: false,
  setIsAuthorized: () => {},
});

export const useAuthContext = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  const [checkToken] = useLazyQuery(CHECK_TOKEN_QUERY);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function validateToken() {
      setIsChecking(true);

      // If you want to store the token in sessionStorage, do:
      // const token = sessionStorage.getItem("accessToken");
      // Otherwise, if you still prefer localStorage:
      const token = sessionStorage.getItem("accessToken");

      if (!token) {
        // No token => user is not authorized
        if (isMounted) {
          setIsAuthorized(false);
          setIsChecking(false);
        }
        return;
      }

      // Timeout if the query hangs
      timeoutRef.current = setTimeout(() => {
        if (isMounted) {
          console.error("Token validation timeout");
          sessionStorage.removeItem("accessToken");
          setIsAuthorized(false);
          setIsChecking(false);
        }
      }, 5000);

      try {
        const { data } = await checkToken({ variables: { input: { token } } });
        if (isMounted) {
          if (!data?.checkToken) {
            sessionStorage.removeItem("accessToken");
            setIsAuthorized(false);
          } else {
            console.log("Token valid");
            setIsAuthorized(true);
          }
        }
      } catch (error) {
        if (isMounted) {
          console.error("Token validation error:", error);
          sessionStorage.removeItem("accessToken");
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
    }

    validateToken();

    return () => {
      isMounted = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [checkToken]);

  // While checking token, show loading screen
  if (isChecking) {
    return <LoadingPage />;
  }

  return (
    <AuthContext.Provider value={{ isAuthorized, isChecking, setIsAuthorized }}>
      {children}
    </AuthContext.Provider>
  );
}
