import { LocalStore } from '@/lib/storage';
import {
  ApolloClient,
  InMemoryCache,
  HttpLink,
  ApolloLink,
  concat,
  from,
  split,
} from '@apollo/client';
import { onError } from '@apollo/client/link/error';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { createClient } from 'graphql-ws';

import { getMainDefinition } from '@apollo/client/utilities';

// HTTP Link
const httpLink = new HttpLink({
  uri: process.env.NEXT_PUBLIC_GRAPHQL_URL,
  headers: {
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Origin': '*',
  },
});

// WebSocket Link
const wsLink = new GraphQLWsLink(
  createClient({
    url: process.env.NEXT_PUBLIC_GRAPHQL_URL?.replace('http', 'ws') || '',
    connectionParams: () => {
      if (typeof window === 'undefined') return {};

      const token = localStorage.getItem(LocalStore.accessToken);
      return {
        Authorization: token ? `Bearer ${token}` : '',
      };
    },
    on: {
      connected: () => console.log('WebSocket Connected'),
      error: (err) => console.error('WebSocket Error:', err),
      closed: () => console.log('WebSocket Closed'),
    },
  })
);

// Logging Middleware
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

// Auth Middleware
const authMiddleware = new ApolloLink((operation, forward) => {
  if (typeof window === 'undefined') {
    return forward(operation);
  }
  const token = localStorage.getItem(LocalStore.accessToken);
  if (token) {
    operation.setContext({
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }
  return forward(operation);
});

// Error Link
const errorLink = onError(({ graphQLErrors, networkError, operation }) => {
  if (graphQLErrors) {
    graphQLErrors.forEach(({ message, locations, path }) => {
      console.error(
        `[GraphQL error]: Message: ${message}, Location: ${locations}, Path: ${path}`
      );
    });
  }
  if (networkError) {
    console.error(`[Network error]: ${networkError}`);
  }
});

// Split traffic based on operation type
const splitLink = split(
  ({ query }) => {
    const definition = getMainDefinition(query);
    return (
      definition.kind === 'OperationDefinition' &&
      definition.operation === 'subscription'
    );
  },
  wsLink,
  from([errorLink, requestLoggingMiddleware, authMiddleware, httpLink])
);

// Create Apollo Client
const client = new ApolloClient({
  link: splitLink,
  cache: new InMemoryCache(),
  defaultOptions: {
    watchQuery: {
      fetchPolicy: 'no-cache',
    },
    query: {
      fetchPolicy: 'no-cache',
    },
  },
});

export default client;
