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

export default function FileSidebar({ isCollapsed, isMobile, loading }) {
  const [isSimple, setIsSimple] = useState(false);
  const [currentChatid, setCurrentChatid] = useState('');
  const handleNewChat = useCallback(() => {
    window.history.replaceState({}, '', '/');
    setCurrentChatid('');
    const event = new Event(EventEnum.NEW_CHAT);
    window.dispatchEvent(event);
  }, []);

  if (loading) return <SidebarSkeleton />;
  //   if (error) {
  //     console.error('Error loading chats:', error);
  //     return null;
  //   }
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
          size="setting"
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
            <SidebarGroupContent></SidebarGroupContent>
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
