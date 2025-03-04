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
          {
            <svg
              data-name="Layer 1"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <g transform="scale(-1,1) translate(-24,0)">
                <path
                  d="M5,8A1,1,0,0,0,7,8V7H8A1,1,0,0,0,8,5H7V4A1,1,0,0,0,5,4V5H4A1,1,0,0,0,4,7H5ZM18,5H12a1,1,0,0,0,0,2h6a1,1,0,0,1,1,1v9.72l-1.57-1.45a1,1,0,0,0-.68-.27H8a1,1,0,0,1-1-1V12a1,1,0,0,0-2,0v3a3,3,0,0,0,3,3h8.36l3,2.73A1,1,0,0,0,20,21a1.1,1.1,0,0,0,.4-.08A1,1,0,0,0,21,20V8A3,3,0,0,0,18,5Z"
                  fill="#808080"
                />
              </g>
            </svg>
          }
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
