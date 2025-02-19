import { useContext, useEffect, useRef, useState } from 'react';
import { ProjectContext } from './project-context';

export default function WebPreview() {
  const { curProject } = useContext(ProjectContext);
  const [url, setUrl] = useState('');
  const iframeRef = useRef(null);

  useEffect(() => {
    const getWebUrl = async () => {
      const projectPath = curProject.projectPath;
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
        const json = await response.json();
        console.log(json);
        await new Promise((resolve) => setTimeout(resolve, 10000));
        setUrl(`http://${json.domain}/`);
      } catch (error) {
        console.error('fetching url error:', error);
      }
    };

    getWebUrl();
  }, [curProject]);

  useEffect(() => {
    if (iframeRef.current) {
      iframeRef.current.src = url;
    }
  }, [url]);

  const refreshIframe = () => {
    if (iframeRef.current) {
      iframeRef.current.src = url;
    }
  };

  const enterFullScreen = () => {
    if (iframeRef.current) {
      iframeRef.current.requestFullscreen();
    }
  };

  return (
    <div className="flex flex-col items-center gap-4 p-4 w-full">
      <div className="flex gap-2 w-full max-w-2xl">
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="flex-1 p-2 border rounded"
        />
        <button
          onClick={refreshIframe}
          className="p-2 bg-blue-500 text-white rounded"
        >
          refresh
        </button>
        <button
          onClick={enterFullScreen}
          className="p-2 bg-green-500 text-white rounded"
        >
          fullscreen
        </button>
      </div>

      <div className="w-full h-full max-w-5xl border rounded-lg overflow-hidden">
        <iframe
          ref={iframeRef}
          src={url}
          className="w-full h-full border-none"
        />
      </div>
    </div>
  );
}
