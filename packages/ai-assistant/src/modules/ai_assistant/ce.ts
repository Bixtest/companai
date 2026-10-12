/**
 * AI Assistant — the `Agent` as a first-class kernel object (`AH-1`).
 *
 * **Why this file.** `AH-1` says an agent is *"one flat, legible row with a role and a real `reportsTo`
 * edge — no 'type' flag, no separate human/AI shape"* (`AGENT-HALF.md` §3.1), and that it *"lands as the
 * `Agent` object in the kernel, extended with `kind`/`owner`/`actsAs`/`autonomy`"* (§1.4). The kernel
 * (`buildModelDescriptor`) admits an object through exactly two declaration channels — `customEntities`
 * and `entityExtensions`/`customFieldSets` — there is **no separate "platform entity" list**
 * (`packages/shared/src/lib/kernel/model.ts:192–223`). A `ce.ts` at the module root is the **one** channel
 * that fills both: the generator splits it into `customEntities` (each `{ id, label, description }`) and
 * `customFieldSets` (each entry **that has `fields`**, as `{ entity: id, fields }`)
 * (`packages/cli/src/lib/generators/module-registry.ts:3166` and `:3139`). So this one declaration makes the
 * kernel see the `Agent` object **and** its fields. Measured, not assumed.
 *
 * **What this is NOT — the boundary that must not move.** This declares a *kernel object* (a described
 * entity the model can reason about). It is **not** the code-declared agent *behaviour*: the runtime agent
 * definition stays `ai-agents.ts` → `ai-agents.generated.ts`, resolved by `agent-registry.ts` from an
 * in-memory `agentsById` Map with **no DB read**. A DB-only agent would be invisible to `runAiAgent*` — so
 * nothing here may be treated as "move the agent definition into the database" (the `CC-27` lesson,
 * `BACKLOG.md`). It is also **not** a tenant ad-hoc record: an agent is a platform **capability**, which is
 * why the entity class below is `CAPABILITY` and why the object is `accessRestricted`.
 *
 * **What is declared here vs what is enforced elsewhere.** `AH-1` declares the six §1.4 **fields**. Their
 * *enforcement* is not this task and is already tracked by its own item:
 * - the `runtime` **binding executes nothing** here — the `AiRuntimePort` now **exists**
 *   (`lib/ai-runtime-port.ts`, built by row 28 / `R28-1`: the eight §4.1 operations
 *   `describeCapabilities`/`startRun`/`streamRun`/`cancelRun`/`steerRun`/`resumeConversation`/
 *   `resolveToolCall`/`completeRun`, the §4.2 envelope, secret *references*), but this file does not
 *   *invoke* it — the `runtime` field merely **names** which runtime runs an agent's turns (the port's
 *   **selector**, §1.5). Whose turns actually reach it is row 28's wiring (`R28-3`/`R28-4`/`CC-67`).
 * - `autonomy` is **declared** as a per-action-class field, but the `A0`–`A5` **gate** is `AH-2` (needs
 *   `G-04`);
 * - the AI-user ↔ agent **binding row** is `CC-27`, which waits on this object.
 * Declaring the field now, and enforcing it later, is the §3.1 order — it is **not** a partial build left
 * unscheduled, because each enforcement has a named owning item (`COMPLETION-CALLBACKS.md` / `BACKLOG.md`).
 *
 * **The protection tier (owner, 2026-10-09).** An agent's protection tier is **not** a blanket rule; it is
 * the **same per-object setting the tables use** — `core` / `platform_release` / `tenant_structural` /
 * `tenant_data`, assigned when the agent is created, from the UI, no deploy. See
 * [`DECISION-agent-protection-tier.md`](DECISION-agent-protection-tier.md) and the build order's item 20.
 * The tier is wired in a separate slice (the core-object registry gains `agent` as a kind); this file
 * declares the object.
 *
 * Source: `AGENT-HALF.md` §1.4 + §3.1; `BACKLOG.md` `AH-1`; `BUILD-ORDER.md` item 20;
 * `platform_points.md` §E (`AH-1`) and §A (`C1`, the resource envelope); `PLAN-AH-1.md`.
 */

import type { CustomFieldDefinition } from '@open-mercato/shared/modules/entities'

/**
 * The five agent kinds (`AGENT-HALF.md` §1.4). Declared once as the field's option set so the DB, the API
 * and the UI cannot disagree about the vocabulary.
 */
export const AGENT_KINDS = ['personal', 'role', 'context', 'independent', 'system'] as const
export type AgentKind = (typeof AGENT_KINDS)[number]

