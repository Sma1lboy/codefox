'use client';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { memo, useCallback, useEffect, useState } from 'react';
import { SquarePen } from 'lucide-react';
import SidebarSkeleton from './sidebar-skeleton';
import UserSettings from './user-settings';
import { SideBarItem } from './sidebar-item';
import { Chat } from '@/graphql/type';
import { EventEnum } from './enum';
import {
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarTrigger,
  Sidebar,
  SidebarRail,
  SidebarFooter,
} from './ui/sidebar';
import { cn } from '@/lib/utils';

interface SidebarProps {
  isCollapsed: boolean;
  isMobile: boolean;
  currentChatId?: string;
  chatListUpdated: boolean;
  setChatListUpdated: (value: boolean) => void;
  chats: Chat[];
  loading: boolean;
  error: any;
  onRefetch: () => void;
}

function CustomSidebar({
  isCollapsed,
  isMobile,
  chatListUpdated,
  setChatListUpdated,
  chats,
  loading,
  error,
  onRefetch,
}: SidebarProps) {
  const [isSimple, setIsSimple] = useState(false);
  const [currentChatid, setCurrentChatid] = useState('');
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
  console.log(`${isCollapsed}, ${isMobile}, ${isSimple}`);

  return (
    <div
      data-collapsed={isCollapsed}
      className="relative justify-between group lg:bg-accent/0 lg:dark:bg-card/0 flex flex-col h-full"
    >
      <Sidebar collapsible="icon" side="left">
        <SidebarTrigger
          className={`lg:flex items-center justify-center cursor-pointer p-2 ml-3.5 mt-2`}
          onClick={() => setIsSimple(!isSimple)}
        ></SidebarTrigger>

        <Button
          onClick={() => handleNewChat()}
          variant="ghost"
          className={`flex justify-between w-[90%] h-14 text-sm xl:text-lg font-normal items-center ml-[5%]`}
        >
          <Image
            src="/codefox.svg"
            alt="AI"
            width={48}
            height={48}
            className={`flex-shrink-0 dark:invert ${isSimple ? 'm-auto' : ''}`}
          />
          {!isSimple && (
            <div
              className={cn('flex items-center', {
                'gap-7': !isMobile,
                'gap-4': isMobile,
              })}
            >
              New chat
              {(!isCollapsed || isMobile) && (
                <SquarePen
                  className={cn('shrink-0', {
                    'ml-[12.5%]': isSimple && !isMobile,
                    'm-3': !isSimple,
                  })}
                />
              )}
            </div>
          )}
        </Button>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              {loading
                ? 'Loading...'
                : !isSimple &&
                  chats.map((chat) => (
                    <SideBarItem
                      key={chat.id}
                      id={chat.id}
                      currentChatId={currentChatid}
                      title={chat.title}
                      onSelect={() => {
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
          <UserSettings isSimple={isSimple} />
        </SidebarFooter>

        <SidebarRail setIsSimple={setIsSimple} isSimple={isSimple} />
      </Sidebar>
    </div>
  );
}

export default memo(CustomSidebar, (prevProps, nextProps) => {
  return (
    prevProps.isCollapsed === nextProps.isCollapsed &&
    prevProps.isMobile === nextProps.isMobile &&
    prevProps.chatListUpdated === nextProps.chatListUpdated &&
    prevProps.loading === nextProps.loading &&
    prevProps.error === nextProps.error &&
    JSON.stringify(prevProps.chats) === JSON.stringify(nextProps.chats)
  );
});
