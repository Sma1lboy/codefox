
// app/page.tsx or components/Home.tsx
'use client';
import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@/components/ui/resizable';
import { CodeEngine } from '@/components/code-engine/code-engine';
import { GET_CHAT_HISTORY } from '@/graphql/request';
import { useQuery } from '@apollo/client';
import { toast } from 'sonner';
import { EventEnum } from '@/components/enum';
import { useModels } from '../hooks/useModels';
import { useChatList } from '../hooks/useChatList';
import { useChatStream } from '../hooks/useChatStream';
import EditUsernameForm from '@/components/edit-username-form';
import ChatContent from '@/components/chat/chat';
import { ProjectContext } from '@/components/code-engine/project-context';

export default function Home() {
  // Initialize state, refs, and custom hooks
  const urlParams = new URLSearchParams(window.location.search);
  const [chatId, setChatId] = useState('');
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const formRef = useRef<HTMLFormElement>(null);

  const { models } = useModels();
  const [selectedModel, setSelectedModel] = useState(models[0] || 'gpt-4o');

  const { refetchChats } = useChatList();

  //TODO: adding project id from .codefox/projects
  const [projectId, setProjectId] = useState(
    '2025-02-02-dfca4698-6e9b-4aab-9fcb-98e9526e5f21'
  );
  const [filePath, setFilePath] = useState('frontend/vite.config.ts');

  // Apollo query to fetch chat history
  useQuery(GET_CHAT_HISTORY, {
    variables: { chatId },
    onCompleted: (data) => {
      if (data?.getChatHistory) {
        setMessages(data.getChatHistory);
      }
    },
    onError: () => {
      toast.error('Failed to load chat history');
    },
  });

  // Custom hook for handling chat streaming
  const { loadingSubmit, handleSubmit, handleInputChange, stop } =
    useChatStream({
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
    return () => {
      window.removeEventListener(EventEnum.CHAT, updateChatId);
      window.removeEventListener(EventEnum.NEW_CHAT, cleanChatId);
      window.removeEventListener(EventEnum.SETTING, updateSetting);
    };
  }, [updateChatId]);

  // Render the settings view if chatId indicates settings mode
  if (chatId === EventEnum.SETTING) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <EditUsernameForm />
      </div>
    );
  }
  // Render the main layout
  return (
    <ResizablePanelGroup direction="horizontal" className="h-full w-full">
      <ResizablePanel
        defaultSize={50}
        minSize={20}
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
          loadingSubmit={loadingSubmit}
          stop={stop}
          formRef={formRef}
          setInput={setInput}
          setMessages={setMessages}
        />
      </ResizablePanel>

      <ResizableHandle withHandle className="hidden md:flex" />

      {projectId ? (
        <ResizablePanel
          defaultSize={50}
          minSize={20}
          maxSize={80}
          className="h-full overflow-auto"
        >
          <ProjectContext.Provider
            value={{ projectId, setProjectId, filePath, setFilePath }}
          >
            <CodeEngine />
          </ProjectContext.Provider>
        </ResizablePanel>
      ) : (
        <h1>Forgot to input project id</h1>
      )}
    </ResizablePanelGroup>
  );
}
