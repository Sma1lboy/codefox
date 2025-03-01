import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { BaseProviders } from '@/providers/BaseProvider';
import NavLayout from '@/components/root/navLayout';

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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <BaseProviders>
          <div className="min-h-screen w-full bg-gray-50 dark:bg-gray-900 transition-colors">
            <NavLayout>{children}</NavLayout>
          </div>
        </BaseProviders>
      </body>
    </html>
  );
}
