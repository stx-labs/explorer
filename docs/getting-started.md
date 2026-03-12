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

## Installing Project Dependencies

To install project dependencies:

1. Open your terminal window and make sure you are in the `/explorer` folder.
2. Run the `pnpm i` command to install the project dependencies.

## Setting Environment Variables

The Explorer application needs the environment variables listed below to work properly. 

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

## Running the Development Server

After installing dependencies and configuring environment variables:

```bash
# Start the development server
pnpm dev

# The app will be available at http://localhost:3000
```

## Running Tests

```bash
# Run unit tests
pnpm test

# Run end-to-end tests
pnpm e2e

# Run tests in watch mode
pnpm test:watch
```

## Troubleshooting

### Common Issues

**Issue: `pnpm i` fails with node version error**
```
Solution: Ensure you're using Node.js v22 or higher. Use nvm to switch versions:
nvm install 22
nvm use 22
```

**Issue: Environment variables not loading**
```
Solution: Create a .env.local file in the project root with the required variables.
Copy from .env.example if available.
```

**Issue: API requests failing with CORS errors**
```
Solution: The Stacks API has CORS enabled for localhost. Ensure you're running 
on http://localhost:3000 (not 127.0.0.1).
```

**Issue: Build fails with memory errors**
```bash
# Increase Node.js memory limit
export NODE_OPTIONS="--max-old-space-size=4096"
pnpm build
```

### Getting Help

If you encounter issues not covered here:

1. Check [existing GitHub issues](https://github.com/hirosystems/explorer/issues)
2. Join the [Discord community](https://discord.com/invite/pPwMzMx9k8)
3. Open a new issue with detailed reproduction steps
