# Workplan: ECR build – switch action source and forward build secrets

## Task ID

2888 (PR `stx-labs/explorer#2888`, branch `feat/update_ecr_action_source`)

## Problem Statement

The Explorer ECR build workflow (`.github/workflows/build-explorer-image.yml`) passes `SENTRY_AUTH_TOKEN` to the image build as a BuildKit secret, but the `docker/build-push-action` wrapper it used neither declared nor forwarded a `secrets` input. The token was silently dropped, so Sentry source-map upload inside the Docker build never received it.

The wrapper actions also moved from `stx-labs/actions` to `stacks-sbtc/actions`.

## Components Involved

- `.github/workflows/build-explorer-image.yml`

## Dependencies

- `stacks-sbtc/actions#10` (merged as `e33bab33a7b152490b4b0332b1adc38aa9a2104b`), which adds the `secrets` input to `docker/build-push-action` and forwards it upstream.
- Repository/environment secret `SENTRY_AUTH_TOKEN`.

## Implementation Checklist

- [x] Point all wrapper actions at `stacks-sbtc/actions` instead of `stx-labs/actions`
- [x] Pin all wrapper actions to `e33bab33a7b152490b4b0332b1adc38aa9a2104b`, the merge commit of `stacks-sbtc/actions#10`
- [ ] Run an image build and confirm the Sentry source-map upload succeeds

## Verification Steps

- Every `stacks-sbtc/actions/*` reference in the workflow uses the same commit SHA.
- Trigger a build (PR label or `workflow_dispatch`) and confirm in the "Build and Push" log that the `SENTRY_AUTH_TOKEN` secret is mounted and source maps are uploaded.

## Decision Authority

Repository maintainers / infra owners.

## Questions/Uncertainties

### Blocking

- None.

### Non-blocking

- None.

## Acceptable Tradeoffs

- All six wrapper actions are bumped to the same SHA, not only `docker/build-push-action`, so the workflow keeps a single pin. The only other change between the old and new pin is in `github-pages/upload-pages-artifact`, which this workflow does not use.

## Status

In Progress

## Notes

- The workflow already passed `secrets: SENTRY_AUTH_TOKEN=...`; no caller-side change was needed beyond the pin.
- Status moves to Completed once an image build confirms the token reaches the build.
