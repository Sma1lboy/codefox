'use client';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from './ui/button';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { GearIcon } from '@radix-ui/react-icons';
import { useState, useMemo, memo } from 'react';
import { Skeleton } from './ui/skeleton';
import EditUsernameForm from './edit-username-form';
import PullModel from './pull-model';
import { useAuth } from '@/app/hooks/useAuth';
import { useRouter } from 'next/navigation';
import exp from 'constants';

export const UserSettings = () => {
  const { user, isLoading, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const handleLogout = useMemo(() => {
    return () => {
      router.push('/login');
      logout();
    };
  }, [router, logout]);

  const avatarFallback = useMemo(() => {
    if (!user?.username) return '';
    return user.username.substring(0, 2).toUpperCase();
  }, [user?.username]);

  const displayUsername = useMemo(() => {
    if (isLoading) return null;
    return user?.username || 'Anonymous';
  }, [isLoading, user?.username]);

  const avatarButton = useMemo(
    () => (
      <Button
        variant="ghost"
        className="flex justify-start gap-3 w-full h-14 text-base font-normal items-center"
      >
        <Avatar className="flex justify-start items-center overflow-hidden">
          <AvatarImage
            src=""
            alt="User"
            width={4}
            height={4}
            className="object-contain"
          />
          <AvatarFallback>{avatarFallback}</AvatarFallback>
        </Avatar>
        <div className="text-xs truncate">
          {isLoading ? <Skeleton className="w-20 h-4" /> : displayUsername}
        </div>
      </Button>
    ),
    [avatarFallback, displayUsername, isLoading]
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{avatarButton}</DropdownMenuTrigger>
      <DropdownMenuContent className="w-48 p-2">
        <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
          <PullModel />
        </DropdownMenuItem>
        <Dialog>
          <DialogTrigger className="w-full">
            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
              <div className="flex w-full gap-2 p-1 items-center cursor-pointer">
                <GearIcon className="w-4 h-4" />
                Settings
              </div>
            </DropdownMenuItem>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader className="space-y-4">
              <DialogTitle>Settings</DialogTitle>
              <EditUsernameForm setOpen={setOpen} />
            </DialogHeader>
          </DialogContent>
        </Dialog>
        <DropdownMenuItem
          className="text-red-500 hover:text-red-600"
          onSelect={handleLogout}
        >
          Logout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
export default memo(UserSettings);
