'use client';

import { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
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
      console.error('Registration failed:', error.message);
      if (error.message.includes('already exists')) {
        setErrorMessage('This email is already in use. Please try another.');
      } else {
        setErrorMessage(error.message);
      }
    },
    onCompleted: () => {
      onClose(); // ✅ Close modal on success
      router.push('/login'); // ✅ Redirect to login page
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null); // Clear previous errors

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
      <DialogContent className="sm:max-w-[425px] fixed top-[50%] left-[50%] transform -translate-x-[50%] -translate-y-[50%]">
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
              <form className="space-y-4" onSubmit={handleSubmit}>
                <div>
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    placeholder="Name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="w-full px-4 py-2 rounded-md border"
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    placeholder="Email"
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setErrorMessage(null); // ✅ Clear error when user types
                    }}
                    required
                    className="w-full px-4 py-2 rounded-md border"
                  />
                  {errorMessage && (
                    <p className="text-red-500 text-sm mt-1">{errorMessage}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    placeholder="Password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full px-4 py-2 rounded-md border"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full bg-red-500 text-white py-2 rounded-md"
                  disabled={loading}
                >
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
