'use client';

import { ApolloProvider } from '@apollo/client';
import client from '@/lib/client';

interface Props {
  children: React.ReactNode;
}

export default function DynamicApolloProvider({ children }: Props) {
  return <ApolloProvider client={client}>{children}</ApolloProvider>;
}
