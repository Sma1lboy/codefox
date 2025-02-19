import React, {
  createContext,
  useState,
  ReactNode,
  useCallback,
  useMemo,
} from 'react';
import { useLazyQuery, useMutation, useQuery } from '@apollo/client';
import { CREATE_PROJECT, GET_CHAT_DETAILS } from '@/graphql/request';
import { Project } from '../project-modal';
import { GET_USER_PROJECTS } from '@/utils/requests';
import { useAuth } from '@/app/hooks/useAuth';

export interface ProjectContextType {
  projects: Project[];
  setProjects: React.Dispatch<React.SetStateAction<Project[]>>;
  curProject: Project | undefined;
  setCurProject: React.Dispatch<React.SetStateAction<Project | undefined>>;
  filePath: string | null;
  setFilePath: React.Dispatch<React.SetStateAction<string | null>>;
  createNewProject: (projectName: string, description: string) => Promise<void>;
  pollChatProject: (chatId: string) => Promise<Project | null>;
}

export const ProjectContext = createContext<ProjectContextType | undefined>(
  undefined
);

export function ProjectProvider({ children }: { children: ReactNode }) {
  const { validateToken } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [curProject, setCurProject] = useState<Project | undefined>(undefined);
  const [filePath, setFilePath] = useState<string | null>(null);
  const [chatProjectCache, setChatProjectCache] = useState<
    Map<string, Project | null>
  >(new Map());
  const MAX_RETRIES = 100;

  useQuery(GET_USER_PROJECTS, {
    onCompleted: (data) => setProjects(data.getUserProjects),
    onError: (error) => console.error('Error fetching projects:', error),
  });

  const [createProject] = useMutation(CREATE_PROJECT, {
    context: {
      headers: {
        Authorization: `Bearer ${validateToken}`,
      },
    },
    onCompleted: (data) => {
      setProjects((prev) =>
        prev.some((p) => p.id === data.createProject.id)
          ? prev
          : [...prev, data.createProject]
      );
    },
    onError: (error) => alert(error),
  });

  const [getChatDetail] = useLazyQuery(GET_CHAT_DETAILS, {
    fetchPolicy: 'network-only',
    context: { Authorization: `Bearer ${validateToken}` },
  });

  const createNewProject = useCallback(
    async (projectName: string, description: string) => {
      if (!projectName || !description)
        return alert('Please fill in all fields!');
      try {
        createProject({
          variables: {
            createProjectInput: {
              projectName,
              description,
              databaseType: 'MySQL',
              packages: [],
            },
          },
        });
      } catch (err) {
        console.error('Failed to create project:', err);
      }
    },
    [createProject]
  );

  const pollChatProject = useCallback(
    async (chatId: string): Promise<Project | null> => {
      if (chatProjectCache.has(chatId)) {
        return chatProjectCache.get(chatId) || null;
      }

      let retries = 0;
      while (retries < MAX_RETRIES) {
        try {
          console.log('testing ' + chatId);
          const { data } = await getChatDetail({ variables: { chatId } });

          if (data?.getChatDetails?.project) {
            setChatProjectCache((prev) =>
              new Map(prev).set(chatId, data.getChatDetails.project)
            );
            return data.getChatDetails.project;
          }
        } catch (error) {
          console.error('Error polling chat:', error);
        }

        await new Promise((resolve) => setTimeout(resolve, 6000));
        retries++;
      }

      setChatProjectCache((prev) => new Map(prev).set(chatId, null));
      return null;
    },
    [getChatDetail, chatProjectCache]
  );

  const contextValue = useMemo(
    () => ({
      projects,
      setProjects,
      curProject,
      setCurProject,
      filePath,
      setFilePath,
      createNewProject,
      pollChatProject,
    }),
    [projects, curProject, filePath, createNewProject, pollChatProject]
  );

  return (
    <ProjectContext.Provider value={contextValue}>
      {children}
    </ProjectContext.Provider>
  );
}
