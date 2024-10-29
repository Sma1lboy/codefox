'use client';

import React, { useRef, useState } from 'react';
import { useMutation, useQuery, useSubscription } from '@apollo/client';
import { toast } from 'sonner';
import { ChatLayout } from '@/components/chat/chat-layout';
import { Message } from '@/components/types';
import { useModels } from '../hooks/useModels';
import useChatStore from '../hooks/useChatStore';
import { CHAT_STREAM_SUBSCRIPTION, GET_CHAT_HISTORY } from '@/graphql/request';

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
      toast.error('Failed to load chat history');
    },
  });

  // Chat subscription
  const { data: streamData } = useSubscription(CHAT_STREAM_SUBSCRIPTION, {
    variables: {
      input: {
        message: input,
        chatId: params.id,
        model: selectedModel,
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

  const stop = () => {
    setLoadingSubmit(false);
    setCurrentAssistantMessage('');
    toast.info('Stopping message generation...');
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
