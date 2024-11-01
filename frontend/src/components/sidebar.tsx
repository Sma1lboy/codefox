'use client';

import Link from 'next/link';
import { MoreHorizontal, SquarePen, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button, buttonVariants } from '@/components/ui/button';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import SidebarSkeleton from './sidebar-skeleton';
import UserSettings from './user-settings';
import { useQuery, useMutation } from '@apollo/client';
import { GET_USER_CHATS, DELETE_CHAT } from '@/graphql/request';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

interface SidebarProps {
  isCollapsed: boolean;
  isMobile: boolean;
  currentChatId?: string;
  chatListUpdated: boolean;
  setChatListUpdated: React.Dispatch<React.SetStateAction<boolean>>;
}

// Define chat type based on the actual GraphQL response
interface Chat {
  __typename: 'Chat';
  id: string;
  title: string;
  createdAt: string;
}

export function Sidebar({
  isCollapsed,
  isMobile,
  currentChatId,
  chatListUpdated,
  setChatListUpdated,
}: SidebarProps) {
  const router = useRouter();
  const [selectedChatId, setSelectedChatId] = useState<string | null>(
    currentChatId || null
  );

  // Query user chats
  // const { data, loading, error } = useQuery(GET_USER_CHATS, {
  //   fetchPolicy: 'network-only',
  // });
  const { data, loading, error } = useQuery(GET_USER_CHATS, {
    fetchPolicy: chatListUpdated ? 'network-only' : 'cache-first',
  });

  const chats: Chat[] = data?.getUserChats || [];

  useEffect(() => {
    if (chatListUpdated) {
      setChatListUpdated(false);
    }
  }, [chatListUpdated, setChatListUpdated]);

  // Delete chat mutation
  const [deleteChat] = useMutation(DELETE_CHAT, {
    refetchQueries: [{ query: GET_USER_CHATS }],
    onError: (error) => {
      console.error('Error deleting chat:', error);
      toast.error('Failed to delete chat');
    },
  });

  if (loading) return <SidebarSkeleton />;
  if (error) {
    console.error('Error loading chats:', error);
    return null;
  }

  // Sort chats by creation date
  const sortedChats = [...chats].sort((a, b) => {
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const handleDeleteChat = async (chatId: string) => {
    try {
      await deleteChat({
        variables: {
          chatId,
        },
      });

      // If the deleted chat was selected, navigate to home
      if (chatId === selectedChatId) {
        router.push('/');
      }

      toast.success('Chat deleted successfully');
    } catch (error) {
      console.error('Error deleting chat:', error);
      toast.error('Failed to delete chat');
    }
  };

  const handleNewChat = () => {
    setSelectedChatId(null);
    router.push('/');
  };

  return (
    <div
      data-collapsed={isCollapsed}
      className="relative justify-between group lg:bg-accent/20 lg:dark:bg-card/35 flex flex-col h-full gap-4 p-2 data-[collapsed=true]:p-2"
    >
      <div className="flex flex-col justify-between p-2 max-h-fit overflow-y-auto">
        {/* New Chat Button */}
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

        {/* Chat List */}
        <div className="flex flex-col pt-10 gap-2">
          <p className="pl-4 text-xs text-muted-foreground">Your chats</p>
          {sortedChats.length > 0 && (
            <div>
              {sortedChats.map((chat) => {
                const isSelected = chat.id === currentChatId;

                return (
                  <Link
                    key={chat.id}
                    href={`/${chat.id}`}
                    onClick={() => setSelectedChatId(chat.id)}
                    className={cn(
                      buttonVariants({
                        variant: isSelected ? 'secondaryLink' : 'ghost',
                      }),
                      'flex justify-between w-full h-14 text-base font-normal items-center'
                    )}
                  >
                    <div className="flex gap-3 items-center truncate">
                      <div className="flex flex-col">
                        <span className="text-xs font-normal">
                          {chat.title || 'New Chat'}
                        </span>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          className="flex justify-end items-center"
                          onClick={(e) => e.preventDefault()}
                        >
                          <MoreHorizontal size={15} className="shrink-0" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="ghost"
                              className="w-full flex gap-2 hover:text-red-500 text-red-500 justify-start items-center"
                              onClick={(e) => e.preventDefault()}
                            >
                              <Trash2 className="shrink-0 w-4 h-4" />
                              Delete chat
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader className="space-y-4">
                              <DialogTitle>Delete chat?</DialogTitle>
                              <DialogDescription>
                                Are you sure you want to delete this chat? This
                                action cannot be undone.
                              </DialogDescription>
                              <div className="flex justify-end gap-2">
                                <Button variant="outline">Cancel</Button>
                                <Button
                                  variant="destructive"
                                  onClick={() => handleDeleteChat(chat.id)}
                                >
                                  Delete
                                </Button>
                              </div>
                            </DialogHeader>
                          </DialogContent>
                        </Dialog>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* User Settings */}
      <div className="justify-end px-2 py-2 w-full border-t">
        <UserSettings />
      </div>
    </div>
  );
}
