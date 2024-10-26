import { ApolloClient, gql, TypedDocumentNode } from '@apollo/client';
import type { DocumentNode } from 'graphql';

export type GetUserProjectsQuery = { __typename?: 'Query' } & {
  getUserProjects: Array<
    { __typename?: 'Project' } & {
      id: string;
      projectName: string;
      path: string;
      projectPackages?: Array<
        { __typename?: 'ProjectPackages' } & {
          id: string;
          content: string;
        }
      > | null;
    }
  >;
};

export type GetProjectDetailsQuery = { __typename?: 'Query' } & {
  getProjectDetails: { __typename?: 'Project' } & {
    id: string;
    projectName: string;
    path: string;
    projectPackages?: Array<
      { __typename?: 'ProjectPackages' } & {
        id: string;
        content: string;
      }
    > | null;
  };
};

export type GetProjectDetailsQueryVariables = {
  projectId: string;
};

export type UpsertProjectMutation = { __typename?: 'Mutation' } & {
  upsertProject: { __typename?: 'Project' } & {
    id: string;
    projectName: string;
    path: string;
    projectPackages?: Array<
      { __typename?: 'ProjectPackages' } & {
        id: string;
        content: string;
      }
    > | null;
  };
};

export type UpsertProjectMutationVariables = {
  upsertProjectInput: {
    projectId?: string | null;
    projectName: string;
    projectPackages?: Array<string> | null;
  };
};

export type DeleteProjectMutation = { __typename?: 'Mutation' } & {
  deleteProject: boolean;
};

export type DeleteProjectMutationVariables = {
  projectId: string;
};

export type RemovePackageFromProjectMutation = { __typename?: 'Mutation' } & {
  removePackageFromProject: boolean;
};

export type RemovePackageFromProjectMutationVariables = {
  projectId: string;
  packageId: string;
};

export const GET_USER_PROJECTS: TypedDocumentNode<GetUserProjectsQuery> = gql`
  query GetUserProjects {
    getUserProjects {
      id
      projectName
      path
      projectPackages {
        id
        content
      }
    }
  }
`;

export const getUserProjects = async (
  client: ApolloClient<unknown>
): Promise<GetUserProjectsQuery['getUserProjects']> => {
  try {
    const response = await client.query<GetUserProjectsQuery>({
      query: GET_USER_PROJECTS,
    });
    return response.data.getUserProjects;
  } catch (error) {
    console.error('Error fetching user projects:', error);
    throw error;
  }
};

export const GET_PROJECT_DETAILS: TypedDocumentNode<
  GetProjectDetailsQuery,
  GetProjectDetailsQueryVariables
> = gql`
  query GetProjectDetails($projectId: String!) {
    getProjectDetails(projectId: $projectId) {
      id
      projectName
      path
      projectPackages {
        id
        content
      }
    }
  }
`;

export const getProjectDetails = async (
  client: ApolloClient<unknown>,
  projectId: string
): Promise<GetProjectDetailsQuery['getProjectDetails']> => {
  try {
    const response = await client.query<
      GetProjectDetailsQuery,
      GetProjectDetailsQueryVariables
    >({
      query: GET_PROJECT_DETAILS,
      variables: { projectId },
    });
    return response.data.getProjectDetails;
  } catch (error) {
    console.error('Error fetching project details:', error);
    throw error;
  }
};

export const UPSERT_PROJECT: TypedDocumentNode<
  UpsertProjectMutation,
  UpsertProjectMutationVariables
> = gql`
  mutation UpsertProject($upsertProjectInput: UpsertProjectInput!) {
    upsertProject(upsertProjectInput: $upsertProjectInput) {
      id
      projectName
      path
      projectPackages {
        id
        content
      }
    }
  }
`;

export const upsertProject = async (
  client: ApolloClient<unknown>,
  upsertProjectInput: UpsertProjectMutationVariables['upsertProjectInput']
): Promise<UpsertProjectMutation['upsertProject']> => {
  try {
    const response = await client.mutate<
      UpsertProjectMutation,
      UpsertProjectMutationVariables
    >({
      mutation: UPSERT_PROJECT,
      variables: { upsertProjectInput },
    });
    if (!response.data) {
      throw new Error('No data returned from mutation');
    }
    return response.data.upsertProject;
  } catch (error) {
    console.error('Error creating/updating project:', error);
    throw error;
  }
};

export const DELETE_PROJECT: TypedDocumentNode<
  DeleteProjectMutation,
  DeleteProjectMutationVariables
> = gql`
  mutation DeleteProject($projectId: String!) {
    deleteProject(projectId: $projectId)
  }
`;

export const deleteProject = async (
  client: ApolloClient<unknown>,
  projectId: string
): Promise<DeleteProjectMutation['deleteProject']> => {
  try {
    const response = await client.mutate<
      DeleteProjectMutation,
      DeleteProjectMutationVariables
    >({
      mutation: DELETE_PROJECT,
      variables: { projectId },
    });
    if (!response.data) {
      throw new Error('No data returned from mutation');
    }
    return response.data.deleteProject;
  } catch (error) {
    console.error('Error deleting project:', error);
    throw error;
  }
};

export const REMOVE_PACKAGE_FROM_PROJECT: TypedDocumentNode<
  RemovePackageFromProjectMutation,
  RemovePackageFromProjectMutationVariables
> = gql`
  mutation RemovePackageFromProject($projectId: String!, $packageId: String!) {
    removePackageFromProject(projectId: $projectId, packageId: $packageId)
  }
`;

export const removePackageFromProject = async (
  client: ApolloClient<unknown>,
  projectId: string,
  packageId: string
): Promise<RemovePackageFromProjectMutation['removePackageFromProject']> => {
  try {
    const response = await client.mutate<
      RemovePackageFromProjectMutation,
      RemovePackageFromProjectMutationVariables
    >({
      mutation: REMOVE_PACKAGE_FROM_PROJECT,
      variables: { projectId, packageId },
    });
    if (!response.data) {
      throw new Error('No data returned from mutation');
    }
    return response.data.removePackageFromProject;
  } catch (error) {
    console.error('Error removing package from project:', error);
    throw error;
  }
};
