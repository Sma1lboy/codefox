'use client';

import { useState } from 'react';
import { SendIcon, FileUp, Sun, Moon } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useTheme } from 'next-themes';

import { SignUpModal } from '@/components/SignUpModal';
import { SignInModal } from '@/components/SignInModal';
import { AuthChoiceModal } from '@/components/AuthChoiceModal';
import { useAuthContext } from '@/providers/AuthProvider';

export default function HomePage() {
  const [message, setMessage] = useState('');
  const [showSignUp, setShowSignUp] = useState(false);
  const [showSignIn, setShowSignIn] = useState(false);
  const [showAuthChoice, setShowAuthChoice] = useState(false);

  const { isAuthorized, logout } = useAuthContext();
  const { theme, setTheme } = useTheme();

  return (
    <>
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
                  className="px-4 py-2 rounded-md bg-indigo-500 text-white hover:text-indigo-400 transition-colors"
                >
                  Sign Up
                </button>
              </>
            ) : (
              <button
                onClick={logout}
                className="px-4 py-2 rounded-md bg-red-500 text-white hover:bg-red-600 transition-colors"
              >
                Logout
              </button>
            )}
          </div>
        </div>
      </nav>

      <div className="flex flex-col items-center pt-20">
        <div className="mb-6">
          <Image
            src="/codefox.svg"
            alt="CodeFox Logo"
            width={120}
            height={120}
            className="h-32 w-auto"
          />
        </div>

        <div className="mb-16">
          <p className="text-2xl font-medium text-indigo-600 dark:text-indigo-400">
            CodeFox makes everything better
          </p>
        </div>

        <div className="w-full max-w-3xl px-4">
          <div className="relative">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your message..."
              className="w-full py-24 px-6 pr-12 text-lg border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400 align-top pt-6"
            />
            <button
              className="absolute right-3 bottom-3 p-3 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 transition-colors"
              aria-label="Send message"
              onClick={() => {
                if (!isAuthorized) {
                  setShowAuthChoice(true);
                } else {
                  console.log('Sending message:', message);
                }
              }}
            >
              <SendIcon size={20} />
            </button>
            <button
              className="absolute left-3 bottom-3 flex items-center gap-2 text-gray-600 hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-400"
              aria-label="Upload file"
            >
              <FileUp size={20} />
              <span>Upload file</span>
            </button>
          </div>
        </div>

        <AuthChoiceModal
          isOpen={showAuthChoice}
          onClose={() => setShowAuthChoice(false)}
          onSignUpClick={() => {
            setShowAuthChoice(false);
            setShowSignUp(true);
          }}
          onSignInClick={() => {
            setShowAuthChoice(false);
            setShowSignIn(true);
          }}
        />
        <SignUpModal isOpen={showSignUp} onClose={() => setShowSignUp(false)} />
        <SignInModal isOpen={showSignIn} onClose={() => setShowSignIn(false)} />
      </div>
    </>
  );
}
