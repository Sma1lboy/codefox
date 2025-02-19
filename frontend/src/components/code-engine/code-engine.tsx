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
import WebPreview from './web-view';

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
        setIsProjectFinished(false);
        const linkedProject = await pollChatProject(chatId);
        console.log(linkedProject);
        setIsProjectFinished(true);
      } else {
        setIsProjectFinished(false);
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
  const ResponsiveToolbar = ({ isLoading }: { isLoading: boolean }) => {
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
        className="flex items-center justify-between p-4 border-b w-full bg-background/60 backdrop-blur supports-[backdrop-filter]:bg-background/60"
      >
        <div className="flex items-center space-x-2">
          <Button
            variant={activeTab === 'preview' ? 'default' : 'outline'}
            className="text-sm"
            onClick={() => setActiveTab('preview')}
            disabled={isLoading}
          >
            <Eye className="w-4 h-4 mr-1" />
            Preview
          </Button>
          {visibleTabs >= 2 && (
            <Button
              variant={activeTab === 'code' ? 'default' : 'outline'}
              className="text-sm"
              onClick={() => setActiveTab('code')}
              disabled={isLoading}
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
              disabled={isLoading}
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
              disabled={isLoading}
            >
              <GitFork className="w-5 h-5" />
            </Button>
            <Button
              variant="ghost"
              className={`p-0 ${compactIcons ? 'hidden' : 'block'}`}
              disabled={isLoading}
            >
              <Share2 className="w-5 h-5" />
            </Button>
            <Button
              variant="ghost"
              className={`p-0 ${compactIcons ? 'hidden' : 'block'}`}
              disabled={isLoading}
            >
              <Copy className="w-5 h-5" />
            </Button>
          </div>
          <div className="flex items-center space-x-2">
            {!compactIcons && (
              <>
                <Button
                  variant="outline"
                  className="text-sm"
                  disabled={isLoading}
                >
                  Supabase
                </Button>
                <Button
                  variant="outline"
                  className="text-sm"
                  disabled={isLoading}
                >
                  Publish
                </Button>
              </>
            )}
            {compactIcons && (
              <Button variant="outline" className="p-2" disabled={isLoading}>
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
    <div className="rounded-lg border shadow-sm overflow-hidden">
      {/* Header Bar */}
      <ResponsiveToolbar isLoading={!isProjectFinished} />

      {/* Main Content Area with Loading */}
      <div className="relative h-[calc(100vh-48px)]">
        <AnimatePresence>
          {!isProjectFinished && (
            <motion.div
              key="loader"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-background/60 backdrop-blur-sm flex flex-col items-center justify-center gap-3 z-30"
            >
              <Loader className="w-8 h-8 text-primary animate-spin" />
              <p className="text-sm text-muted-foreground">
                Initializing project...
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex h-full">
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
                  height="100%"
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
            <div className="w-full h-full">
              <WebPreview />
            </div>
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
