/** Browser-safe public surface; server loaders remain an explicit `tx-diagnosis/server` import. */
export * from './types';
export { parseContractAbi } from './abi';
export { contractName } from './clarity-source';
export { classifyFailure } from './classify';
export type { Classification } from './classify';
export { parseVmError, describeConditionCode } from './vm-error';
export type { ParsedVmError } from './vm-error';
export { resolveErrorCode, resolveErrorCodeSync, calleeCandidates } from './resolve-error-code';
export type { Resolution } from './resolve-error-code';
export { diagnose, diagnoseSync, enrich } from './diagnose';
export type { DiagnoseLoaders } from './diagnose';
export {
  renderContextPackMarkdown,
  renderContextPackJson,
  copyPromptFor,
  PLAYBOOK,
} from './context-pack';
export { lookupRegistry } from './registry';
export { tagForName } from './tags';
export type { SemanticTag } from './tags';
export { formatInt, truncateMiddle } from './templates';
