'use client';

import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { memo, useCallback, useContext, useState } from 'react';
import SidebarSkeleton from './sidebar-skeleton';
import UserSettings from './user-settings';
import { SideBarItem } from './sidebar-item';
import { Chat } from '@/graphql/type';
import { EventEnum } from '../const/EventEnum';
import { useRouter } from 'next/navigation';

import {
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarTrigger,
  Sidebar,
  SidebarRail,
  SidebarFooter,
  useSidebar,
} from './ui/sidebar';
import { ProjectContext } from './chat/code-engine/project-context';
import { useChatList } from '@/hooks/useChatList';
import { motion } from 'framer-motion';

interface SidebarProps {
  setIsModalOpen: (value: boolean) => void;
  isCollapsed: boolean;
  setIsCollapsed: (value: boolean) => void;
  isMobile: boolean;
  currentChatId?: string;
  chatListUpdated: boolean;
  setChatListUpdated: (value: boolean) => void;
  chats: Chat[];
  loading: boolean;
  error: any;
  onRefetch: () => void;
}

export function ChatSideBar({
  setIsModalOpen,
  isCollapsed,
  setIsCollapsed,
  chats,
  loading,
  error,
  onRefetch,
}: SidebarProps) {
  const router = useRouter();
  const [currentChatid, setCurrentChatid] = useState('');
  const { setCurProject, pollChatProject } = useContext(ProjectContext);

  const handleNewChat = useCallback(() => {
    window.history.replaceState({}, '', '/');
    setCurrentChatid('');
    const event = new Event(EventEnum.NEW_CHAT);
    window.dispatchEvent(event);
  }, []);
  if (loading) return <SidebarSkeleton />;
  if (error) {
    console.error('Error loading chats:', error);
    return null;
  }

  return (
    <div
      data-collapsed={isCollapsed}
      className="relative flex flex-col h-full justify-between group lg:bg-accent/0 lg:dark:bg-card/0"
    >
      <Sidebar collapsible="icon" side="left">
        {/* Header Row: Fox Logo (clickable) on the left, SidebarTrigger on the right */}
        <div
          className={`flex items-center ${isCollapsed ? 'justify-center w-full px-0' : 'justify-between px-3'} pt-3`}
        >
          {!isCollapsed && (
            <div className="flex flex-1 items-center justify-between">
              <Button
                onClick={() => router.push('/')}
                variant="ghost"
                className="inline-flex items-center gap-2 pl-0 
          rounded-md  ease-in-out"
              >
                <Image
                  src="/codefox.svg"
                  alt="CodeFox Logo"
                  width={40}
                  height={40}
                  className="dark:invert"
                />
                <span className="text-primary-500 font-semibold text-base">
                  CodeFox
                </span>
              </Button>

              {/* SidebarTrigger 保证在 CodeFox 按钮的中间 */}
              <SidebarTrigger
                className="flex items-center justify-center w-12 h-12 "
                onClick={() => setIsCollapsed(!isCollapsed)}
              />
            </div>
          )}

          {isCollapsed && (
            <SidebarTrigger
              className="flex items-center justify-center w-full p-2 mt"
              onClick={() => setIsCollapsed(!isCollapsed)}
            />
          )}
        </div>

        {/* Divider Line */}
        <div className="border-t border-dotted border-gray-300 my-2 w-full mx-auto" />

        {/* New Project 按钮 - 依然占据整行 */}
        <div
          className={`flex ${isCollapsed ? 'justify-center items-center w-full px-0' : ''} w-full mt-4`}
        >
          <Button
            onClick={() => {
              if (isCollapsed) {
                router.push('/');
              } else {
                setIsModalOpen(true);
              }
            }}
            variant="ghost"
            className={`h-7 w-7 flex items-center justify-center rounded-md ease-in-out ${
              !isCollapsed && 'w-full gap-2 pl-4 justify-start'
            }`}
          >
            <svg
              data-name="Layer 1"
              viewBox="0 0 32 32"
              preserveAspectRatio="xMidYMid meet"
              xmlns="http://www.w3.org/2000/svg"
              className={
                isCollapsed
                  ? 'w-8 h-8 min-w-[32px] min-h-[32px] ml-[-5px] mt-[-10px]'
                  : 'w-10 h-10 min-w-[32px] min-h-[32px] mr-1'
              }
              strokeWidth="0.1"
            >
              <g transform="scale(-1,1) translate(-32,0)">
                <path
                  d="M5,8A1,1,0,0,0,7,8V7H8A1,1,0,0,0,8,5H7V4A1,1,0,0,0,5,4V5H4A1,1,0,0,0,4,7H5ZM18,5H12a1,1,0,0,0,0,2h6a1,1,0,0,1,1,1v9.72l-1.57-1.45a1,1,0,0,0-.68-.27H8a1,1,0,0,1-1-1V12a1,1,0,0,0-2,0v3a3,3,0,0,0,3,3h8.36l3,2.73A1,1,0,0,0,20,21a1.1,1.1,0,0,0,.4-.08A1,1,0,0,0,21,20V8A3,3,0,0,0,18,5Z"
                  fill="#808080"
                />
              </g>
            </svg>
            {!isCollapsed && (
              <span className="text-gray-600 hover:text-gray-800 font-semibold text-sm relative -top-0.5">
                New Project
              </span>
            )}
          </Button>
        </div>

        {/* 聊天列表 */}
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              {loading
                ? 'Loading...'
                : !isCollapsed &&
                  chats.map((chat) => (
                    <SideBarItem
                      key={chat.id}
                      id={chat.id}
                      currentChatId={currentChatid}
                      title={chat.title}
                      onSelect={() => {
                        setCurProject(null);
                        pollChatProject(chat.id).then((p) => {
                          setCurProject(p);
                        });
                        router.push(`/chat?id=${chat.id}`);
                        setCurrentChatid(chat.id);
                      }}
                      refetchChats={onRefetch}
                    />
                  ))}
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        {/* 底部设置 */}
        <SidebarFooter
          className={`mt-auto ${isCollapsed ? 'flex justify-center px-0' : ''}`}
        >
          <UserSettings isSimple={false} />
        </SidebarFooter>

        <SidebarRail
          setIsSimple={() => setIsCollapsed(!isCollapsed)}
          isSimple={false}
        />
      </Sidebar>
    </div>
  );
}

