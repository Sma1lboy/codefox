'use client';
import {
  createContext,
  Dispatch,
  SetStateAction,
  useContext,
  useState,
} from 'react';
interface ProjectContextType {
  projectId: string;
  setProjectId: Dispatch<SetStateAction<string>>;
  filePath: string | null;
  setFilePath: Dispatch<SetStateAction<string | null>>;
}

const ProjectContext = createContext<ProjectContextType>({
  projectId: '',
  setProjectId: () => {},
  filePath: null,
  setFilePath: () => {},
});

export const useProject = () => useContext(ProjectContext);
export const ProjectProvider = ({ children }) => {
  const [projectId, setProjectId] = useState(
    '2025-01-31-f9b3465a-1bd0-4a56-b042-46864953d870'
  );
  const [filePath, setFilePath] = useState('frontend/vite.config.ts');

  return (
    <ProjectContext.Provider
      value={{ projectId, setProjectId, filePath, setFilePath }}
    >
      {children}
    </ProjectContext.Provider>
  );
};
