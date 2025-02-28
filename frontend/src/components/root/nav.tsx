'use client';
import {
  useState,
  useEffect,
  forwardRef,
  useImperativeHandle,
  ReactNode,
} from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

// Define types for tab items
interface TabItem {
  label: string;
  path: string;
  key?: string;
  icon?: ReactNode;
}

// Define the ref interface
export interface NavbarRef {
  activeTab: number;
  setActiveTab: (index: number) => void;
}

// Define props interface
interface FloatingNavbarProps {
  tabs: TabItem[];
  logo?: ReactNode;
  name: string;
  authButtons?: ReactNode;
  className?: string;
  containerClassName?: string;
  tabsContainerClassName?: string;
  activeTabClassName?: string;
  inactiveTabClassName?: string;
  logoContainerClassName?: string;
  nameClassName?: string;
  authButtonsContainerClassName?: string;
  onTabChange?: (index: number) => void;
  initialTab?: number;
  animationDuration?: number;
}

// Extended FloatingNavbar with Next.js navigation
const FloatingNavbar = forwardRef<NavbarRef, FloatingNavbarProps>(
  (
    {
      tabs,
      logo,
      name,
      authButtons,
      className = '',
      containerClassName = '',
      tabsContainerClassName = '',
      activeTabClassName = '',
      inactiveTabClassName = '',
      logoContainerClassName = '',
      nameClassName = '',
      authButtonsContainerClassName = '',
      onTabChange,
      initialTab = 0,
      animationDuration = 300,
    },
    ref
  ) => {
    const pathname = usePathname();

    // Find the active tab index based on the current pathname
    const findActiveTabIndex = () => {
      const index = tabs.findIndex((tab) => tab.path === pathname);
      return index >= 0 ? index : 0; // Default to first tab if path not found
    };

    const [activeTab, setActiveTab] = useState(findActiveTabIndex());
    const [isVisible, setIsVisible] = useState(true);

    // Update active tab when pathname changes
    useEffect(() => {
      const newActiveTab = findActiveTabIndex();
      if (newActiveTab !== activeTab) {
        setActiveTab(newActiveTab);
      }
    }, [pathname]);

    // Expose the activeTab value to parent components through the ref
    useImperativeHandle(ref, () => ({
      activeTab,
      setActiveTab: (index) => handleTabChange(index),
    }));

    // Handle tab change locally (for animation purposes)
    const handleTabChange = (index: number) => {
      if (index !== activeTab) {
        setIsVisible(false);
        setTimeout(() => {
          setActiveTab(index);
          setIsVisible(true);
          // Call the onTabChange callback if provided
          if (onTabChange) onTabChange(index);
        }, animationDuration);
      }
    };

    // Ensure content is visible on initial render
    useEffect(() => {
      setIsVisible(true);
    }, []);

    // Using the same animation variants as in page.tsx
    const containerVariants = {
      hidden: { opacity: 0 },
      visible: {
        opacity: 1,
        transition: {
          duration: 0.8,
          ease: 'easeInOut',
          staggerChildren: 0.3,
        },
      },
    };

    const itemVariants = {
      hidden: { opacity: 0, y: 20 },
      visible: {
        opacity: 1,
        y: 0,
        transition: {
          duration: 0.5,
          ease: 'easeOut',
        },
      },
    };

    return (
      <div className={`fixed top-5 left-0 right-0 z-50 ${className}`}>
        <motion.div
          className={`w-full flex justify-between items-center px-6 py-4 ${containerClassName}`}
          initial="hidden"
          animate="visible"
          variants={containerVariants}
        >
          {/* Left side - Logo and Name */}
          <motion.div
            className={`flex items-center space-x-3 ${logoContainerClassName}`}
            variants={itemVariants}
          >
            {logo && <div className="h-10 w-auto overflow-hidden">{logo}</div>}
            <span
              className={`font-bold text-2xl text-primary-600 dark:text-primary-400 transition-transform hover:scale-105 duration-300 ${nameClassName}`}
            >
              {name}
            </span>
          </motion.div>

          {/* Right side - Navigation tabs and auth buttons */}
          <motion.div
            className={`flex items-center space-x-4  ${authButtonsContainerClassName}`}
            variants={itemVariants}
          >
            {/* Navigation tabs in a container */}
            <div
              className={`relative left-[-40px] bg-gray-100 dark:bg-gray-800 rounded-full px-2 py-1 shadow-md ${tabsContainerClassName}`}
            >
              <div className="flex relative z-10">
                {tabs.map((tab, index) => (
                  <Link
                    href={tab.path}
                    key={tab.key || index}
                    onClick={(e) => {
                      if (tab.label === 'Pricing') {
                        e.preventDefault(); // 阻止默认跳转
                        alert('Coming Soon'); // 显示提示
                      } else if (tab.label === 'Codefox Journey') {
                        e.preventDefault(); // 阻止默认跳转
                        window.open('https://github.com/Sma1lboy/codefox', '_blank'); // 新标签打开 GitHub 页面
                      } else {
                        handleTabChange(index);
                      }
                    }}
                    className="focus:outline-none"
                  >
                    <div
                      className={`relative px-4 py-2 font-medium text-sm rounded-full transition-all duration-300 ${
                        activeTab === index
                          ? `text-white ${activeTabClassName}`
                          : `text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white ${inactiveTabClassName}`
                      }`}
                    >
                      {/* Icon if available */}
                      {tab.icon && <span className="mr-2">{tab.icon}</span>}

                      {/* Animated background for active tab */}
                      <AnimatePresence>
                        {activeTab === index && (
                          <motion.span
                            className="absolute inset-0 bg-primary-500 dark:bg-primary-600 rounded-full -z-10"
                            layoutId="activeTabBackground"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: animationDuration / 1000 }}
                          />
                        )}
                      </AnimatePresence>
                      {tab.label}
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            {/* Auth buttons passed as prop */}
            {authButtons}
          </motion.div>
        </motion.div>
      </div>
    );
  }
);

FloatingNavbar.displayName = 'FloatingNavbar';

export default FloatingNavbar;
