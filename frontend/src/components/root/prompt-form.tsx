'use client';

import { useState, forwardRef, useImperativeHandle, useEffect } from 'react';
import {
  SendIcon,
  FileUp,
  Sparkles,
  Globe,
  Lock,
  Loader2,
  Cpu,
  Command,
} from 'lucide-react';
import Typewriter from 'typewriter-effect';
import { AnimatedInputBorder } from '@/components/ui/moving-border';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useModels } from '@/hooks/useModels';
import { gql, useMutation } from '@apollo/client';

export interface PromptFormRef {
  getPromptData: () => {
    message: string;
    isPublic: boolean;
    model: string;
  };
  clearMessage: () => void;
}

interface PromptFormProps {
  isAuthorized: boolean;
  onSubmit: () => void;
  onAuthRequired: () => void;
  isLoading?: boolean;
}

const REGENERATE_DESCRIPTION = gql`
  mutation RegenerateDescription($input: String!) {
    regenerateDescription(input: $input)
  }
`;

export const PromptForm = forwardRef<PromptFormRef, PromptFormProps>(
  function PromptForm(
    { isAuthorized, onSubmit, onAuthRequired, isLoading = false },
    ref
  ) {
    // Internal state
    const [message, setMessage] = useState('');
    const [visibility, setVisibility] = useState<'public' | 'private'>(
      'public'
    );
    const [isEnhanced, setIsEnhanced] = useState(false);
    // New state for tracking input focus
    const [isFocused, setIsFocused] = useState(false);
    // State for regeneration loading
    const [isRegenerating, setIsRegenerating] = useState(false);

    const {
      selectedModel,
      setSelectedModel,
      loading: isModelLoading,
      models,
    } = useModels();

    // Set up the regenerate mutation
    const [regenerateDescriptionMutation] = useMutation(
      REGENERATE_DESCRIPTION,
      {
        onCompleted: (data) => {
          // Update the message with the regenerated description
          setMessage(data.regenerateDescription);
          setIsRegenerating(false);
        },
        onError: (error) => {
          console.error('Error regenerating description:', error);
          setIsRegenerating(false);
        },
      }
    );

    // Handle form submission
    const handleSubmit = () => {
      if (isLoading || isRegenerating) return;
      if (!isAuthorized) {
        onAuthRequired();
      } else {
        onSubmit();
      }
    };

    // Handle magic enhance button click
    const handleMagicEnhance = () => {
      // Don't do anything if already loading
      if (isLoading || isRegenerating) {
        return;
      }

      // Check if user is authorized
      if (!isAuthorized) {
        onAuthRequired();
        return;
      }

      // If there's text, regenerate it
      if (message.trim()) {
        setIsRegenerating(true);
        regenerateDescriptionMutation({
          variables: {
            input: message,
          },
        });
      }

      // Toggle the enhanced state regardless
      setIsEnhanced(!isEnhanced);
    };

    // Set up keyboard shortcut for submission
    useEffect(() => {
      const handleKeyDown = (e) => {
        // Skip if currently loading, regenerating, or enhancing
        if (isLoading || isRegenerating) {
          return;
        }

        // Check for Cmd+Enter (Mac) or Ctrl+Enter (Windows/Linux)
        if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
          e.preventDefault();
          handleSubmit();
        }
        // Also support Alt+Enter as an alternative shortcut
        if (e.altKey && e.key === 'Enter') {
          e.preventDefault();
          handleSubmit();
        }
      };

      // Add event listener
      document.addEventListener('keydown', handleKeyDown);

      // Clean up
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
      };
    }, [isAuthorized, isLoading, isRegenerating]);

    // Expose methods to parent component
    useImperativeHandle(ref, () => ({
      getPromptData: () => ({
        message,
        isPublic: visibility === 'public',
        model: selectedModel,
      }),
      clearMessage: () => setMessage(''),
    }));

    // Typewriter initialization function
    const handleTypewriterInit = (typewriter) => {
      typewriter
        .typeString("Create a personal website for me, I'm an engineer...")
        .changeDelay(50)
        .pauseFor(10)
        .deleteAll()
        .start();
    };

    return (
      <div className="relative w-full max-w-2xl mx-auto">
        {/* Main content area with textarea */}
        <AnimatedInputBorder borderWidth={200} borderHeight={30}>
          <div className="flex flex-col">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder=""
              className="w-full min-h-[200px] py-6 px-6 pr-12 text-lg border border-transparent rounded-lg focus:outline-none focus:ring-0 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 resize-none font-normal"
              disabled={isLoading || isRegenerating}
              rows={4}
              style={{ paddingBottom: '48px' }} // Extra padding at bottom to avoid text touching buttons
            />

            {/* The typewriter only shows when the input is empty, not loading, and not focused */}
            {message === '' && !isLoading && !isRegenerating && !isFocused && (
              <div className="absolute top-[26px] left-[23px] right-12 pointer-events-none text-gray-500 dark:text-gray-400 text-lg font-normal overflow-hidden">
                <Typewriter onInit={handleTypewriterInit} />
              </div>
            )}
          </div>

          {/* Controls section - now separated with a background */}
          <div className="absolute bottom-0 left-0 right-0 pb-3 px-3 flex pt-1 justify-between items-center bg-white dark:bg-gray-600 rounded-b-lg dark:border-gray-600">
            <div className="flex items-center gap-2">
              <Select
                value={visibility}
                onValueChange={(value) =>
                  !isLoading &&
                  !isRegenerating &&
                  setVisibility(value as 'public' | 'private')
                }
                disabled={isLoading || isRegenerating}
              >
                <SelectTrigger
                  className={cn(
                    'w-[72px] h-6 border-0 focus:ring-0 hover:bg-gray-100 dark:hover:bg-gray-600 pl-1',
                    (isLoading || isRegenerating) &&
                      'opacity-50 cursor-not-allowed'
                  )}
                >
                  <div className="flex items-center gap-2">
                    <SelectValue />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">
                    <div className="flex items-center gap-2">
                      <Globe size={16} />
                      <span>Public</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="private">
                    <div className="flex items-center gap-2">
                      <Lock size={16} />
                      <span>Private</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={selectedModel}
                onValueChange={(value) =>
                  !isLoading && !isRegenerating && setSelectedModel(value)
                }
                disabled={isLoading || isRegenerating}
              >
                <SelectTrigger
                  className={cn(
                    'h-6 border-0 focus:ring-0 hover:bg-gray-100 dark:hover:bg-gray-600 pl-1 min-w-max',
                    (isLoading || isRegenerating) &&
                      'opacity-50 cursor-not-allowed'
                  )}
                >
                  <div className="flex items-center gap-2">
                    {!isModelLoading ? <SelectValue /> : 'Loading...'}
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {!isModelLoading ? (
                    models.map((model) => (
                      <SelectItem key={model} value={model}>
                        <div className="flex items-center gap-2">
                          <Cpu size={16} />
                          <span>{model}</span>
                        </div>
                      </SelectItem>
                    ))
                  ) : (
                    <>Loading...</>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              {/* Magic enhance tooltip */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn(
                        'rounded-full p-2 transition-all',
                        isEnhanced
                          ? 'bg-amber-500/20 text-amber-500 hover:bg-amber-500/30 hover:text-amber-600'
                          : 'text-gray-500 hover:text-amber-500',
                        (isLoading || isRegenerating) &&
                          'opacity-50 cursor-not-allowed'
                      )}
                      onClick={handleMagicEnhance}
                      disabled={isLoading || isRegenerating}
                    >
                      <Sparkles
                        size={20}
                        className={cn(isRegenerating && 'animate-spin')}
                      />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p>
                      {message.trim()
                        ? 'Regenerate & enhance'
                        : 'Magic enhance generation'}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {/* Submit button */}
              <Button
                className={cn(
                  'bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white shadow-md hover:shadow-lg transition-all px-5 py-3 h-10 rounded-full',
                  (isLoading || isRegenerating) &&
                    'opacity-80 cursor-not-allowed'
                )}
                onClick={handleSubmit}
                disabled={isLoading || isRegenerating}
              >
                {isLoading ? (
                  <>
                    <Loader2 size={18} className="mr-2 animate-spin" />
                    <span>Creating...</span>
                  </>
                ) : (
                  <>
                    <SendIcon size={18} className="mr-2" />
                    <span>Create</span>
                    <span className="ml-2 text-xs opacity-80 border-l border-white pl-2">
                      Alt+↵
                    </span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </AnimatedInputBorder>
      </div>
    );
  }
);
