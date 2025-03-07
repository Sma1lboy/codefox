'use client';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import PullModel from './pull-model';
import {
  AvatarFallback,
  AvatarImage,
  SmallAvatar,
} from '@/components/ui/avatar';
import { GearIcon } from '@radix-ui/react-icons';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { useMemo, useState, memo, useEffect } from 'react';
import { EventEnum } from '../const/EventEnum';
import { useAuthContext } from '@/providers/AuthProvider';

// Avatar URL normalization helper
function normalizeAvatarUrl(avatarUrl: string | null | undefined): string {
  if (!avatarUrl) return '';

  // Check if it's already an absolute URL (S3 case)
  if (avatarUrl.startsWith('http://') || avatarUrl.startsWith('https://')) {
    return avatarUrl;
  }

  // Check if it's a relative media path
  if (avatarUrl.startsWith('media/')) {
    // Convert to API route path
    return `/api/${avatarUrl}`;
  }

  // Handle paths that might not have the media/ prefix
  if (avatarUrl.includes('avatars/')) {
    const parts = avatarUrl.split('avatars/');
    return `/api/media/avatars/${parts[parts.length - 1]}`;
  }

  // Return as is for other cases
  return avatarUrl;
}

interface UserSettingsProps {
  isSimple: boolean;
}

export const UserSettings = ({ isSimple }: UserSettingsProps) => {
  const { user, isLoading, logout } = useAuthContext();
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

  // Normalize the avatar URL
  const normalizedAvatarUrl = useMemo(() => {
    return normalizeAvatarUrl(user?.avatarUrl);
  }, [user?.avatarUrl]);

  const handleSettingsClick = () => {
    // First navigate using Next.js router
    router.push('/chat?id=setting');

    // Then dispatch the event
    setTimeout(() => {
      const event = new Event(EventEnum.SETTING);
      window.dispatchEvent(event);
    }, 0);
  };

  const avatarButton = useMemo(() => {
    return (
      <Button
        size="setting"
        variant="ghost"
        className={`flex justify-start ${
          isSimple ? 'w-10 h-12 p-auto' : 'gap-2 w-full h-12 p-1'
        }`}
      >
        <SmallAvatar className="flex items-center justify-center">
          {/* Use normalized avatar URL */}
          <AvatarImage
            src={normalizedAvatarUrl}
            alt="User"
            key={user?.avatarUrl}
          />
          <AvatarFallback>{avatarFallback}</AvatarFallback>
        </SmallAvatar>
        {!isSimple && <span className="truncate">{displayUsername}</span>}
      </Button>
    );
  }, [
    avatarFallback,
    displayUsername,
    isSimple,
    normalizedAvatarUrl,
    user?.avatarUrl,
  ]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{avatarButton}</DropdownMenuTrigger>
      <DropdownMenuContent className="w-48">
        <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
          <div
            className="flex w-full gap-2 p-1 items-center cursor-pointer"
            onClick={handleSettingsClick}
          >
            <GearIcon className="w-4 h-4" />
            Settings
          </div>
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
