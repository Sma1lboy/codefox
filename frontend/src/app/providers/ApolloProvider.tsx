'use client';

import { ApolloClient, InMemoryCache, ApolloProvider } from '@apollo/client';
import { useEffect, useState } from 'react';

export default function ApolloWrapper({ children }: { children: React.ReactNode }) {
  const [client, setClient] = useState<ApolloClient<any> | null>(null);

  useEffect(() => {
    const client = new ApolloClient({
      uri: process.env.NEXT_PUBLIC_GRAPHQL_URL || 'http://localhost:4000/graphql',
      cache: new InMemoryCache(),
    });
    setClient(client);
  }, []);

  if (!client) {
    return null;
  }

  return <ApolloProvider client={client}>{children}</ApolloProvider>;
}