// app/page.tsx 或 components/Home.tsx
'use client';
import React, {
  createContext,
  useEffect,
  useState,
  useRef,
  useCallback,
} from 'react';
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
  const urlParams = new URLSearchParams(window.location.search);
  const [chatId, setChatId] = useState('');
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const formRef = useRef<HTMLFormElement>(null);

  const { models } = useModels();
  const [selectedModel, setSelectedModel] = useState(models[0] || 'gpt-4o');
  const { refetchChats } = useChatList();

  useEffect(() => {
    setChatId(urlParams.get('id') || '');
    refetchChats();
  }, [urlParams, refetchChats]);

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

  const cleanChatId = () => setChatId('');
  const updateChatId = useCallback(() => {
    const params = new URLSearchParams(window.location.search);
    setChatId(params.get('id') || '');
    refetchChats();
  }, [refetchChats]);
  const updateSetting = () => setChatId(EventEnum.SETTING);

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
  //TODO: adding project id from .codefox/projects
  const [projectId, setProjectId] = useState('');
  const [filePath, setFilePath] = useState('frontend/vite.config.ts');

  if (chatId === EventEnum.SETTING) {
    return (
      <div className="h-full w-full flex items-center justify-center ">
        <EditUsernameForm />
      </div>
    );
  }

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
        <h1>forget to input project id</h1>
      )}
    </ResizablePanelGroup>
  );
}
