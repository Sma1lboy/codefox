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
import {
  Check,
  Pencil,
  X,
  Code,
  Terminal,
  Copy,
  RotateCcw,
  ThumbsUp,
  ThumbsDown,
} from 'lucide-react';
import { useAuthContext } from '@/providers/AuthProvider';

interface ChatListProps {
  messages: Message[];
  loadingSubmit?: boolean;
  onMessageEdit?: (messageId: string, newContent: string) => void;
}

const isUserMessage = (role: string) => role.toLowerCase() === 'user';
const isToolCall = (content: string) =>
  content.includes('```') || content.includes('executing');

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

  const renderMessageContent = (content: string, isAssistant: boolean) => {
    // Try to parse JSON for assistant messages
    if (isAssistant) {
      try {
        const parsed = JSON.parse(content);
        if (parsed.final_response && parsed.thinking_process) {
          return (
            <>
              <div>
                <Markdown remarkPlugins={[remarkGfm]}>
                  {parsed.final_response}
                </Markdown>
              </div>
              <div className="mt-4 pt-4 border-t border-border/50">
                <div className="text-xs text-muted-foreground mb-2">
                  Thinking Process:
                </div>
                <Markdown remarkPlugins={[remarkGfm]}>
                  {parsed.thinking_process}
                </Markdown>
              </div>
            </>
          );
        }
      } catch (e) {
        // If parsing fails, treat as normal content
      }
    }

    // Default rendering for non-JSON content
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
    <div className="w-full overflow-y-auto overflow-x-hidden h-full px-4 py-6">
      <div className="w-full flex flex-col gap-3 min-h-full pb-4 max-w-3xl mx-auto">
        <AnimatePresence initial={false}>
          {messages.map((message, index) => {
            const isUser = isUserMessage(message.role);
            const isEditing = message.id === editingMessageId;
            const isTool = !isUser && isToolCall(message.content);

            return (
              <motion.div
                key={`${message.id}-${index}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{
                  opacity: { duration: 0.15 },
                  y: { duration: 0.15 },
                }}
                className="flex flex-col gap-1 w-full group"
              >
                {/* Sender info - always on the left */}
                <div className="flex items-center gap-2 ml-1">
                  <Avatar
                    className={cn(
                      'h-6 w-6',
                      isUser ? 'bg-primary/10' : 'bg-secondary/10'
                    )}
                  >
                    {isUser ? (
                      <>
                        <AvatarImage src="/" alt="user" />
                        <AvatarFallback className="text-primary-foreground text-xs">
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
                        <AvatarFallback className="text-secondary-foreground">
                          AI
                        </AvatarFallback>
                      </>
                    )}
                  </Avatar>
                  <span className="text-xs text-muted-foreground">
                    {isUser ? user.username || 'You' : 'CodeFox'}
                  </span>
                </div>

                {/* Message content */}
                <div className="flex flex-col gap-1 pl-8 relative">
                  {/* Edit buttons for user messages */}
                  {isUser && !isEditing && onMessageEdit && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="absolute -left-1 top-1 opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6"
                      onClick={() => handleEditStart(message)}
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                  )}

                  {/* Message bubble */}
                  {isEditing ? (
                    <div className="flex flex-col gap-2 w-full pl-0">
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
                          className="h-7 px-2 text-xs"
                        >
                          <X className="h-3 w-3 mr-1" />
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleEditSubmit(message.id)}
                          className="h-7 px-2 text-xs"
                        >
                          <Check className="h-3 w-3 mr-1" />
                          Save
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div
                      className={cn(
                        'px-4 py-3 rounded-lg w-full break-words',
                        isTool
                          ? 'bg-slate-50 dark:bg-slate-900'
                          : !isUser
                            ? 'bg-card text-card-foreground'
                            : 'text-foreground'
                      )}
                    >
                      <div className="whitespace-pre-wrap">
                        {isUser ? (
                          message.content
                        ) : isTool ? (
                          <div className="prose dark:prose-invert prose-sm max-w-none">
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1.5">
                              <Terminal className="h-3.5 w-3.5" />
                              <span>Tool Execution</span>
                            </div>
                            {renderMessageContent(message.content, !isUser)}
                          </div>
                        ) : (
                          <div className="prose dark:prose-invert prose-sm max-w-none">
                            {renderMessageContent(message.content, !isUser)}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Action buttons for assistant messages */}
                  {!isUser && !isTool && (
                    <div className="flex gap-2 mt-2">
                      <Button size="sm" variant="ghost" className="h-7 px-2">
                        <Copy className="h-3 w-3" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 px-2">
                        <RotateCcw className="h-3 w-3" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 px-2">
                        <ThumbsUp className="h-3 w-3" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 px-2">
                        <ThumbsDown className="h-3 w-3" />
                      </Button>
                    </div>
                  )}

                  {/* Tool result or additional info could be added here */}
                  {isTool && (
                    <div className="text-xs text-muted-foreground mt-1 ml-2">
                      <span>Tool output</span>
                    </div>
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
            className="flex flex-col gap-1 w-full"
          >
            <div className="flex items-center gap-2 ml-1">
              <Avatar className="h-6 w-6 bg-secondary/10">
                <AvatarImage
                  src="/codefox.svg"
                  alt="AI"
                  className="p-1 dark:invert"
                />
                <AvatarFallback>AI</AvatarFallback>
              </Avatar>
              <span className="text-xs text-muted-foreground">CodeFox</span>
            </div>

            <div className="flex pl-8">
              <div className="px-3 py-2 flex items-center">
                <div className="flex gap-1.5">
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
              </div>
            </div>
          </motion.div>
        )}
      </div>
      <div ref={bottomRef} />
    </div>
  );
}
