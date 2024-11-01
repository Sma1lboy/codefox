'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useMutation, useSubscription, gql } from '@apollo/client';
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
import { Message } from '@/components/types';
import { useModels } from './hooks/useModels';
import { CHAT_STREAM, CREATE_CHAT, TRIGGER_CHAT } from '@/graphql/request';

// Define stream states to manage chat flow
enum StreamStatus {
  IDLE = 'IDLE',
  STREAMING = 'STREAMING',
  DONE = 'DONE',
}

// GraphQL input types
interface ChatInput {
  chatId: string;
  message: string;
  model: string;
}

interface SubscriptionState {
  enabled: boolean;
  variables: {
    input: ChatInput;
  } | null;
}

export default function HomeContent() {
  // Core message states
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const formRef = useRef<HTMLFormElement>(null);

  // Loading and stream control states
  const [loadingSubmit, setLoadingSubmit] = useState(false);
  const [streamStatus, setStreamStatus] = useState<StreamStatus>(
    StreamStatus.IDLE
  );

  // Chat session states
  const [chatId, setChatId] = useState<string>('');
  const { models } = useModels();
  const [selectedModel, setSelectedModel] = useState<string>(
    models[0] || 'Loading models'
  );
  const [chatListUpdated, setChatListUpdated] = useState(false);

  // Welcome dialog state
  const [open, setOpen] = useState(false);

  // Subscription state management
  const [subscription, setSubscription] = useState<SubscriptionState>({
    enabled: false,
    variables: null,
  });

  const [triggerChat] = useMutation(TRIGGER_CHAT, {
    onCompleted: () => {
      setStreamStatus(StreamStatus.STREAMING);
    },
    onError: () => {
      setStreamStatus(StreamStatus.IDLE);
      finishChatResponse();
    },
  });

  // Subscribe to chat stream
  const { error: subError } = useSubscription(CHAT_STREAM, {
    skip: !subscription.enabled || !subscription.variables,
    variables: subscription.variables,
    onSubscriptionData: ({ subscriptionData }) => {
      const chatStream = subscriptionData?.data?.chatStream;
      if (!chatStream) return;

      // Set loading state to false when first data arrives
      if (streamStatus === StreamStatus.STREAMING && loadingSubmit) {
        setLoadingSubmit(false);
      }

      // Handle stream completion
      if (chatStream.status === StreamStatus.DONE) {
        setStreamStatus(StreamStatus.DONE);
        finishChatResponse();
        return;
      }

      const content = chatStream.choices?.[0]?.delta?.content;

      // Update message content
      if (content) {
        setMessages((prev) => {
          const lastMsg = prev[prev.length - 1];
          if (lastMsg?.role === 'assistant') {
            // Append content to existing assistant message
            return [
              ...prev.slice(0, -1),
              { ...lastMsg, content: lastMsg.content + content },
            ];
          } else {
            // Create new assistant message
            return [
              ...prev,
              {
                id: chatStream.id,
                role: 'assistant',
                content,
                createdAt: new Date(chatStream.created * 1000).toISOString(),
              },
            ];
          }
        });
      }

      // Handle message completion
      if (chatStream.choices?.[0]?.finishReason === 'stop') {
        setStreamStatus(StreamStatus.DONE);
        finishChatResponse();
      }
    },
    onError: (error) => {
      toast.error('Connection error. Please try again.');
      setStreamStatus(StreamStatus.IDLE);
      finishChatResponse();
    },
  });

  // Initialize chat stream
  const startChatStream = async (currentChatId: string, message: string) => {
    try {
      const input: ChatInput = {
        chatId: currentChatId,
        message,
        model: selectedModel,
      };

      setStreamStatus(StreamStatus.STREAMING);
      setSubscription({
        enabled: true,
        variables: { input },
      });

      // Ensure subscription is set up before triggering
      await new Promise((resolve) => setTimeout(resolve, 100));
      await triggerChat({ variables: { input } });
    } catch (err) {
      toast.error('Failed to start chat');
      setStreamStatus(StreamStatus.IDLE);
      finishChatResponse();
    }
  };

  // Create new chat session
  const [createChat] = useMutation(CREATE_CHAT, {
    onCompleted: async (data) => {
      const newChatId = data.createChat.id;
      setChatId(newChatId);
      setChatListUpdated(true);
      await startChatStream(newChatId, input);
    },
    onError: () => {
      toast.error('Failed to create chat');
      setStreamStatus(StreamStatus.IDLE);
      setLoadingSubmit(false);
    },
  });

  // Reset states after response completion
  const finishChatResponse = () => {
    setLoadingSubmit(false);
    setSubscription({
      enabled: false,
      variables: null,
    });
    if (streamStatus === StreamStatus.DONE) {
      setStreamStatus(StreamStatus.IDLE);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
  };

  // Handle message submission
  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim() || loadingSubmit) return;

    setLoadingSubmit(true);

    // Add user message immediately
    const newMessage: Message = {
      id: chatId || 'temp-id',
      role: 'user',
      content: input,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, newMessage]);

    // Handle new or existing chat
    if (!chatId) {
      try {
        await createChat({
          variables: {
            input: {
              title: input.slice(0, 50),
            },
          },
        });
      } catch (error) {
        setLoadingSubmit(false);
        return;
      }
    } else {
      await startChatStream(chatId, input);
    }

    setInput('');
  };

  // Stop message generation
  const stop = () => {
    if (streamStatus === StreamStatus.STREAMING) {
      setSubscription({
        enabled: false,
        variables: null,
      });
      setStreamStatus(StreamStatus.IDLE);
      setLoadingSubmit(false);
      toast.info('Message generation stopped');
    }
  };

  // Handle welcome dialog
  const onOpenChange = (isOpen: boolean) => {
    const username = localStorage.getItem('ollama_user');
    if (username) return setOpen(isOpen);

    localStorage.setItem('ollama_user', 'Anonymous');
    window.dispatchEvent(new Event('storage'));
    setOpen(isOpen);
  };

  // Monitor subscription errors
  useEffect(() => {
    if (subError) {
      console.error('Subscription error:', subError);
    }
  }, [subError]);

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
          loadingSubmit={loadingSubmit}
          stop={stop}
          navCollapsedSize={10}
          defaultLayout={[30, 160]}
          formRef={formRef}
          setMessages={setMessages}
          setInput={setInput}
          chatListUpdated={chatListUpdated} // Pass to ChatLayout
          setChatListUpdated={setChatListUpdated} // Pass to ChatLayout
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
