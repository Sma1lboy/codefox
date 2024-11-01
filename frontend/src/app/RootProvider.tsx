'use client';

import client from '@/lib/client';
import { ApolloProvider } from '@apollo/client';
import { ThemeProvider } from 'next-themes';
import { Toaster } from 'sonner';
import { AuthProvider } from './AuthProvider';

export const RootProvider = ({ children }) => {
  return (
    <ApolloProvider client={client}>
      <AuthProvider>
        <ThemeProvider attribute="class" defaultTheme="dark">
          {children}
          <Toaster />
        </ThemeProvider>
      </AuthProvider>
    </ApolloProvider>
  );
};
