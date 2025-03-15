'use client';
import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@/components/ui/resizable';
import { GET_CHAT_HISTORY } from '@/graphql/request';
import { useQuery } from '@apollo/client';
import { toast } from 'sonner';
import { EventEnum } from '@/const/EventEnum';
import UserSetting from '@/components/settings/settings';
import ChatContent from '@/components/chat/chat-panel';
import { useModels } from '@/hooks/useModels';
import { useChatList } from '@/hooks/useChatList';
import { useChat } from '@/hooks/useChat';
import { CodeEngine } from './code-engine/code-engine';
import { useProjectStatusMonitor } from '@/hooks/useProjectStatusMonitor';
import { Loader2 } from 'lucide-react';
import { useAuthContext } from '@/providers/AuthProvider';
import { useRouter } from 'next/navigation';

export default function Chat() {
  // Initialize state, refs, and custom hooks
  const { isAuthorized } = useAuthContext();
  const urlParams = new URLSearchParams(window.location.search);
  const [chatId, setChatId] = useState('');
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const formRef = useRef<HTMLFormElement>(null);
  const { models } = useModels();
  const [selectedModel, setSelectedModel] = useState(models[0] || 'gpt-4o');
  const { refetchChats } = useChatList();
  const route = useRouter();

  // Project status monitoring for the current chat
  const { isReady, projectId, projectName, error } =
    useProjectStatusMonitor(chatId);

  // Apollo query to fetch chat history
  useQuery(GET_CHAT_HISTORY, {
    variables: { chatId },
    skip: !isAuthorized || !chatId,
    onCompleted: (data) => {
      if (data?.getChatHistory) {
        setMessages(data.getChatHistory);
      }
    },
    onError: () => {
      toast.error('Failed to load chat history');
    },
  });

  // Custom hook for handling chat
  const { loading, handleSubmit, handleInputChange } = useChat({
    chatId,
    input,
    setInput,
    setMessages,
    selectedModel,
  });

  // Callback to clear the chat ID
  const cleanChatId = () => setChatId('');

  // Callback to update chat ID based on URL parameters and refresh the chat list
  const updateChatId = useCallback(() => {
    const params = new URLSearchParams(window.location.search);
    setChatId(params.get('id') || '');
    refetchChats();
  }, [refetchChats]);

  // Callback to switch to the settings view
  const updateSetting = () => setChatId(EventEnum.SETTING);
  const updateProject = () => setChatId(EventEnum.NEW_PROJECT);

  // Effect to initialize chat ID and refresh the chat list based on URL parameters
  useEffect(() => {
    setChatId(urlParams.get('id') || '');
    refetchChats();
  }, [urlParams, refetchChats]);

  // Effect to add and remove global event listeners
  useEffect(() => {
    window.addEventListener(EventEnum.CHAT, updateChatId);
    window.addEventListener(EventEnum.NEW_CHAT, cleanChatId);
    window.addEventListener(EventEnum.SETTING, updateSetting);
    window.addEventListener(EventEnum.NEW_PROJECT, updateProject);
    return () => {
      window.removeEventListener(EventEnum.CHAT, updateChatId);
      window.removeEventListener(EventEnum.NEW_PROJECT, updateProject);
      window.removeEventListener(EventEnum.NEW_CHAT, cleanChatId);
      window.removeEventListener(EventEnum.SETTING, updateSetting);
    };
  }, [updateChatId]);

  // Render the main layout
  return chatId ? (
    <ResizablePanelGroup
      direction="horizontal"
      className="h-full w-full"
      key="with-chat"
    >
      <ResizablePanel
        defaultSize={15}
        minSize={15}
        maxSize={80}
        className="h-full"
      >
        <ChatContent
          chatId={chatId}
          setSelectedModel={setSelectedModel}
          messages={messages}
          input={input}
          handleInputChange={handleInputChange}
          handleSubmit={handleSubmit}
          loadingSubmit={loading}
          formRef={formRef}
          setInput={setInput}
          setMessages={setMessages}
        />
      </ResizablePanel>
      <ResizableHandle withHandle className="hidden md:flex" />
      <ResizablePanel
        defaultSize={80}
        minSize={20}
        maxSize={80}
        className="h-full overflow-auto"
      >
        <div className="p-4 h-full">
          <CodeEngine
            chatId={chatId}
            isProjectReady={isReady}
            projectId={projectId}
          />
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  ) : (
    <div className="h-full w-full" key="without-chat">
      <ChatContent
        chatId={chatId}
        setSelectedModel={setSelectedModel}
        messages={messages}
        input={input}
        handleInputChange={handleInputChange}
        handleSubmit={handleSubmit}
        loadingSubmit={loading}
        formRef={formRef}
        setInput={setInput}
        setMessages={setMessages}
      />
    </div>
  );
}
