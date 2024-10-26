import { ModelTags } from '@/graphql/type';
import client from '@/utils/client';
import { gql } from '@apollo/client';

export function getSelectedModel(): string {
  if (typeof window !== 'undefined') {
    client
      .query<ModelTags>({
        query: gql`
          query {
            modelTags {
              tags
            }
          }
        `,
      })
      .then((result) => {
        console.log(result.data.tags);
      });
    const storedModel = localStorage.getItem('selectedModel');
    return storedModel || 'gemma:2b';
  } else {
    // Default model
    return 'default';
  }
}
