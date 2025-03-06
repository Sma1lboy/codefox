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
  UPDATE_PROJECT_PHOTO_URL,
} from '@/graphql/request';
import { Project } from '../project-modal';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useAuthContext } from '@/providers/AuthProvider';
import { URL_PROTOCOL_PREFIX } from '@/utils/const';

export interface ProjectContextType {
  projects: Project[];
  setProjects: React.Dispatch<React.SetStateAction<Project[]>>;
  curProject: Project | undefined;
  setCurProject: React.Dispatch<React.SetStateAction<Project | undefined>>;
  filePath: string | null;
  setFilePath: React.Dispatch<React.SetStateAction<string | null>>;
  createNewProject: (projectName: string, description: string) => Promise<void>;
  createProjectFromPrompt: (
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
  getWebUrl: (
    projectPath: string
  ) => Promise<{ domain: string; containerId: string }>;
  takeProjectScreenshot: (projectId: string, url: string) => Promise<void>;
  refreshProjects: () => Promise<void>;
}

export const ProjectContext = createContext<ProjectContextType | undefined>(
  undefined
);

/**
 * Utility function to check if a URL is accessible
 * @param url URL to check
 * @param maxRetries Maximum number of retries
 * @param delayMs Delay between retries in milliseconds
 */
const checkUrlStatus = async (
  url: string,
  maxRetries = 30,
  delayMs = 1000
): Promise<boolean> => {
  let retries = 0;

  while (retries < maxRetries) {
    try {
      const res = await fetch(url, {
        method: 'HEAD',
        // Add shorter timeout to avoid long waits
        signal: AbortSignal.timeout(5000),
      });

      if (res.status === 200) {
        return true;
      }

      console.log(
        `URL status: ${res.status}. Retry ${retries + 1}/${maxRetries}...`
      );
      retries++;
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    } catch (err) {
      console.error('Error checking URL status:', err);
      retries++;
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  return false; // Return false after max retries
};

export function ProjectProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { isAuthorized } = useAuthContext();
  const [projects, setProjects] = useState<Project[]>([]);
  const [curProject, setCurProject] = useState<Project | undefined>(undefined);
  const [filePath, setFilePath] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Use maps with timestamps for better cache management
  const chatProjectCache = useRef<
    Map<string, { project: Project | null; timestamp: number }>
  >(new Map());
  const pendingOperations = useRef<Map<string, boolean>>(new Map());

  const MAX_RETRIES = 30;
  const CACHE_TTL = 5 * 60 * 1000; // 5 minutes TTL for cache

  // Mounted ref to prevent state updates after unmount
  const isMounted = useRef(true);

  useEffect(() => {
    return () => {
      isMounted.current = false;
      chatProjectCache.current.clear();
      pendingOperations.current.clear();
    };
  }, []);

  // Function to clean expired cache entries
  const cleanCache = useCallback(() => {
    const now = Date.now();
    for (const [key, value] of chatProjectCache.current.entries()) {
      if (now - value.timestamp > CACHE_TTL) {
        chatProjectCache.current.delete(key);
      }
    }
  }, [CACHE_TTL]);

  // Periodically clean the cache
  useEffect(() => {
    const intervalId = setInterval(cleanCache, 60000); // Clean every minute
    return () => clearInterval(intervalId);
  }, [cleanCache]);

  // Effect to restore current project state if needed
  useEffect(() => {
    if (projects.length > 0 && !curProject) {
      const lastProjectId = localStorage.getItem('lastProjectId');
      if (lastProjectId) {
        const project = projects.find((p) => p.id === lastProjectId);
        if (project && isMounted.current) {
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

  // Define refetch function for projects
  const { loading, error, refetch } = useQuery(GET_USER_PROJECTS, {
    fetchPolicy: 'network-only',
    skip: !isAuthorized,
    onCompleted: (data) => {
      if (!isMounted.current) return;

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
      if (isMounted.current) {
        toast.error('Failed to fetch projects. Retrying...');
        // Retry after 5 seconds on error
        setTimeout(() => {
          if (isMounted.current) refetch();
        }, 5000);
      }
    },
  });

  // Explicit refresh function
  const refreshProjects = useCallback(async () => {
    try {
      await refetch();
    } catch (error) {
      console.error('Error refreshing projects:', error);
    }
  }, [refetch]);

  // Create project mutation
  const [createProject] = useMutation(CREATE_PROJECT, {
    onCompleted: (data) => {
      if (!isMounted.current) return;

      // Navigate to chat page after project creation
      if (data?.createProject?.id) {
        toast.success('Project created successfully!');
        router.push(`/chat?id=${data.createProject.id}`);

        // Refresh the projects list
        refreshProjects();
      }
    },
    onError: (error) => {
      if (isMounted.current) {
        toast.error(`Failed to create project: ${error.message}`);
      }
    },
  });

  // Fork project mutation
  const [forkProjectMutation] = useMutation(FORK_PROJECT, {
    onCompleted: (data) => {
      if (!isMounted.current) return;

      if (data?.forkProject?.id) {
        toast.success('Project forked successfully!');
        router.push(`/chat/${data.forkProject.id}`);

        // Refresh the projects list
        refreshProjects();
      }
    },
    onError: (error) => {
      if (isMounted.current) {
        toast.error(`Failed to fork project: ${error.message}`);
      }
    },
  });

  // Update project public status mutation
  const [updateProjectPublicStatusMutation] = useMutation(
    UPDATE_PROJECT_PUBLIC_STATUS,
    {
      onCompleted: (data) => {
        if (!isMounted.current) return;

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
        if (isMounted.current) {
          toast.error(`Failed to update project visibility: ${error.message}`);
        }
      },
    }
  );

  const [updateProjectPhotoMutation] = useMutation(UPDATE_PROJECT_PHOTO_URL, {
    onCompleted: (data) => {
      if (!isMounted.current) return;

      // Update projects list
      setProjects((prev) =>
        prev.map((project) =>
          project.id === data.updateProjectPhoto.id
            ? {
                ...project,
                photoUrl: data.updateProjectPhoto.photoUrl,
              }
            : project
        )
      );

      // Update current project if it's the one being modified
      if (curProject?.id === data.updateProjectPhoto.id) {
        setCurProject((prev) =>
          prev
            ? {
                ...prev,
                photoUrl: data.updateProjectPhoto.photoUrl,
              }
            : prev
        );
      }
    },
    onError: (error) => {
      if (isMounted.current) {
        toast.error(`Failed to update project photo: ${error.message}`);
      }
    },
  });

  const takeProjectScreenshot = useCallback(
    async (projectId: string, url: string): Promise<void> => {
      // Check if this screenshot operation is already in progress
      const operationKey = `screenshot_${projectId}`;
      if (pendingOperations.current.get(operationKey)) {
        return;
      }

      pendingOperations.current.set(operationKey, true);

      try {
        // Check if the URL is accessible
        const isUrlAccessible = await checkUrlStatus(url);
        if (!isUrlAccessible) {
          console.warn(`URL ${url} is not accessible after multiple retries`);
          return;
        }

        // Add a cache buster to avoid previous screenshot caching
        const screenshotUrl = `/api/screenshot?url=${encodeURIComponent(url)}&t=${Date.now()}`;
        const screenshotResponse = await fetch(screenshotUrl);

        if (!screenshotResponse.ok) {
          throw new Error(
            `Failed to capture screenshot: ${screenshotResponse.status} ${screenshotResponse.statusText}`
          );
        }

        const arrayBuffer = await screenshotResponse.arrayBuffer();
        const blob = new Blob([arrayBuffer], { type: 'image/png' });
        const file = new File([blob], 'screenshot.png', { type: 'image/png' });

        if (isMounted.current) {
          await updateProjectPhotoMutation({
            variables: {
              input: {
                projectId,
                file,
              },
            },
          });
        }
      } catch (error) {
        console.error('Error taking screenshot:', error);
      } finally {
        pendingOperations.current.delete(operationKey);
      }
    },
    [updateProjectPhotoMutation]
  );

  const getWebUrl = useCallback(
    async (
      projectPath: string
    ): Promise<{ domain: string; containerId: string }> => {
      // Check if this operation is already in progress
      const operationKey = `getWebUrl_${projectPath}`;
      if (pendingOperations.current.get(operationKey)) {
        // Wait for operation to complete
        await new Promise((resolve) => {
          const checkInterval = setInterval(() => {
            if (!pendingOperations.current.get(operationKey)) {
              clearInterval(checkInterval);
              resolve(true);
            }
          }, 500);
        });
      }

      pendingOperations.current.set(operationKey, true);

      try {
        const response = await fetch(
          `/api/runProject?projectPath=${encodeURIComponent(projectPath)}`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );

        if (!response.ok) {
          throw new Error(
            `Failed to get web URL: ${response.status} ${response.statusText}`
          );
        }

        const data = await response.json();

        if (!data.domain || !data.containerId) {
          throw new Error(
            'Invalid response from API: missing domain or containerId'
          );
        }

        const baseUrl = `${URL_PROTOCOL_PREFIX}://${data.domain}`;

        // Find project and take screenshot if needed
        const project = projects.find((p) => p.projectPath === projectPath);
        if (project) {
          // Don't await this - let it run in background
          takeProjectScreenshot(project.id, baseUrl).catch((err) =>
            console.error('Background screenshot error:', err)
          );
        }

        return {
          domain: data.domain,
          containerId: data.containerId,
        };
      } catch (error) {
        console.error('Error getting web URL:', error);
        if (isMounted.current) {
          toast.error('Failed to prepare web preview');
        }
        throw error;
      } finally {
        pendingOperations.current.delete(operationKey);
      }
    },
    [projects, takeProjectScreenshot]
  );

  const [getChatDetail] = useLazyQuery(GET_CHAT_DETAILS, {
    fetchPolicy: 'network-only',
  });

  // Original createNewProject function
  const createNewProject = useCallback(
    async (projectName: string, description: string): Promise<void> => {
      if (!projectName || !description) {
        if (isMounted.current) {
          toast.error('Please fill in all fields!');
        }
        return;
      }

      try {
        if (isMounted.current) {
          setIsLoading(true);
        }

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
        if (isMounted.current) {
          toast.error('An error occurred while creating the project');
        }
      } finally {
        if (isMounted.current) {
          setIsLoading(false);
        }
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
        if (isMounted.current) {
          toast.error('Please enter a project description');
        }
        return false;
      }

      try {
        if (isMounted.current) {
          setIsLoading(true);
        }

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
        if (isMounted.current) {
          toast.error('Failed to create project from prompt');
        }
        return false;
      } finally {
        if (isMounted.current) {
          setIsLoading(false);
        }
      }
    },
    [createProject]
  );

  // New function to fork a project
  const forkProject = useCallback(
    async (projectId: string): Promise<void> => {
      try {
        if (isMounted.current) {
          setIsLoading(true);
        }

        await forkProjectMutation({
          variables: {
            projectId,
          },
        });
      } catch (error) {
        console.error('Error forking project:', error);
        if (isMounted.current) {
          toast.error('Failed to fork project');
        }
      } finally {
        if (isMounted.current) {
          setIsLoading(false);
        }
      }
    },
    [forkProjectMutation]
  );

  // Function to update project public status
  const setProjectPublicStatus = useCallback(
    async (projectId: string, isPublic: boolean): Promise<void> => {
      const operationKey = `publicStatus_${projectId}`;
      if (pendingOperations.current.get(operationKey)) {
        return;
      }

      pendingOperations.current.set(operationKey, true);

      try {
        await updateProjectPublicStatusMutation({
          variables: {
            projectId,
            isPublic,
          },
        });
      } catch (error) {
        console.error('Error updating project visibility:', error);
        if (isMounted.current) {
          toast.error('Failed to update project visibility');
        }
      } finally {
        pendingOperations.current.delete(operationKey);
      }
    },
    [updateProjectPublicStatusMutation]
  );

  const pollChatProject = useCallback(
    async (chatId: string): Promise<Project | null> => {
      // Check cache first (with validity)
      const cachedData = chatProjectCache.current.get(chatId);
      if (cachedData) {
        const now = Date.now();
        if (now - cachedData.timestamp < CACHE_TTL) {
          return cachedData.project;
        }
      }

      // Check if this poll operation is already in progress
      const operationKey = `poll_${chatId}`;
      if (pendingOperations.current.get(operationKey)) {
        // Wait for any pending operation to complete
        let retries = 0;
        while (pendingOperations.current.get(operationKey) && retries < 10) {
          await new Promise((resolve) => setTimeout(resolve, 500));
          retries++;
        }

        // Check cache again after waiting
        const updatedCache = chatProjectCache.current.get(chatId);
        if (updatedCache) {
          return updatedCache.project;
        }
      }

      pendingOperations.current.set(operationKey, true);

      let retries = 0;
      try {
        while (retries < MAX_RETRIES) {
          try {
            const { data } = await getChatDetail({ variables: { chatId } });

            if (data?.getChatDetails?.project) {
              const project = data.getChatDetails.project;

              // Update cache with timestamp
              chatProjectCache.current.set(chatId, {
                project,
                timestamp: Date.now(),
              });

              // Try to get web URL in background without blocking
              if (isMounted.current && project.projectPath) {
                getWebUrl(project.projectPath).catch((error) => {
                  console.warn('Background web URL fetch failed:', error);
                });
              }

              return project;
            }
          } catch (error) {
            console.error(
              `Error polling chat (attempt ${retries + 1}/${MAX_RETRIES}):`,
              error
            );
          }

          await new Promise((resolve) => setTimeout(resolve, 6000));
          retries++;

          // If component unmounted during polling, stop
          if (!isMounted.current) {
            return null;
          }
        }

        // Cache the null result to prevent repeated polling
        chatProjectCache.current.set(chatId, {
          project: null,
          timestamp: Date.now(),
        });
        return null;
      } finally {
        pendingOperations.current.delete(operationKey);
      }
    },
    [getChatDetail, getWebUrl, MAX_RETRIES, CACHE_TTL]
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
      getWebUrl,
      takeProjectScreenshot,
      refreshProjects,
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
      getWebUrl,
      takeProjectScreenshot,
      refreshProjects,
    ]
  );

  return (
    <ProjectContext.Provider value={contextValue}>
      {children}
    </ProjectContext.Provider>
  );
}
