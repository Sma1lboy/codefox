import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { BaseProviders } from './providers/BaseProvider';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Codefox',
  description: 'The best dev project generator',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <BaseProviders>{children}</BaseProviders>
      </body>
    </html>
  );
}
