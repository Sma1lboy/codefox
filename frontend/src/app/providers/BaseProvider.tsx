'use client';

import client from '@/lib/client';
import { ApolloProvider } from '@apollo/client';
import { ThemeProvider } from 'next-themes';
import { Toaster } from 'sonner';
import { AuthProvider } from '../AuthProvider';

interface ProvidersProps {
  children: React.ReactNode;
}

// Base Provider for the app
export function BaseProviders({ children }: ProvidersProps) {
  return (
    <ApolloProvider client={client}>
      <AuthProvider>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          {children}
          <Toaster position="top-right" />
        </ThemeProvider>
      </AuthProvider>
    </ApolloProvider>
  );
}
