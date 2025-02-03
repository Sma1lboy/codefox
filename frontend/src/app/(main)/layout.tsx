import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import MainLayout from './MainLayout';
import { SidebarProvider } from '@/components/ui/sidebar';

import { getProjectPath, getProjectsDir, getRootDir } from 'codefox-common';
import { FileReader } from '@/utils/file-reader';
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

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <MainLayout>{children}</MainLayout>;
}
