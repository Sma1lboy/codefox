'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useMutation, useSubscription } from '@apollo/client';
import { ChatLayout } from '@/components/chat/chat-layout';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import UsernameForm from '@/components/username-form';
import { toast } from 'sonner';
import useChatStore from './hooks/useChatStore';
import { Message } from '@/components/types';
import { useModels } from './hooks/useModels';
import {
  CHAT_STREAM_SUBSCRIPTION,
  CREATE_CHAT,
  SAVE_CHAT_HISTORY,
} from '@/graphql/request';

export default function HomeContent() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [chatId, setChatId] = useState<string>('');
  const { models } = useModels();
  const [selectedModel, setSelectedModel] = useState<string>(
    models[0] || 'Loading models'
  );
  const [open, setOpen] = useState(false);
  const [loadingSubmit, setLoadingSubmit] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const base64Images = useChatStore((state) => state.base64Images);
  const setBase64Images = useChatStore((state) => state.setBase64Images);

  // Apollo mutations
  const [createChat] = useMutation(CREATE_CHAT, {
    onCompleted: (data) => {
      console.log('Created new chat:', data);
      setChatId(data.createChat.id);
    },
    onError: (error) => {
      console.error('Error creating chat:', error);
      toast.error('Failed to create new chat');
    },
  });

  const [saveChatHistory] = useMutation(SAVE_CHAT_HISTORY, {
    onCompleted: (data) => {
      console.log('Saved chat history:', data);
    },
    onError: (error) => {
      console.error('Error saving chat history:', error);
      // Fallback to local storage
      if (chatId) {
        localStorage.setItem(`chat_${chatId}`, JSON.stringify(messages));
        window.dispatchEvent(new Event('storage'));
      }
    },
  });

  // Create new chat when component mounts
  useEffect(() => {
    if (messages.length < 1) {
      createChat({
        variables: {
          input: {
            title: 'New Chat',
          },
        },
      });
    }
  }, [messages, createChat]);

  // Save messages to local storage
  useEffect(() => {
    if (!isLoading && !error && chatId && messages.length > 0) {
      saveChatHistory({
        variables: {
          chatId,
          messages: messages.map((msg) => ({
            content: msg.content,
            role: msg.role,
            createdAt: msg.createdAt,
          })),
        },
      });
    }
  }, [chatId, isLoading, error, messages, saveChatHistory]);

  // Chat subscription
  const { data: streamData } = useSubscription(CHAT_STREAM_SUBSCRIPTION, {
    variables: {
      input: {
        chatId,
        message: input,
        model: selectedModel,
        attachments: base64Images
          ? base64Images.map((image) => ({
              contentType: 'image/base64',
              url: image,
            }))
          : [],
      },
    },
    skip: !input.trim() || !chatId,
    onSubscriptionData: ({ subscriptionData }) => {
      if (subscriptionData.data) {
        const chunk = subscriptionData.data.chatStream;
        const content = chunk.choices[0]?.delta?.content;

        if (content) {
          setMessages((prev) => {
            const lastMsg = prev[prev.length - 1];
            if (lastMsg?.role === 'assistant') {
              return [
                ...prev.slice(0, -1),
                {
                  ...lastMsg,
                  content: lastMsg.content + content,
                  updatedAt: new Date().toISOString(),
                },
              ];
            } else {
              return [
                ...prev,
                {
                  id: chunk.id,
                  role: 'assistant',
                  content,
                  createdAt: new Date(chunk.created * 1000).toISOString(),
                  isActive: true,
                  isDeleted: false,
                },
              ];
            }
          });
        }

        if (chunk.choices[0]?.finish_reason === 'stop') {
          setLoadingSubmit(false);
          setBase64Images(null);
        }
      }
    },
    onError: (error) => {
      console.error('Subscription error:', error);
      toast.error('Connection error. Please try again.');
      setLoadingSubmit(false);
    },
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
  };

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim() || !chatId) return;

    setLoadingSubmit(true);

    const newMessage: Message = {
      id: chatId,
      role: 'user',
      content: input,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, newMessage]);
    setInput('');
  };

  const stop = () => {
    // Implement stop functionality if needed
    toast.info('Stopping message generation...');
  };

  const onOpenChange = (isOpen: boolean) => {
    const username = localStorage.getItem('ollama_user');
    if (username) return setOpen(isOpen);

    localStorage.setItem('ollama_user', 'Anonymous');
    window.dispatchEvent(new Event('storage'));
    setOpen(isOpen);
  };

  return (
    <main className="flex h-[calc(100dvh)] flex-col items-center">
      <Dialog open={open} onOpenChange={onOpenChange}>
        <ChatLayout
          chatId={chatId}
          setSelectedModel={setSelectedModel}
          messages={messages}
          input={input}
          handleInputChange={handleInputChange}
          handleSubmit={onSubmit}
          isLoading={isLoading}
          loadingSubmit={loadingSubmit}
          error={error}
          stop={stop}
          navCollapsedSize={10}
          defaultLayout={[30, 160]}
          formRef={formRef}
          setMessages={setMessages}
          setInput={setInput}
        />
        <DialogContent className="flex flex-col space-y-4">
          <DialogHeader className="space-y-2">
            <DialogTitle>Welcome to Ollama!</DialogTitle>
            <DialogDescription>
              Enter your name to get started. This is just to personalize your
              experience.
            </DialogDescription>
            <UsernameForm setOpen={setOpen} />
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </main>
  );
}
