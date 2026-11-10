# Workplan: ECR build – publish image tag to Parameter Store

## Task ID

ecr-build-image-tag-parameter (no issue number; branch `feat/add_gh_build_action`)

## Problem Statement

The Explorer ECR build workflow (`.github/workflows/build-explorer-image.yml`) builds, pushes and attests the image, but unlike the reference workflow in `stx-labs/usdcx` (`bridge-ecr-build.yml`) it does not record the pushed tag anywhere a deploy can read it, and it produces no run summary.

## Components Involved

- `.github/workflows/build-explorer-image.yml`

## Dependencies

- GitHub environment variable `AWS_SSM_IMAGE_TAG_PARAMETER` on `environment/explorer-testnet` and `environment/explorer-mainnet`.
- The OIDC role (`AWS_ROLE_ARN`) needs `ssm:PutParameter` on that parameter.

## Implementation Checklist

- [x] Add "Publish Image Tag to Parameter Store" step after attestation
- [x] Add "Build Summary" step (`if: always()`)
- [x] Share the image tag through a workflow-level `image_tag` env value
- [ ] Configure `AWS_SSM_IMAGE_TAG_PARAMETER` and IAM permission (infra, outside this repo)

## Verification Steps

- Workflow YAML parses / passes `actionlint`.
- Run the workflow via `workflow_dispatch` on `main` for `environment/explorer-testnet`; confirm the SSM parameter holds `explorer-<sha>` and the run summary shows tag, image and digest.

## Decision Authority

Repository maintainers / infra owners for variable names and IAM.

## Questions/Uncertainties

### Blocking

- None for the code change.

### Non-blocking

- Should PR-label builds also move the SSM parameter? Currently they do, consistent with them already pushing (and tagging `latest` for production).

## Acceptable Tradeoffs

- The job fails (after the image is pushed and attested) when `AWS_SSM_IMAGE_TAG_PARAMETER` is unset, rather than guessing a parameter path. Same behaviour as the reference workflow.

## Status

In Progress

## Notes

- Existing Explorer-specific behaviour kept: PR-label trigger, `explorer-<sha>` tag, `latest` on production, `vars.AWS_ROLE_ARN`, `vars.AWS_ECR_REPOSITORY`.
- `packages: write` from the reference was not copied; nothing is pushed to GHCR.
