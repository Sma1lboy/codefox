import { useEffect, useRef, useState } from 'react';

export default function WebPreview() {
  const [url, setUrl] = useState(
    'https://kzmgu6xz4h7tgnj3yzwq.lite.vusercontent.net/'
  );
  const iframeRef = useRef(null);

  useEffect(() => {
    const getWebUrl = async () => {
      // TODO: using dynamic loading project by useContext
      const projectPath =
        '2025-02-10T02-09-3-fc331808-0edf-44fb-9f34-9310b890ba71';
      try {
        const response = await fetch(
          `http://localhost:3000/api/runProject?projectPath=${encodeURIComponent(projectPath)}`,
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
  }, []);

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

      <div className="w-full max-w-5xl border rounded-lg overflow-hidden">
        <iframe
          ref={iframeRef}
          src={url}
          className="w-full h-[600px] border-none"
        />
      </div>
    </div>
  );
}
