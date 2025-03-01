'use client';
import React, { useEffect, useState, useRef } from 'react';
import { Sun, Moon } from 'lucide-react';
import Image from 'next/image';
import { useTheme } from 'next-themes';
import { motion } from 'framer-motion';
import { useAuthContext } from '@/providers/AuthProvider';
import FloatingNavbar, { NavbarRef } from './nav';
import { SignUpModal } from '../sign-up-modal';
import { SignInModal } from '../sign-in-modal';

interface NavLayoutProps {
  children: React.ReactNode;
}

export default function NavLayout({ children }: NavLayoutProps) {
  const navRef = useRef<NavbarRef>(null);
  const { isAuthorized, logout } = useAuthContext();
  const { theme, setTheme } = useTheme();
  const [showSignUp, setShowSignUp] = useState(false);
  const [showSignIn, setShowSignIn] = useState(false);

  const navTabs = [
    { label: 'Home', path: '/' },
    { label: 'Codefox Journey', path: '/Codefox-Journey' },
    { label: 'Pricing', path: '/price' },
  ];

  const logoElement = !isAuthorized ? (
    <Image
      src="/codefox.svg"
      alt="CodeFox Logo"
      width={40}
      height={40}
      className="h-10 w-auto"
    />
  ) : null;

  const authButtons = (
    <div className="flex items-center space-x-4 transition-transform duration-300">
      <button
        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
        aria-label="Toggle theme"
      >
        {theme === 'dark' ? (
          <Sun className="h-5 w-5 text-gray-600 dark:text-gray-400" />
        ) : (
          <Moon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
        )}
      </button>

      <a
        href="https://github.com/Sma1lboy/codefox"
        target="_blank"
        rel="noopener noreferrer"
        className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
        aria-label="GitHub"
      >
        <Image
          src="/images/github.svg"
          alt="GitHub"
          width={24}
          height={24}
          className="h-6 w-6"
        />
      </a>

      {!isAuthorized ? (
        <>
          <button
            onClick={() => setShowSignIn(true)}
            className="px-4 py-2 rounded-md bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600 transition-colors"
          >
            Sign In
          </button>
          <button
            onClick={() => setShowSignUp(true)}
            className="px-4 py-2 rounded-md bg-primary-500 text-white hover:bg-primary-600 transition-colors"
          >
            Sign Up
          </button>
        </>
      ) : (
        <button
          onClick={logout}
          className="px-4 py-2 rounded-md bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors"
        >
          Logout
        </button>
      )}
    </div>
  );

  return (
    <>
      <FloatingNavbar
        ref={navRef}
        tabs={navTabs}
        logo={logoElement}
        name={!isAuthorized ? 'CodeFox' : ''}
        authButtons={authButtons}
        className="transition-transform duration-300"
      />

      <div className="w-full pt-32 pb-24 px-6">{children}</div>

      <SignUpModal isOpen={showSignUp} onClose={() => setShowSignUp(false)} />
      <SignInModal isOpen={showSignIn} onClose={() => setShowSignIn(false)} />
    </>
  );
}
