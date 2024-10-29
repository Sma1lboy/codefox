'use client';

import { ChatLayout } from '@/components/chat/chat-layout';
import { Message } from '@/components/types';
import { CHAT_STREAM_SUBSCRIPTION, GET_CHAT_HISTORY } from '@/graphql/request';
import { useQuery, useSubscription } from '@apollo/client';
import React, { useRef, useState } from 'react';
import { toast } from 'sonner';
import useChatStore from '../hooks/useChatStore';
import { useModels } from '../hooks/useModels';

// Define stream states for chat flow
enum StreamStatus {
  IDLE = 'IDLE',
  STREAMING = 'STREAMING',
  DONE = 'DONE',
}

interface PageProps {
  params: {
    id: string;
  };
}

export default function Page({ params }: PageProps) {
  // Core message states
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const formRef = useRef<HTMLFormElement>(null);

  // Loading and stream control states
  const [loadingSubmit, setLoadingSubmit] = useState(false);
  const [streamStatus, setStreamStatus] = useState<StreamStatus>(
    StreamStatus.IDLE
  );

  // Model selection state
  const { models } = useModels();
  const [selectedModel, setSelectedModel] = useState<string>(
    models[0] || 'Loading models'
  );

  // Image handling from global store
  const setBase64Images = useChatStore((state) => state.setBase64Images);

  // Load chat history
  const { data: historyData } = useQuery(GET_CHAT_HISTORY, {
    variables: { chatId: params.id },
    onCompleted: (data) => {
      if (data?.getChatHistory) {
        setMessages(data.getChatHistory);
        setStreamStatus(StreamStatus.IDLE);
      }
    },
    onError: (error) => {
      console.error('Error loading chat history:', error);
      toast.error('Failed to load chat history');
      setStreamStatus(StreamStatus.IDLE);
    },
  });

  // Subscribe to chat stream
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
      if (!subscriptionData.data) return;

      const chunk = subscriptionData.data.chatStream;
      const content = chunk.choices[0]?.delta?.content;

      // Handle first data arrival
      if (streamStatus !== StreamStatus.STREAMING) {
        setStreamStatus(StreamStatus.STREAMING);
        setLoadingSubmit(false);
      }

      // Update message content
      if (content) {
        setMessages((prev) => {
          const lastMsg = prev[prev.length - 1];
          if (lastMsg?.role === 'assistant') {
            // Append to existing assistant message
            return [
              ...prev.slice(0, -1),
              {
                ...lastMsg,
                content: lastMsg.content + content,
              },
            ];
          } else {
            // Create new assistant message
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

      // Handle stream completion
      if (chunk.choices[0]?.finish_reason === 'stop') {
        setStreamStatus(StreamStatus.DONE);
        setLoadingSubmit(false);
        setBase64Images(null);
      }
    },
    onError: (error) => {
      console.error('Subscription error:', error);
      toast.error('Connection error. Please try again.');
      setStreamStatus(StreamStatus.IDLE);
      setLoadingSubmit(false);
    },
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
  };

  // Stop message generation
  const stop = () => {
    if (streamStatus === StreamStatus.STREAMING) {
      setStreamStatus(StreamStatus.IDLE);
      setLoadingSubmit(false);
      toast.info('Stopping message generation...');
    }
  };

  // Handle message submission
  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim() || loadingSubmit) return;

    setLoadingSubmit(true);

    // Add user message immediately
    const newMessage: Message = {
      id: params.id,
      role: 'user',
      content: input,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, newMessage]);
    setInput('');
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
        loadingSubmit={loadingSubmit}
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
