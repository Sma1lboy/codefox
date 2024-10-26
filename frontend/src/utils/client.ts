import {
  ApolloClient,
  InMemoryCache,
  HttpLink,
  ApolloLink,
  concat,
  from,
} from '@apollo/client';
import { onError } from '@apollo/client/link/error';

const httpLink = new HttpLink({
  uri: process.env.NEXT_PUBLIC_GRAPHQL_URL,
  headers: {
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Origin': '*',
  },
});
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
const authMiddleware = new ApolloLink((operation, forward) => {
  if (typeof window === 'undefined') {
    return forward(operation);
  }
  const token = localStorage.getItem('token');
  // Use the setContext method to set the HTTP headers.
  if (token) {
    operation.setContext({
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }
  return forward(operation);
});
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

const client = new ApolloClient({
  link: from([errorLink, requestLoggingMiddleware, authMiddleware, httpLink]),
  cache: new InMemoryCache(),
});

export default client;

// export const useClient = () => {
//   const client = useMemo(() => {
//     return new ApolloClient({
//       link: concat(authMiddleware, httpLink),
//       cache: new InMemoryCache(),
//     });
//   }, []);
//   return client;
// };
