'use client';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { memo, useCallback } from 'react';
import { SquarePen } from 'lucide-react';
import SidebarSkeleton from './sidebar-skeleton';
import UserSettings from './user-settings';
import { SideBarItem } from './sidebar-item';
import { Chat } from '@/graphql/type';

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

function Sidebar({
  isCollapsed,
  isMobile,
  currentChatId,
  chatListUpdated,
  setChatListUpdated,
  chats,
  loading,
  error,
  onRefetch,
}: SidebarProps) {
  const router = useRouter();

  const handleNewChat = useCallback(() => {
    //force reload to reset the chat state
    window.location.href = '/';
  }, []);

  if (loading) return <SidebarSkeleton />;
  if (error) {
    console.error('Error loading chats:', error);
    return null;
  }

  return (
    <div
      data-collapsed={isCollapsed}
      className="relative justify-between group lg:bg-accent/20 lg:dark:bg-card/35 flex flex-col h-full gap-4 p-2 data-[collapsed=true]:p-2"
    >
      <div className="flex flex-col justify-between p-2 max-h-fit overflow-y-auto">
        <Button
          onClick={handleNewChat}
          variant="ghost"
          className="flex justify-between w-full h-14 text-sm xl:text-lg font-normal items-center"
        >
          <div className="flex gap-3 items-center">
            {!isCollapsed && !isMobile && (
              <Image
                src="/ollama.png"
                alt="AI"
                width={28}
                height={28}
                className="dark:invert hidden 2xl:block"
              />
            )}
            New chat
          </div>
          <SquarePen size={18} className="shrink-0 w-4 h-4" />
        </Button>
        <div className="flex flex-col pt-10 gap-2">
          <p className="pl-4 text-xs text-muted-foreground">Your chats</p>
          {chats.length > 0 && (
            <div>
              {chats.map((chat) => (
                <SideBarItem
                  key={chat.id}
                  id={chat.id}
                  title={chat.title}
                  isSelected={currentChatId === chat.id}
                  onSelect={() => router.push(`/${chat.id}`)}
                  refetchChats={onRefetch}
                />
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="justify-end px-2 py-2 w-full border-t">
        <UserSettings />
      </div>
    </div>
  );
}

export default memo(Sidebar, (prevProps, nextProps) => {
  return (
    prevProps.isCollapsed === nextProps.isCollapsed &&
    prevProps.isMobile === nextProps.isMobile &&
    prevProps.currentChatId === nextProps.currentChatId &&
    prevProps.chatListUpdated === nextProps.chatListUpdated &&
    prevProps.loading === nextProps.loading &&
    prevProps.error === nextProps.error &&
    JSON.stringify(prevProps.chats) === JSON.stringify(nextProps.chats)
  );
});
