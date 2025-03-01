'use client';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import ProjectModal from '@/components/chat/project-modal';
import { useQuery } from '@apollo/client';
import { GET_USER_PROJECTS } from '@/graphql/request';
import { useAuthContext } from '@/providers/AuthProvider';
import { ProjectProvider } from './code-engine/project-context';

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthorized, isChecking } = useAuthContext();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { refetch } = useQuery(GET_USER_PROJECTS);
  const router = useRouter();

  useEffect(() => {
    if (isChecking || !isAuthorized) {
      router.push('/');
    }
  }, [isChecking, isAuthorized, router]);

  if (isChecking) {
    return (
      <div className="flex h-screen items-center justify-center">
        Loading...
      </div>
    );
  }

  if (!isAuthorized) {
    return null;
  }

  return (
    <main className="flex h-[calc(100dvh)] flex-col items-center">
      <ProjectProvider>
        <ProjectModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          refetchProjects={refetch}
        />
        {/* 仅渲染聊天主要内容，侧边栏在 NavLayout 中统一管理 */}
        <div className="w-full h-full">{children}</div>
      </ProjectProvider>
    </main>
  );
}
