import React, {
  createContext,
  useState,
  ReactNode,
  useCallback,
  useMemo,
  useRef,
  useEffect,
} from 'react';
import { useLazyQuery, useMutation, useQuery } from '@apollo/client';
import {
  CREATE_PROJECT,
  GET_CHAT_DETAILS,
  GET_USER_PROJECTS,
} from '@/graphql/request';
import { Project } from '../project-modal';

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
  const [projects, setProjects] = useState<Project[]>([]);
  const [curProject, setCurProject] = useState<Project | undefined>(undefined);
  const [filePath, setFilePath] = useState<string | null>(null);
  const chatProjectCache = useRef<Map<string, Project | null>>(new Map());
  const MAX_RETRIES = 100;

  // Effect to clean up cache on unmount
  useEffect(() => {
    return () => {
      chatProjectCache.current.clear();
    };
  }, []);

  // Effect to restore current project state if needed
  useEffect(() => {
    if (projects.length > 0 && !curProject) {
      const lastProjectId = localStorage.getItem('lastProjectId');
      if (lastProjectId) {
        const project = projects.find((p) => p.id === lastProjectId);
        if (project) {
          setCurProject(project);
        }
      }
    }
  }, [projects, curProject]);

  // Effect to save current project id
  useEffect(() => {
    if (curProject?.id) {
      localStorage.setItem('lastProjectId', curProject.id);
    }
  }, [curProject?.id]);

  const { loading, error, refetch } = useQuery(GET_USER_PROJECTS, {
    fetchPolicy: 'network-only',
    onCompleted: (data) => {
      setProjects(data.getUserProjects);
      // If we have a current project in the list, update it
      if (curProject) {
        const updatedProject = data.getUserProjects.find(
          (p) => p.id === curProject.id
        );
        if (
          updatedProject &&
          JSON.stringify(updatedProject) !== JSON.stringify(curProject)
        ) {
          setCurProject(updatedProject);
        }
      }
    },
    onError: (error) => {
      console.error('Error fetching projects:', error);
      // Retry after 5 seconds on error
      setTimeout(refetch, 5000);
    },
  });

  const [createProject] = useMutation(CREATE_PROJECT, {
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
      if (chatProjectCache.current.has(chatId)) {
        return chatProjectCache.current.get(chatId) || null;
      }

      let retries = 0;
      while (retries < MAX_RETRIES) {
        try {
          console.log('testing ' + chatId);
          const { data } = await getChatDetail({ variables: { chatId } });

          if (data?.getChatDetails?.project) {
            chatProjectCache.current.set(chatId, data.getChatDetails.project);
            return data.getChatDetails.project;
          }
        } catch (error) {
          console.error('Error polling chat:', error);
        }

        await new Promise((resolve) => setTimeout(resolve, 6000));
        retries++;
      }

      chatProjectCache.current.set(chatId, null);
      return null;
    },
    [getChatDetail]
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
