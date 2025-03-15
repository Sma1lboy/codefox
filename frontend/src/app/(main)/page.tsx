'use client';

import { useRef, useContext, useState } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { AuthChoiceModal } from '@/components/auth-choice-modal';
import { useAuthContext } from '@/providers/AuthProvider';
import { ProjectsSection } from '@/components/root/projects-section';
import { PromptForm, PromptFormRef } from '@/components/root/prompt-form';
import { ProjectContext } from '@/components/chat/code-engine/project-context';
import { SignInModal } from '@/components/sign-in-modal';
import { SignUpModal } from '@/components/sign-up-modal';
import { useRouter } from 'next/navigation';
import { logger } from '../log/logger';
export default function HomePage() {
  // States for AuthChoiceModal
  const [showAuthChoice, setShowAuthChoice] = useState(false);
  const router = useRouter();
  const [showSignIn, setShowSignIn] = useState(false);
  const [showSignUp, setShowSignUp] = useState(false);

  const promptFormRef = useRef<PromptFormRef>(null);
  const { isAuthorized } = useAuthContext();
  const { createProjectFromPrompt, isLoading } = useContext(ProjectContext);

  const handleSubmit = async () => {
    if (!promptFormRef.current) return;

    const { message, isPublic, model } = promptFormRef.current.getPromptData();
    if (!message.trim()) return;

    try {
      await createProjectFromPrompt(message, isPublic, model);
      promptFormRef.current.clearMessage();
    } catch (error) {
      logger.error('Error creating project:', error);
    }
  };

  return (
    <div className="pt-32 pb-24 px-6">
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
            ref={promptFormRef}
            isAuthorized={isAuthorized}
            onSubmit={handleSubmit}
            onAuthRequired={() => setShowAuthChoice(true)}
            isLoading={isLoading}
          />
        </div>

        <div className="w-full mb-24">
          <ProjectsSection />
        </div>
      </motion.div>

      {/* Choice Modal */}
      <AuthChoiceModal
        isOpen={showAuthChoice}
        onClose={() => setShowAuthChoice(false)}
        onSignUpClick={() => {
          setShowAuthChoice(false);
          setTimeout(() => {
            setShowSignUp(true);
          }, 100);
        }}
        onSignInClick={() => {
          setShowAuthChoice(false);
          setTimeout(() => {
            setShowSignIn(true);
          }, 100);
        }}
      />

      {/* SignInModal & SignUpModal */}
      <SignInModal isOpen={showSignIn} onClose={() => setShowSignIn(false)} />
      <SignUpModal isOpen={showSignUp} onClose={() => setShowSignUp(false)} />

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
    </div>
  );
}
