'use client';

import { useState, forwardRef, useImperativeHandle } from 'react';
import {
  SendIcon,
  FileUp,
  Sparkles,
  Globe,
  Lock,
  Loader2,
  Cpu,
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

    const {
      selectedModel,
      setSelectedModel,
      loading: isModelLoading,
      models,
    } = useModels();

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
        <AnimatedInputBorder borderWidth={200} borderHeight={30}>
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder=""
            className="w-full py-24 px-6 pr-12 text-lg border border-transparent rounded-lg focus:outline-none focus:ring-0 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 align-top pt-6 font-normal"
            disabled={isLoading}
          />
        </AnimatedInputBorder>

        {/* The typewriter only shows when the input is empty, not loading, and not focused */}
        {message === '' && !isLoading && !isFocused && (
          <div className="absolute top-[26px] left-[23px] right-12 pointer-events-none text-gray-500 dark:text-gray-400 text-lg font-normal overflow-hidden">
            <Typewriter onInit={handleTypewriterInit} />
          </div>
        )}

        <div className="absolute bottom-3 left-3 right-3 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Select
              value={visibility}
              onValueChange={(value) =>
                !isLoading && setVisibility(value as 'public' | 'private')
              }
              disabled={isLoading}
            >
              <SelectTrigger
                className={cn(
                  'w-[72px] h-6 border-0 focus:ring-0 hover:bg-gray-100 dark:hover:bg-gray-600 pl-1',
                  isLoading && 'opacity-50 cursor-not-allowed'
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
              onValueChange={(value) => !isLoading && setSelectedModel(value)}
              disabled={isLoading}
            >
              <SelectTrigger
                className={cn(
                  'w-[117px] h-6 border-0 focus:ring-0 hover:bg-gray-100 dark:hover:bg-gray-600 pl-1',
                  isLoading && 'opacity-50 cursor-not-allowed'
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

          <div className="flex items-center gap-3">
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
                      isLoading && 'opacity-50 cursor-not-allowed'
                    )}
                    onClick={() => !isLoading && setIsEnhanced(!isEnhanced)}
                    disabled={isLoading}
                  >
                    <Sparkles size={20} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>Magic enhance generation</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* Submit button */}
            <Button
              className={cn(
                'bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white shadow-md hover:shadow-lg transition-all px-5 py-3 h-10 rounded-full',
                isLoading && 'opacity-80 cursor-not-allowed'
              )}
              onClick={() => {
                if (isLoading) return;
                if (!isAuthorized) {
                  onAuthRequired();
                } else {
                  onSubmit();
                }
              }}
              disabled={isLoading}
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
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    );
  }
);
