import { useState, useCallback } from 'react';
import { useMutation, useSubscription } from '@apollo/client';
import { CHAT_STREAM, CREATE_CHAT, TRIGGER_CHAT } from '@/graphql/request';
import { Message } from '@/const/MessageType';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
enum StreamStatus {
  IDLE = 'IDLE',
  STREAMING = 'STREAMING',
  DONE = 'DONE',
}

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
  const [loadingSubmit, setLoadingSubmit] = useState(false);
  const [streamStatus, setStreamStatus] = useState<StreamStatus>(
    StreamStatus.IDLE
  );
  const [currentChatId, setCurrentChatId] = useState<string>(chatId);

  const [subscription, setSubscription] = useState<SubscriptionState>({
    enabled: false,
    variables: null,
  });

  const updateChatId = () => {
    setCurrentChatId('');
  };

  window.addEventListener('newchat', updateChatId);

  const [triggerChat] = useMutation(TRIGGER_CHAT, {
    onCompleted: () => {
      setStreamStatus(StreamStatus.STREAMING);
    },
    onError: () => {
      setStreamStatus(StreamStatus.IDLE);
      finishChatResponse();
    },
  });

  const [createChat] = useMutation(CREATE_CHAT, {
    onCompleted: async (data) => {
      const newChatId = data.createChat.id;
      setCurrentChatId(newChatId);
      await startChatStream(newChatId, input);
      window.history.pushState({}, '', `/chat?id=${newChatId}`);
      console.log(`new chat: ${newChatId}`);
    },
    onError: () => {
      toast.error('Failed to create chat');
      setStreamStatus(StreamStatus.IDLE);
      setLoadingSubmit(false);
    },
  });

  useSubscription(CHAT_STREAM, {
    skip: !subscription.enabled || !subscription.variables,
    variables: subscription.variables,
    onSubscriptionData: ({ subscriptionData }) => {
      const chatStream = subscriptionData?.data?.chatStream;
      if (!chatStream) return;

      if (streamStatus === StreamStatus.STREAMING && loadingSubmit) {
        setLoadingSubmit(false);
      }

      if (chatStream.status === StreamStatus.DONE) {
        setStreamStatus(StreamStatus.DONE);
        finishChatResponse();
        return;
      }

      const content = chatStream.choices?.[0]?.delta?.content;

      if (content) {
        setMessages((prev) => {
          const lastMsg = prev[prev.length - 1];
          if (lastMsg?.role === 'assistant') {
            return [
              ...prev.slice(0, -1),
              { ...lastMsg, content: lastMsg.content + content },
            ];
          } else {
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

      if (chatStream.choices?.[0]?.finishReason === 'stop') {
        setStreamStatus(StreamStatus.DONE);
        finishChatResponse();
      }
    },
    onError: (error) => {
      console.log(error);
      toast.error('Connection error. Please try again.');
      setStreamStatus(StreamStatus.IDLE);
      finishChatResponse();
    },
  });

  const startChatStream = async (targetChatId: string, message: string) => {
    try {
      const input: ChatInput = {
        chatId: targetChatId,
        message,
        model: selectedModel,
      };
      console.log(input);

      setInput('');
      setStreamStatus(StreamStatus.STREAMING);
      setSubscription({
        enabled: true,
        variables: { input },
      });

      await new Promise((resolve) => setTimeout(resolve, 100));
      await triggerChat({ variables: { input } });
    } catch (err) {
      toast.error('Failed to start chat');
      setStreamStatus(StreamStatus.IDLE);
      finishChatResponse();
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const content = input;

    if (!content.trim() || loadingSubmit) return;

    setLoadingSubmit(true);

    const messageId = currentChatId || 'temp-id';
    const newMessage: Message = {
      id: messageId,
      role: 'user',
      content: content,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, newMessage]);

    if (!currentChatId) {
      try {
        await createChat({
          variables: {
            input: {
              title: content.slice(0, 50),
            },
          },
        });
      } catch (error) {
        setLoadingSubmit(false);
        return;
      }
    } else {
      await startChatStream(currentChatId, content);
    }
  };

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

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setInput(e.target.value);
    },
    [setInput]
  );

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
    currentChatId,
  };
}
