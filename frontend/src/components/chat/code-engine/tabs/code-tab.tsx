'use client';
import {
  useState,
  useEffect,
  useContext,
  useRef,
  MutableRefObject,
} from 'react';
import { motion } from 'framer-motion';
import Editor from '@monaco-editor/react';
import { useTheme } from 'next-themes';
import { TreeItem, TreeItemIndex } from 'react-complex-tree';
import { ProjectContext } from '../project-context';
import FileExplorerButton from '../file-explorer-button';
import FileStructure from '../file-structure';

interface CodeTabProps {
  editorRef: MutableRefObject<any>;
  fileStructureData: Record<TreeItemIndex, TreeItem<any>>;
  newCode: string;
  isFileStructureLoading: boolean;
  updateSavingStatus: (value: string) => void;
}

const CodeTab = ({
  editorRef,
  fileStructureData,
  newCode,
  isFileStructureLoading,
  updateSavingStatus,
}: CodeTabProps) => {
  const theme = useTheme();
  const { filePath, curProject } = useContext(ProjectContext);
  const [isExplorerCollapsed, setIsExplorerCollapsed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [type, setType] = useState('javascript');

  // Handle editor mount
  const handleEditorMount = (editorInstance) => {
    editorRef.current = editorInstance;
    editorInstance.getDomNode().style.position = 'absolute';
  };

  // Effect: Fetch file content when filePath or projectId changes
  useEffect(() => {
    async function getCode() {
      if (!curProject || !filePath) return;

      const file_node = fileStructureData[`root/${filePath}`];
      if (filePath == '' || !file_node) return;
      const isFolder = file_node.isFolder;
      if (isFolder) return;

      try {
        setIsLoading(true);
        const res = await fetch(
          `/api/file?path=${encodeURIComponent(`${curProject.projectPath}/${filePath}`)}`
        ).then((res) => res.json());

        // We use callback prop to update parent state
        updateSavingStatus(res.content);
        setType(res.type);
        setIsLoading(false);
      } catch (error: any) {
        console.error(error.message);
      }
    }

    getCode();
  }, [filePath, curProject, fileStructureData, updateSavingStatus]);

  return (
    <>
      {/* File Explorer Panel (collapsible) */}
      <motion.div
        animate={{
          width: isExplorerCollapsed ? '0px' : '300px',
          opacity: isExplorerCollapsed ? 0 : 1,
        }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className="overflow-y-auto border-r"
      >
        <FileStructure
          data={fileStructureData}
          filePath={filePath}
          isLoading={isFileStructureLoading}
        />
      </motion.div>

      {/* Code Editor */}
      <div className="flex-1 relative">
        <Editor
          height="100%"
          width="100%"
          defaultLanguage="typescriptreact"
          value={newCode}
          language={type}
          loading={isLoading}
          onChange={updateSavingStatus}
          onMount={handleEditorMount}
          options={{
            fontSize: 14,
            minimap: { enabled: false },
            wordWrap: 'on',
            wrappingStrategy: 'advanced',
            scrollbar: {
              useShadows: false,
              vertical: 'visible',
              horizontal: 'visible',
              verticalScrollbarSize: 10,
              horizontalScrollbarSize: 10,
            },
          }}
          theme={theme.theme === 'dark' ? 'vs-dark' : 'vs'}
        />
      </div>

      {/* File Explorer Toggle Button */}
      <FileExplorerButton
        isExplorerCollapsed={isExplorerCollapsed}
        setIsExplorerCollapsed={setIsExplorerCollapsed}
      />
    </>
  );
};

export default CodeTab;
