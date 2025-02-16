'use client';

import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import {
  TextureCardHeader,
  TextureCardTitle,
  TextureSeparator,
  TextureCardContent,
} from '@/components/ui/texture-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BackgroundGradient } from '@/components/ui/background-gradient';
import { useState } from 'react';
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
  const [isSuccess, setIsSuccess] = useState(false); // ✅ Track if signup is successful
  const [errorMessage, setErrorMessage] = useState<string | null>(null); // ✅ Track error message

  const [registerUser, { loading }] = useMutation(REGISTER_USER, {
    onError: (error) => {
      console.error('Registration failed:', error.message);
      setErrorMessage(error.message); // ✅ Set error message to display
    },
    onCompleted: () => {
      setIsSuccess(true); // ✅ Show success block
      setErrorMessage(null); // Clear any previous error
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) {
      setErrorMessage('All fields are required.');
      return;
    }

    try {
      console.log('Submitting registration with:', { name, email, password });
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
        <DialogTitle asChild>
          <VisuallyHidden>Sign Up Form</VisuallyHidden>
        </DialogTitle>
        <BackgroundGradient className="rounded-[22px] p-4 bg-white dark:bg-zinc-900">
          <div className="w-full">
            {/* ✅ Show Success Block if Sign Up is Successful */}
            {isSuccess ? (
              <div className="flex flex-col items-center text-center p-6">
                <TextureCardHeader className="flex flex-col gap-1 items-center justify-center">
                  <TextureCardTitle>🎉 Sign Up Successful! 🎉</TextureCardTitle>
                  <p className="text-neutral-600 dark:text-neutral-400">
                    Your account has been created successfully.
                  </p>
                </TextureCardHeader>
                <TextureSeparator />
                <TextureCardContent>
                  <Button
                    className="w-full bg-green-500 text-white py-2 rounded-md mt-4"
                    onClick={() => {
                      onClose();
                      router.push('/login'); // ✅ Redirect to login page
                    }}
                  >
                    Go to Login
                  </Button>
                </TextureCardContent>
              </div>
            ) : errorMessage ? (
              // ✅ Show Error Block if Registration Fails
              <div className="flex flex-col items-center text-center p-6">
                <TextureCardHeader className="flex flex-col gap-1 items-center justify-center">
                  <TextureCardTitle>❌ Registration Failed</TextureCardTitle>
                  <p className="text-red-500">{errorMessage}</p>
                </TextureCardHeader>
                <TextureSeparator />
                <TextureCardContent>
                  <Button
                    className="w-full bg-gray-500 text-white py-2 rounded-md mt-4"
                    onClick={() => setErrorMessage(null)} // Reset error and show form again
                  >
                    Try Again
                  </Button>
                </TextureCardContent>
              </div>
            ) : (
              // ✅ Show Signup Form if No Success or Error
              <>
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
                        required
                        className="w-full px-4 py-2 rounded-md border border-neutral-300 dark:border-neutral-700 bg-white/80 dark:bg-neutral-800/80"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        placeholder="Email"
                        type="email"
                        required
                        className="w-full px-4 py-2 rounded-md border border-neutral-300 dark:border-neutral-700 bg-white/80 dark:bg-neutral-800/80"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="password">Password</Label>
                      <Input
                        id="password"
                        placeholder="Password"
                        type="password"
                        required
                        className="w-full px-4 py-2 rounded-md border border-neutral-300 dark:border-neutral-700 bg-white/80 dark:bg-neutral-800/80"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
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
              </>
            )}
          </div>
        </BackgroundGradient>
      </DialogContent>
    </Dialog>
  );
}
