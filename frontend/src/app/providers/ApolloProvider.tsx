"use client";
import { ApolloClient, InMemoryCache, ApolloProvider, createHttpLink } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext'; // ✅ Import AuthContext

const httpLink = createHttpLink({
  uri: process.env.NEXT_PUBLIC_GRAPHQL_URL || 'http://localhost:4000/graphql',
});

export default function ApolloWrapper({ children }: { children: React.ReactNode }) {
  const { token, refreshAccessToken } = useAuth(); // ✅ Access AuthContext
  const [client, setClient] = useState<ApolloClient<any> | null>(null);

  const authLink = setContext(async (_, { headers }) => {
    let currentToken = localStorage.getItem('accessToken');

    if (!currentToken) {
      currentToken = await refreshAccessToken(); // ✅ Refresh token if missing
    }

    return {
      headers: {
        ...headers,
        Authorization: currentToken ? `Bearer ${currentToken}` : "",
      },
    };
  });

  useEffect(() => {
    const client = new ApolloClient({
      link: authLink.concat(httpLink),
      cache: new InMemoryCache(),
    });
    setClient(client);
  }, [token]); // ✅ Rebuild client when token updates

  if (!client) return null;

  return <ApolloProvider client={client}>{children}</ApolloProvider>;
}