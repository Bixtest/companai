/**
 * Module-root AI tools contribution for `ai_assistant` (Phase 1 WS-C, Step 3.8).
 *
 * The generator scans every module for a top-level `ai-tools.ts` and takes
 * the `aiTools` (or `default`) export as the module contribution. This file
 * aggregates the general-purpose tool packs (`search.*`, `attachments.*`,
 * `meta.*`, and — since `CC-59` — `business_ir.*`) so they flow through the
 * existing `ai-tools.generated.ts` pipeline without any new generator plumbing.
 */
import type { AiToolDefinition } from './lib/types'
import searchAiTools from './ai-tools/search-pack'
import attachmentsAiTools from './ai-tools/attachments-pack'
import metaAiTools from './ai-tools/meta-pack'
import businessIrAiTools from './ai-tools/business-ir-pack'

export const aiTools: AiToolDefinition<any, any>[] = [
  ...searchAiTools,
  ...attachmentsAiTools,
  ...metaAiTools,
  ...businessIrAiTools,
]

export default aiTools
