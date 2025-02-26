'use client';

import { Button, buttonVariants } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DELETE_CHAT } from '@/graphql/request';
import { cn } from '@/lib/utils';
import { useMutation } from '@apollo/client';
import { MoreHorizontal, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { EventEnum } from '../const/EventEnum';

interface SideBarItemProps {
  id: string;
  currentChatId: string;
  title: string;
  onSelect: (id: string) => void;
  refetchChats: () => void;
}

export function SideBarItem({
  id,
  currentChatId,
  title,
  onSelect,
  refetchChats,
}: SideBarItemProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSelected, setIsSelected] = useState(false);
  const [variant, setVariant] = useState<
    'ghost' | 'link' | 'secondary' | 'default' | 'destructive' | 'outline'
  >('ghost');

  useEffect(() => {
    const selected = currentChatId === id;
    setIsSelected(selected);
    if (selected) {
      setVariant('secondary'); // 类型安全
    } else {
      setVariant('ghost'); // 类型安全
    }
    refetchChats();
    console.log(`update sidebar ${currentChatId}`);
  }, [currentChatId]);

  const [deleteChat] = useMutation(DELETE_CHAT, {
    onCompleted: () => {
      toast.success('Chat deleted successfully');
      console.log(`${id} ${isSelected}`);
      if (isSelected) {
        window.history.replaceState({}, '', '/');
        const event = new Event(EventEnum.NEW_CHAT);
        window.dispatchEvent(event);
      }
      refetchChats();
    },
    onError: (error) => {
      console.error('Error deleting chat:', error);
      toast.error('Failed to delete chat');
    },
  });

  const handleDeleteChat = async () => {
    try {
      await deleteChat({
        variables: {
          chatId: id,
        },
      });
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Error deleting chat:', error);
      toast.error('Failed to delete chat');
    }
  };

  const handleChatClick = (e: React.MouseEvent) => {
    if (!(e.target as HTMLElement).closest('.dropdown-trigger')) {
      window.history.replaceState({}, '', `/?id=${id}`);
      const event = new Event(EventEnum.CHAT);
      window.dispatchEvent(event);
      onSelect(id);
    }
  };

  return (
    <div
      className={cn(
        buttonVariants({
          variant,
        }),
        'flex justify-between w-full h-14 text-base font-normal items-center group'
      )}
      onClick={handleChatClick}
    >
      <div className="flex-1 flex gap-3 items-center truncate ml-2">
        <div className="flex flex-col">
          <span className="text-xs font-normal">{title || 'New Chat'}</span>
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="flex justify-end items-center dropdown-trigger mr-2"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
            >
              <MoreHorizontal size={15} className="shrink-0" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DialogTrigger
              asChild
              onClick={() => {
                setIsDropdownOpen(false);
                setIsDialogOpen(true);
              }}
            >
              <Button
                variant="ghost"
                className="w-full flex hover:text-red-500 text-red-500 justify-start items-center"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
              >
                <Trash2 className="shrink-0 w-4 h-4" />
                Delete chat
              </Button>
            </DialogTrigger>
          </DropdownMenuContent>
        </DropdownMenu>
        <DialogContent>
          <DialogHeader className="space-y-4">
            <DialogTitle>Delete chat?</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this chat? This action cannot be
              undone.
            </DialogDescription>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleDeleteChat();
                }}
              >
                Delete
              </Button>
            </div>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </div>
  );
}
