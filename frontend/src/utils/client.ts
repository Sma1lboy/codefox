import {
  ApolloClient,
  InMemoryCache,
  HttpLink,
  ApolloLink,
  concat,
} from '@apollo/client';

const httpLink = new HttpLink({
  uri: process.env.NEXT_PUBLIC_GRAPHQL_URL,
});

const authMiddleware = new ApolloLink((operation, forward) => {
  // Get the authentication token from local storage if it exists
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
const client = new ApolloClient({
  link: concat(authMiddleware, httpLink),
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
