import { useContext, useEffect, useRef, useState } from 'react';
import { ProjectContext } from './project-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  ChevronLeft,
  ChevronRight,
  Maximize,
  ExternalLink,
  RefreshCcw,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';

export default function WebPreview() {
  const { curProject } = useContext(ProjectContext);
  const [baseUrl, setBaseUrl] = useState('');
  const [displayPath, setDisplayPath] = useState('/');
  const [history, setHistory] = useState<string[]>(['/']);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [scale, setScale] = useState(0.7);
  const iframeRef = useRef(null);
  const containerRef = useRef<{ projectPath: string; domain: string } | null>(
    null
  );
  const lastProjectPathRef = useRef<string | null>(null);

  useEffect(() => {
    const getWebUrl = async () => {
      if (!curProject) return;
      const projectPath = curProject.projectPath;

      if (lastProjectPathRef.current === projectPath) {
        return;
      }

      lastProjectPathRef.current = projectPath;

      if (containerRef.current?.projectPath === projectPath) {
        setBaseUrl(`http://${containerRef.current.domain}`);
        return;
      }

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

        await new Promise((resolve) => setTimeout(resolve, 100));

        containerRef.current = {
          projectPath,
          domain: json.domain,
        };

        const checkUrlStatus = async (url: string) => {
          let status = 0;
          while (status !== 200) {
            try {
              const res = await fetch(url, { method: 'HEAD' });
              status = res.status;
              if (status !== 200) {
                console.log(`URL status: ${status}. Retrying...`);
                await new Promise((resolve) => setTimeout(resolve, 1000));
              }
            } catch (err) {
              console.error('Error checking URL status:', err);
              await new Promise((resolve) => setTimeout(resolve, 1000));
            }
          }
        };

        const baseUrl = `http://${json.domain}`;
        await checkUrlStatus(baseUrl);

        setBaseUrl(baseUrl);
        setDisplayPath('/');
      } catch (error) {
        console.error('fetching url error:', error);
      }
    };

    getWebUrl();
  }, [curProject]);

  useEffect(() => {
    if (iframeRef.current && baseUrl) {
      const fullUrl = `${baseUrl}${displayPath}`;
      iframeRef.current.src = fullUrl;
    }
  }, [baseUrl, displayPath]);

  const enterFullScreen = () => {
    if (iframeRef.current) {
      iframeRef.current.requestFullscreen();
    }
  };

  const openInNewTab = () => {
    if (baseUrl) {
      const fullUrl = `${baseUrl}${displayPath}`;
      window.open(fullUrl, '_blank');
    }
  };

  const handlePathChange = (newPath: string) => {
    if (!newPath.startsWith('/')) {
      newPath = '/' + newPath;
    }
    setDisplayPath(newPath);
    // Add new path to history, removing any forward history
    const newHistory = history.slice(0, currentIndex + 1);
    setHistory([...newHistory, newPath]);
    setCurrentIndex(newHistory.length);
  };

  const goBack = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setDisplayPath(history[currentIndex - 1]);
    }
  };

  const goForward = () => {
    if (currentIndex < history.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setDisplayPath(history[currentIndex + 1]);
    }
  };
  const reloadIframe = () => {
    const iframe = document.getElementById('myIframe') as HTMLIFrameElement;
    if (iframe) {
      iframe.src = iframe.src;
      setScale(0.7);
    }
  };

  const zoomIn = () => {
    setScale((prevScale) => Math.min(prevScale + 0.1, 2)); // 最大缩放比例为 2
  };

  const zoomOut = () => {
    setScale((prevScale) => Math.max(prevScale - 0.1, 0.5)); // 最小缩放比例为 0.5
  };

  return (
    <div className="flex flex-col w-full h-full">
      {/* URL Bar */}
      <div className="flex items-center gap-2 px-3 h-11 border-b bg-muted">
        {/* Navigation Controls */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={goBack}
            disabled={!baseUrl || currentIndex === 0}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={goForward}
            disabled={!baseUrl || currentIndex >= history.length - 1}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={reloadIframe}
          >
            <RefreshCcw />
          </Button>
        </div>

        {/* URL Input */}
        <div className="flex-1 flex items-center">
          <Input
            type="text"
            value={displayPath}
            onChange={(e) => handlePathChange(e.target.value)}
            className="h-8 bg-secondary"
            placeholder="/"
            disabled={!baseUrl}
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={zoomOut}
            className="h-8 w-8"
            disabled={!baseUrl}
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={zoomIn}
            className="h-8 w-8"
            disabled={!baseUrl}
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={openInNewTab}
            className="h-8 w-8"
            disabled={!baseUrl}
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={enterFullScreen}
            className="h-8 w-8"
            disabled={!baseUrl}
          >
            <Maximize className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Preview Container */}
      <div className="relative flex-1 w-full h-full">
        {baseUrl ? (
          <iframe
            id="myIframe"
            ref={iframeRef}
            src={`${baseUrl}${displayPath}`}
            className="absolute inset-0 w-full h-80% border-none bg-background"
            style={{
              transform: `scale(${scale})`,
              transformOrigin: 'top left',
              width: `calc(100% / ${scale})`,
              height: `calc(100% / ${scale})`,
              border: 'none',
            }}
          />
        ) : (
          <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-background">
            <p className="text-sm text-muted-foreground">Loading preview...</p>
          </div>
        )}
      </div>
    </div>
  );
}
