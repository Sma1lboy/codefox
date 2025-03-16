import { useState, useCallback, useEffect } from 'react';
import { useMutation } from '@apollo/client';
import { CREATE_CHAT } from '@/graphql/request';
import { Message } from '@/const/MessageType';
import { toast } from 'sonner';
import { logger } from '@/app/log/logger';
import { startChatStream } from '@/utils/chatStream';

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
  const [currentChatId, setCurrentChatId] = useState<string>(chatId);

  // Use useEffect to handle new chat event and cleanup
  useEffect(() => {
    const updateChatId = () => {
      setCurrentChatId('');
      setMessages([]); // Clear messages for new chat
    };

    // Only add event listener when we want to create a new chat
    if (!chatId) {
      window.addEventListener('newchat', updateChatId);
    }

    // Cleanup
    return () => {
      window.removeEventListener('newchat', updateChatId);
    };
  }, [chatId, setMessages]);

  // Update currentChatId when chatId prop changes
  useEffect(() => {
    setCurrentChatId(chatId);
  }, [chatId]);

  const [createChat] = useMutation(CREATE_CHAT, {
    onCompleted: async (data) => {
      const newChatId = data.createChat.id;
      setCurrentChatId(newChatId);
      await handleChatResponse(newChatId, input);
      window.history.pushState({}, '', `/chat?id=${newChatId}`);
      logger.info(`new chat: ${newChatId}`);
    },
    onError: () => {
      toast.error('Failed to create chat');
      setLoadingSubmit(false);
    },
  });

  const handleChatResponse = async (targetChatId: string, message: string) => {
    try {
      setInput('');
      const response = await startChatStream(
        targetChatId,
        message,
        selectedModel
      );

      setMessages((prev) => [
        ...prev,
        {
          id: `${targetChatId}/${prev.length}`,
          role: 'assistant',
          content: response,
          createdAt: new Date().toISOString(),
        },
      ]);

      setLoadingSubmit(false);
    } catch (err) {
      toast.error('Failed to get chat response');
      setLoadingSubmit(false);
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
      await handleChatResponse(currentChatId, content);
    }
  };

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setInput(e.target.value);
    },
    [setInput]
  );

  const stop = useCallback(() => {
    if (loadingSubmit) {
      setLoadingSubmit(false);
      toast.info('Message generation stopped');
    }
  }, [loadingSubmit]);

  return {
    loadingSubmit,
    handleSubmit,
    handleInputChange,
    stop,
    isStreaming: loadingSubmit,
    currentChatId,
  };
}
