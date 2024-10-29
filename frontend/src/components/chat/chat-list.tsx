'use client';

import React, { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { ChatProps } from './chat';
import Image from 'next/image';
import CodeDisplayBlock from '../code-display-block';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { INITIAL_QUESTIONS } from '@/utils/initial-questions';
import { Button } from '../ui/button';
import { Message } from '../types';
import { useAuth } from '@/app/hooks/useAuth';

// Helper function to determine if a message is from the user
const isUserMessage = (role: string) =>
  role.toLowerCase() === 'user' || role.toLowerCase() === 'User';

// Helper function to determine if a message is from the assistant/model
const isAssistantMessage = (role: string) =>
  role.toLowerCase() === 'assistant' ||
  role.toLowerCase() === 'model' ||
  role.toLowerCase() === 'Model';

export default function ChatList({
  messages,
  input,
  handleInputChange,
  handleSubmit,
  stop,
  loadingSubmit,
  formRef,
  isMobile,
}: ChatProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const [initialQuestions, setInitialQuestions] = React.useState<Message[]>([]);
  const { user } = useAuth();

  const scrollToBottom = () => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'end',
      });
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(scrollToBottom, 100);
    return () => clearTimeout(timeoutId);
  }, [messages]);

  const onClickQuestion = (content: string, e: React.MouseEvent) => {
    e.preventDefault();
    handleInputChange({
      target: { value: content },
    } as React.ChangeEvent<HTMLTextAreaElement>);

    requestAnimationFrame(() => {
      formRef.current?.dispatchEvent(
        new Event('submit', { cancelable: true, bubbles: true })
      );
    });
  };

  const renderMessageContent = (content: string) => {
    return content.split('```').map((part, index) => {
      if (index % 2 === 0) {
        return (
          <Markdown key={index} remarkPlugins={[remarkGfm]}>
            {part}
          </Markdown>
        );
      }
      return (
        <pre className="whitespace-pre-wrap" key={index}>
          <CodeDisplayBlock code={part} lang="" />
        </pre>
      );
    });
  };

  if (messages.length === 0) {
    return (
      <div className="w-full h-full flex justify-center items-center">
        <div className="relative flex flex-col gap-4 items-center justify-center w-full h-full">
          <div className="flex flex-col gap-4 items-center">
            <Image
              src="/ollama.png"
              alt="AI"
              width={60}
              height={60}
              className="h-20 w-14 object-contain dark:invert"
            />
            <p className="text-center text-lg text-muted-foreground">
              How can I help you today?
            </p>
          </div>

          <div className="absolute bottom-0 w-full px-4 sm:max-w-3xl grid gap-2 sm:grid-cols-2 sm:gap-4 text-sm">
            {initialQuestions.map((message) => {
              const delay = Math.random() * 0.25;
              return (
                <motion.div
                  key={message.content}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{
                    opacity: { duration: 0.1, delay },
                    y: { type: 'spring', stiffness: 100, damping: 10, delay },
                  }}
                >
                  <Button
                    type="button"
                    variant="outline"
                    className="sm:text-start px-4 py-8 flex w-full justify-center sm:justify-start items-center text-sm whitespace-pre-wrap"
                    onClick={(e) => onClickQuestion(message.content, e)}
                  >
                    {message.content}
                  </Button>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full overflow-y-scroll overflow-x-hidden h-full justify-end">
      <div className="w-full flex flex-col overflow-x-hidden overflow-y-hidden min-h-full justify-end">
        {messages.map((message, index) => {
          const isUser = isUserMessage(message.role);
          return (
            <motion.div
              key={`${message.id}-${index}`}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{
                opacity: { duration: 0.1 },
                layout: {
                  type: 'spring',
                  bounce: 0.3,
                  duration: index * 0.05 + 0.2,
                },
              }}
              className={cn(
                'flex flex-col gap-2 p-4 whitespace-pre-wrap',
                isUser ? 'items-end' : 'items-start'
              )}
            >
              <div className="flex gap-3 items-center">
                {isUser ? (
                  <div className="flex items-end gap-3">
                    <div className="flex flex-col gap-2 bg-accent p-3 rounded-md max-w-xs sm:max-w-2xl overflow-x-auto">
                      <p className="text-end">{message.content}</p>
                    </div>
                    <Avatar className="flex justify-start items-center overflow-hidden">
                      <AvatarImage
                        src="/"
                        alt="user"
                        width={6}
                        height={6}
                        className="object-contain"
                      />
                      <AvatarFallback>
                        {user.username?.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                ) : (
                  <div className="flex items-end gap-2">
                    <Avatar className="flex justify-start items-center">
                      <AvatarImage
                        src="/ollama.png"
                        alt="AI"
                        width={6}
                        height={6}
                        className="object-contain dark:invert"
                      />
                    </Avatar>
                    <span className="bg-accent p-3 rounded-md max-w-xs sm:max-w-2xl overflow-x-auto">
                      {renderMessageContent(message.content)}
                    </span>
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}

        {loadingSubmit && (
          <div className="flex pl-4 pb-4 gap-2 items-center">
            <Avatar className="flex justify-start items-center">
              <AvatarImage
                src="/ollama.png"
                alt="AI"
                width={6}
                height={6}
                className="object-contain dark:invert"
              />
            </Avatar>
            <div className="bg-accent p-3 rounded-md max-w-xs sm:max-w-2xl overflow-x-auto">
              <div className="flex gap-1">
                <span className="size-1.5 rounded-full bg-slate-700 motion-safe:animate-[bounce_1s_ease-in-out_infinite] dark:bg-slate-300"></span>
                <span className="size-1.5 rounded-full bg-slate-700 motion-safe:animate-[bounce_0.5s_ease-in-out_infinite] dark:bg-slate-300"></span>
                <span className="size-1.5 rounded-full bg-slate-700 motion-safe:animate-[bounce_1s_ease-in-out_infinite] dark:bg-slate-300"></span>
              </div>
            </div>
          </div>
        )}
      </div>
      <div ref={bottomRef} />
    </div>
  );
}
