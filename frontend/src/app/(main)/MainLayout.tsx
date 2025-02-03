'use client';

import React, { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { useChatList } from '../hooks/useChatList';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable';
import ChatSiderBar from '@/components/sidebar';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { CodeDisplayer } from '@/components/code-display';
import { Project } from '@/graphql/type';
import FileStructure from '@/components/file-structure';
import { ProjectProvider } from '../context/projectContext';
import FileSidebar from '@/components/file-structure';

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const projectId = '2025-01-31-f9b3465a-1bd0-4a56-b042-46864953d870';
  const defaultLayout = [30, 160];
  const navCollapsedSize = 10;
  const {
    chats,
    loading,
    error,
    chatListUpdated,
    setChatListUpdated,
    refetchChats,
  } = useChatList();

  useEffect(() => {
    document.cookie = `react-resizable-panels:collapsed=${JSON.stringify(isCollapsed)}; path=/; max-age=604800`;
  }, [isCollapsed]);

  useEffect(() => {
    async function fetchFiles() {
      const response = await fetch(`/api/project?id=${projectId}`);
      const data = await response.json();
      if (data.files) {
        setProjectFiles(data.files);
      }
    }

    fetchFiles();
  }, [projectId]);

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

  console.log(`${isCollapsed}, ${isMobile}`);

  return (
    <main className="flex h-[calc(100dvh)] flex-col items-center">
      <ResizablePanelGroup
        direction="horizontal"
        data-panel-group-direction="horizontal"
        onLayout={(sizes: number[]) => {
          document.cookie = `react-resizable-panels:layout=${JSON.stringify(
            sizes
          )}; path=/; max-age=604800`;
        }}
        className="h-screen items-stretch"
      >
        <SidebarProvider>
          <ResizablePanel
            defaultSize={defaultLayout[0]}
            collapsedSize={navCollapsedSize}
            collapsible={true}
            minSize={isMobile ? 4 : 12}
            maxSize={isMobile ? 10 : 16}
            onCollapse={() => {
              console.log(`setting collapse to T`);
              // setIsCollapsed(true);
            }}
            onExpand={() => {
              console.log(`setting collapse to F`);
              // setIsCollapsed(false);
            }}
            className={cn(
              'transition-all duration-300 ease-in-out',
              isCollapsed ? 'min-w-[50px] md:min-w-[70px]' : 'md:min-w-[20%]'
            )}
          >
            {loading ? (
              <div className="flex justify-center items-center">Loading...</div>
            ) : error ? (
              <div className="flex justify-center items-center text-red-500">
                Error: {error.message}
              </div>
            ) : (
              <ChatSiderBar
                isCollapsed={isCollapsed}
                isMobile={isMobile}
                chatListUpdated={chatListUpdated}
                setChatListUpdated={setChatListUpdated}
                chats={chats}
                loading={loading}
                error={error}
                onRefetch={refetchChats}
              />
            )}
          </ResizablePanel>

          <ResizablePanel
            className="h-full w-full flex justify-center"
            defaultSize={160}
          >
            {children}
          </ResizablePanel>
          <ResizableHandle className={cn('hidden md:flex')} withHandle />
          <ResizablePanel
            className="h-full w-full flex justify-center"
            defaultSize={defaultLayout[1]}
          >
            <ProjectProvider>
              <CodeDisplayer />
            </ProjectProvider>
          </ResizablePanel>
        </SidebarProvider>
      </ResizablePanelGroup>
    </main>
  );
}
function setProjectFiles(files: any) {
  throw new Error('Function not implemented.');
}
