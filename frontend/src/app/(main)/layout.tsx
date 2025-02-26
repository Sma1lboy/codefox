import { Metadata, Viewport } from 'next';
import React from 'react';
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
export default function HomeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen w-full bg-gray-50 dark:bg-gray-900 transition-colors">
      <main>{children}</main>
    </div>
  );
}
