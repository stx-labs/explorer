# Stacks Explorer

![CI/CD](https://github.com/blockstack/explorer/actions/workflows/ci.yml/badge.svg)
[![codecov](https://codecov.io/gh/hirosystems/explorer/branch/main/graph/badge.svg?token=03EGMFTMO0)](https://app.codecov.io/gh/hirosystems/explorer)

| Environment | Status                                                                                      |
| ----------- | ------------------------------------------------------------------------------------------- |
| Prod        | ![Prod App Status](https://argo-cd.hiro.tools/api/badge?name=explorer&revision=true)        |
| Staging     | ![Staging App Status](https://argo-cd.stg.hiro.tools/api/badge?name=explorer&revision=true) |
| Dev         | ![Dev App Status](https://argo-cd.dev.hiro.tools/api/badge?name=explorer&revision=true)     |

# Stacks Explorer

The [Stacks Explorer](https://explorer.hiro.so/) is an observability tool that helps users, developers, miners, and investors understand the Stacks Blockchain. It's built with [React](https://reactjs.org/), [next.js](https://nextjs.org/) and [Chakra UI](https://chakra-ui.com/).

This README will guide you through the process of setting up and running the Stacks Explorer locally and how to contribute to the project.

## Bugs and feature requests

If you encounter a bug or have a feature request for the Stacks Explorer, we encourage you to follow the steps below:

1.  **Search for existing issues:** Before submitting a new issue, please search [existing and closed issues](https://github.com/hirosystems/explorer/issues) to check if a similar problem or feature request has already been reported.
1.  **Open a new issue:** If it hasn't been addressed, please [open a new issue](https://github.com/hirosystems/explorer/issues/new/choose). Choose the appropriate issue template and provide as much detail as possible, including steps to reproduce the bug or a clear description of the requested feature.
1.  **Evaluation SLA:** Our team reads and evaluates all the issues and pull requests. We are available Monday to Friday and we make a best effort to respond within 7 business days

Please **do not** use the issue tracker for personal support requests or to ask for the status of a transaction. You'll find help at the [#support Discord channel](https://discord.com/channels/621759717756370964/625538774230892545).

## Contributing

Development of the Explorer happens in the open on GitHub, and we are grateful to the community for contributing bugfixes and improvements. Read below to learn how you can take part in improving the Stacks Explorer.

### Code of Conduct

Please read the Explorer's [Code of conduct](https://github.com/hirosystems/explorer/blob/main/CODE_OF_CONDUCT.md) since we expect project participants to adhere to it.

### Contributing Guide

Read our [contributing guide](https://github.com/hirosystems/explorer/blob/main/.github/CONTRIBUTING.md) to learn about our development process, how to propose bugfixes and improvements, and how to build and test your changes.

## Community

Join our community and stay connected with the latest updates and discussions:

- [Join our Discord community chat](https://discord.com/invite/pPwMzMx9k8) to engage with other users, ask questions, and participate in discussions.

- [Visit hiro.so](https://www.hiro.so/) for updates and subcribing to the mailing list.

- Follow [Hiro on Twitter.](https://twitter.com/hirosystems)

## Troubleshooting

### Common Development Issues

#### Node.js version mismatch

**Symptom**: Build errors or unexpected behavior after installing dependencies.

**Solution**: Ensure you're using Node.js v22+. If using nvm:
```bash
nvm use
```

#### PNPM installation fails

**Symptom**: Permission errors or module not found.

**Solution**: 
1. Clear the pnpm cache: `pnpm store prune`
2. Delete `node_modules` and `pnpm-lock.yaml`
3. Re-run `pnpm i`

#### Environment variables not loading

**Symptom**: API calls fail, pages show errors.

**Solution**: 
1. Ensure `.env.local` exists in the project root
2. Restart the dev server after adding/changing env vars
3. Check that variable names start with `NEXT_PUBLIC_`

#### API connection issues

**Symptom**: "Failed to fetch" errors in the console.

**Solution**:
1. Verify your internet connection
2. Check if the Hiro API is operational at [status.hiro.so](https://status.hiro.so)
3. Try switching between mainnet and testnet

#### Tests failing with type errors

**Symptom**: Jest shows "Cannot find module" or type errors.

**Solution**:
```bash
# Rebuild type definitions
pnpm build
```

For more setup details, see the [Getting Started](./docs/getting-started.md) guide.

## License

The Stacks Explorer is open source and released under the MIT License.
