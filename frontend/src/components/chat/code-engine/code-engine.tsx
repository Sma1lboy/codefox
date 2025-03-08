'use client';
import { useContext, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader } from 'lucide-react';
import { TreeItem, TreeItemIndex } from 'react-complex-tree';
import { ProjectContext } from './project-context';
import CodeTab from './tabs/code-tab';
import PreviewTab from './tabs/preview-tab';
import ConsoleTab from './tabs/console-tab';
import ResponsiveToolbar from './responsive-toolbar';
import SaveChangesBar from './save-changes-bar';

export function CodeEngine({
  chatId,
  isProjectReady = false,
  projectId,
}: {
  chatId: string;
  isProjectReady?: boolean;
  projectId?: string;
}) {
  const { curProject, projectLoading, pollChatProject } =
    useContext(ProjectContext);
  const [localProject, setLocalProject] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filePath, setFilePath] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [preCode, setPrecode] = useState('// Loading...');
  const [newCode, setCode] = useState('// Loading...');
  const [activeTab, setActiveTab] = useState<'preview' | 'code' | 'console'>(
    'code'
  );
  const [isFileStructureLoading, setIsFileStructureLoading] = useState(false);
  const [fileStructureData, setFileStructureData] = useState<
    Record<TreeItemIndex, TreeItem<any>>
  >({});

  const editorRef = useRef(null);
  const projectPathRef = useRef(null);

  // Poll for project if needed using chatId
  useEffect(() => {
    if (!curProject && chatId && !projectLoading) {
      const loadProjectFromChat = async () => {
        try {
          setIsLoading(true);
          const project = await pollChatProject(chatId);
          if (project) {
            setLocalProject(project);
          }
        } catch (error) {
          console.error('Failed to load project from chat:', error);
        } finally {
          setIsLoading(false);
        }
      };

      loadProjectFromChat();
    } else {
      setIsLoading(projectLoading);
    }
  }, [chatId, curProject, projectLoading, pollChatProject]);

  // Use either curProject from context or locally polled project
  const activeProject = curProject || localProject;

  // Update projectPathRef when project changes
  useEffect(() => {
    if (activeProject?.projectPath) {
      projectPathRef.current = activeProject.projectPath;
    }
  }, [activeProject]);

  async function fetchFiles() {
    const projectPath = activeProject?.projectPath || projectPathRef.current;
    if (!projectPath) {
      return;
    }

    try {
      setIsFileStructureLoading(true);
      const response = await fetch(`/api/project?path=${projectPath}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch file structure: ${response.status}`);
      }
      const data = await response.json();
      if (data && data.res) {
        setFileStructureData(data.res);
      } else {
        console.warn('Empty or invalid file structure data received');
      }
    } catch (error) {
      console.error('Error fetching file structure:', error);
    } finally {
      setIsFileStructureLoading(false);
    }
  }

  // Effect for loading file structure when project is ready
  useEffect(() => {
    const shouldFetchFiles =
      isProjectReady &&
      (activeProject?.projectPath || projectPathRef.current) &&
      Object.keys(fileStructureData).length === 0 &&
      !isFileStructureLoading;

    if (shouldFetchFiles) {
      fetchFiles();
    }
  }, [
    isProjectReady,
    activeProject,
    isFileStructureLoading,
    fileStructureData,
  ]);

  // Effect for selecting default file once structure is loaded
  useEffect(() => {
    if (
      !isFileStructureLoading &&
      Object.keys(fileStructureData).length > 0 &&
      !filePath
    ) {
      selectDefaultFile();
    }
  }, [isFileStructureLoading, fileStructureData, filePath]);

  // Retry mechanism for fetching files if needed
  useEffect(() => {
    let retryTimeout;

    if (
      isProjectReady &&
      activeProject?.projectPath &&
      Object.keys(fileStructureData).length === 0 &&
      !isFileStructureLoading
    ) {
      retryTimeout = setTimeout(() => {
        console.log('Retrying file structure fetch...');
        fetchFiles();
      }, 3000);
    }

    return () => {
      if (retryTimeout) clearTimeout(retryTimeout);
    };
  }, [
    isProjectReady,
    activeProject,
    fileStructureData,
    isFileStructureLoading,
  ]);

  function selectDefaultFile() {
    const defaultFiles = [
      'src/App.tsx',
      'src/App.js',
      'src/index.tsx',
      'src/index.js',
      'app/page.tsx',
      'pages/index.tsx',
      'index.html',
      'README.md',
    ];

    for (const defaultFile of defaultFiles) {
      if (fileStructureData[`root/${defaultFile}`]) {
        setFilePath(defaultFile);
        return;
      }
    }

    const firstFile = Object.entries(fileStructureData).find(
      ([key, item]) =>
        key.startsWith('root/') && !item.isFolder && key !== 'root/'
    );

    if (firstFile) {
      setFilePath(firstFile[0].replace('root/', ''));
    }
  }

  const handleReset = () => {
    setCode(preCode);
    editorRef.current?.setValue(preCode);
    setSaving(false);
  };

  const updateCode = async (value) => {
    const projectPath = activeProject?.projectPath || projectPathRef.current;
    if (!projectPath || !filePath) return;

    try {
      const response = await fetch('/api/file', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filePath: `${projectPath}/${filePath}`,
          newContent: JSON.stringify(value),
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to update file: ${response.status}`);
      }

      await response.json();
    } catch (error) {
      console.error('Error updating file:', error);
    }
  };

  const handleSave = () => {
    setSaving(false);
    setPrecode(newCode);
    updateCode(newCode);
  };

  const updateSavingStatus = (value) => {
    setCode(value);
    setSaving(true);
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'code':
        return (
          <CodeTab
            editorRef={editorRef}
            fileStructureData={fileStructureData}
            newCode={newCode}
            isFileStructureLoading={isFileStructureLoading}
            updateSavingStatus={updateSavingStatus}
            filePath={filePath}
            setFilePath={setFilePath}
          />
        );
      case 'preview':
        return <PreviewTab />;
      case 'console':
        return <ConsoleTab />;
      default:
        return null;
    }
  };

  useEffect(() => {
    async function getCode() {
      const projectPath = activeProject?.projectPath || projectPathRef.current;
      if (!projectPath || !filePath) return;

      const file_node = fileStructureData[`root/${filePath}`];
      if (!file_node) return;

      const isFolder = file_node.isFolder;
      if (isFolder) return;

      try {
        const res = await fetch(
          `/api/file?path=${encodeURIComponent(`${projectPath}/${filePath}`)}`
        );

        if (!res.ok) {
          throw new Error(`Failed to fetch file content: ${res.status}`);
        }

        const data = await res.json();
        setCode(data.content);
        setPrecode(data.content);
      } catch (error) {
        console.error('Error loading file content:', error);
      }
    }

    getCode();
  }, [filePath, activeProject, fileStructureData]);

  // Determine if we're truly ready to render
  const showLoader =
    !isProjectReady ||
    isLoading ||
    (!activeProject?.projectPath && !projectPathRef.current && !localProject);

  return (
    <div className="rounded-lg border shadow-sm overflow-scroll h-full">
      <ResponsiveToolbar
        isLoading={showLoader}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      <div className="relative h-[calc(100vh-48px-4rem)]">
        <AnimatePresence>
          {showLoader && (
            <motion.div
              key="loader"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-background/60 backdrop-blur-sm flex flex-col items-center justify-center gap-3 z-30"
            >
              <Loader className="w-8 h-8 text-primary animate-spin" />
              <p className="text-sm text-muted-foreground">
                {projectLoading
                  ? 'Loading project...'
                  : 'Initializing project...'}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex h-full">{renderTabContent()}</div>

        {saving && <SaveChangesBar onSave={handleSave} onReset={handleReset} />}
      </div>
    </div>
  );
}

export default CodeEngine;
