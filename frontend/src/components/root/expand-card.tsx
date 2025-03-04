'use client';
import Image from 'next/image';
import React, { useEffect, useId, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useOutsideClick } from '@/hooks/use-outside-click';
import { X } from 'lucide-react';

export function ExpandableCard({ projects }) {
  const [active, setActive] = useState(null);
  const [iframeUrl, setIframeUrl] = useState('');
  const id = useId();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setActive(null);
      }
    }

    if (active && typeof active === 'object') {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [active]);

  useOutsideClick(ref, () => setActive(null));

  const getWebUrl = async (project) => {
    if (!project) return;
    console.log('project:', project);
    const projectPath = project.path;

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
      const baseUrl = `http://${json.domain}`;
      setIframeUrl(baseUrl);
      setActive(project);
    } catch (error) {
      console.error('fetching url error:', error);
    }
  };

  return (
    <>
      <AnimatePresence mode="wait">
        {active && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{
              duration: 0.3,
              ease: [0.4, 0, 0.2, 1],
            }}
            className="fixed inset-0 backdrop-blur-[2px] bg-black/20 h-full w-full z-50"
            style={{ willChange: 'opacity' }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {active ? (
          <div className="fixed inset-0 grid place-items-center z-[80] m-4">
            <motion.button
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.2 }}
              className="flex absolute top-4 right-4 items-center justify-center bg-white/90 hover:bg-white rounded-full h-8 w-8"
              onClick={() => setActive(null)}
            >
              <X className="h-4 w-4 z-50" />
            </motion.button>

            <motion.div
              layoutId={`card-${active.id}`}
              ref={ref}
              className="w-full h-full flex flex-col bg-white dark:bg-neutral-900 rounded-2xl overflow-hidden"
              style={{ willChange: 'transform, opacity' }}
            >
              <motion.div className="flex-1 p-6 h-[50%]">
                <motion.div
                  layoutId={`content-${active.id}`}
                  className="h-full"
                >
                  <motion.h3
                    layoutId={`title-${active.id}`}
                    className="text-xl font-semibold text-gray-900 dark:text-gray-100"
                  >
                    {active.name}
                  </motion.h3>
                  <motion.div
                    layoutId={`meta-${active.id}`}
                    className="mt-2 w-full h-full"
                  >
                    <iframe
                      src={iframeUrl}
                      className="w-full h-[100%]"
                      title="Project Preview"
                    />
                  </motion.div>
                </motion.div>
              </motion.div>
            </motion.div>
          </div>
        ) : null}
      </AnimatePresence>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {projects.map((project) => (
          <motion.div
            key={project.id}
            layoutId={`card-${project.id}`}
            onClick={() => getWebUrl(project)}
            className="group cursor-pointer"
          >
            <motion.div
              layoutId={`image-container-${project.id}`}
              className="relative rounded-xl overflow-hidden"
            >
              <motion.div layoutId={`image-${project.id}`}>
                <Image
                  src={project.image}
                  alt={project.name}
                  width={600}
                  height={200}
                  className="w-full h-48 object-cover transition duration-300 group-hover:scale-105"
                />
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                whileHover={{ opacity: 1 }}
                transition={{ duration: 0.2 }}
                className="absolute inset-0 bg-black/40 flex items-center justify-center"
              >
                <span className="text-white font-medium px-4 py-2 rounded-lg bg-white/20 backdrop-blur-sm">
                  View Project
                </span>
              </motion.div>
            </motion.div>

            <motion.div layoutId={`content-${project.id}`} className="mt-3">
              <motion.h3
                layoutId={`title-${project.id}`}
                className="font-medium text-gray-900 dark:text-gray-100"
              >
                {project.name}
              </motion.h3>
              <motion.div
                layoutId={`meta-${project.id}`}
                className="mt-1 text-sm text-gray-500"
              >
                {project.author}
              </motion.div>
            </motion.div>
          </motion.div>
        ))}
      </div>
    </>
  );
}
