import { useState, useCallback } from 'react';
import { useMutation, useSubscription } from '@apollo/client';
import { CHAT_STREAM, CREATE_CHAT, TRIGGER_CHAT } from '@/graphql/request';
import { Message } from '@/components/types';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

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

interface UseChatStreamProps {
  chatId: string;
  input: string;
  setInput: (input: string) => void;
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  selectedModel: string;
}

export function useChatStream({
  chatId,
  input,
  setInput,
  setMessages,
  selectedModel,
}: UseChatStreamProps) {
  const router = useRouter();
  const [loadingSubmit, setLoadingSubmit] = useState(false);
  const [streamStatus, setStreamStatus] = useState<StreamStatus>(
    StreamStatus.IDLE
  );

  // Subscription state management
  const [subscription, setSubscription] = useState<SubscriptionState>({
    enabled: false,
    variables: null,
  });

  // Initialize trigger chat mutation
  const [triggerChat] = useMutation(TRIGGER_CHAT, {
    onCompleted: () => {
      setStreamStatus(StreamStatus.STREAMING);
    },
    onError: () => {
      setStreamStatus(StreamStatus.IDLE);
      finishChatResponse();
    },
  });

  // Create new chat session mutation
  const [createChat] = useMutation(CREATE_CHAT, {
    onCompleted: async (data) => {
      const newChatId = data.createChat.id;
      router.push(`/${newChatId}`);
      await startChatStream(newChatId, input);
    },
    onError: () => {
      toast.error('Failed to create chat');
      setStreamStatus(StreamStatus.IDLE);
      setLoadingSubmit(false);
    },
  });

  // Subscribe to chat stream
  useSubscription(CHAT_STREAM, {
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

  // Reset states after response completion
  const finishChatResponse = useCallback(() => {
    setLoadingSubmit(false);
    setSubscription({
      enabled: false,
      variables: null,
    });
    if (streamStatus === StreamStatus.DONE) {
      setStreamStatus(StreamStatus.IDLE);
    }
  }, [streamStatus]);

  // Handle input change
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setInput(e.target.value);
    },
    [setInput]
  );

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
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
  const stop = useCallback(() => {
    if (streamStatus === StreamStatus.STREAMING) {
      setSubscription({
        enabled: false,
        variables: null,
      });
      setStreamStatus(StreamStatus.IDLE);
      setLoadingSubmit(false);
      toast.info('Message generation stopped');
    }
  }, [streamStatus]);

  return {
    loadingSubmit,
    handleSubmit,
    handleInputChange,
    stop,
    isStreaming: streamStatus === StreamStatus.STREAMING,
  };
}
