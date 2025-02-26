import React from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';

const FileExplorerButton = ({
  isExplorerCollapsed,
  setIsExplorerCollapsed,
}: {
  isExplorerCollapsed: boolean;
  setIsExplorerCollapsed: (value: boolean) => void;
}) => {
  return (
    <div className="absolute bottom-0 left-0">
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              onClick={() => setIsExplorerCollapsed(!isExplorerCollapsed)}
              className="ml-2 mb-2 p-2 rounded-lg hover:bg-primary/10 dark:hover:bg-primary/20 border-primary dark:border-white"
            >
              <svg
                viewBox="0 0 24 24"
                width="20"
                height="20"
                stroke="currentColor"
                strokeWidth="2"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={`transform transition-transform duration-150 ${
                  isExplorerCollapsed ? 'rotate-0' : 'rotate-180'
                }`}
              >
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </Button>
          </TooltipTrigger>
          <TooltipContent
            side="right"
            className="bg-primary text-primary-foreground px-3 py-1.5 rounded-md transition-all duration-150"
          >
            <p>{isExplorerCollapsed ? 'Open File Tree' : 'Close File Tree'}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
};

export default FileExplorerButton;
