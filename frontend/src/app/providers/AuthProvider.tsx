"use client";

import { useState, useEffect, useRef } from "react";
import { useLazyQuery } from "@apollo/client";
import { CHECK_TOKEN_QUERY } from "@/graphql/request";
import { LocalStore } from "@/lib/storage";
import { LoadingPage } from "@/components/global-loading";

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [showSignInModal, setShowSignInModal] = useState(false);

  const [checkToken] = useLazyQuery(CHECK_TOKEN_QUERY);
  const timeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    let isMounted = true;

    async function validateToken() {
      setIsChecking(true);

      const token = localStorage.getItem(LocalStore.accessToken);
      if (!token) {
        // No token => not authorized, but don't block the page
        if (isMounted) {
          setIsAuthorized(false);
          setIsChecking(false);
          // Optionally show sign-in modal:
          setShowSignInModal(true);
        }
        return;
      }

      // Timeout if the query hangs
      timeoutRef.current = setTimeout(() => {
        if (isMounted) {
          console.error("Token validation timeout");
          localStorage.removeItem(LocalStore.accessToken);
          setIsAuthorized(false);
          setIsChecking(false);
          setShowSignInModal(true);
        }
      }, 5000);

      try {
        const { data } = await checkToken({ variables: { input: { token } } });
        if (isMounted) {
          if (!data?.checkToken) {
            localStorage.removeItem(LocalStore.accessToken);
            setIsAuthorized(false);
            setShowSignInModal(true);
          } else {
            console.log("Token valid");
            setIsAuthorized(true);
          }
        }
      } catch (error) {
        if (isMounted) {
          console.error("Token validation error:", error);
          localStorage.removeItem(LocalStore.accessToken);
          setIsAuthorized(false);
          setShowSignInModal(true);
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

  if (isChecking) {
    return <LoadingPage />;
  }

  // Always render main page, authorized or not
  return (
    <>
      {children}
      {/* Show sign-in modal if unauthorized */}
      {/* <SignInModal isOpen={showSignInModal} onClose={() => setShowSignInModal(false)} /> */}
    </>
  );
};
