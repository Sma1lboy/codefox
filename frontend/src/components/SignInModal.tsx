"use client"
import { useState } from 'react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { BackgroundGradient } from '@/components/ui/background-gradient'
import { TextureCardHeader, TextureCardTitle, TextureCardContent, TextureSeparator } from '@/components/ui/texture-card'

export function SignInModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setPassword('') // Clear password when moving to password step
    setShowPassword(true)
  }

  const handleBackToEmail = () => {
    setPassword('') // Clear password when going back
    setShowPassword(false)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] fixed top-[50%] left-[50%] transform -translate-x-[50%] -translate-y-[50%]">
        <BackgroundGradient className="rounded-[22px] p-4 bg-white dark:bg-zinc-900">
          <div className="w-full">
            <TextureCardHeader className="flex flex-col gap-1 items-center justify-center p-4">
              <TextureCardTitle>Welcome back</TextureCardTitle>
              <p className="text-center text-neutral-600 dark:text-neutral-400">
                {showPassword ? 'Enter your password' : 'Sign in to your account'}
              </p>
            </TextureCardHeader>
            <TextureSeparator />
            <TextureCardContent>
              {!showPassword ? (
                <>
                  <form onSubmit={handleEmailSubmit} className="space-y-4">
                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input 
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="w-full px-4 py-2 rounded-md border"
                      />
                    </div>
                    <Button type="submit" className="w-full">Continue</Button>
                  </form>

                  <div className="mt-6">
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-white dark:bg-zinc-900 px-2 text-muted-foreground">
                          Or continue with
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-col gap-4">
                      <Button variant="outline" className="flex items-center gap-2 w-full">
                        <img src="/images/google.png" alt="Google" className="w-5 h-5" />
                        <span>Google</span>
                      </Button>
                      <Button variant="outline" className="flex items-center gap-2 w-full">
                        <img src="/images/github.png" alt="GitHub" className="w-5 h-5" />
                        <span>GitHub</span>
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <form className="space-y-4">
                  <div>
                    <Label htmlFor="password">Password</Label>
                    <Input 
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="w-full px-4 py-2 rounded-md border"
                    />
                  </div>
                  <Button type="submit" className="w-full">Sign in</Button>
                  <Button 
                    type="button" 
                    variant="link" 
                    onClick={handleBackToEmail}
                    className="w-full"
                  >
                    Back to email
                  </Button>
                </form>
              )}
            </TextureCardContent>
          </div>
        </BackgroundGradient>
      </DialogContent>
    </Dialog>
  )
}
