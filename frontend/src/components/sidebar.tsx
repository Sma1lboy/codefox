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
} from './ui/sidebar';
import { ProjectContext } from './chat/code-engine/project-context';

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
          className={`flex items-center ${
            isCollapsed ? 'justify-center w-full' : 'justify-between'
          } px-3 pt-3`}
        >
          {/* 只包裹图标与文字，让点击区域正好等于这两个元素 */}
          <Button
            onClick={() => router.push('/')}
            variant="ghost"
            className="inline-flex items-center justify-start gap-2 pl-0 hover:bg-yellow-50 rounded-md transition-all duration-200 ease-in-out"
          >
            <Image
              src="/codefox.svg"
              alt="CodeFox Logo"
              width={28}
              height={28}
              className="dark:invert"
            />
            {!isCollapsed && (
              <span className="text-primary-500 font-semibold text-base">
                CodeFox
              </span>
            )}
          </Button>

          {/* 折叠/展开图标放右侧 */}
          <SidebarTrigger
            className="flex items-center justify-center cursor-pointer p-2"
            onClick={() => setIsCollapsed(!isCollapsed)}
          />
        </div>

        {/* Divider Line */}
        <div className="border-t border-dotted border-gray-300 my-2 w-full mx-auto" />

        {/* New Project 按钮 - 依然占据整行 */}
        <Button
          onClick={() => setIsModalOpen(true)}
          variant="ghost"
          className="
            flex items-center
            w-full
            h-14
            gap-2
            pl-4
            rounded-md
            hover:bg-yellow-50
            transition-all
            duration-200
            ease-in-out
            justify-start
          "
        >
          {!isCollapsed && (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-5 h-5 text-gray-600"
            >
              <path d="m11 19-1.106-.552a2 2 0 0 0-1.788 0l-3.659 1.83A1 1 0 0 1 3 19.381V6.618a1 1 0 0 1 .553-.894l4.553-2.277a2 2 0 0 1 1.788 0l4.212 2.106a2 2 0 0 0 1.788 0l3.659-1.83A1 1 0 0 1 21 4.619V12" />
              <path d="M15 5.764V12" />
              <path d="M18 15v6" />
              <path d="M21 18h-6" />
              <path d="M9 3.236v15" />
            </svg>
          )}
          {!isCollapsed && (
            <span className="text-gray-600 hover:text-gray-800  font-semibold text-sm">
              New Project
            </span>
          )}
        </Button>

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
        <SidebarFooter>
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
