'use client'; // Only needed if you import this directly in a client component

import {
  ApolloClient,
  InMemoryCache,
  HttpLink,
  ApolloLink,
  from,
  split,
  gql,
} from '@apollo/client';
import { onError } from '@apollo/client/link/error';
import { setContext } from '@apollo/client/link/context';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { createClient } from 'graphql-ws';
import { getMainDefinition, Observable } from '@apollo/client/utilities';
import { LocalStore } from '@/lib/storage';

// 1. GraphQL HTTP Link
const httpLink = new HttpLink({
  uri: process.env.NEXT_PUBLIC_GRAPHQL_URL || 'http://localhost:8080/graphql',
  headers: {
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Origin': '*',
  },
});

// 2. Auth Link (attach tokens to headers)
const authLink = setContext((_, { headers }) => {
  if (typeof window === 'undefined') {
    return { headers };
  }
  const accessToken = localStorage.getItem('accessToken');
  const refreshToken = localStorage.getItem('refreshToken');
  return {
    headers: {
      ...headers,
      authorization: accessToken ? `Bearer ${accessToken}` : '',
      'x-refresh-token': refreshToken || '',
    },
  };
});

// 3. Conditionally create WebSocket Link for subscriptions
let wsLink: GraphQLWsLink | undefined;
if (typeof window !== 'undefined') {
  wsLink = new GraphQLWsLink(
    createClient({
      url:
        process.env.NEXT_PUBLIC_GRAPHQL_WS_URL || 'ws://localhost:8080/graphql',
    })
  );
}

// 4. Logging Middleware (for debugging requests/responses)
const requestLoggingMiddleware = new ApolloLink((operation, forward) => {
  console.log('GraphQL Request:', {
    operationName: operation.operationName,
    variables: operation.variables,
    query: operation.query.loc?.source.body,
  });
  return forward(operation).map((response) => {
    console.log('GraphQL Response:', response.data);
    return response;
  });
});

// 6. Define the Refresh Token Mutation (as a string or gql tag)
const REFRESH_TOKEN_MUTATION = gql`
  mutation RefreshToken($refreshToken: String!) {
    refreshToken(refreshToken: $refreshToken) {
      accessToken
      refreshToken
    }
  }
`;

// 7. Error Link: Direct Fetch for Refresh Token
const errorLink = onError(
  ({ graphQLErrors, networkError, operation, forward }) => {
    // Check if "Unauthorized" error is present
    if (
      typeof window !== 'undefined' &&
      graphQLErrors &&
      graphQLErrors.some((err) => err.message.includes('Unauthorized'))
    ) {
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        // Create a new Observable that handles the token refresh
        return new Observable((observer) => {
          fetch(
            process.env.NEXT_PUBLIC_GRAPHQL_URL ||
              'http://localhost:8080/graphql',
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                query: REFRESH_TOKEN_MUTATION.loc?.source.body,
                variables: { refreshToken },
              }),
            }
          )
            .then((res) => res.json())
            .then(({ data }) => {
              if (!data || !data.refreshToken) {
                throw new Error('Refresh token failed');
              }

              localStorage.setItem(
                'accessToken',
                data.refreshToken.accessToken
              );
              localStorage.setItem(
                'refreshToken',
                data.refreshToken.refreshToken
              );

              // Update the original operation's headers
              operation.setContext(({ headers = {} }) => ({
                headers: {
                  ...headers,
                  authorization: `Bearer ${data.refreshToken.accessToken}`,
                },
              }));

              // Retry the original operation
              forward(operation).subscribe({
                next: (result) => observer.next(result),
                error: (err) => observer.error(err),
                complete: () => observer.complete(),
              });
            })
            .catch((err) => {
              console.error('Refresh token error:', err);
              // Clear tokens, redirect or show sign-in modal
              localStorage.removeItem('accessToken');
              localStorage.removeItem('refreshToken');
              observer.error(err);
            });
        });
      }
    }

    // If no refresh token or not "Unauthorized", just continue
    if (networkError) {
      console.error(`[Network error]: ${networkError}`);
    }
    return forward(operation);
  }
);

// 8. Split Link: Subscriptions vs. Queries
const splitLink = wsLink
  ? split(
      ({ query }) => {
        const definition = getMainDefinition(query);
        return (
          definition.kind === 'OperationDefinition' &&
          definition.operation === 'subscription'
        );
      },
      wsLink,
      from([errorLink, requestLoggingMiddleware, authLink, httpLink])
    )
  : from([errorLink, requestLoggingMiddleware, authLink, httpLink]);

// 9. Create the Unified Apollo Client
export const client = new ApolloClient({
  link: splitLink,
  cache: new InMemoryCache(),
  defaultOptions: {
    watchQuery: { fetchPolicy: 'no-cache' },
    query: { fetchPolicy: 'no-cache' },
  },
});

export default client;
