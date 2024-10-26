module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:prettier/recommended',
  ],
  plugins: ['@typescript-eslint'],
  ignorePatterns: ['node_modules', 'dist', '.turbo', '.next', 'build'],
  rules: {
    '@typescript-eslint/no-unused-vars': [
      'warn',
      {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
      },
    ],
    'no-console': 'warn',
    'prefer-const': 'error',
    'no-var': 'error',
    '@typescript-eslint/no-explicit-any': 'warn',
  },
};
