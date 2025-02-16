'use client';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import PullModel from './pull-model';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { GearIcon } from '@radix-ui/react-icons';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/app/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useMemo, useState, memo } from 'react';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogTitle,
} from '@radix-ui/react-dialog';
import EditUsernameForm from './edit-username-form';
import { DialogHeader } from './ui/dialog';
import DetailSettings from './detail-settings';

interface UserSettingsProps {
  isSimple: boolean;
}

export const UserSettings = ({ isSimple }: UserSettingsProps) => {
  const { user, isLoading, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const handleLogout = useMemo(() => {
    return () => {
      router.push('/');
      // router.push('/login');
      logout();
    };
  }, [logout, router]);

  const avatarFallback = useMemo(() => {
    if (!user?.username) return 'US';
    return user.username.substring(0, 2).toUpperCase();
  }, [user?.username]);

  const displayUsername = useMemo(() => {
    if (isLoading) return 'Loading...';
    return user?.username || 'Anonymous';
  }, [isLoading, user?.username]);

  const avatarButton = useMemo(() => {
    return (
      <Button
        variant="ghost"
        className={`flex justify-start ${
          isSimple ? 'w-10 h-12 p-auto' : 'gap-2 w-full h-12 p-1'
        }`}
      >
        <Avatar className="flex items-center justify-center">
          <AvatarImage src="" alt="User" />
          <AvatarFallback>{avatarFallback}</AvatarFallback>
        </Avatar>
        {!isSimple && <span className="truncate">{displayUsername}</span>}
      </Button>
    );
  }, [avatarFallback, displayUsername, isSimple]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{avatarButton}</DropdownMenuTrigger>
      <DropdownMenuContent className="w-48">
        <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
          <PullModel />
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
          <DetailSettings />
        </DropdownMenuItem>

        <DropdownMenuItem
          onSelect={handleLogout}
          className="text-red-500 hover:text-red-600"
        >
          Logout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default memo(UserSettings);
