---
Title: Architecture Overview
---

# Architecture Overview

This document provides an overview of the Stacks Explorer's architecture and key components.

## Technology Stack

| Layer | Technology | Description |
|-------|------------|-------------|
| Framework | [Next.js](https://nextjs.org/) | React framework with SSR support |
| UI Library | [Chakra UI](https://chakra-ui.com/) | Component library for styling |
| State Management | React Context + Hooks | Client-side state management |
| API Client | Custom fetch wrappers | Stacks API integration |
| Testing | Jest + Playwright | Unit and E2E testing |

## Directory Structure

```
explorer/
├── src/
│   ├── app/           # Next.js app router pages
│   ├── common/        # Shared utilities and constants
│   ├── components/    # Reusable UI components
│   ├── features/      # Feature-specific components and logic
│   └── hooks/         # Custom React hooks
├── docs/              # Documentation
├── e2e/               # End-to-end tests
├── public/            # Static assets
└── .storybook/        # Storybook configuration
```

## Key Features

### Transaction Explorer
- View transaction details, status, and events
- Real-time transaction tracking
- Support for all Stacks transaction types (STX transfers, contract calls, deployments)

### Block Explorer
- Browse blocks and their contents
- View miner information and rewards
- Block confirmation status

### Contract Explorer
- View deployed smart contracts
- Explore contract source code
- Function call history

### Address Explorer
- Account balances (STX and tokens)
- Transaction history
- Stacking status

## API Integration

The Explorer connects to Stacks blockchain nodes via the Hiro API:

```typescript
// Example API endpoints used
const API_ENDPOINTS = {
  mainnet: 'https://api.hiro.so',
  testnet: 'https://api.testnet.hiro.so',
};

// Transaction lookup
GET /extended/v1/tx/{txId}

// Block lookup
GET /extended/v1/block/{blockHash}

// Address info
GET /extended/v1/address/{address}

// Contract info
GET /extended/v2/contracts/source/{address}/{name}
```

## Performance Considerations

1. **Server-Side Rendering (SSR)**: Critical data is fetched server-side for faster initial page loads
2. **Caching**: API responses are cached to reduce redundant requests
3. **Code Splitting**: Next.js automatically splits code for optimal loading
4. **Image Optimization**: Using Next.js Image component for optimized images

## Environment Configuration

The Explorer supports multiple environments:

| Environment | API Endpoint | Purpose |
|-------------|--------------|---------|
| Production | api.hiro.so | Live mainnet data |
| Staging | api.stg.hiro.so | Pre-production testing |
| Development | localhost:3999 | Local development |

## Contributing New Features

When adding new features:

1. Create feature components in `src/features/`
2. Add reusable UI components to `src/components/`
3. Use existing hooks or create new ones in `src/hooks/`
4. Write tests in `e2e/` for user flows
5. Update documentation in `docs/`

See the [Contributing Guide](/.github/CONTRIBUTING.md) for more details.
