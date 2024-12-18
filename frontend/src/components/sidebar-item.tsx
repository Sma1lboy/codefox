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
import { useState } from 'react';
import { toast } from 'sonner';

interface SideBarItemProps {
  id: string;
  title: string;
  isSelected: boolean;
  onSelect: (id: string) => void;
  refetchChats: () => void;
}

export function SideBarItem({
  id,
  title,
  isSelected,
  onSelect,
  refetchChats,
}: SideBarItemProps) {
  const router = useRouter();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const [deleteChat] = useMutation(DELETE_CHAT, {
    onCompleted: () => {
      toast.success('Chat deleted successfully');
      refetchChats();
      if (isSelected) {
        router.push('/');
      }
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
      onSelect(id);
    }
  };

  return (
    <div
      className={cn(
        buttonVariants({
          variant: isSelected ? 'secondaryLink' : 'ghost',
        }),
        'flex justify-between w-full h-14 text-base font-normal items-center group'
      )}
    >
      <Link
        href={`/${id}`}
        className="flex-1 flex gap-3 items-center truncate"
        onClick={handleChatClick}
      >
        <div className="flex flex-col">
          <span className="text-xs font-normal">{title || 'New Chat'}</span>
        </div>
      </Link>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="flex justify-end items-center dropdown-trigger"
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
                className="w-full flex gap-2 hover:text-red-500 text-red-500 justify-start items-center"
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
