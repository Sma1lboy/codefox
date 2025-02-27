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

  console.log(
    'ChatSideBar state: isCollapsed:',
    isCollapsed,
    'currentChatid:',
    currentChatid
  );

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
          onClick={handleNewChat}
          size="setting"
          variant="ghost"
          className="flex justify-between w-[90%] h-14 text-sm xl:text-lg font-normal items-center ml-[5%]"
        >
          <Image
            src="/codefox.svg"
            alt="AI"
            width={48}
            height={48}
            className="flex-shrink-0 dark:invert"
          />
          {/* Only show extra text/icons when the sidebar is expanded */}
          {!isCollapsed && (
            <div
              className={cn('flex items-center', {
                'gap-7': !isMobile,
                'gap-4': isMobile,
              })}
            >
              New chat
              {(!isCollapsed || isMobile) && (
                <SquarePen className="shrink-0 m-3" />
              )}
            </div>
          )}
        </Button>

        <Button
          onClick={() => setIsModalOpen(true)}
          size="setting"
          variant="ghost"
          className="flex justify-between w-[90%] h-14 text-sm xl:text-lg font-normal items-center ml-[5%]"
        >
          <Image
            src="/codefox.svg"
            alt="AI"
            width={48}
            height={48}
            className="flex-shrink-0 dark:invert"
          />
          {/* Only show extra text/icons when the sidebar is expanded */}
          {!isCollapsed && (
            <div
              className={cn('flex items-center', {
                'gap-7': !isMobile,
                'gap-4': isMobile,
              })}
            >
              New Project
              {(!isCollapsed || isMobile) && (
                <SquarePen className="shrink-0 m-3" />
              )}
            </div>
          )}
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
                        window.history.replaceState({}, '', `/?id=${chat.id}`);
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
