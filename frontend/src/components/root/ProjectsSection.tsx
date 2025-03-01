'use client';

import Image from 'next/image';

const communityProjects = [
  {
    id: 1,
    name: 'Hoodie Store',
    createDate: '2025-02-01',
    author: 'John Doe',
    forkNum: 1400,
    image: 'https://picsum.photos/500/250?random=1',
  },
  {
    id: 2,
    name: 'FuturisticLanding',
    createDate: '2025-01-20',
    author: 'Jane Smith',
    forkNum: 1200,
    image: 'https://picsum.photos/500/250?random=2',
  },
  {
    id: 3,
    name: 'Next.js Conf 2024',
    createDate: '2025-02-15',
    author: 'Alex Johnson',
    forkNum: 2100,
    image: 'https://picsum.photos/500/250?random=3',
  },
  {
    id: 4,
    name: 'Glow new component',
    createDate: '2025-01-05',
    author: 'Emily Wang',
    forkNum: 999,
    image: 'https://picsum.photos/500/250?random=4',
  },
  {
    id: 5,
    name: 'Hoodie Store',
    createDate: '2025-02-01',
    author: 'John Doe',
    forkNum: 1400,
    image: 'https://picsum.photos/500/250?random=1',
  },
  {
    id: 6,
    name: 'FuturisticLanding',
    createDate: '2025-01-20',
    author: 'Jane Smith',
    forkNum: 1200,
    image: 'https://picsum.photos/500/250?random=2',
  },
  {
    id: 7,
    name: 'Next.js Conf 2024',
    createDate: '2025-02-15',
    author: 'Alex Johnson',
    forkNum: 2100,
    image: 'https://picsum.photos/500/250?random=3',
  },
  {
    id: 8,
    name: 'Glow new component',
    createDate: '2025-01-05',
    author: 'Emily Wang',
    forkNum: 999,
    image: 'https://picsum.photos/500/250?random=4',
  },
];
// mock 数据：我的项目
const myProjects = [
  {
    id: 1,
    name: 'recipe-haven-journal',
    createDate: '2025-01-25',
    author: 'Me',
    forkNum: 10,
    image: 'https://picsum.photos/500/250?random=5',
  },
  {
    id: 2,
    name: 'mindful-byte-odyssey',
    createDate: '2025-01-29',
    author: 'Me',
    forkNum: 12,
    image: 'https://picsum.photos/500/250?random=6',
  },
  {
    id: 3,
    name: 'web-page-builder',
    createDate: '2025-01-02',
    author: 'Me',
    forkNum: 23,
    image: 'https://picsum.photos/500/250?random=7',
  },
  {
    id: 4,
    name: 'beat-collective',
    createDate: '2025-02-10',
    author: 'Me',
    forkNum: 5,
    image: 'https://picsum.photos/500/250?random=8',
  },
];

const ProjectCard = ({ project }) => (
  <div className="cursor-pointer group space-y-3">
    {/* Image section - with card styling */}
    <div className="relative rounded-lg overflow-hidden shadow-md transform transition-all duration-300 hover:-translate-y-2 hover:shadow-xl">
      <Image
        src={project.image}
        alt={project.name}
        width={600}
        height={200}
        className="w-full h-36 object-cover transition-all duration-300 group-hover:brightness-75"
      />
      <div className="absolute bottom-0 right-0 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded-tl-md">
        {project.forkNum} forks
      </div>

      {/* View Detail hover effect */}
      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <button className="bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-md font-medium transform transition-transform duration-300 scale-90 group-hover:scale-100">
          View Detail
        </button>
      </div>
    </div>

    {/* Info section - without card background */}
    <div className="px-1">
      <div className="flex flex-col space-y-2">
        {/* Project name */}
        <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">
          {project.name}
        </h3>

        {/* Author and date info */}
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <span className="inline-block w-5 h-5 rounded-full bg-gray-300 dark:bg-gray-600 mr-2"></span>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {project.author}
            </span>
          </div>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {formatDate(project.createDate)}
          </span>
        </div>
      </div>
    </div>
  </div>
);

// Main Projects Section component
export function ProjectsSection() {
  return (
    <section className="w-full max-w-7xl mx-auto px-4">
      {/* From the Community */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-semibold dark:text-white">
            From the Community
          </h2>
          <button className="text-primary-600 dark:text-primary-400 hover:underline">
            View All &rarr;
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {communityProjects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      </div>

      {/* My Projects */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-semibold dark:text-white">
            My Projects
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {myProjects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      </div>
    </section>
  );
}

const formatDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};
