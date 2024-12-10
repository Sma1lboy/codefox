import { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
  schema: './src/graphql/schema.gql',
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
};

export default config;