export default memo(ChatSideBar, (prevProps, nextProps) => {
  return (
    prevProps.isCollapsed === nextProps.isCollapsed &&
    prevProps.isMobile === nextProps.isMobile &&
    prevProps.chatListUpdated === nextProps.chatListUpdated &&
    prevProps.loading === nextProps.loading &&
    prevProps.error === nextProps.error &&
    JSON.stringify(prevProps.chats) === JSON.stringify(nextProps.chats)
  );
});

export function SidebarWrapper({
  children,
  isAuthorized,
}: {
  children: React.ReactNode;
  isAuthorized: boolean;
}) {
  const { state, setOpen } = useSidebar();
  const [isCollapsed, setIsCollapsed] = useState(state === 'collapsed');
  const {
    chats,
    loading,
    error,
    chatListUpdated,
    setChatListUpdated,
    refetchChats,
  } = useChatList();

  // When user collapses or expands the sidebar, update both local state and Sidebar context
  const handleCollapsedChange = (collapsed: boolean) => {
    setIsCollapsed(collapsed);
    setOpen(!collapsed);
  };

  return (
    <div className="min-h-screen flex">
      {isAuthorized && (
        <motion.div
          initial={{ x: isCollapsed ? -80 : -250, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: isCollapsed ? -80 : -250, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 80, damping: 20 }}
          className="fixed left-0 top-0 h-full z-50"
          style={{ width: isCollapsed ? '80px' : '250px' }}
        >
          <ChatSideBar
            setIsModalOpen={() => {}}
            isCollapsed={isCollapsed}
            setIsCollapsed={handleCollapsedChange}
            isMobile={false}
            currentChatId={''}
            chatListUpdated={chatListUpdated}
            setChatListUpdated={setChatListUpdated}
            chats={chats}
            loading={loading}
            error={error}
            onRefetch={refetchChats}
          />
        </motion.div>
      )}
      <div
        className="transition-all duration-300 flex justify-center w-full"
        style={{
          marginLeft: isAuthorized ? (isCollapsed ? '80px' : '250px') : '0px',
        }}
      >
        <div className="w-full">{children}</div>
      </div>
    </div>
  );
}
