'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { Message } from '@/components/types';
import { useModels } from '@/app/hooks/useModels';
import ChatContent from '@/components/chat/chat';
import { useChatStream } from '../../hooks/useChatStream';
import { useQuery } from '@apollo/client';
import { GET_CHAT_HISTORY } from '@/graphql/request';
import { toast } from 'sonner';

export default function ChatPage() {
  const params = useParams();
  const chatId = params.id as string;

  // Core message states
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const formRef = useRef<HTMLFormElement>(null);

  const { models } = useModels();
  const [selectedModel, setSelectedModel] = useState<string>(
    'gpt-4o' 
  );

  useQuery(GET_CHAT_HISTORY, {
    variables: { chatId: params.id },
    onCompleted: (data) => {
      if (data?.getChatHistory) {
        setMessages(data.getChatHistory);
      }
    },
    onError: (error) => {
      toast.error('Failed to load chat history');
    },
  });

  const { loadingSubmit, handleSubmit, handleInputChange, stop } =
    useChatStream({
      chatId,
      input,
      setInput,
      setMessages,
      selectedModel,
    });

  return (
    <ChatContent
      chatId={chatId}
      setSelectedModel={setSelectedModel}
      messages={messages}
      input={input}
      handleInputChange={handleInputChange}
      handleSubmit={handleSubmit}
      loadingSubmit={loadingSubmit}
      stop={stop}
      formRef={formRef}
      setInput={setInput}
      setMessages={setMessages}
    />
  );
}
