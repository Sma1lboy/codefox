import { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
  schema: './src/graphql/schema.gql',
  documents: ['src/**/*.tsx', 'src/**/*.ts'],
  ignoreNoDocuments: true,
  generates: {
    'src/graphql/type.tsx': {
      plugins: [
        'typescript',
        'typescript-operations',
        'typescript-resolvers',
        'typescript-react-apollo',
      ],
      config: {
        withHooks: true,
        useIndexSignature: true,
        enumsAsTypes: true,
        constEnums: true,
        skipTypename: false,
        dedupeOperationSuffix: true,
        nonOptionalTypename: true,
        preResolveTypes: true,
        namingConvention: {
          enumValues: 'keep',
        },
        scalars: {
          Date: 'Date',
        },
      },
    },
  },
  hooks: {
    afterOneFileWrite: ['prettier --write'],
    afterAllFileWrite: ['echo "✨ GraphQL types generated successfully"'],
    onWatchTriggered: (event, path) => {
      console.log(`🔄 Changes detected in ${path}`);
    },
    onError: (error) => {
      console.error('❌ GraphQL Codegen Error:', error);
      return null; // Continue generation even if there are errors
    },
  },
  watch: ['src/**/*.{ts,tsx,graphql,gql}'],
};

export default config;
