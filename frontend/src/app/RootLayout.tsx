'use client';

import React, { useEffect, useState } from 'react';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable';
import { cn } from '@/lib/utils';
import { usePathname } from 'next/navigation';
import { useChatList } from './hooks/useChatList';
import Sidebar from '@/components/sidebar';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const defaultLayout = [30, 160];
  const navCollapsedSize = 10;

  const pathname = usePathname();
  const currentChatId = pathname.split('/')[1] || '';

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
          document.cookie = `react-resizable-panels:layout=${JSON.stringify(sizes)}`;
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
            document.cookie = `react-resizable-panels:collapsed=${JSON.stringify(true)}`;
          }}
          onExpand={() => {
            setIsCollapsed(false);
            document.cookie = `react-resizable-panels:collapsed=${JSON.stringify(false)}`;
          }}
          className={cn(
            isCollapsed
              ? 'min-w-[50px] md:min-w-[70px] transition-all duration-300 ease-in-out'
              : 'hidden md:block'
          )}
        >
          <Sidebar
            isCollapsed={isCollapsed}
            isMobile={isMobile}
            currentChatId={currentChatId}
            chatListUpdated={chatListUpdated}
            setChatListUpdated={setChatListUpdated}
            chats={chats}
            loading={loading}
            error={error}
            onRefetch={refetchChats}
          />
        </ResizablePanel>
        <ResizableHandle className={cn('hidden md:flex')} withHandle />
        <ResizablePanel
          className="h-full w-full flex justify-center"
          defaultSize={defaultLayout[1]}
        >
          {children}
        </ResizablePanel>
      </ResizablePanelGroup>
    </main>
  );
}
