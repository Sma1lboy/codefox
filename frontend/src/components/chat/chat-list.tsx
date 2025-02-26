'use client';

import React, { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage, SmallAvatar } from '../ui/avatar';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import CodeDisplayBlock from '../code-display-block';
import { Message } from '../types';
import { Button } from '../ui/button';
import { Pencil } from 'lucide-react';
import { useAuth } from '@/app/hooks/useAuth';

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
  const { user } = useAuth();
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

  const handleEditStart = (message: Message) => {
    setEditingMessageId(message.id);
    setEditContent(message.content);
  };

  const handleEditSubmit = (messageId: string) => {
    if (onMessageEdit) {
      onMessageEdit(messageId, editContent);
    }
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
        <pre className="whitespace-pre-wrap" key={index}>
          <CodeDisplayBlock code={part} lang="" />
        </pre>
      );
    });
  };

  if (messages.length === 0) {
    return (
      <div className="w-full h-full flex justify-center items-center">
        <div className="flex flex-col  items-center">
          <img
            src="/codefox.svg"
            alt="AI"
            className="h-24 w-24 aspect-square object-contain dark:invert"
          />
          <p className="text-center text-lg text-muted-foreground">
            How can I help you today?
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full overflow-y-scroll overflow-x-hidden h-full justify-end">
      <div className="w-full flex flex-col overflow-x-hidden overflow-y-hidden min-h-full justify-end">
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
                opacity: { duration: 0.1 },
                layout: {
                  type: 'spring',
                  bounce: 0.3,
                  duration: index * 0.05 + 0.2,
                },
              }}
              className={cn(
                'flex flex-col gap-2 p-4 whitespace-pre-wrap group',
                isUser ? 'items-end' : 'items-start'
              )}
            >
              <div className="flex gap-3 items-center">
                {isUser ? (
                  <div className="flex items-end gap-3">
                    <div className="relative flex flex-col gap-2 bg-accent p-3 rounded-md max-w-xs sm:max-w-2xl overflow-x-auto">
                      {isEditing ? (
                        <div className="flex flex-col gap-2">
                          <textarea
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            className="min-h-[100px] w-full p-2 rounded border bg-background resize-none"
                            autoFocus
                          />
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setEditingMessageId(null)}
                            >
                              Cancel
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleEditSubmit(message.id)}
                            >
                              Save
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <p className="text-end">{message.content}</p>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="absolute -left-12 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => handleEditStart(message)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                    <SmallAvatar className="flex justify-start items-center overflow-hidden">
                      <AvatarImage
                        src="/"
                        alt="user"
                        className="h-full w-full object-cover"
                      />
                      <AvatarFallback>
                        {user.username?.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </SmallAvatar>
                  </div>
                ) : (
                  <div className="flex items-end gap-2">
                    <SmallAvatar className="flex justify-start items-center">
                      <AvatarImage
                        src="/codefox.svg"
                        alt="AI"
                        className="h-full w-full object-contain dark:invert"
                      />
                    </SmallAvatar>
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
            <Avatar className="h-10 w-10 flex justify-start items-center">
              <AvatarImage
                src="/codefox.svg"
                alt="AI"
                className="h-full w-full object-contain dark:invert"
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
