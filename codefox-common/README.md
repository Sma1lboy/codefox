# codefox-common

Common utilities and types for Codefox projects.

## Installation

Since this is a workspace package, you can add it to your project's dependencies:

```json
{
  "dependencies": {
    "codefox-common": "workspace:*"
  }
}
```

Then run:

```bash
pnpm install
```

The package will automatically build during installation due to the prepare script.

## Manual Building

If you need to rebuild the package manually:

```bash
# Install dependencies
pnpm install

# Build package
pnpm run build
```

This will create:

- CommonJS build in `dist/cjs`
- ES Modules build in `dist/esm`
- TypeScript declarations in `dist/types`

## Usage

You can import types and utilities using either ESM or CommonJS syntax:

```typescript
// ESM
import { BaseEntity, Result } from 'codefox-common';

// CommonJS
const { BaseEntity } = require('codefox-common');
```

### Available Types

```typescript
// Base entity with common fields
interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

// Error response structure
interface ErrorResponse {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

// Generic result type
type Result<T> =
  | {
      success: true;
      data: T;
    }
  | {
      success: false;
      error: ErrorResponse;
    };
```

## Development

1. Make changes in `src/` directory
2. The package will automatically rebuild when you run `pnpm install`
3. For manual rebuilds, run `pnpm run build`
4. Import and use in other workspace packages

## Project Structure

```
codefox-common/
├── src/
│   ├── index.ts     # Main entry point
│   └── types.ts     # Type definitions
├── dist/            # Build output (generated)
├── tsconfig.json    # Base TypeScript config
├── tsconfig.cjs.json    # CommonJS build config
├── tsconfig.esm.json    # ES Modules build config
└── tsconfig.types.json  # Type declarations config
```

## Auto-build Feature

The package uses npm's `prepare` script to automatically build during installation. This means:

1. When you run `pnpm install` in the root workspace
2. When you add/update this package as a dependency
3. When you clone the repository and run initial setup

The package will automatically build itself, ensuring the compiled files are always available.
