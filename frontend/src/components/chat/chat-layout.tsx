'use client';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { SidebarProvider } from '@/components/ui/sidebar';
import { ChatSideBar } from '@/components/sidebar';

import ProjectModal from '@/components/chat/project-modal';
import { useQuery } from '@apollo/client';
import { useChatList } from '@/hooks/useChatList';
import { GET_USER_PROJECTS } from '@/graphql/request';
import { useAuthContext } from '@/providers/AuthProvider';
import { ProjectProvider } from './code-engine/project-context';

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthorized, isChecking } = useAuthContext();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const defaultLayout = [25, 75]; // [sidebar, main]
  const navCollapsedSize = 5;

  const { refetch } = useQuery(GET_USER_PROJECTS);
  const {
    chats,
    loading,
    error,
    chatListUpdated,
    setChatListUpdated,
    refetchChats,
  } = useChatList();

  const router = useRouter();

  useEffect(() => {
    if (isChecking || !isAuthorized) {
      router.push('/');
    }
  }, [isChecking, isAuthorized, router]);

  useEffect(() => {
    document.cookie = `react-resizable-panels:collapsed=${JSON.stringify(
      isCollapsed
    )}; path=/; max-age=604800`;
  }, [isCollapsed]);

  useEffect(() => {
    const checkScreenWidth = () => {
      setIsMobile(window.innerWidth <= 1023);
    };
    checkScreenWidth();
    window.addEventListener('resize', checkScreenWidth);
    return () => window.removeEventListener('resize', checkScreenWidth);
  }, []);

  if (isChecking) {
    return (
      <div className="flex h-screen items-center justify-center">
        Loading...
      </div>
    );
  }

  if (!isAuthorized) {
    return null;
  }

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
            document.cookie = `react-resizable-panels:layout=${JSON.stringify(
              newSizes
            )}; path=/; max-age=604800`;
            return newSizes;
          }

          document.cookie = `react-resizable-panels:layout=${JSON.stringify(
            sizes
          )}; path=/; max-age=604800`;
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
            />
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
