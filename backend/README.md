# Backend Project Setup

## Installation

To install the project dependencies, run the following command:

```bash
pnpm install
```

## Running the Project

To start the project in development mode, use:

```bash
pnpm run dev
```

> **Note:** The `pnpm run dev` command will first build `codefox-common` before starting the backend. If you use `pnpm run start:dev`, it will not build `codefox-common`.

For production mode, build and start the project:

```bash
pnpm run build
pnpm run start:prod
```

## Running Tests

To run all tests, use:

```bash
pnpm run test
```

If you need to run integration tests for the build system, set the `INTEGRATION_TEST` environment variable:

```bash
INTEGRATION_TEST=1 npx jest
```
