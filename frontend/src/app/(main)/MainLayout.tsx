'use client';

import React, { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { usePathname } from 'next/navigation';
import { useChatList } from '../hooks/useChatList';
import { ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import CustomSidebar from '@/components/sidebar';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
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
    <main className="flex h-[calc(100dvh)] flex-col items-center">
      <ResizablePanelGroup
        direction="horizontal"
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
              setIsCollapsed(true);
              document.cookie = `react-resizable-panels:collapsed=${JSON.stringify(true)};`;
            }}
            onExpand={() => {
              setIsCollapsed(false);
              document.cookie = `react-resizable-panels:collapsed=${JSON.stringify(false)};`;
            }}
            className={cn(
              isCollapsed
                ? 'min-w-[50px] md:min-w-[70px] transition-all duration-300 ease-in-out'
                : 'md:min-w-[200px] transition-all duration-300 ease-in-out'
            )}
          >
            {loading ? (
              <div className="flex justify-center items-center">Loading...</div>
            ) : error ? (
              <div className="flex justify-center items-center text-red-500">
                Error: {error.message}
              </div>
            ) : (
              <CustomSidebar
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
            defaultSize={defaultLayout[1]}
          >
            {children}
          </ResizablePanel>
        </SidebarProvider>
      </ResizablePanelGroup>
    </main>
  );
}
