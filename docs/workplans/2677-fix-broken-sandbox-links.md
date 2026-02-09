# Workplan: Fix Broken Links in Sandbox Deploy Page

## Task ID
2677

## Problem Statement
The Sandbox Deploy page contains two broken links in the informational text:
1. The Clarinet link points to a page that no longer exists
2. The Hiro Platform link points to a page that no longer exists

## Components Involved
- `src/app/sandbox/deploy/LeftSection.tsx` - Contains the broken links

## Dependencies
None

## Implementation Checklist
- [x] Locate the broken links in the codebase
- [x] Update Clarinet link from `https://docs.hiro.so/stacks/clarinet/guides/deploy-a-contract` to `https://docs.stacks.co/clarinet/contract-deployment`
- [x] Update Hiro Platform link from `https://docs.hiro.so/stacks/platform/guides/deployment-plans` to `https://platform.hiro.so/`
- [x] Run linter to verify no issues
- [x] Build to verify no issues (compiled successfully, Windows symlink issue is environment-related)

## Verification Steps
1. Run `pnpm lint` to ensure code passes linting
2. Run `pnpm build` to ensure build succeeds
3. Navigate to the Sandbox Deploy page and verify links work correctly

## Decision Authority
No decisions required - straightforward link updates as specified in the issue.

## Questions/Uncertainties
None - the correct URLs are provided in the issue.

## Acceptable Tradeoffs
None applicable.

## Status
Completed

## Notes
Links updated as specified in issue #2677. Build compiled and type-checked successfully. The symlink errors during build trace collection are Windows permission issues unrelated to the code changes.

