'use client';

import {
  SetStateAction,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { Message } from '@/components/types';
import { useModels } from '../hooks/useModels';
import ChatContent from '@/components/chat/chat';
import { useChatStream } from '../hooks/useChatStream';
import { GET_CHAT_HISTORY } from '@/graphql/request';
import { useQuery } from '@apollo/client';
import { toast } from 'sonner';
import { useChatList } from '../hooks/useChatList';
import { EventEnum } from '@/components/enum';
import DetailSettings from '@/components/detail-settings';
import EditUsernameForm from '@/components/edit-username-form';

export default function Home() {
  let urlParams = new URLSearchParams(window.location.search);
  const [chatId, setChatId] = useState('');
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

  const cleanChatId = () => {
    setChatId('');
  };
  const updateChatId = useCallback(() => {
    urlParams = new URLSearchParams(window.location.search);
    setChatId(urlParams.get('id') || '');
    refetchChats();
  }, []);
  const updateSetting = () => {
    setChatId(EventEnum.SETTING);
  };

  useEffect(() => {
    window.addEventListener(EventEnum.CHAT, updateChatId);
    window.addEventListener(EventEnum.NEW_CHAT, cleanChatId);
    window.addEventListener(EventEnum.SETTING, updateSetting);

    return () => {
      window.removeEventListener(EventEnum.CHAT, updateChatId);
      window.removeEventListener(EventEnum.NEW_CHAT, cleanChatId);
      window.removeEventListener(EventEnum.SETTING, updateSetting);
    };
  }, [updateChatId]);

  const { loadingSubmit, handleSubmit, handleInputChange, stop } =
    useChatStream({
      chatId,
      input,
      setInput,
      setMessages,
      selectedModel,
    });

  return (
    <>
      {chatId === EventEnum.SETTING.toString() ? (
        <EditUsernameForm />
      ) : (
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
      )}
    </>
  );
}
