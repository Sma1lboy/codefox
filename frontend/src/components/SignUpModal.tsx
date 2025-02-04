import { Dialog, DialogContent } from '@/components/ui/dialog';
import {
  TextureCardHeader,
  TextureCardTitle,
  TextureCardFooter,
  TextureSeparator,
  TextureCardContent,
} from '@/components/ui/texture-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BackgroundGradient } from '@/components/ui/background-gradient';

export function SignUpModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
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
              <form className="space-y-4">
                <div>
                  <Label htmlFor="name">Name</Label>
                  <Input 
                    id="name" 
                    placeholder="Name" 
                    type="text" 
                    required 
                    className="w-full px-4 py-2 rounded-md border border-neutral-300 dark:border-neutral-700 bg-white/80 dark:bg-neutral-800/80" 
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" placeholder="Email" type="email" required className="w-full px-4 py-2 rounded-md border border-neutral-300 dark:border-neutral-700 bg-white/80 dark:bg-neutral-800/80" />
                </div>
                <div>
                  <Label htmlFor="password">Password</Label>
                  <Input id="password" placeholder="Password" type="password" required className="w-full px-4 py-2 rounded-md border border-neutral-300 dark:border-neutral-700 bg-white/80 dark:bg-neutral-800/80" />
                </div>
                <Button type="submit" className="w-full bg-red-500 text-white py-2 rounded-md">Sign Up</Button>
              </form>
              
              <div className="mt-6">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-neutral-300 dark:border-neutral-700" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">
                      Or 
                    </span>
                  </div>
                </div>

                <div className="mt-4 flex flex-col gap-4">
                  <Button variant="outline" className="flex items-center gap-2 w-full justify-center py-2">
                    <img src="/images/google.png" alt="Google" width="20" height="20" className="mr-2" />
                    <span>Sign in with Google</span>
                  </Button>
                  <Button variant="outline" className="flex items-center gap-2 w-full justify-center py-2">
                    <img src="/images/github.png" alt="GitHub" width="20" height="20" className="mr-2" />
                    <span>Sign in with GitHub</span>
                  </Button>
                </div>
              </div>
            </TextureCardContent>
          </div>
        </BackgroundGradient>
      </DialogContent>
    </Dialog>
  );
}
