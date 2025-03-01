//frontend/src/app/layout.tsx
import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { BaseProviders } from '@/providers/BaseProvider';
import NavLayout from '@/components/root/navLayout';
import RootLayout from '@/components/root/root-layout';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Codefox - The best dev project generator',
  description: 'The best dev project generator',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <BaseProviders>
          <div className="min-h-screen w-full bg-gray-50 dark:bg-gray-900 transition-colors">
            <RootLayout>{children}</RootLayout>
          </div>
        </BaseProviders>
      </body>
    </html>
  );
}
