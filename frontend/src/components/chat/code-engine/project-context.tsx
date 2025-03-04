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
  FORK_PROJECT,
  GET_CHAT_DETAILS,
  GET_USER_PROJECTS,
  UPDATE_PROJECT_PUBLIC_STATUS,
} from '@/graphql/request';
import { Project } from '../project-modal';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner'; // Assuming you use Sonner for toasts
import { useAuthContext } from '@/providers/AuthProvider';

export interface ProjectContextType {
  projects: Project[];
  setProjects: React.Dispatch<React.SetStateAction<Project[]>>;
  curProject: Project | undefined;
  setCurProject: React.Dispatch<React.SetStateAction<Project | undefined>>;
  filePath: string | null;
  setFilePath: React.Dispatch<React.SetStateAction<string | null>>;
  createNewProject: (projectName: string, description: string) => Promise<void>;
  createProjectFromPrompt: (
    // TODO(Sma1lboy): should adding packages
    prompt: string,
    isPublic: boolean,
    model?: string
  ) => Promise<boolean>;
  forkProject: (projectId: string) => Promise<void>;
  setProjectPublicStatus: (
    projectId: string,
    isPublic: boolean
  ) => Promise<void>;
  pollChatProject: (chatId: string) => Promise<Project | null>;
  isLoading: boolean;
}

export const ProjectContext = createContext<ProjectContextType | undefined>(
  undefined
);

export function ProjectProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { isAuthorized } = useAuthContext();
  const [projects, setProjects] = useState<Project[]>([]);
  const [curProject, setCurProject] = useState<Project | undefined>(undefined);
  const [filePath, setFilePath] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
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
    skip: !isAuthorized,
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

  // Create project mutation
  const [createProject] = useMutation(CREATE_PROJECT, {
    onCompleted: (data) => {
      // Navigate to chat page after project creation
      if (data?.createProject?.id) {
        toast.success('Project created successfully!');
        router.push(`/chat/${data.createProject.id}`);
      }
    },
    onError: (error) => {
      toast.error(`Failed to create project: ${error.message}`);
    },
  });

  // Fork project mutation
  const [forkProjectMutation] = useMutation(FORK_PROJECT, {
    onCompleted: (data) => {
      if (data?.forkProject?.id) {
        toast.success('Project forked successfully!');
        router.push(`/chat/${data.forkProject.id}`);
      }
    },
    onError: (error) => {
      toast.error(`Failed to fork project: ${error.message}`);
    },
  });

  // Update project public status mutation
  const [updateProjectPublicStatusMutation] = useMutation(
    UPDATE_PROJECT_PUBLIC_STATUS,
    {
      onCompleted: (data) => {
        toast.success(
          `Project visibility updated to ${data.updateProjectPublicStatus.isPublic ? 'public' : 'private'}`
        );

        // Update the project in the local state
        setProjects((prev) =>
          prev.map((project) =>
            project.id === data.updateProjectPublicStatus.id
              ? {
                  ...project,
                  isPublic: data.updateProjectPublicStatus.isPublic,
                }
              : project
          )
        );

        // Update current project if it's the one being modified
        if (curProject?.id === data.updateProjectPublicStatus.id) {
          setCurProject((prev) =>
            prev
              ? {
                  ...prev,
                  isPublic: data.updateProjectPublicStatus.isPublic,
                }
              : prev
          );
        }
      },
      onError: (error) => {
        toast.error(`Failed to update project visibility: ${error.message}`);
      },
    }
  );

  const [getChatDetail] = useLazyQuery(GET_CHAT_DETAILS, {
    fetchPolicy: 'network-only',
  });

  // Original createNewProject function
  const createNewProject = useCallback(
    async (projectName: string, description: string) => {
      if (!projectName || !description) {
        toast.error('Please fill in all fields!');
        return;
      }

      try {
        setIsLoading(true);
        await createProject({
          variables: {
            createProjectInput: {
              projectName,
              description,
              databaseType: 'MySQL',
              packages: [],
              public: false, // Default to private
            },
          },
        });
      } catch (err) {
        console.error('Failed to create project:', err);
      } finally {
        setIsLoading(false);
      }
    },
    [createProject]
  );

  // New function to create project from prompt
  const createProjectFromPrompt = useCallback(
    async (
      prompt: string,
      isPublic: boolean,
      model = 'gpt-4o-mini'
    ): Promise<boolean> => {
      if (!prompt.trim()) {
        toast.error('Please enter a project description');
        return false;
      }

      try {
        setIsLoading(true);

        // Default packages based on typical web project needs
        const defaultPackages = [
          { name: 'react', version: '^18.2.0' },
          { name: 'next', version: '^13.4.0' },
          { name: 'tailwindcss', version: '^3.3.0' },
        ];

        const result = await createProject({
          variables: {
            createProjectInput: {
              description: prompt,
              packages: defaultPackages,
              public: isPublic,
              model: model,
            },
          },
        });

        return !!result.data?.createProject;
      } catch (error) {
        console.error('Error creating project:', error);
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [createProject]
  );

  // New function to fork a project
  const forkProject = useCallback(
    async (projectId: string) => {
      try {
        setIsLoading(true);
        await forkProjectMutation({
          variables: {
            projectId,
          },
        });
      } catch (error) {
        console.error('Error forking project:', error);
      } finally {
        setIsLoading(false);
      }
    },
    [forkProjectMutation]
  );

  // Function to update project public status
  const setProjectPublicStatus = useCallback(
    async (projectId: string, isPublic: boolean) => {
      try {
        await updateProjectPublicStatusMutation({
          variables: {
            projectId,
            isPublic,
          },
        });
      } catch (error) {
        console.error('Error updating project visibility:', error);
      }
    },
    [updateProjectPublicStatusMutation]
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
      createProjectFromPrompt,
      forkProject,
      setProjectPublicStatus,
      pollChatProject,
      isLoading,
    }),
    [
      projects,
      curProject,
      filePath,
      createNewProject,
      createProjectFromPrompt,
      forkProject,
      setProjectPublicStatus,
      pollChatProject,
      isLoading,
    ]
  );

  return (
    <ProjectContext.Provider value={contextValue}>
      {children}
    </ProjectContext.Provider>
  );
}
