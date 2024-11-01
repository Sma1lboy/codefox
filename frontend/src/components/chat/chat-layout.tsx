'use client';
import React, { useEffect, useState, Dispatch, SetStateAction } from 'react';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable';
import { cn } from '@/lib/utils';
import { Sidebar } from '../sidebar';
import Chat from './chat';
import { Message } from '../types';

interface ChatLayoutProps {
  defaultLayout?: number[];
  defaultCollapsed?: boolean;
  navCollapsedSize: number;
  chatId: string;
  messages: Message[];
  input: string;
  handleInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  handleSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  loadingSubmit: boolean;
  stop: () => void;
  setSelectedModel: Dispatch<SetStateAction<string>>;
  formRef: React.RefObject<HTMLFormElement>;
  setMessages: Dispatch<SetStateAction<Message[]>>;
  setInput: Dispatch<SetStateAction<string>>;
  chatListUpdated: boolean;
  setChatListUpdated: React.Dispatch<React.SetStateAction<boolean>>;
}

export function ChatLayout({
  defaultLayout = [30, 160],
  defaultCollapsed = false,
  navCollapsedSize,
  messages,
  input,
  handleInputChange,
  handleSubmit,
  stop,
  chatId,
  setSelectedModel,
  loadingSubmit,
  formRef,
  setMessages,
  setInput,
  chatListUpdated,
  setChatListUpdated,
}: ChatLayoutProps) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkScreenWidth = () => {
      setIsMobile(window.innerWidth <= 1023);
    };
    checkScreenWidth();
    window.addEventListener('resize', checkScreenWidth);
    return () => {
      window.removeEventListener('resize', checkScreenWidth);
    };
  }, []);

  return (
    <ResizablePanelGroup
      direction="horizontal"
      onLayout={(sizes: number[]) => {
        document.cookie = `react-resizable-panels:layout=${JSON.stringify(
          sizes
        )}`;
      }}
      className="h-screen items-stretch"
    >
      <ResizablePanel
        defaultSize={defaultLayout[0]}
        collapsedSize={navCollapsedSize}
        collapsible={true}
        minSize={isMobile ? 0 : 12}
        maxSize={isMobile ? 0 : 16}
        onCollapse={() => {
          setIsCollapsed(true);
          document.cookie = `react-resizable-panels:collapsed=${JSON.stringify(
            true
          )}`;
        }}
        onExpand={() => {
          setIsCollapsed(false);
          document.cookie = `react-resizable-panels:collapsed=${JSON.stringify(
            false
          )}`;
        }}
        className={cn(
          isCollapsed
            ? 'min-w-[50px] md:min-w-[70px] transition-all duration-300 ease-in-out'
            : 'hidden md:block'
        )}
      >
        <Sidebar
          isCollapsed={isCollapsed || isMobile}
          isMobile={isMobile}
          chatListUpdated={chatListUpdated}
          setChatListUpdated={setChatListUpdated}
        />
      </ResizablePanel>
      <ResizableHandle className={cn('hidden md:flex')} withHandle />
      <ResizablePanel
        className="h-full w-full flex justify-center"
        defaultSize={defaultLayout[1]}
      >
        <Chat
          chatId={chatId}
          setSelectedModel={setSelectedModel}
          messages={messages}
          input={input}
          handleInputChange={handleInputChange}
          handleSubmit={handleSubmit}
          loadingSubmit={loadingSubmit}
          stop={stop}
          formRef={formRef}
          isMobile={isMobile}
          setInput={setInput}
          setMessages={setMessages}
        />
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
