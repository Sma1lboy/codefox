'use client';

import { useEffect, useRef, useState } from 'react';
import DomInspector from 'dom-inspector';

export function ElementInspector() {
  const [isInspecting, setIsInspecting] = useState(false);
  const iframeInspectorRef = useRef<any>(null);

  useEffect(() => {
    if (isInspecting) {
      setupIframeInspector(); // 监听 iframe
    } else {
      if (iframeInspectorRef.current) {
        iframeInspectorRef.current.disable();
        iframeInspectorRef.current = null;
      }
    }
  }, [isInspecting]);

  const setupIframeInspector = () => {
    const iframe = document.querySelector('iframe');
    if (!iframe) return;

    // 使用 MutationObserver 监听 iframe 何时真正加载完成
    const observer = new MutationObserver(() => {
      try {
        const iframeDoc =
          iframe.contentDocument || iframe.contentWindow?.document;
        if (!iframeDoc) return;

        console.log('Iframe loaded, attaching inspector...');

        // 绑定 `dom-inspector` 到 `iframe` 内部
        iframeInspectorRef.current = new DomInspector({
          root: iframeDoc.body, // 绑定 `iframe` 内部
          exclude: [],
          theme: 'github',
          maxZIndex: '10000000',
          onHover: (element: Element) => {
            console.log('Hovering inside iframe:', element);
          },
          onSelect: (element: Element) => {
            console.log('Selected inside iframe:', element);
            element.classList.add('border-2', 'border-red-500'); // 添加边框
            setIsInspecting(false);
          },
        });

        iframeInspectorRef.current.enable();

        // 停止观察（已经加载完成）
        observer.disconnect();
      } catch (error) {
        console.warn('无法访问 iframe:', error);
      }
    });

    // 开始观察 iframe 的内容变化
    observer.observe(iframe, {
      attributes: true,
      childList: true,
      subtree: true,
    });
  };

  return (
    <button
      onClick={() => setIsInspecting(!isInspecting)}
      className={`fixed bottom-4 right-4 px-4 py-2 rounded-md text-sm font-medium ${
        isInspecting
          ? 'bg-red-500 hover:bg-red-600'
          : 'bg-blue-500 hover:bg-blue-600'
      } text-white transition-colors`}
    >
      {isInspecting ? 'Stop Inspecting' : 'Inspect Iframe'}
    </button>
  );
}
