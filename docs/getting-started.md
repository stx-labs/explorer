---
Title: Getting Started
---

# Getting Started

The Explorer is built with [React](https://reactjs.org/), [next.js](https://github.com/vercel/next.js) and [@stacks/ui](https://github.com/hirosystems/ui).

## Prerequisites

To run the explorer locally, you must first clone the [Explorer repository](https://github.com/hirosystems/explorer).

You must also ensure you have installed the project dependencies listed below.

- [Node.js](https://nodejs.org/) **v22 or higher** (LTS recommended)
- [PNPM](https://pnpm.io/installation/) **v10 or higher**

> **Tip:** Use [nvm](https://github.com/nvm-sh/nvm) to manage Node.js versions. Run `nvm use` in the project root to automatically switch to the required version.

It is also highly recommended you install [Homebrew](https://brew.sh/) (macOS).

## Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/hirosystems/explorer.git
cd explorer

# 2. Switch to correct Node.js version (if using nvm)
nvm use

# 3. Install dependencies
pnpm i

# 4. Create environment file
cp .env.example .env.local

# 5. Start development server
pnpm dev
```

The explorer will be available at `http://localhost:3000`.

## Installing Project Dependencies

To install project dependencies:

1. Open your terminal window and make sure you are in the `/explorer` folder.
2. Run the `pnpm i` command to install the project dependencies.

## Setting Environment Variables

The Explorer application needs the environment variables listed below to work properly. Create a `.env.local` file in the project root:

```
NEXT_PUBLIC_MAINNET_API_SERVER=https://api.hiro.so
NEXT_PUBLIC_TESTNET_API_SERVER=https://api.testnet.hiro.so
NEXT_PUBLIC_LEGACY_EXPLORER_API_SERVER=https://explorer-api.legacy.blockstack.org
NEXT_PUBLIC_DEPLOYMENT_URL=https://explorer.hiro.so
NEXT_PUBLIC_MAINNET_ENABLED="true"
NEXT_PUBLIC_DEFAULT_POLLING_INTERVAL="10000"
```

> **_NOTE:_**
>
> If you are working in a macOS environment, you will need to add these variable to `/etc/paths`.

## Running Tests

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run specific test file
pnpm test -- path/to/test.ts
```

## Common Issues

If you encounter issues during setup, see the troubleshooting section in the main [README](../README.md).
