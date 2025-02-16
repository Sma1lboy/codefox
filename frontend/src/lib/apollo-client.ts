import {
  ApolloClient,
  InMemoryCache,
  createHttpLink,
  from,
} from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { onError } from '@apollo/client/link/error';
import { REFRESH_TOKEN } from '@/graphql/mutations/auth';

const httpLink = createHttpLink({
  uri: process.env.NEXT_PUBLIC_GRAPHQL_URL,
});

const authLink = setContext((_, { headers }) => {
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

const errorLink = onError(({ graphQLErrors, operation, forward }) => {
  if (graphQLErrors?.some((err) => err.message.includes('Unauthorized'))) {
    const refreshToken = localStorage.getItem('refreshToken');

    if (refreshToken) {
      return new Promise((resolve, reject) => {
        client
          .mutate({
            mutation: REFRESH_TOKEN,
            variables: { refreshToken },
          })
          .then(({ data }) => {
            // Store new tokens
            localStorage.setItem('accessToken', data.refreshToken.accessToken);
            localStorage.setItem(
              'refreshToken',
              data.refreshToken.refreshToken
            );

            // Update authorization header
            operation.setContext(({ headers = {} }) => ({
              headers: {
                ...headers,
                authorization: `Bearer ${data.refreshToken.accessToken}`,
              },
            }));

            // Retry original operation
            resolve(forward(operation));
          })
          .catch((error) => {
            // Token refresh failed, redirect to login
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            window.location.href = '/login';
            reject(error);
          });
      });
    }
  }
  return forward(operation);
});

export const client = new ApolloClient({
  link: from([errorLink, authLink, httpLink]),
  cache: new InMemoryCache(),
});
