'use client';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { memo, useCallback, useContext, useState } from 'react';
import { SquarePen } from 'lucide-react';
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
import { cn } from '@/lib/utils';
import { ProjectContext } from './chat/code-engine/project-context';

interface SidebarProps {
  setIsModalOpen: (value: boolean) => void; // Parent setter to update collapse state
  isCollapsed: boolean;
  setIsCollapsed: (value: boolean) => void; // Parent setter to update collapse state
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
  isMobile,
  chatListUpdated,
  setChatListUpdated,
  chats,
  loading,
  error,
  onRefetch,
}: SidebarProps) {
  // Use a local state only for the currently selected chat.
  const router = useRouter();
  const [currentChatid, setCurrentChatid] = useState('');
  const { setCurProject, pollChatProject } = useContext(ProjectContext);
  // Handler for starting a new chat.
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
      className="relative justify-between group lg:bg-accent/0 lg:dark:bg-card/0 flex flex-col h-full"
    >
      <Sidebar collapsible="icon" side="left">
        {/* Toggle button: Clicking this will toggle the collapse state */}
        <SidebarTrigger
          className="lg:flex items-center justify-center cursor-pointer p-2 ml-3.5 mt-2"
          onClick={() => setIsCollapsed(!isCollapsed)}
        />
        <Button
          onClick={() => router.push('/')}
          variant="ghost"
          className="
            w-full
            h-14
            flex
            items-center
            justify-start
            px-4
            gap-2
            text-sm
            xl:text-lg
            font-normal
            rounded-md
            hover:bg-yellow-50
            transition-all
            duration-200
            ease-in-out
          "
        >
          <Image
            src="/codefox.svg"
            alt="CodeFox Logo"
            width={32}
            height={32}
            className="flex-shrink-0 dark:invert"
          />
          {!isCollapsed && (
            <span className="text-primary-500 font-semibold text-lg">
              CodeFox
            </span>
          )}
        </Button>

        {/* Divider Line */}
        <div className="border-t border-dotted border-gray-300 my-2 w-full mx-auto" />

        <Button
          onClick={() => setIsModalOpen(true)}
          size="setting"
          variant="ghost"
          className="flex items-center justify-start w-[85%] h-14 text-xs xl:text-sm font-normal gap-2 pl-4 hover:bg-yellow-50 rounded-md transition-all duration-200 ease-in-out"
        >
          <div className="flex items-center gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="1.5"
              stroke="currentColor"
              className="w-5 h-5 text-yellow-500"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 18v-5.25m0 0a6.01 6.01 0 0 0 1.5-.189m-1.5.189a6.01 6.01 0 0 1-1.5-.189m3.75 7.478a12.06 12.06 0 0 1-4.5 0m3.75 2.383a14.406 14.406 0 0 1-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 1 0-7.517 0c.85.493 1.509 1.333 1.509 2.316V18"
              />
            </svg>

            {!isCollapsed && (
              <span className="text-primary-600 hover:text-primary-800 transition-colors text-sm">
                New Project
              </span>
            )}

            {!isCollapsed && (
              <SquarePen className="text-primary-400 hover:text-primary-600 transition-colors w-4 h-4" />
            )}
          </div>
        </Button>

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
                        window.history.replaceState(
                          {},
                          '',
                          `/chat?id=${chat.id}`
                        );
                        setCurrentChatid(chat.id);
                      }}
                      refetchChats={onRefetch}
                    />
                  ))}
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter>
          <UserSettings isSimple={false} />
        </SidebarFooter>

        <SidebarRail
          // Optional: Provide a secondary trigger if needed.
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
