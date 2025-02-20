'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes'; 
import { SignInModal } from '@/components/SignInModal';
import { SignUpModal } from '@/components/SignUpModal';

export default function HomeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { theme, setTheme } = useTheme(); 
  const [showSignIn, setShowSignIn] = useState(false);
  const [showSignUp, setShowSignUp] = useState(false);

  return (
    <div className="min-h-screen w-full bg-gray-50 dark:bg-gray-900 transition-colors">
      <nav className="w-full p-4 bg-white dark:bg-gray-800 shadow-sm">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <Link href="/" className="flex items-center space-x-2">
            <Image
              src="/codefox.svg"
              alt="CodeFox Logo"
              width={40}
              height={40}
              className="h-10 w-auto"
            />
            <span className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
              CodeFox
            </span>
          </Link>

          <div className="flex items-center space-x-4">
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
            <button
              onClick={() => setShowSignIn(true)}
              className="px-4 py-2 rounded-md bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600 transition-colors"
            >
              Sign In
            </button>
            <button
              onClick={() => setShowSignUp(true)}
              className="px-4 py-2 rounded-md bg-indigo-500 text-white hover:text-indigo-400 transition-colors"
            >
              Sign Up
            </button>
          </div>
        </div>
      </nav>
      <main className="container mx-auto px-4 pt-8">{children}</main>
      <SignInModal isOpen={showSignIn} onClose={() => setShowSignIn(false)} />
      <SignUpModal isOpen={showSignUp} onClose={() => setShowSignUp(false)} />
    </div>
  );
}
