'use client';

import { useEffect, useState } from 'react';
import {
  FileIcon,
  ChevronDownIcon,
  ChevronRightIcon,
} from '@radix-ui/react-icons';
import { useProject } from '@/app/context/projectContext';

interface FileNodeType {
  name: string;
  type: 'file' | 'folder';
  children?: FileNodeType[];
}

const FileNode = ({
  node,
  fullPath,
}: {
  node: FileNodeType;
  fullPath: string;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const { setFilePath, filePath } = useProject();

  const toggleOpen = () => {
    if (node.type === 'folder') setIsOpen(!isOpen);
  };

  const handleChangeFile = () => {
    if (node.type === 'file') setFilePath(fullPath);
  };

  return (
    <div className="ml-4 overflow-hidden">
      {node.type === 'folder' ? (
        <div
          className="cursor-pointer flex items-center min-h-[24px] hover:text-blue-500"
          onClick={toggleOpen}
        >
          {isOpen ? (
            <ChevronDownIcon className="mr-2 w-5 h-5" />
          ) : (
            <ChevronRightIcon className="mr-2 w-5 h-5" />
          )}
          {node.name}
        </div>
      ) : (
        <div
          className={`flex items-center cursor-pointer min-h-[24px] transition-colors duration-200 ${
            filePath === fullPath ? 'text-blue-500 font-bold' : ''
          }`}
          onClick={handleChangeFile}
        >
          <FileIcon className="mr-2 w-4 h-4" /> {node.name}
        </div>
      )}

      {isOpen && node.children && (
        <div className="ml-4 border-l pl-2">
          {node.children.map((child) => (
            <FileNode
              key={`${fullPath}/${child.name}`}
              node={child}
              fullPath={`${fullPath}/${child.name}`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default function FileStructure({
  isCollapsed,
}: {
  isCollapsed: boolean;
}) {
  const { projectId, filePath } = useProject();
  const [fileStructure, setStructure] = useState<FileNodeType[]>([]);

  useEffect(() => {
    async function fetchFiles() {
      try {
        const response = await fetch(`/api/project?id=${projectId}`);
        const data = await response.json();
        console.log('Fetched file structure:', data.res);
        setStructure(data.res || []);
      } catch (error) {
        console.error('Error fetching file structure:', error);
      }
    }

    fetchFiles();
  }, [projectId]);

  return (
    <div className="relative">
      <div className="p-4">
        <h3 className="mb-2 font-bold">File Explorer</h3>
        {filePath && <div className="mt-4 p-2 text-sm">{filePath}</div>}
        {fileStructure.map((node) => (
          <FileNode key={node.name} node={node} fullPath={node.name} />
        ))}
      </div>
    </div>
  );
}
