'use client';

import { useRef, useContext, useState } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { AuthChoiceModal } from '@/components/auth-choice-modal';
import { useAuthContext } from '@/providers/AuthProvider';
import { ProjectsSection } from '@/components/root/ProjectsSection';
import { PromptForm, PromptFormRef } from '@/components/root/prompt-form';
import { ProjectContext } from '@/components/chat/code-engine/project-context';

export default function HomePage() {
  const [showAuthChoice, setShowAuthChoice] = useState(false);

  const promptFormRef = useRef<PromptFormRef>(null);
  const { isAuthorized } = useAuthContext();
  const { createProjectFromPrompt, isLoading } = useContext(ProjectContext);

  const handleSubmit = async () => {
    if (!promptFormRef.current) return;

    // Get form data from the prompt form
    const { message, isPublic, model } = promptFormRef.current.getPromptData();

    if (!message.trim()) return;

    try {
      // Create the project
      const result = await createProjectFromPrompt(message, isPublic, model);

      // If successful, clear the input
      if (result) {
        promptFormRef.current.clearMessage();

        // Note: No need to navigate here as the ProjectContext's onCompleted handler
        // in the createProject mutation will handle navigation to the chat page
      }
    } catch (error) {
      console.error('Error creating project:', error);
      // Error handling is done via toast in ProjectContext
    }
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
    </>
  );
}
