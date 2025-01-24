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
} from './ui/sidebar';

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

  const handleSidebarToggle = (e: React.MouseEvent) => {
    const clientX = e.clientX;
    if (clientX < 100) {
      // 判断拖拽位置是否触发简化模式
      setIsSimple(true);
    } else {
      setIsSimple(false);
    }
  };
  return (
    <div
      data-collapsed={isCollapsed}
      className="relative justify-between group lg:bg-accent/20 lg:dark:bg-card/10 flex flex-col h-full gap-4 p-2 data-[collapsed=true]:p-2"
    >
      <Sidebar collapsible="icon" side="left">
        <SidebarTrigger
          className={`lg:flex items-center justify-center cursor-pointer p-2 ${isSimple ? 'ml-[25%]' : 'ml-[100%]'}`}
          onClick={() => setIsSimple(!isSimple)}
        ></SidebarTrigger>

        <Button
          onClick={() => handleNewChat()}
          variant="ghost"
          className={` flex justify-between w-full h-14 text-sm xl:text-lg font-normal items-center`}
        >
          {!isSimple && (
            <div className="flex gap-3 items-center">
              {!isCollapsed && !isMobile && (
                <Image
                  src="/codefox.svg"
                  alt="AI"
                  width={28}
                  height={28}
                  className="dark:invert hidden 2xl:block"
                />
              )}
              New chat
            </div>
          )}
          <SquarePen
            className={`shrink-0 ${isSimple ? 'ml-[12.5%]' : 'm-5'}`}
          />
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
        <div className="justify-end px-2 py-2 w-full border-t">
          <UserSettings isSimple={isSimple} />
        </div>
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
