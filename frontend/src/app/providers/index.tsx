'use client';

import client from '@/lib/client';
import { ApolloProvider } from '@apollo/client';
import { ThemeProvider } from 'next-themes';
import { Toaster } from 'sonner';
import { AuthProvider } from '../AuthProvider';
import RootLayout from '../RootLayout';

interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <ApolloProvider client={client}>
      <AuthProvider>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          <RootLayout>{children}</RootLayout>
          <Toaster position="top-right" />
        </ThemeProvider>
      </AuthProvider>
    </ApolloProvider>
  );
}
