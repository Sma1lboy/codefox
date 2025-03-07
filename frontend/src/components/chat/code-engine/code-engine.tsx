'use client';
import { useContext, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader } from 'lucide-react';
import { TreeItem, TreeItemIndex } from 'react-complex-tree';
import { ProjectContext } from './project-context';
import CodeTab from './tabs/code-tab';
import PreviewTab from './tabs/preview-tab';
import ConsoleTab from './tabs/preview-tab';
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
  // Initialize state and context
  const { curProject, filePath } = useContext(ProjectContext);
  console.log('filepath', filePath);
  console.log('chatid', chatId);
  console.log('projectid', projectId);
  const [saving, setSaving] = useState(false);
  const [preCode, setPrecode] = useState('// some comment');
  const [newCode, setCode] = useState('// some comment');
  const [activeTab, setActiveTab] = useState<'preview' | 'code' | 'console'>(
    'code'
  );
  const [isFileStructureLoading, setIsFileStructureLoading] = useState(false);
  const [fileStructureData, setFileStructureData] = useState<
    Record<TreeItemIndex, TreeItem<any>>
  >({});

  // Reference to the editor instance
  const editorRef = useRef(null);

  // Fetch file structure function (only for code tab)
  async function fetchFiles() {
    if (!curProject?.projectPath) {
      return;
    }

    try {
      setIsFileStructureLoading(true);
      const response = await fetch(
        `/api/project?path=${curProject.projectPath}`
      );
      const data = await response.json();
      setFileStructureData(data.res || {});
    } catch (error) {
      console.error('Error fetching file structure:', error);
    } finally {
      setIsFileStructureLoading(false);
    }
  }

  // Effect: Fetch file structure when needed for code tab
  useEffect(() => {
    if (
      activeTab === 'code' &&
      Object.keys(fileStructureData).length === 0 &&
      curProject?.projectPath
    ) {
      fetchFiles();
    }
  }, [activeTab, fileStructureData, curProject?.projectPath]);

  // Reset code to previous state
  const handleReset = () => {
    setCode(preCode);
    editorRef.current?.setValue(preCode);
    setSaving(false);
  };

  // Update file content on the server
  const updateCode = async (value) => {
    if (!curProject) return;

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

  // Track unsaved changes
  const updateSavingStatus = (value) => {
    setCode(value);
    setSaving(true);
  };

  // Render appropriate content based on active tab
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

  // Render the CodeEngine layout
  return (
    <div className="rounded-lg border shadow-sm overflow-scroll h-full">
      {/* Header Bar */}
      <ResponsiveToolbar
        isLoading={!isProjectReady}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* Main Content Area with Loading */}
      <div className="relative h-[calc(100vh-48px-4rem)]">
        <AnimatePresence>
          {!isProjectReady && (
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

        <div className="flex h-full">{renderTabContent()}</div>

        {/* Save Changes Bar */}
        {saving && <SaveChangesBar onSave={handleSave} onReset={handleReset} />}
      </div>
    </div>
  );
}

export default CodeEngine;
