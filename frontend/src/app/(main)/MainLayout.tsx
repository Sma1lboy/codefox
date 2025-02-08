// components/MainLayout.tsx
'use client';
import React, { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable';
import { SidebarProvider } from '@/components/ui/sidebar';
import { ChatSideBar } from '@/components/sidebar';
import { useChatList } from '../hooks/useChatList';
import ProjectModal from '@/components/project-modal';
import { GET_USER_PROJECTS } from '@/utils/requests';
import { useQuery } from '@apollo/client';
import {
  ProjectContext,
  ProjectProvider,
} from '@/components/code-engine/project-context';

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const defaultLayout = [25, 75]; // [sidebar, main]
  const { data, refetch } = useQuery(GET_USER_PROJECTS);
  const navCollapsedSize = 5;

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
    const checkScreenWidth = () => {
      setIsMobile(window.innerWidth <= 1023);
    };
    checkScreenWidth();
    window.addEventListener('resize', checkScreenWidth);
    return () => window.removeEventListener('resize', checkScreenWidth);
  }, []);

  return (
    <main className="flex h-[calc(100dvh)] flex-col items-center">
      <ResizablePanelGroup
        direction="horizontal"
        autoSaveId="main-layout"
        onLayout={(sizes: number[]) => {
          const sidebarSize = sizes[0];
          const isNowCollapsed = sidebarSize < 10;
          setIsCollapsed(isNowCollapsed);

          if (isNowCollapsed && sizes.length > 1) {
            const newSizes = [navCollapsedSize, 100 - navCollapsedSize];
            document.cookie = `react-resizable-panels:layout=${JSON.stringify(newSizes)}; path=/; max-age=604800`;
            return newSizes;
          }

          document.cookie = `react-resizable-panels:layout=${JSON.stringify(sizes)}; path=/; max-age=604800`;
          return sizes;
        }}
        className="h-screen items-stretch w-full"
      >
        <ProjectProvider>
          <SidebarProvider>
            <ProjectModal
              isOpen={isModalOpen}
              onClose={() => setIsModalOpen(false)}
              refetchProjects={refetch}
            ></ProjectModal>
            <ChatSideBar
              setIsModalOpen={setIsModalOpen}
              isCollapsed={isCollapsed}
              setIsCollapsed={setIsCollapsed}
              isMobile={isMobile}
              chatListUpdated={chatListUpdated}
              setChatListUpdated={setChatListUpdated}
              chats={chats}
              loading={loading}
              error={error}
              onRefetch={refetchChats}
            />

            <ResizablePanel
              className="h-full w-full flex justify-center"
              defaultSize={defaultLayout[1]}
            >
              {children}
            </ResizablePanel>
          </SidebarProvider>
        </ProjectProvider>
      </ResizablePanelGroup>
    </main>
  );
}
