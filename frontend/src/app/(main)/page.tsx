'use client';

import { useEffect, useRef, useState } from 'react';
import { Message } from '@/components/types';
import { useModels } from '../hooks/useModels';
import ChatContent from '@/components/chat/chat';
import { useChatStream } from '../hooks/useChatStream';
import { useParams } from 'next/navigation';
import { GET_CHAT_HISTORY } from '@/graphql/request';
import { useQuery } from '@apollo/client';
import { toast } from 'sonner';
import { useChatList } from '../hooks/useChatList';

export default function Home() {
  const urlParams = new URLSearchParams(window.location.search); // 读取查询参数
  const [chatId, setChatId] = useState(''); // 获取参数 'id'
  // Core message states
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const formRef = useRef<HTMLFormElement>(null);

  const { models } = useModels();
  const [selectedModel, setSelectedModel] = useState<string>(
    models[0] || 'gpt-4o'
  );

  const { refetchChats } = useChatList();

  useEffect(() => {
    setChatId(urlParams.get('id') || '');
    refetchChats();
    console.log(`update ${urlParams.get('id')}`);
  }, [urlParams]);

  useQuery(GET_CHAT_HISTORY, {
    variables: { chatId },
    onCompleted: (data) => {
      if (data?.getChatHistory) {
        setMessages(data.getChatHistory);
      }
    },
    onError: (error) => {
      toast.error('Failed to load chat history');
    },
  });

  const updateChatId = () => {
    setChatId('');
  };

  window.addEventListener('newchat', updateChatId);

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
