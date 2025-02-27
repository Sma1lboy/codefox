'use client';

import { useState } from 'react';
import { SendIcon, FileUp, Sparkles, Globe, Lock } from 'lucide-react';
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

interface PromptFormProps {
  message: string;
  setMessage: (message: string) => void;
  isAuthorized: boolean;
  onSubmit: () => void;
  onAuthRequired: () => void;
}

export function PromptForm({
  message,
  setMessage,
  isAuthorized,
  onSubmit,
  onAuthRequired,
}: PromptFormProps) {
  const [visibility, setVisibility] = useState<'public' | 'private'>('public');
  const [isEnhanced, setIsEnhanced] = useState(false);

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
          placeholder=""
          className="w-full py-24 px-6 pr-12 text-lg border border-transparent rounded-lg focus:outline-none focus:ring-0 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 align-top pt-6 font-normal"
        />
      </AnimatedInputBorder>

      {message === '' && (
        <div className="absolute top-[26px] left-[23px] right-12 pointer-events-none text-gray-500 dark:text-gray-400 text-lg font-normal overflow-hidden">
          <Typewriter onInit={handleTypewriterInit} />
        </div>
      )}

      <div className="absolute bottom-3 left-3 right-3 flex justify-between items-center">
        <button
          className="flex items-center gap-2 text-gray-600 hover:text-primary-600 dark:text-gray-400 dark:hover:text-primary-400 transition-colors"
          aria-label="Upload file"
        >
          <FileUp size={20} />
          <span>Drag in file</span>
        </button>

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
                      : 'text-gray-500 hover:text-amber-500'
                  )}
                  onClick={() => setIsEnhanced(!isEnhanced)}
                >
                  <Sparkles size={20} />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>Magic enhance generation</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Public/Private dropdown */}
          <Select
            value={visibility}
            onValueChange={(value) =>
              setVisibility(value as 'public' | 'private')
            }
          >
            <SelectTrigger className="w-[130px] h-10 border-0 bg-gray-100 dark:bg-gray-600 focus:ring-0">
              <div className="flex items-center gap-2">
                {visibility === 'public' ? (
                  <>
                    <SelectValue placeholder="Public" />
                  </>
                ) : (
                  <>
                    <SelectValue placeholder="Private" />
                  </>
                )}
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

          {/* Submit button */}
          <Button
            className="bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white shadow-md hover:shadow-lg transition-all px-5 py-3 h-10 rounded-full"
            onClick={() => {
              if (!isAuthorized) {
                onAuthRequired();
              } else {
                onSubmit();
              }
            }}
          >
            <SendIcon size={18} className="mr-2" />
            <span>Create</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
