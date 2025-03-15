import { useState, useCallback } from 'react';
import { useMutation } from '@apollo/client';
import { CHAT, CREATE_CHAT } from '@/graphql/request';
import { Message } from '@/const/MessageType';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

interface ChatInput {
  chatId: string;
  message: string;
  model: string;
}

interface UseChatProps {
  chatId: string;
  input: string;
  setInput: (input: string) => void;
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  selectedModel: string;
}

export function useChat({
  chatId,
  input,
  setInput,
  setMessages,
  selectedModel,
}: UseChatProps) {
  const [loading, setLoading] = useState(false);
  const [currentChatId, setCurrentChatId] = useState<string>(chatId);

  const updateChatId = () => {
    setCurrentChatId('');
  };

  window.addEventListener('newchat', updateChatId);

  const [chat] = useMutation(CHAT, {
    onCompleted: (data) => {
      const response = data.chat;
      setMessages((prev) => [
        ...prev,
        {
          id: `${currentChatId}/${prev.length + 1}`,
          role: 'assistant',
          content: response,
          createdAt: new Date().toISOString(),
        },
      ]);
      setLoading(false);
    },
    onError: (error) => {
      toast.error('Failed to get response');
      setLoading(false);
    },
  });

  const [createChat] = useMutation(CREATE_CHAT, {
    onCompleted: async (data) => {
      const newChatId = data.createChat.id;
      setCurrentChatId(newChatId);
      await sendMessage(newChatId, input);
      window.history.pushState({}, '', `/chat?id=${newChatId}`);
      console.log(`new chat: ${newChatId}`);
    },
    onError: () => {
      toast.error('Failed to create chat');
      setLoading(false);
    },
  });

  const sendMessage = async (targetChatId: string, message: string) => {
    try {
      setInput('');
      await chat({
        variables: {
          input: {
            chatId: targetChatId,
            message,
            model: selectedModel,
          },
        },
      });
    } catch (err) {
      toast.error('Failed to send message');
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const content = input;

    if (!content.trim() || loading) return;

    setLoading(true);

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
        setLoading(false);
        return;
      }
    } else {
      await sendMessage(currentChatId, content);
    }
  };

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setInput(e.target.value);
    },
    [setInput]
  );

  return {
    loading,
    handleSubmit,
    handleInputChange,
    currentChatId,
  };
}
