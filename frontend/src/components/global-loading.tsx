'use client';
import { Loader2 } from 'lucide-react';
import { useTheme } from 'next-themes';

export const LoadingPage = () => {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  return (
    <div
      className={`fixed inset-0 flex items-center justify-center transition-colors duration-200 ${
        isDark ? 'bg-background dark:bg-background' : 'bg-background'
      }`}
    >
      <div className="flex flex-col items-center gap-4">
        <Loader2
          className={`h-12 w-12 animate-spin ${
            isDark ? 'text-foreground dark:text-foreground' : 'text-foreground'
          }`}
        />
        <p
          className={`text-lg font-medium ${
            isDark ? 'text-foreground dark:text-foreground' : 'text-foreground'
          }`}
        >
          Loading...
        </p>
      </div>
    </div>
  );
};
