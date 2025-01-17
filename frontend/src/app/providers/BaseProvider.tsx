'use client';

import dynamic from 'next/dynamic';
import { ThemeProvider } from 'next-themes';
import { Toaster } from 'sonner';
import { AuthProvider } from './AuthProvider';

const DynamicApolloProvider = dynamic(() => import('./DynamicApolloProvider'), {
  ssr: false,
});

interface ProvidersProps {
  children: React.ReactNode;
}

export function BaseProviders({ children }: ProvidersProps) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <DynamicApolloProvider>
        <AuthProvider>
          {children}
          <Toaster position="top-right" />
        </AuthProvider>
      </DynamicApolloProvider>
    </ThemeProvider>
  );
}