/**
 * The `Agent` object's declared fields (kernel field declarations).
 *
 * These describe the *object*; they are the §1.4 fields made concrete.
 *
 * **The relation upgrade (`CC-40`, slices 3+4).** `owner`, `acts_as` and now `role` are declared as
 * `relation` fields, and the `reportsTo` self-edge (`data/extensions.ts`) is a real kernel relationship.
 * **Where the target lands, stated precisely** (a hostile-critic pass corrected an earlier overstatement
 * here): the `relation` *kind* reaches the kernel model (`KernelField.fieldKind`), and the `relatedEntityId`
 * target is a real, **consumed** property of the custom-field declaration — the installer persists it
 * (`entities/lib/install-from-ce.ts` `FIELD_DETAIL_KEYS`) and the relation-options UI reads it
 * (`ui/backend/custom-fields/FieldDefinitionsEditor.tsx`). **It is NOT carried on the kernel model's
 * `KernelField`** — that type has no such property (verified). Making the target first-class *in the model*
 * would need a companion relationship and is deliberately not claimed here.
 *
 * `role` now targets **`auth:role`**, which IS a declared kernel entity — admitted by `data/extensions.ts`
 * (the same route that admits `auth:user`: an `EntityExtension` end). `auth:role` has **no `ce.ts`** of its
 * own, exactly like `auth:user`, so this declaration is what puts it in the **kernel model**. Verified by the
 * AH-1 kernel-object test, which asserts the target entity is present in the built model before asserting the
 * field carries it — a hostile-critic pass caught an earlier version asserting only the source constant.
 *
 * **Two registries, kept distinct (the critic's precision).** The kernel model
 * (`buildModelDescriptor`) is one registry; the generated MikroORM entity ids
 * (`entities.ids.generated.ts`) and the relation-options resolver
 * (`entities/api/relations/options.ts:66` → `resolveRegisteredEntityTableName`) are another. `auth:role` was
 * always in the *second* (a registered `Role` ORM entity), which is why the relation-options UI could already
 * resolve it. What this slice fixes is the **first** — the kernel model having a `role` entity — which is
 * exactly the gap `CC-40` names and the gap `AH-1` reported (`role` could not honestly be a relation).
 */
export const AGENT_FIELDS: CustomFieldDefinition[] = [
  {
    key: 'kind',
    kind: 'select',
    label: 'Kind',
    description:
      'Which of the five agent kinds this is (personal · role · context · independent · system). Decides visibility and who owns it.',
    options: [...AGENT_KINDS],
    required: true,
    filterable: true,
    listVisible: true,
  },
  {
    key: 'owner',
    kind: 'relation',
    relatedEntityId: 'user',
    label: 'Owner',
    description:
      'The visibility scope and the party answerable for the agent: a user (a first-class relation — CC-40). An organization- or admin-owned agent is deferred until those entities are declared in the kernel.',
    filterable: true,
    listVisible: true,
  },
  {
    key: 'acts_as',
    kind: 'relation',
    relatedEntityId: 'user',
    label: 'Acts as',
    description:
      'Set for context agents only — the user whose seat this agent occupies ("acts as Alice"), as a first-class relation (CC-40). Empty otherwise.',
    filterable: false,
    listVisible: true,
  },
  {
    key: 'role',
    kind: 'relation',
    relatedEntityId: 'auth:role',
    label: 'Role',
    description:
      'The role whose permissions the agent carries, exactly as a human has them (a real relation to `auth:role`). `auth:role` is a declared kernel entity via `data/extensions.ts` — the CC-40 prerequisite, met.',
    filterable: true,
    listVisible: true,
  },
  {
    key: 'runtime',
    kind: 'text',
    label: 'Runtime binding',
    description:
      'Which runtime runs the agent\'s turns — a binding name, not an embedded runtime (the AiRuntimePort selector, §1.5).',
    filterable: false,
    listVisible: true,
  },
  {
    key: 'autonomy',
    kind: 'text',
    label: 'Autonomy',
    description:
      'The A0–A5 gate, per action class — one agent can be A5 for reading and A1 for deleting. Declared here; enforced by AH-2.',
    filterable: false,
    listVisible: true,
  },
]

export const entities = [
  {
    id: 'ai_assistant:agent',
    label: 'Agent',
    description:
      'A first-class actor that can be assigned work: one flat, legible row with a kind, an owner, a role, a runtime binding and a per-action-class autonomy gate. Declared by AH-1; its protection tier is a per-object setting.',
    labelField: 'kind',
    // An agent is a governance surface (it holds a role), so its records require an explicit per-entity
    // grant beyond the coarse `entities.records.*` feature — matching how roles and API keys are treated.
    accessRestricted: true,
    showInSidebar: false,
    fields: AGENT_FIELDS,
  },
]

export default entities
