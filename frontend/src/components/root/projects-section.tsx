import { gql, useQuery } from '@apollo/client';
import Image from 'next/image';

const FETCH_PUBLIC_PROJECTS = gql`
  query FetchPublicProjects($input: FetchPublicProjectsInputs!) {
    fetchPublicProjects(input: $input) {
      id
      projectName
      createdAt
      user {
        username
      }
      photoUrl
      subNumber
    }
  }
`;

const ProjectCard = ({ project }) => (
  <div className="cursor-pointer group space-y-3">
    {/* Image section with card styling */}
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

      {/* "View Detail" hover effect */}
      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <button className="bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-md font-medium transform transition-transform duration-300 scale-90 group-hover:scale-100">
          View Detail
        </button>
      </div>
    </div>

    {/* Info section */}
    <div className="px-1">
      <div className="flex flex-col space-y-2">
        <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">
          {project.name}
        </h3>
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

const formatDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

export function ProjectsSection() {
  // Execute the GraphQL query with provided variables
  const { data, loading, error } = useQuery(FETCH_PUBLIC_PROJECTS, {
    // Make sure strategy matches the backend definition (e.g., 'latest' or 'trending')
    variables: { input: { size: 10, strategy: 'latest' } },
  });

  const fetchedProjects = data?.fetchPublicProjects || [];

  // Transform fetched data to match the component's expected format
  const transformedProjects = fetchedProjects.map((project) => ({
    id: project.id,
    name: project.projectName,
    createDate: project.createdAt
      ? new Date(project.createdAt).toISOString().split('T')[0]
      : '2025-01-01',
    author: project.user?.username || 'Unknown',
    forkNum: project.subNumber || 0,
    image:
      project.photoUrl || `https://picsum.photos/500/250?random=${project.id}`,
  }));

  return (
    <section className="w-full max-w-7xl mx-auto px-4">
      <div className="mb-8">
        {/* Header and "View All" button always visible */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-semibold dark:text-white">
            From the Community
          </h2>
          <button className="text-primary-600 dark:text-primary-400 hover:underline">
            View All &rarr;
          </button>
        </div>

        {loading ? (
          <div className="text-center py-10">Loading...</div>
        ) : error ? (
          <div className="text-center py-10">Error: {error.message}</div>
        ) : (
          <div>
            {transformedProjects.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {transformedProjects.map((project) => (
                  <ProjectCard key={project.id} project={project} />
                ))}
              </div>
            ) : (
              // Show message when no projects are available
              <div className="text-center py-10 text-gray-500 dark:text-gray-400">
                No projects available.
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
