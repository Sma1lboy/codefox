'use client';

import React, { useRef, useState } from 'react';
import { useMutation } from '@apollo/client';
import { UPLOAD_AVATAR } from '../graphql/request';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';

interface AvatarUploaderProps {
  currentAvatarUrl: string;
  avatarFallback: string;
  onAvatarChange: (newUrl: string) => void;
}

export const AvatarUploader: React.FC<AvatarUploaderProps> = ({
  currentAvatarUrl,
  avatarFallback,
  onAvatarChange,
}) => {
  const [uploadAvatar, { loading }] = useMutation(UPLOAD_AVATAR);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size on client-side as well (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size exceeds the maximum allowed limit (5MB)');
      return;
    }

    // Check file type on client-side
    const fileType = file.type;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(fileType)) {
      toast.error('Only JPEG, PNG, and WebP files are allowed');
      return;
    }

    // Create a preview URL
    const reader = new FileReader();
    reader.onload = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);

    try {
      const { data } = await uploadAvatar({
        variables: { file },
        context: {
          // Required for file uploads with Apollo Client
          headers: {
            'Apollo-Require-Preflight': 'true',
          },
        },
      });

      if (data?.uploadAvatar?.success) {
        onAvatarChange(data.uploadAvatar.avatarUrl);
        toast.success('Avatar updated successfully');
      }
    } catch (error) {
      console.error('Error uploading avatar:', error);

      // Extract the error message if available
      let errorMessage = 'Failed to upload avatar';
      if (error.graphQLErrors && error.graphQLErrors.length > 0) {
        errorMessage = error.graphQLErrors[0].message;
      }

      toast.error(errorMessage);
      setPreviewUrl(null);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  // Use preview URL if available, otherwise use the current avatar URL
  const displayUrl = previewUrl || currentAvatarUrl;

  return (
    <div className="flex flex-col items-center gap-4">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />
      <Avatar className="w-24 h-24 cursor-pointer" onClick={triggerFileInput}>
        <AvatarImage src={displayUrl} alt="User Avatar" />
        <AvatarFallback>{avatarFallback}</AvatarFallback>
      </Avatar>
      <Button
        onClick={triggerFileInput}
        disabled={loading}
        size="sm"
        variant="outline"
      >
        {loading ? 'Uploading...' : 'Change Avatar'}
      </Button>
    </div>
  );
};
