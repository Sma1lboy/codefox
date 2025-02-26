'use client';

import { useState, useEffect } from 'react';

const TabComponent = ({ tabs }) => {
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

  return (
    <div className="w-full">
      <div className="flex border-b">
        {tabs.map((tab, index) => (
          <button
            key={index}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === index
                ? 'border-b-2 border-indigo-500 text-indigo-600 dark:text-indigo-400'
                : 'text-gray-600 hover:text-indigo-500 dark:text-gray-400 dark:hover:text-indigo-400'
            }`}
            onClick={() => handleTabChange(index)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div
        className={`py-4 transition-opacity duration-300 ease-in ${
          isVisible ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {tabs[activeTab].content}
      </div>
    </div>
  );
};

export default TabComponent;
