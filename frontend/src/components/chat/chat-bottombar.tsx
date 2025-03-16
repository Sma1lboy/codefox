'use client';

import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import TextareaAutosize from 'react-textarea-autosize';
import { Send, X } from 'lucide-react';
import useChatStore from '@/hooks/useChatStore';
import { Button } from '../ui/button';
import { ChatProps } from './chat-panel';

export default function ChatBottombar({
  messages,
  input,
  handleInputChange,
  handleSubmit,
  stop,
  formRef,
  setInput,
}: ChatProps) {
  const [isMobile, setIsMobile] = React.useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const base64Images = useChatStore((state) => state.base64Images);
  const setBase64Images = useChatStore((state) => state.setBase64Images);
  const env = process.env.NODE_ENV;

  useEffect(() => {
    const checkScreenWidth = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    // Initial check
    checkScreenWidth();

    // Event listener for screen width changes
    window.addEventListener('resize', checkScreenWidth);

    // Cleanup the event listener on component unmount
    return () => {
      window.removeEventListener('resize', checkScreenWidth);
    };
  }, []);

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as unknown as React.FormEvent<HTMLFormElement>);
    }
  };

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  return (
    <div className="px-4 pb-4 pt-2">
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="rounded-xl border bg-background shadow-sm"
      >
        {/* Image attachments removed */}

        <form
          ref={formRef}
          onSubmit={handleSubmit}
          className="flex items-end w-full"
        >
          <div className="relative flex-1 flex items-center">
            <TextareaAutosize
              autoComplete="off"
              value={input}
              ref={inputRef}
              onKeyDown={handleKeyPress}
              onChange={handleInputChange}
              name="message"
              placeholder="Message CodeFox..."
              className="resize-none px-4 py-3 w-full focus:outline-none bg-transparent text-sm placeholder:text-muted-foreground"
              maxRows={5}
            />
          </div>

          <Button
            type="submit"
            size="icon"
            className="h-9 w-9 rounded-lg mr-2 mb-1 bg-primary hover:bg-primary/90 text-primary-foreground"
            disabled={!input.trim()}
          >
            <Send className="h-5 w-5" />
          </Button>
        </form>
      </motion.div>
    </div>
  );
}
