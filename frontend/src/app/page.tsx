'use client';

import { useRef, useState } from 'react';
import { Message } from '@/components/types';
import { useModels } from './hooks/useModels';
import ChatContent from '@/components/chat/chat';
import { useChatStream } from './hooks/useChatStream';

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const formRef = useRef<HTMLFormElement>(null);

  const { selectedModel, setSelectedModel } = useModels();

  const { loadingSubmit, handleSubmit, handleInputChange, stop, isStreaming } =
    useChatStream({
      chatId: '',
      input,
      setInput,
      setMessages,
      selectedModel,
    });

  return (
    <ChatContent
      chatId=""
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
