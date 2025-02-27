'use client';

import { useState } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { AuthChoiceModal } from '@/components/auth-choice-modal';
import { useAuthContext } from '@/providers/AuthProvider';
import { ProjectsSection } from '@/components/root/ProjectsSection';
import { PromptForm } from '@/components/root/prompt-form';

export default function HomePage() {
  const [message, setMessage] = useState('');

  const [showAuthChoice, setShowAuthChoice] = useState(false);

  const { isAuthorized } = useAuthContext();

  const handleSubmit = () => {
    console.log('Sending message:', message);
    // Additional submission logic here
  };

  return (
    <>
      <motion.div
        className="flex flex-col items-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
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
          <div className="flex flex-col items-center">
            <p className="text-5xl font-medium text-primary-600 dark:text-primary-400 mb-3">
              Sentence to a project in seconds.
            </p>
            <p className="text-xl text-gray-600 dark:text-gray-400">
              Codefox built AI agents crew for you to create your next project
            </p>
          </div>
        </div>

        <div className="w-full mb-12">
          <PromptForm
            message={message}
            setMessage={setMessage}
            isAuthorized={isAuthorized}
            onSubmit={handleSubmit}
            onAuthRequired={() => setShowAuthChoice(true)}
          />
        </div>

        <div className="w-full mb-24">
          <ProjectsSection />
        </div>
      </motion.div>

      {/* Modals */}
      <AuthChoiceModal
        isOpen={showAuthChoice}
        onClose={() => setShowAuthChoice(false)}
        onSignUpClick={() => {
          setShowAuthChoice(false);
        }}
        onSignInClick={() => {
          setShowAuthChoice(false);
        }}
      />

      {/* Add this to your global CSS for the subtle pulse animation */}
      <style jsx global>{`
        .animate-pulse-subtle {
          animation: pulse-subtle 2s infinite;
        }
        @keyframes pulse-subtle {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0.85;
          }
        }
      `}</style>
    </>
  );
}
