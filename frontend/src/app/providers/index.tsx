'use client';

import client from '@/lib/client';
import { ApolloProvider } from '@apollo/client';
import { ThemeProvider } from 'next-themes';
import { Toaster } from 'sonner';
import { AuthProvider } from '../AuthProvider';
import RootLayout from '../RootLayout';
import { BaseProviders } from './BaseProvider';

interface ProvidersProps {
  children: React.ReactNode;
}

export function RootProvider({ children }: ProvidersProps) {
  return (
    <BaseProviders>
      <RootLayout>{children}</RootLayout>
    </BaseProviders>
  );
}
