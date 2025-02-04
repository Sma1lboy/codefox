import Home from './chat/Home';

import { useState } from 'react';
import { SendIcon, FileUp } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { SignUpModal } from '@/components/SignUpModal';
import { SignInModal } from '@/components/SignInModal';
import { AuthChoiceModal } from '@/components/AuthChoiceModal';

export default function HomePage() {
  const [message, setMessage] = useState('');
  const [showSignUp, setShowSignUp] = useState(false);
  const [showSignIn, setShowSignIn] = useState(false);
  const [showAuthChoice, setShowAuthChoice] = useState(false);
  const router = useRouter();
  
  const handleSignIn = (e: React.MouseEvent) => {
    // router.push('/login');
    e.preventDefault();
    setShowSignIn(true);
  };

  const handleSignUp = (e: React.MouseEvent) => {
    e.preventDefault();
    setShowSignUp(true);
  };

  const handleMessageButtonClick = () => {
    setShowAuthChoice(true);
  };

  return (
    <div className="flex flex-col items-center pt-20">
      <div className="mb-6">
        <Image
          src="/codefox.svg"
          alt="CodeFox Logo"
          width={120}
          height={120}
          className="h-32 w-auto"
        />
      </div>

      <div className="mb-16">
        <p className="text-2xl font-medium text-indigo-600 dark:text-indigo-400">
          CodeFox makes everything better
        </p>
      </div>

      <div className="w-full max-w-3xl px-4">
        <div className="relative">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type your message..."
            className="w-full py-24 px-6 pr-12 text-lg border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400 align-top pt-6"
          />
          <button 
            className="absolute right-3 bottom-3 p-3 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 transition-colors"
            aria-label="Send message"
            onClick={handleMessageButtonClick}
          >
            <SendIcon size={20} />
          </button>
          <button 
            className="absolute left-3 bottom-3 flex items-center gap-2 text-gray-600 hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-400"
            aria-label="Upload file"
          >
            <FileUp size={20} />
            <span>Upload file</span>
          </button>
        </div>

      </div>
      <AuthChoiceModal 
        isOpen={showAuthChoice}
        onClose={() => setShowAuthChoice(false)}
        onSignUpClick={() => {
          setShowAuthChoice(false);
          setShowSignUp(true);
        }}
        onSignInClick={() => {
          setShowAuthChoice(false);
          setShowSignIn(true);
        }}
      />
      <SignUpModal 
        isOpen={showSignUp}
        onClose={() => setShowSignUp(false)}
      />
      <SignInModal 
        isOpen={showSignIn}
        onClose={() => setShowSignIn(false)}
      />
    </div>
  );
}
