/**
 * The engine vocabulary — one list, two readers.
 *
 * **Why this file exists.** `AiRuntimeEngine` was declared inside the selector
 * (`resolve-ai-runtime-port.ts`), which is the right place for *choosing* an engine
 * and the wrong place for *naming* one: the data layer needs to validate the
 * `provider` a runtime row declares (`SR-02`), and importing the selector from the
 * data layer would drag both adapters — and their engine edges — into it.
 *
 * So the vocabulary moved here, where it imports nothing. `resolve-ai-runtime-port`
 * re-exports the type, so every existing importer is unchanged.
 *
 * **Adding an engine is still one place.** Append to `AI_RUNTIME_ENGINES`; the
 * selector's `ACCEPTED_ENGINES` is derived from it, so its error message cannot
 * drift from the list, and `isAiRuntimeEngine` accepts exactly the same set.
 *
 * Note what is NOT here: no `opencode`/`hermes` behaviour, no default, no
 * environment reading. This module is a vocabulary and nothing else — a test pins
 * that it imports nothing, which is what keeps it safe for the data layer.
 */
export const AI_RUNTIME_ENGINES = ['opencode', 'hermes'] as const

export type AiRuntimeEngine = (typeof AI_RUNTIME_ENGINES)[number]

/** Is this string one of the known engines? Narrowing, so a cast is never needed. */
export function isAiRuntimeEngine(value: unknown): value is AiRuntimeEngine {
  return typeof value === 'string' && (AI_RUNTIME_ENGINES as readonly string[]).includes(value)
}
