'use client';
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { SidebarProvider } from '@/components/ui/sidebar';
import ChatSideBar from '@/components/sidebar';
import { ProjectProvider } from '@/components/chat/code-engine/project-context';
import { useChatList } from '@/hooks/useChatList';
import NavLayout from './nav-layout';
import { useAuthContext } from '@/providers/AuthProvider';

interface RootLayoutProps {
  children: React.ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  const { isAuthorized } = useAuthContext();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);

  const {
    chats,
    loading,
    error,
    chatListUpdated,
    setChatListUpdated,
    refetchChats,
  } = useChatList();

  useEffect(() => {
    setShowSidebar(isAuthorized);
  }, [isAuthorized]);

  return (
    <SidebarProvider>
      <div className="min-h-screen flex">
        {showSidebar && (
          <motion.div
            initial={{ x: isCollapsed ? -80 : -250, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: isCollapsed ? -80 : -250, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 80, damping: 20 }}
            className="fixed left-0 top-0 h-full z-50"
            style={{ width: isCollapsed ? '80px' : '250px' }}
          >
            <ProjectProvider>
              <ChatSideBar
                setIsModalOpen={() => {}}
                isCollapsed={isCollapsed}
                setIsCollapsed={setIsCollapsed}
                isMobile={false}
                currentChatId={''}
                chatListUpdated={chatListUpdated}
                setChatListUpdated={setChatListUpdated}
                chats={chats}
                loading={loading}
                error={error}
                onRefetch={refetchChats}
              />
            </ProjectProvider>
          </motion.div>
        )}

        <div
          className="transition-all duration-300 flex justify-center w-full"
          style={{
            marginLeft: showSidebar ? (isCollapsed ? '80px' : '250px') : '0px',
          }}
        >
          <div className="w-full"> {children}</div>
        </div>
      </div>
    </SidebarProvider>
  );
}
