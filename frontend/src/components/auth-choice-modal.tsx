'use client';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { BackgroundGradient } from '@/components/ui/background-gradient';
import { Button } from '@/components/ui/button';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';

interface AuthChoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSignUpClick: () => void;
  onSignInClick: () => void;
}

export function AuthChoiceModal({
  isOpen,
  onClose,
  onSignUpClick,
  onSignInClick,
}: AuthChoiceModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] fixed top-[50%] left-[50%] transform -translate-x-[50%] -translate-y-[50%]">
        {/* Invisible but accessible DialogTitle */}
        <VisuallyHidden>
          <DialogTitle>Choose Authentication Method</DialogTitle>
        </VisuallyHidden>
        <BackgroundGradient className="rounded-[22px] p-4 bg-white dark:bg-zinc-900">
          <div className="w-full p-6 space-y-6">
            <h2 className="text-2xl font-semibold text-center dark:text-white">
              Welcome to CodeFox
            </h2>
            <p className="text-center text-neutral-600 dark:text-neutral-400">
              Choose how you want to continue
            </p>
            <div className="space-y-4">
              <Button
                className="w-full py-6 text-lg bg-primary hover:bg-primary/90"
                onClick={onSignInClick}
              >
                Sign in
              </Button>
              <Button
                variant="outline"
                className="w-full py-6 text-lg"
                onClick={onSignUpClick}
              >
                Create an account
              </Button>
            </div>
          </div>
        </BackgroundGradient>
      </DialogContent>
    </Dialog>
  );
}
