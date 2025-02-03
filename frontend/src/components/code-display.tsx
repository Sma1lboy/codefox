import { useProject } from '@/app/context/projectContext';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Editor from '@monaco-editor/react';
import { useEffect, useState } from 'react';
import { ExclamationTriangleIcon } from '@radix-ui/react-icons';
import FileStructure from './file-structure';
import { motion } from 'framer-motion';
export function CodeDisplayer() {
  const editorRef = useRef(null);

  const { projectId, filePath } = useProject();
  const [preCode, setPrecode] = useState('// some coaamment');
  const [newCode, setCode] = useState('// some coaamment');
  const [saving, setSaving] = useState(false);
  const [type, setType] = useState('javascript');
  const [isLoading, setIsLoading] = useState(false);
  const [editor, setEditor] = useState(null);
  const [isCollapsed, setIsCollapsed] = useState(false); // 默认折叠状态
  const handleEditorMount = (editor) => {
    editorRef.current = editor;

    editor.getDomNode().style.position = 'absolute';
  };
  useEffect(() => {
    async function getCode() {
      try {
        setIsLoading(true);
        const res = await fetch(
          `/api/file?path=${encodeURIComponent(`${projectId}/${filePath}`)}`
        ).then((res) => res.json());
        console.log(res.content);
        setCode(res.content);
        setPrecode(res.content);
        setType(res.type);

        setIsLoading(false);
      } catch (error) {
        console.error(error.message);
      }
    }

    getCode();
  }, [filePath, projectId]);

  const handleReset = () => {
    console.log('Reset!');
    setCode(preCode);
    console.log(editorRef.current?.getValue());
    editorRef.current?.setValue(preCode);
    console.log(preCode);
    console.log(editorRef.current?.getValue());
    setSaving(false);
  };

  const updateCode = async (value) => {
    try {
      const response = await fetch('/api/file', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filePath: projectId + '/' + filePath,
          newContent: JSON.stringify(value),
        }),
      });

      const data = await response.json();
    } catch (error) {
      /* empty */
    }
  };

  const handleSave = () => {
    console.log('Saved!');
    setSaving(false);
    setPrecode(newCode);
    updateCode(newCode);
  };

  const updateSavingStatus = async (value, event) => {
    setCode(value);
    setSaving(true);
  };
  return (
    <Tabs defaultValue="account" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="account">Code</TabsTrigger>
        <TabsTrigger value="password">Password</TabsTrigger>
      </TabsList>
      <TabsContent value="account" className="flex h-full">
        <motion.div
          animate={{
            width: isCollapsed ? 0 : '25%',
            opacity: isCollapsed ? 0 : 1,
          }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          className="overflow-hidden"
        >
          <FileStructure isCollapsed={isCollapsed} />
        </motion.div>

        <motion.div
          animate={{ marginLeft: isCollapsed ? 0 : '1%' }}
          transition={{ duration: 0.5, ease: 'easeInOut' }}
          className="flex-1 w-auto"
        >
          <Editor
            height="100vh"
            width="100%"
            defaultLanguage="typescript"
            value={newCode}
            language={type}
            loading={isLoading}
            onChange={updateSavingStatus}
            onMount={handleEditorMount}
          />
        </motion.div>
        <Button
          className="fixed bottom-4 p-3 bg-blue-500 text-white rounded-full shadow-lg hover:bg-blue-600 transition z-90"
          onClick={() => setIsCollapsed(!isCollapsed)}
        >
          {isCollapsed ? '▶' : '◀'}
        </Button>
        {saving && (
          <SaveChangesBar
            saving={saving}
            onSave={handleSave}
            onReset={handleReset}
          />
        )}
      </TabsContent>

      <TabsContent value="password">
        <Card>
          <CardHeader>
            <CardTitle>Password</CardTitle>
            <CardDescription>
              Change your password here. After saving, you'll be logged out.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="space-y-1">
              <Label htmlFor="current">Current password</Label>
              <Input id="current" type="password" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="new">New password</Label>
              <Input id="new" type="password" />
            </div>
          </CardContent>
          <CardFooter>
            <Button>Save password</Button>
          </CardFooter>
        </Card>
      </TabsContent>
    </Tabs>
  );
}

const SaveChangesBar = ({ saving, onSave, onReset }) => {
  return (
    saving && (
      <div className="flex items-center space-x-2 p-2 border rounded-full shadow bg-white">
        <ExclamationTriangleIcon className="w-5 h-5 text-yellow-500" />
        <span className="text-sm text-gray-700">Unsaved Changes</span>
        <Button
          className="px-3 py-1 text-sm font-medium border rounded-full bg-gray-100 hover:bg-gray-200"
          onClick={onReset}
        >
          Reset
        </Button>
        <Button
          className="px-4 py-1 text-sm font-medium text-white bg-black rounded-full hover:bg-gray-800"
          onClick={onSave}
        >
          Save
        </Button>
      </div>
    )
  );
};
