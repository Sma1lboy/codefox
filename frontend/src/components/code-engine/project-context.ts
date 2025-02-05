import { createContext } from 'react';

export interface ProjectContextType {
  projectId: string;
  setProjectId: React.Dispatch<React.SetStateAction<string>>;
  filePath: string | null;
  setFilePath: React.Dispatch<React.SetStateAction<string | null>>;
}

export const ProjectContext = createContext<ProjectContextType>({
  projectId: '',
  setProjectId: () => {},
  filePath: null,
  setFilePath: () => {},
});
