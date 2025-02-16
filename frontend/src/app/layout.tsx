import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { BaseProviders } from './providers/BaseProvider';
import { ThemeProvider } from './providers/ThemeProvider';
import ApolloWrapper from './providers/ApolloProvider';
import { AuthProvider } from '@/contexts/AuthContext'; // ✅ Import AuthProvider

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Codefox',
  description: 'The best dev project generator',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ApolloWrapper>
          {' '}
          {/* ✅ Ensure Apollo is ready first */}
          <AuthProvider>
            {' '}
            {/* ✅ Then wrap AuthProvider inside */}
            <ThemeProvider>{children}</ThemeProvider>
          </AuthProvider>
        </ApolloWrapper>
      </body>
    </html>
  );
}
