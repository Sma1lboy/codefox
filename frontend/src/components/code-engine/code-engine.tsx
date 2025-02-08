'use client';

import { Button } from '@/components/ui/button';
import Editor from '@monaco-editor/react';
import { ExclamationTriangleIcon } from '@radix-ui/react-icons';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Code as CodeIcon,
  Copy,
  Eye,
  GitFork,
  Loader,
  Share2,
  Terminal,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { useContext, useEffect, useRef, useState } from 'react';
import { TreeItem, TreeItemIndex } from 'react-complex-tree';
import FileExplorerButton from './file-explorer-button';
import FileStructure from './file-structure';
import { ProjectContext } from './project-context';

export function CodeEngine({ chatId }: { chatId: string }) {
  // Initialize state, refs, and context
  const editorRef = useRef(null);
  const { curProject, filePath, pollChatProject } = useContext(ProjectContext);
  const [preCode, setPrecode] = useState('// some comment');
  const [newCode, setCode] = useState('// some comment');
  const [saving, setSaving] = useState(false);
  const [type, setType] = useState('javascript');
  const [isLoading, setIsLoading] = useState(false);
  const [isExplorerCollapsed, setIsExplorerCollapsed] = useState(false);
  const [fileStructureData, setFileStructureData] = useState<
    Record<TreeItemIndex, TreeItem<any>>
  >({});
  const theme = useTheme();

  const [isProjectFinished, setIsProjectFinished] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'preview' | 'code' | 'console'>(
    'code'
  );

  // Callback: Handle editor mount
  const handleEditorMount = (editorInstance) => {
    editorRef.current = editorInstance;
    // Set the editor DOM node's position for layout control
    editorInstance.getDomNode().style.position = 'absolute';
  };
  useEffect(() => {
    async function checkChatProject() {
      if (curProject?.id) {
        const linkedProject = await pollChatProject(chatId);
        console.log(linkedProject);
        setIsProjectFinished(!!linkedProject);
        // setIsProjectFinished(false);
        // if (
        //   chatId == '6730a482-2935-47f0-ad7a-43e7f17dc121' ||
        //   chatId == '806b1498-65e0-4e4f-8724-42a8177610e0'
        // ) {
        //   await new Promise((resolve) => setTimeout(resolve, 10000));
        // }
        // setIsProjectFinished(true);
      }
    }
    checkChatProject();
  }, [curProject, pollChatProject]);

  // Effect: Fetch file content when filePath or projectId changes
  useEffect(() => {
    async function getCode() {
      const file_node = fileStructureData[`root/${filePath}`];
      if (filePath == '' || !file_node) return;
      const isFolder = file_node.isFolder;
      if (isFolder) return;
      try {
        setIsLoading(true);
        const res = await fetch(
          `/api/file?path=${encodeURIComponent(`${curProject.projectPath}/${filePath}`)}`
        ).then((res) => res.json());
        setCode(res.content);
        setPrecode(res.content);
        setType(res.type);
        setIsLoading(false);
      } catch (error: any) {
        console.error(error.message);
      }
    }
    getCode();
  }, [filePath, curProject]);

  // Effect: Fetch file structure when projectId changes
  useEffect(() => {
    async function fetchFiles() {
      try {
        const response = await fetch(
          `/api/project?path=${curProject.projectPath}`
        );
        const data = await response.json();
        setFileStructureData(data.res || {});
      } catch (error) {
        console.error('Error fetching file structure:', error);
      }
    }
    fetchFiles();
  }, [curProject]);

  // Reset code to previous state and update editor
  const handleReset = () => {
    setCode(preCode);
    editorRef.current?.setValue(preCode);
    setSaving(false);
  };

  // Update file content on the server
  const updateCode = async (value) => {
    try {
      const response = await fetch('/api/file', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filePath: `${curProject.projectPath}/${filePath}`,
          newContent: JSON.stringify(value),
        }),
      });
      await response.json();
    } catch (error) {
      console.error(error);
    }
  };

  // Save the new code and update the previous state
  const handleSave = () => {
    setSaving(false);
    setPrecode(newCode);
    updateCode(newCode);
  };

  // Update code in state and mark as saving
  const updateSavingStatus = (value) => {
    setCode(value);
    setSaving(true);
  };

  // Responsive toolbar component for header tabs and buttons
  const ResponsiveToolbar = () => {
    const containerRef = useRef(null);
    const [containerWidth, setContainerWidth] = useState(700);
    const [visibleTabs, setVisibleTabs] = useState(3);
    const [compactIcons, setCompactIcons] = useState(false);

    // Observe container width changes
    useEffect(() => {
      const observer = new ResizeObserver((entries) => {
        for (const entry of entries) {
          setContainerWidth(entry.contentRect.width);
        }
      });

      if (containerRef.current) {
        observer.observe(containerRef.current);
      }
      return () => observer.disconnect();
    }, []);

    // Adjust visible tabs and icon style based on container width
    useEffect(() => {
      if (containerWidth > 650) {
        setVisibleTabs(3);
        setCompactIcons(false);
      } else if (containerWidth > 550) {
        setVisibleTabs(2);
        setCompactIcons(false);
      } else if (containerWidth > 450) {
        setVisibleTabs(1);
        setCompactIcons(true);
      } else {
        setVisibleTabs(0);
        setCompactIcons(true);
      }
    }, [containerWidth]);

    return (
      <div
        ref={containerRef}
        className="flex items-center justify-between p-2 border-b w-full"
      >
        <div className="flex items-center space-x-2">
          <Button
            variant={activeTab === 'preview' ? 'default' : 'outline'}
            className="text-sm"
            onClick={() => setActiveTab('preview')}
          >
            <Eye className="w-4 h-4 mr-1" />
            Preview
          </Button>
          {visibleTabs >= 2 && (
            <Button
              variant={activeTab === 'code' ? 'default' : 'outline'}
              className="text-sm"
              onClick={() => setActiveTab('code')}
            >
              <CodeIcon className="w-4 h-4 mr-1" />
              Code
            </Button>
          )}
          {visibleTabs >= 3 && (
            <Button
              variant={activeTab === 'console' ? 'default' : 'outline'}
              className="text-sm"
              onClick={() => setActiveTab('console')}
            >
              <Terminal className="w-4 h-4 mr-1" />
              Console
            </Button>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              className={`p-0 ${compactIcons ? 'hidden' : 'block'}`}
            >
              <GitFork className="w-5 h-5" />
            </Button>
            <Button
              variant="ghost"
              className={`p-0 ${compactIcons ? 'hidden' : 'block'}`}
            >
              <Share2 className="w-5 h-5" />
            </Button>
            <Button
              variant="ghost"
              className={`p-0 ${compactIcons ? 'hidden' : 'block'}`}
            >
              <Copy className="w-5 h-5" />
            </Button>
          </div>
          <div className="flex items-center space-x-2">
            {!compactIcons && (
              <>
                <Button variant="outline" className="text-sm">
                  Supabase
                </Button>
                <Button variant="outline" className="text-sm">
                  Publish
                </Button>
              </>
            )}
            {compactIcons && (
              <Button variant="outline" className="p-2">
                <Share2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Render the CodeEngine layout
  return (
    <div className="flex flex-col h-full relative">
      <AnimatePresence>
        {!isProjectFinished && (
          <motion.div
            key="loader"
            initial={{ opacity: 0, scale: 0.9 }} // 初始状态：透明 & 缩小
            animate={{ opacity: 1, scale: 1 }} // 进入动画：淡入 & 正常大小
            exit={{ opacity: 0, scale: 0.9 }} // 退出动画：淡出 & 缩小
            transition={{ duration: 0.3, ease: 'easeOut' }} // 动画时间：0.3s
            className="absolute inset-0 bg-black bg-opacity-40 backdrop-blur-md flex items-center justify-center z-50"
          >
            <Loader className="w-10 h-10 text-white animate-spin" />
          </motion.div>
        )}
      </AnimatePresence>
      {/* Header Bar */}
      <ResponsiveToolbar />

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {activeTab === 'code' ? (
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
              <FileStructure data={fileStructureData} filePath={filePath} />
            </motion.div>
            <div className="flex-1 relative">
              <Editor
                height="100vh"
                width="100%"
                defaultLanguage="typescript"
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
          </>
        ) : activeTab === 'preview' ? (
          <div className="flex-1 p-4 text-sm">Preview Content (Mock)</div>
        ) : activeTab === 'console' ? (
          <div className="flex-1 p-4 text-sm">Console Content (Mock)</div>
        ) : null}
      </div>

      {/* Save Changes Bar */}
      {saving && (
        <SaveChangesBar
          saving={saving}
          onSave={handleSave}
          onReset={handleReset}
        />
      )}

      {/* File Explorer Toggle Button */}
      {activeTab === 'code' && (
        <FileExplorerButton
          isExplorerCollapsed={isExplorerCollapsed}
          setIsExplorerCollapsed={setIsExplorerCollapsed}
        />
      )}
    </div>
  );
}

// SaveChangesBar component for showing unsaved changes status
const SaveChangesBar = ({ saving, onSave, onReset }) => {
  return (
    saving && (
      <div className="fixed bottom-4 right-4 flex items-center space-x-2 p-2 border rounded-full shadow bg-background">
        <ExclamationTriangleIcon className="w-5 h-5 text-yellow-500" />
        <span className="text-sm text-foreground">Unsaved Changes</span>
        <Button
          variant="outline"
          className="px-3 py-1 text-sm font-medium rounded-full"
          onClick={onReset}
        >
          Reset
        </Button>
        <Button
          variant="default"
          className="px-4 py-1 text-sm font-medium rounded-full"
          onClick={onSave}
        >
          Save
        </Button>
      </div>
    )
  );
};
