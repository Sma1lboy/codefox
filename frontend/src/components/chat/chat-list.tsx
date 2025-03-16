'use client';

import React, { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import CodeDisplayBlock from '../code-display-block';
import { Message } from '../../const/MessageType';
import { Button } from '../ui/button';
import { Check, Pencil, X } from 'lucide-react';
import { useAuthContext } from '@/providers/AuthProvider';

interface ChatListProps {
  messages: Message[];
  loadingSubmit?: boolean;
  onMessageEdit?: (messageId: string, newContent: string) => void;
}

const isUserMessage = (role: string) => role.toLowerCase() === 'user';

export default function ChatList({
  messages,
  loadingSubmit,
  onMessageEdit,
}: ChatListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const { user } = useAuthContext();

  const [editingMessageId, setEditingMessageId] = React.useState<string | null>(
    null
  );
  const [editContent, setEditContent] = React.useState('');

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }, 100);
    return () => clearTimeout(timeoutId);
  }, [messages]);

  if (!user) {
    return null;
  }

  const handleEditStart = (message: Message) => {
    setEditingMessageId(message.id);
    setEditContent(message.content);
  };

  const handleEditSubmit = (messageId: string) => {
    if (onMessageEdit && editContent.trim()) {
      onMessageEdit(messageId, editContent);
    }
    setEditingMessageId(null);
    setEditContent('');
  };

  const handleEditCancel = () => {
    setEditingMessageId(null);
    setEditContent('');
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
        <div className="my-2 w-full" key={index}>
          <CodeDisplayBlock code={part} lang="" />
        </div>
      );
    });
  };

  if (messages.length === 0) {
    return (
      <div className="w-full h-full flex justify-center items-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col items-center text-center p-6 max-w-md"
        >
          <img
            src="/codefox.svg"
            alt="AI"
            className="h-24 w-24 mb-4 aspect-square object-contain dark:invert"
          />
          <h3 className="text-xl font-semibold mb-2">Welcome to CodeFox</h3>
          <p className="text-muted-foreground">
            Ask me anything about coding, project development, or technical
            problems. I&apos;m here to help!
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="w-full overflow-y-auto overflow-x-hidden h-full px-2 py-4">
      <div className="w-full flex flex-col gap-6 min-h-full pb-4">
        <AnimatePresence initial={false}>
          {messages.map((message, index) => {
            const isUser = isUserMessage(message.role);
            const isEditing = message.id === editingMessageId;

            return (
              <motion.div
                key={`${message.id}-${index}`}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                transition={{
                  opacity: { duration: 0.2 },
                  layout: {
                    type: 'spring',
                    bounce: 0.2,
                    duration: 0.4,
                  },
                }}
                className={cn(
                  'flex w-full',
                  isUser ? 'justify-end' : 'justify-start'
                )}
              >
                <div
                  className={cn(
                    'flex max-w-3xl group relative',
                    isUser ? 'flex-row-reverse' : 'flex-row'
                  )}
                >
                  <div
                    className={cn(
                      'flex items-start pt-1',
                      isUser ? 'ml-3' : 'mr-3'
                    )}
                  >
                    <Avatar
                      className={cn(
                        'h-8 w-8 ring-2',
                        isUser ? 'ring-primary/20' : 'ring-secondary/20'
                      )}
                    >
                      {isUser ? (
                        <>
                          <AvatarImage src="/" alt="user" />
                          <AvatarFallback className="bg-primary/10 text-primary-foreground text-xs">
                            {user.username?.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </>
                      ) : (
                        <>
                          <AvatarImage
                            src="/codefox.svg"
                            alt="AI"
                            className="p-1 dark:invert"
                          />
                          <AvatarFallback className="bg-secondary/10 text-secondary-foreground">
                            AI
                          </AvatarFallback>
                        </>
                      )}
                    </Avatar>
                  </div>

                  <div
                    className={cn(
                      'flex flex-col',
                      isUser ? 'items-end' : 'items-start',
                      'w-full'
                    )}
                  >
                    <div
                      className={cn(
                        'px-4 py-3 rounded-lg',
                        isUser
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted',
                        isEditing ? 'w-full' : 'max-w-full'
                      )}
                    >
                      {isEditing ? (
                        <div className="flex flex-col gap-2 w-full">
                          <textarea
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            className="min-h-[100px] w-full p-2 rounded bg-background border resize-none text-foreground"
                            autoFocus
                          />
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={handleEditCancel}
                              className="h-8 px-2"
                            >
                              <X className="h-4 w-4 mr-1" />
                              Cancel
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleEditSubmit(message.id)}
                              className="h-8 px-2"
                            >
                              <Check className="h-4 w-4 mr-1" />
                              Save
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div
                          className={cn(
                            'whitespace-pre-wrap',
                            isUser
                              ? 'text-primary-foreground'
                              : 'text-foreground'
                          )}
                        >
                          {isUser ? (
                            message.content
                          ) : (
                            <div className="prose dark:prose-invert prose-sm max-w-none">
                              {renderMessageContent(message.content)}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="text-xs text-muted-foreground mt-1 px-1">
                      {message.createdAt && (
                        <span>
                          {new Date(message.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      )}
                    </div>
                  </div>

                  {isUser && !isEditing && onMessageEdit && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="absolute -left-10 top-0 opacity-0 group-hover:opacity-100 transition-opacity h-7 w-7"
                      onClick={() => handleEditStart(message)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {loadingSubmit && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-start gap-3 mt-2"
          >
            <Avatar className="h-8 w-8 ring-2 ring-secondary/20">
              <AvatarImage
                src="/codefox.svg"
                alt="AI"
                className="p-1 dark:invert"
              />
              <AvatarFallback>AI</AvatarFallback>
            </Avatar>
            <div className="bg-muted px-4 py-3 rounded-lg flex gap-1.5">
              <span className="size-2 rounded-full bg-foreground/30 animate-bounce"></span>
              <span
                className="size-2 rounded-full bg-foreground/30 animate-bounce"
                style={{ animationDelay: '0.2s' }}
              ></span>
              <span
                className="size-2 rounded-full bg-foreground/30 animate-bounce"
                style={{ animationDelay: '0.4s' }}
              ></span>
            </div>
          </motion.div>
        )}
      </div>
      <div ref={bottomRef} />
    </div>
  );
}
