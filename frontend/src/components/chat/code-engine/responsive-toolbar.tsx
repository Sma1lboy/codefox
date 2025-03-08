'use client';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Code as CodeIcon,
  Copy,
  Eye,
  GitFork,
  Share2,
  Terminal,
} from 'lucide-react';

interface ResponsiveToolbarProps {
  isLoading: boolean;
  activeTab: 'preview' | 'code' | 'console';
  setActiveTab: (tab: 'preview' | 'code' | 'console') => void;
}

const ResponsiveToolbar = ({
  isLoading,
  activeTab,
  setActiveTab,
}: ResponsiveToolbarProps) => {
  const containerRef = useRef(null);
  const [containerWidth, setContainerWidth] = useState(700);
  const [visibleTabs, setVisibleTabs] = useState(3);
  const [compactIcons, setCompactIcons] = useState(false);

  // Observe container width changes
  useEffect(() => {
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }
    return () => observer.disconnect();
  }, []);

  // Adjust visible tabs and icon style based on container width
  useEffect(() => {
    if (containerWidth > 650) {
      setVisibleTabs(3);
      setCompactIcons(false);
    } else if (containerWidth > 550) {
      setVisibleTabs(2);
      setCompactIcons(false);
    } else if (containerWidth > 450) {
      setVisibleTabs(1);
      setCompactIcons(true);
    } else {
      setVisibleTabs(0);
      setCompactIcons(true);
    }
  }, [containerWidth]);

  return (
    <div
      ref={containerRef}
      className="flex items-center justify-between p-4 border-b w-full bg-background/60 backdrop-blur supports-[backdrop-filter]:bg-background/60"
    >
      <div className="flex items-center space-x-2">
        <Button
          variant={activeTab === 'preview' ? 'default' : 'outline'}
          className="text-sm"
          onClick={() => setActiveTab('preview')}
          disabled={isLoading}
        >
          <Eye className="w-4 h-4 mr-1" />
          Preview
        </Button>
        {visibleTabs >= 2 && (
          <Button
            variant={activeTab === 'code' ? 'default' : 'outline'}
            className="text-sm"
            onClick={() => setActiveTab('code')}
            disabled={isLoading}
          >
            <CodeIcon className="w-4 h-4 mr-1" />
            Code
          </Button>
        )}
        {visibleTabs >= 3 && (
          <Button
            variant={activeTab === 'console' ? 'default' : 'outline'}
            className="text-sm"
            onClick={() => setActiveTab('console')}
            disabled={isLoading}
          >
            <Terminal className="w-4 h-4 mr-1" />
            Console
          </Button>
        )}
      </div>

      <div className="flex items-center space-x-2">
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            className={`p-0 ${compactIcons ? 'hidden' : 'block'}`}
            disabled={isLoading}
          >
            <GitFork className="w-5 h-5" />
          </Button>
          <Button
            variant="ghost"
            className={`p-0 ${compactIcons ? 'hidden' : 'block'}`}
            disabled={isLoading}
          >
            <Share2 className="w-5 h-5" />
          </Button>
          <Button
            variant="ghost"
            className={`p-0 ${compactIcons ? 'hidden' : 'block'}`}
            disabled={isLoading}
          >
            <Copy className="w-5 h-5" />
          </Button>
        </div>
        <div className="flex items-center space-x-2">
          {!compactIcons && (
            <>
              <Button
                variant="outline"
                className="text-sm"
                disabled={isLoading}
              >
                Supabase
              </Button>
              <Button
                variant="outline"
                className="text-sm"
                disabled={isLoading}
              >
                Publish
              </Button>
            </>
          )}
          {compactIcons && (
            <Button variant="outline" className="p-2" disabled={isLoading}>
              <Share2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResponsiveToolbar;
