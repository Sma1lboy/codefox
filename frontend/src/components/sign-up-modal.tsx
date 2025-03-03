'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BackgroundGradient } from '@/components/ui/background-gradient';
import {
  TextureCardHeader,
  TextureCardTitle,
  TextureCardContent,
  TextureSeparator,
} from '@/components/ui/texture-card';
import { useMutation } from '@apollo/client';
import { REGISTER_USER } from '@/graphql/mutations/auth';
import { useRouter } from 'next/navigation';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { AlertCircle } from 'lucide-react';

export function SignUpModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [registerUser, { loading }] = useMutation(REGISTER_USER, {
    onError: (error) => {
      if (error.message.includes('already exists')) {
        setErrorMessage('This email is already in use. Please try another.');
      } else {
        setErrorMessage(error.message);
      }
    },
    onCompleted: () => {
      onClose();
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!name || !email || !password) {
      setErrorMessage('All fields are required.');
      return;
    }

    try {
      await registerUser({
        variables: {
          input: {
            username: name,
            email,
            password,
          },
        },
      });
    } catch (error) {
      console.error('Registration failed:', error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] fixed top-[50%] left-[50%] transform -translate-x-[50%] -translate-y-[50%] p-0">
        <VisuallyHidden>
          <DialogTitle>Sign Up</DialogTitle>
          <DialogDescription>
            Create an account by entering your information below
          </DialogDescription>
        </VisuallyHidden>

        <BackgroundGradient className="rounded-[22px] p-4 bg-white dark:bg-zinc-900">
          <div className="w-full">
            <TextureCardHeader className="flex flex-col gap-1 items-center justify-center p-4">
              <TextureCardTitle>Create your account</TextureCardTitle>
              <p className="text-center text-neutral-600 dark:text-neutral-400">
                Welcome! Please fill in the details to get started.
              </p>
            </TextureCardHeader>
            <TextureSeparator />
            <TextureCardContent>
              <form onSubmit={handleSubmit} className="space-y-2">
                <div className="space-y-1">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    placeholder="Name"
                    type="text"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      setErrorMessage(null);
                    }}
                    required
                    className="w-full"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    placeholder="Email"
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setErrorMessage(null);
                    }}
                    required
                    className="w-full"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    placeholder="Password"
                    type="password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setErrorMessage(null);
                    }}
                    required
                    className="w-full"
                  />
                </div>

                {errorMessage && (
                  <div className="flex items-center gap-2 text-primary-700 dark:text-primary-400 text-sm p-2 rounded-md bg-primary-50 dark:bg-zinc-800 border border-primary-200 dark:border-primary-800">
                    <AlertCircle className="h-4 w-4" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Signing up...' : 'Sign up'}
                </Button>
              </form>
            </TextureCardContent>
          </div>
        </BackgroundGradient>
      </DialogContent>
    </Dialog>
  );
}
