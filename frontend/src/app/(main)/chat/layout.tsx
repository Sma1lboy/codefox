import type { Metadata, Viewport } from 'next';
import MainLayout from './MainLayout';

export default function Layout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <MainLayout>{children}</MainLayout>;
}
