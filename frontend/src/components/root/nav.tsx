'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const FloatingNavbar = ({ tabs, logo, name, authButtons }) => {
  const [activeTab, setActiveTab] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  // Add transition effect when switching tabs
  const handleTabChange = (index) => {
    if (index !== activeTab) {
      setIsVisible(false);
      setTimeout(() => {
        setActiveTab(index);
        setIsVisible(true);
      }, 300); // Match transition duration
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
    <div className="fixed top-5 left-0 right-0 z-50">
      <motion.div
        className="w-full flex justify-between items-center px-6 py-4"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        {/* Left side - Logo and Name */}
        <motion.div
          className="flex items-center space-x-3"
          variants={itemVariants}
        >
          {logo && <div className="h-10 w-auto overflow-hidden">{logo}</div>}
          <span className="font-bold text-2xl text-primary-600 dark:text-primary-400 transition-transform hover:scale-105 duration-300">
            {name}
          </span>
        </motion.div>

        {/* Right side - Navigation tabs and auth buttons */}
        <motion.div
          className="flex items-center space-x-4"
          variants={itemVariants}
        >
          {/* Navigation tabs in a container */}
          <div className="relative bg-gray-100 dark:bg-gray-800 rounded-full px-2 py-1 shadow-md">
            <div className="flex relative z-10">
              {tabs.map((tab, index) => (
                <button
                  key={index}
                  className={`relative px-4 py-2 font-medium text-sm rounded-full transition-all duration-300 ${
                    activeTab === index
                      ? 'text-white'
                      : 'text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white'
                  }`}
                  onClick={() => handleTabChange(index)}
                >
                  {/* Animated background for active tab */}
                  <AnimatePresence>
                    {activeTab === index && (
                      <motion.span
                        className="absolute inset-0 bg-primary-500 dark:bg-primary-600 rounded-full -z-10"
                        layoutId="activeTabBackground"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                      />
                    )}
                  </AnimatePresence>
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Auth buttons passed as prop */}
          {authButtons}
        </motion.div>
      </motion.div>

      {/* Content area - Only render if there's content for the active tab */}
      {tabs[activeTab].content && (
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            className="container mx-auto mt-20 py-4 px-6"
            initial="hidden"
            animate="visible"
            exit="hidden"
            variants={itemVariants}
          >
            {tabs[activeTab].content}
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
};

export default FloatingNavbar;
