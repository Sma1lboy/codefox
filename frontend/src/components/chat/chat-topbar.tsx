'use client';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import React from 'react';
import { CaretSortIcon } from '@radix-ui/react-icons';
import { Button } from '../ui/button';
import { useModels } from '@/hooks/useModels';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

export default function ChatTopbar() {
  const [open, setOpen] = React.useState(false);
  const {
    models,
    loading: modelsLoading,
    setSelectedModel,
    selectedModel,
  } = useModels();

  const handleModelChange = (modelName: string) => {
    setSelectedModel(modelName);
    if (typeof window !== 'undefined') {
      localStorage.setItem('selectedModel', modelName);
    }
    setOpen(false);
  };

  return (
    <div className="w-full flex px-4 py-6 items-center justify-center">
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
              : selectedModel || 'Loading models...'}
            <CaretSortIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[300px] p-0 overflow-hidden"
          align="center"
          side="bottom"
          sideOffset={4}
        >
          <div className="px-3 py-2 border-b">
            <h4 className="font-medium text-sm">Select Model</h4>
            <p className="text-xs text-muted-foreground">
              Choose a model for your chat
            </p>
          </div>
          <ScrollArea className="h-[320px]">
            {modelsLoading ? (
              <div className="px-3 py-2">
                <Button variant="ghost" disabled className="w-full">
                  Loading models...
                </Button>
              </div>
            ) : models.length > 0 ? (
              <div className="flex flex-col">
                {models.map((model, index) => (
                  <div key={model}>
                    <Button
                      variant="ghost"
                      className={cn(
                        'w-full justify-start font-normal rounded-none px-3 py-2 h-auto',
                        selectedModel === model && 'bg-accent'
                      )}
                      onClick={() => handleModelChange(model)}
                    >
                      {model}
                    </Button>
                    {index < models.length - 1 && (
                      <Separator className="mx-3" />
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-3 py-2">
                <Button variant="ghost" disabled className="w-full">
                  No models available
                </Button>
              </div>
            )}
          </ScrollArea>
        </PopoverContent>
      </Popover>
    </div>
  );
}
