'use client';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import React from 'react';
import { CaretSortIcon } from '@radix-ui/react-icons';
import { Button } from '../ui/button';
import { useModels } from '@/app/hooks/useModels';

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
