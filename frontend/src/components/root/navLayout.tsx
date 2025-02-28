'use client';
import React, { useEffect, useState, useRef } from 'react';
import { Sun, Moon } from 'lucide-react';
import Image from 'next/image';
import { useTheme } from 'next-themes';
import { motion } from 'framer-motion'; // 引入 Framer Motion
import { useAuthContext } from '@/providers/AuthProvider';
import FloatingNavbar, { NavbarRef } from './nav';
import { SignUpModal } from '../sign-up-modal';
import { SignInModal } from '../sign-in-modal';
import ChatSideBar from '@/components/sidebar';
import { ProjectProvider } from '@/components/chat/code-engine/project-context';
import { SidebarProvider } from '@/components/ui/sidebar';

// Define the navigation layout props
interface NavLayoutProps {
  children: React.ReactNode;
}

export default function NavLayout({ children }: NavLayoutProps) {
  const navRef = useRef<NavbarRef>(null);
  const { isAuthorized, logout } = useAuthContext();
  const { theme, setTheme } = useTheme();
  const [showSignUp, setShowSignUp] = useState(false);
  const [showSignIn, setShowSignIn] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [hideNewChat, setHideNewChat] = useState(true); // true 为隐藏, false 为显示
  
  // Watch authentication state and trigger sidebar
  useEffect(() => {
    setShowSidebar(isAuthorized);
    setHideNewChat(isAuthorized); // 登录后依然隐藏 New Chat
  }, [isAuthorized]);

  // Set up navigation tabs with paths
  const navTabs = [
    { label: 'Home', path: '/' },
    { label: 'Features', path: '/features' },
    { label: 'About', path: '/about' },
    { label: 'Contact', path: '/contact' },
  ];

  const logoElement = (
    <Image
      src="/codefox.svg"
      alt="CodeFox Logo"
      width={40}
      height={40}
      className="h-10 w-auto"
    />
  );

  // Auth buttons to pass to navbar
  const authButtons = (
    <>
      <button
        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
        aria-label="Toggle theme"
      >
        {theme === 'dark' ? (
          <Sun className="h-5 w-5 text-gray-600 dark:text-gray-400" />
        ) : (
          <Moon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
        )}
      </button>

      {!isAuthorized ? (
        <>
          <button
            onClick={() => setShowSignIn(true)}
            className="px-4 py-2 rounded-md bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600 transition-colors"
          >
            Sign In
          </button>
          <button
            onClick={() => setShowSignUp(true)}
            className="px-4 py-2 rounded-md bg-primary-500 text-white hover:bg-primary-600 transition-colors"
          >
            Sign Up
          </button>
        </>
      ) : (
        <button
          onClick={() => {
            logout();
            setShowSidebar(false);
          }}
          className="px-4 py-2 rounded-md bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors"
        >
          Logout
        </button>
      )}
    </>
  );

  return (
    <SidebarProvider>
      <div className="min-h-screen flex">
        {/** Sidebar 固定在左边 */}
        {showSidebar && (
          <motion.div
            initial={{ x: -300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -300, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 80, damping: 20 }}
            className="fixed left-0 top-0 h-full z-50"
          >
            <ProjectProvider>
              <ChatSideBar
                setIsModalOpen={setShowSignUp}
                isCollapsed={isCollapsed}
                setIsCollapsed={setIsCollapsed}
                isMobile={false}
                currentChatId={''}
                chatListUpdated={false}
                setChatListUpdated={() => {}}
                chats={[]}
                loading={false}
                error={null}
                onRefetch={() => {}}
              />
            </ProjectProvider>
          </motion.div>
        )}

        {/** Navbar 和 Main Content 作为一个整体进行平滑移动 */}
        <motion.div
          animate={{
            x: showSidebar ? (isCollapsed ? 80 : 250) : 100,
          }}
          transition={{ type: 'spring', stiffness: 80, damping: 20 }}
          className="flex-1"
        >
          {/** 把 FloatingNavbar 和 Main Content 放在一起 */}
          <FloatingNavbar
            ref={navRef}
            tabs={navTabs}
            logo={logoElement}
            name="CodeFox"
            authButtons={authButtons}
          />

          <div className="container mx-auto pt-32 pb-24 px-6">{children}</div>
        </motion.div>
      </div>

      <SignUpModal isOpen={showSignUp} onClose={() => setShowSignUp(false)} />
      <SignInModal isOpen={showSignIn} onClose={() => setShowSignIn(false)} />
    </SidebarProvider>
  );
}
