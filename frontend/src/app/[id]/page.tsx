'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useSubscription } from '@apollo/client';
import { toast } from 'sonner';
import { ChatLayout } from '@/components/chat/chat-layout';
import { Message } from '@/components/types';
import { useModels } from '../hooks/useModels';
import useChatStore from '../hooks/useChatStore';
import {
  CHAT_STREAM_SUBSCRIPTION,
  GET_CHAT_HISTORY,
  SAVE_CHAT_HISTORY,
} from '@/graphql/request';

interface PageProps {
  params: {
    id: string;
  };
}

export default function Page({ params }: PageProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { models } = useModels();
  const [selectedModel, setSelectedModel] = useState<string>(
    models[0] || 'Loading models'
  );
  const [loadingSubmit, setLoadingSubmit] = useState(false);
  const [currentAssistantMessage, setCurrentAssistantMessage] = useState('');
  const formRef = useRef<HTMLFormElement>(null);

  const base64Images = useChatStore((state) => state.base64Images);
  const setBase64Images = useChatStore((state) => state.setBase64Images);

  // Query chat history
  const { data: historyData } = useQuery(GET_CHAT_HISTORY, {
    variables: { chatId: params.id },
    onCompleted: (data) => {
      console.log('Loaded chat history:', data);
      if (data?.getChatHistory) {
        setMessages(data.getChatHistory);
      }
    },
    onError: (error) => {
      console.error('Error loading chat history:', error);
      // Fallback to local storage
      const localMessages = localStorage.getItem(`chat_${params.id}`);
      if (localMessages) {
        setMessages(JSON.parse(localMessages));
      }
      toast.error('Failed to load chat history');
    },
  });

  // Save chat history mutation
  const [saveChatHistory] = useMutation(SAVE_CHAT_HISTORY, {
    onCompleted: (data) => {
      console.log('Saved chat history:', data);
    },
    onError: (error) => {
      console.error('Error saving chat history:', error);
      // Fallback to local storage
      localStorage.setItem(`chat_${params.id}`, JSON.stringify(messages));
      window.dispatchEvent(new Event('storage'));
    },
  });

  // Chat subscription
  const { data: streamData } = useSubscription(CHAT_STREAM_SUBSCRIPTION, {
    variables: {
      input: {
        message: input,
        chatId: params.id,
        model: selectedModel,
        attachments: base64Images
          ? base64Images.map((image) => ({
              contentType: 'image/base64',
              url: image,
            }))
          : [],
      },
    },
    skip: !input.trim(),
    onSubscriptionData: ({ subscriptionData }) => {
      if (subscriptionData.data) {
        const chunk = subscriptionData.data.chatStream;
        const content = chunk.choices[0]?.delta?.content;

        if (content) {
          setCurrentAssistantMessage((prev) => prev + content);
          setMessages((prev) => {
            const lastMsg = prev[prev.length - 1];
            if (lastMsg?.role === 'assistant') {
              return [
                ...prev.slice(0, -1),
                {
                  ...lastMsg,
                  content: lastMsg.content + content,
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
                },
              ];
            }
          });
        }

        if (chunk.choices[0]?.finish_reason === 'stop') {
          setLoadingSubmit(false);
          setCurrentAssistantMessage('');

          // Save final message state
          saveChatHistory({
            variables: {
              chatId: params.id,
              messages: messages.map((msg) => ({
                content: msg.content,
                role: msg.role,
                createdAt: msg.createdAt,
              })),
            },
          });
        }
      }
    },
    onError: (error) => {
      console.error('Subscription error:', error);
      toast.error('Connection error. Please try again.');
      setLoadingSubmit(false);
    },
  });

  // Save messages to local storage effect
  useEffect(() => {
    if (!isLoading && !error && messages.length > 0) {
      saveChatHistory({
        variables: {
          chatId: params.id,
          messages: messages.map((msg) => ({
            content: msg.content,
            role: msg.role,
            createdAt: msg.createdAt,
          })),
        },
      });
    }
  }, [messages, isLoading, error, params.id]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
  };

  const stop = () => {
    toast.info('Stopping message generation...');
    // Optional: Implement stop functionality through a mutation if needed
  };

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim()) return;

    setLoadingSubmit(true);

    const newMessage: Message = {
      id: params.id,
      role: 'user',
      content: input,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, newMessage]);
    setInput('');
    setCurrentAssistantMessage('');
  };

  return (
    <main className="flex h-[calc(100dvh)] flex-col items-center">
      <ChatLayout
        chatId={params.id}
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
    </main>
  );
}
