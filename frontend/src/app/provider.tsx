'use client';
import client from '@/utils/client';
import { ApolloProvider } from '@apollo/client';
import { ThemeProvider } from 'next-themes';
import { Toaster } from 'sonner';

export const RootProvider = ({ children }) => {
  return (
    <ApolloProvider client={client}>
      <ThemeProvider attribute="class" defaultTheme="dark">
        {children}
        <Toaster />
      </ThemeProvider>
    </ApolloProvider>
  );
};
