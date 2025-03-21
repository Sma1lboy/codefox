'use client';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Code as CodeIcon,
  Copy,
  Download,
  Eye,
  GitFork,
  Github,
  Share2,
  Terminal,
} from 'lucide-react';
import { useAuthContext } from '@/providers/AuthProvider';

interface ResponsiveToolbarProps {
  isLoading: boolean;
  activeTab: 'preview' | 'code' | 'console';
  setActiveTab: (tab: 'preview' | 'code' | 'console') => void;
  projectId?: string;
}

const ResponsiveToolbar = ({
  isLoading,
  activeTab,
  setActiveTab,
  projectId,
}: ResponsiveToolbarProps) => {
  const containerRef = useRef(null);
  const [containerWidth, setContainerWidth] = useState(700);
  const [visibleTabs, setVisibleTabs] = useState(3);
  const [compactIcons, setCompactIcons] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const { token, user } = useAuthContext();
  const [isPublishingToGitHub, setIsPublishingToGitHub] = useState(false);
  const [isGithubSyncComplete, setIsGithubSyncComplete] = useState(false);

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

  const handlePublishToGitHub = async () => {
    // Check if GitHub App is installed
    // Check if GitHub App is installed
    if (!user?.githubInstallationId) {
      // Prompt the user to install the GitHub App
      const shouldInstall = window.confirm(
        'You need to install the GitHub App to publish your project. Would you like to do this now?'
      );
      
      if (shouldInstall) {
        // This format ensures GitHub will prompt the user to choose where to install
        // Replace APP_ID with your actual GitHub App ID
        const installUrl = `https://github.com/apps/codefox-project-fork/installations/new`;
        window.open(installUrl);
        
        // Optionally inform the user what to do after installation
        alert('After installing the GitHub App, please return to this page and try publishing again.');
      }
      return;
    }
    
    // Ensure we have a project ID
    if (!projectId) {
      alert('Cannot publish: No project ID available');
      return;
    }
    
    // Set loading state
    setIsPublishingToGitHub(true);
    
    try {
      // Call the syncProject mutation with GraphQL
      const response = await fetch('/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          query: `
            mutation SyncProject($projectId: String!) {
            syncProject(projectId: $projectId) {
              id
              projectName
              isSyncedWithGitHub
              githubOwner
              githubRepoName
              githubRepoUrl
            }
          }

          `,
          variables: {
            projectId
          }
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.errors) {
        throw new Error(result.errors[0].message || 'GraphQL error');
      }
      
      // Get the repo URL from the response
      const repoUrl = result.data.syncProject.githubRepoUrl;
      
      // Success!
      setIsGithubSyncComplete(true);
      
      alert('Successfully published to GitHub!');
      
      // Open the repo in a new tab
      if (repoUrl) {
        const shouldOpen = window.confirm('Would you like to open the GitHub repository?');
        if (shouldOpen) {
          window.open(repoUrl, '_blank');
        }
      }
    } catch (error) {
      console.error('Error publishing to GitHub:', error);
      alert(`Error publishing to GitHub: ${error.message || 'Unknown error'}`);
    } finally {
      setIsPublishingToGitHub(false);
    }
  };

  const handleDownload = async () => {
    // If projectId is available, initiate download
    if (projectId && !isDownloading) {
      setIsDownloading(true);
      try {
        // Create a hidden anchor element for download
        const a = document.createElement('a');
        
        // Set the download URL with credentials included
        const downloadUrl = `http://localhost:8080/download/project/${projectId}`;


        const headers = new Headers();
        if (token) {
          headers.append('Authorization', `Bearer ${token}`);
        }
        
        // Fetch with credentials to ensure auth is included
        const response = await fetch(downloadUrl, {
          method: 'GET',
          headers: headers,
        });
        
        if (!response.ok) {
          throw new Error(`Download failed: ${response.status}`);
        }
        
        // Get the blob from the response
        const blob = await response.blob();
        
        // Create a URL for the blob
        const url = window.URL.createObjectURL(blob);
        
        // Set the anchor's href to the blob URL
        a.href = url;
        
        // Set download attribute with filename from Content-Disposition header or default
        const contentDisposition = response.headers.get('Content-Disposition');
        const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
        const matches = filenameRegex.exec(contentDisposition || '');
        const filename = matches && matches[1] 
          ? matches[1].replace(/['"]/g, '') 
          : `project-${projectId}.zip`;
          
        a.download = filename;
        
        // Append to the document
        document.body.appendChild(a);
        
        // Click the anchor to start download
        a.click();
        
        // Clean up
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } catch (error) {
        console.error('Error downloading project:', error);
        // Could add a toast notification here
      } finally {
        setIsDownloading(false);
      }
    }
  };

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
              <Button
                variant="outline"
                className="text-sm"
                disabled={isLoading || !projectId}
                onClick={handleDownload}
              >
                <Download className="w-4 h-4 mr-1" />
                Download
              </Button>
              <Button
                variant="outline"
                className="text-sm"
                disabled={isLoading || !projectId}
                onClick={handlePublishToGitHub}
              >
                <Github className="w-4 h-4 mr-1" />
                Github
              </Button>
            </>
          )}
          {compactIcons && (
            <>
              <Button variant="outline" className="p-2" disabled={isLoading}>
                <Share2 className="w-4 h-4" />
              </Button>
              <Button 
                variant="outline" 
                className="p-2" 
                disabled={isLoading || !projectId}
                onClick={handleDownload}
              >
                <Download className="w-4 h-4" />
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResponsiveToolbar;