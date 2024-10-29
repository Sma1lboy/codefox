'use client';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import React, { useEffect } from 'react';
import { CaretSortIcon, HamburgerMenuIcon } from '@radix-ui/react-icons';
import { Sidebar } from '../sidebar';
import { Button } from '../ui/button';
import { Message } from '../types';
import { useModels } from '@/app/hooks/useModels';

interface ChatTopbarProps {
  setSelectedModel: React.Dispatch<React.SetStateAction<string>>;
  chatId?: string;
  messages: Message[];
  setMessages: (messages: Message[]) => void;
}

export default function ChatTopbar({
  setSelectedModel,
  chatId,
  messages,
  setMessages,
}: ChatTopbarProps) {
  const [open, setOpen] = React.useState(false);
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [currentModel, setCurrentModel] = React.useState<string | null>(null);

  const { models, loading: modelsLoading } = useModels();

  useEffect(() => {
    setCurrentModel(models[0] || null);
  }, []);

  const handleModelChange = (modelName: string) => {
    setCurrentModel(modelName);
    setSelectedModel(modelName);
    if (typeof window !== 'undefined') {
      localStorage.setItem('selectedModel', modelName);
    }
    setOpen(false);
  };

  const handleCloseSidebar = () => {
    setSheetOpen(false);
  };

  return (
    <div className="w-full flex px-4 py-6 items-center justify-between lg:justify-center">
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetTrigger>
          <HamburgerMenuIcon className="lg:hidden w-5 h-5" />
        </SheetTrigger>
        <SheetContent side="left">
          <Sidebar
            chatId={chatId || ''}
            isCollapsed={false}
            isMobile={false}
            setMessages={setMessages}
            closeSidebar={handleCloseSidebar}
          />
        </SheetContent>
      </Sheet>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            disabled={modelsLoading}
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-[300px] justify-between"
          >
            {modelsLoading
              ? 'Loading models...'
              : currentModel || 'Loading models...'}
            <CaretSortIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-1">
          {modelsLoading ? (
            <Button variant="ghost" disabled className="w-full">
              Loading models...
            </Button>
          ) : models.length > 0 ? (
            models.map((model) => (
              <Button
                key={model}
                variant="ghost"
                className="w-full"
                onClick={() => handleModelChange(model)}
              >
                {model}
              </Button>
            ))
          ) : (
            <Button variant="ghost" disabled className="w-full">
              No models available
            </Button>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}
