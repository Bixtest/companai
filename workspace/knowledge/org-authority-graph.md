# The organization authority graph

**In one sentence.** Organizations are joined by *typed* edges that carry how much
authority may flow down them, so position in the structure bounds what anyone
there can do — before any personal grant is considered.

**Why it matters.** Real customers are not one company with departments. They are
consultancies operating client companies, groups with subsidiaries, and temporary
structures for one engagement. A tree cannot express *"we advise that client, and
may see these things but never those"*, and a permission system that cannot
express it will have that distinction implemented in application code instead —
differently each time.

This is invariant **I4** made structural: a worker in a subsidiary cannot be
granted more than the edges above it permit, whatever its charter says.

## How it works

The existing tree is unchanged. `organizations.parent_id` and the
`ancestor_ids` / `descendant_ids` closure columns remain the structural spine and
the index every scoped query uses. Edges add what the tree cannot carry:

| Field | What it decides |
|---|---|
| `relationship_type` | `owns` · `manages` · `advises` · `serves` · `licenses` · `templates` · `supervises` |
| `inheritance_mode` | `strict` · `flexible` · `reference_only` · `none` |
| `authority_ceiling` | The most autonomy that may flow down this edge |
| `module_grants` | Which capabilities exist at all downstream (allowlist) |

```ts
import { resolveGraphCeiling, orderEdgesAlongPath } from '@open-mercato/shared/lib/authority/graph'

const path = orderEdgesAlongPath(edges, organization.ancestorIds, organization.id)
const { ceiling, contributingEdges } = resolveGraphCeiling(path, 'crm.customer.create')
```

Or, against the database:

```ts
const graph = container.resolve('authorityGraphService')
await graph.ceilingFor(organizationId, tenantId, capabilityId)
```

The result feeds `resolveDecision` as `actor.graphCeiling`, where it becomes one
more ceiling among the rest — see
[authority-decisions.md](authority-decisions.md).

### Walking a path can only lower

Each edge contributes the **minimum** of three things: what its inheritance mode
allows, what its relationship type allows by default, and its own explicit
ceiling. Adding an edge to a path can never widen it — asserted as a property
over every combination, because if it could, an edge somebody deliberately
narrowed could be widened by adding another beside it.

### Relationship types carry real defaults

`owns` and `manages` pass everything; `advises` and `serves` cap at `A2`. A
consultancy advising a client should not act unattended inside it by default.
These defaults can only be **lowered** by an explicit `authority_ceiling` — a
permissive relationship type never widens an edge someone narrowed.

### `null` and `[]` mean different things

`module_grants: null` restricts nothing. `module_grants: []` passes nothing. An
empty allowlist is a real and useful statement for a `reference_only` engagement,
and conflating the two would make the safest configuration unreachable.

## Nothing changed on the day it landed

The migration seeds one `owns` / `strict` / `A5` edge per existing parent-child
link — the most permissive combination, which imposes nothing. An **absent** edge
is also unconstrained, because the tree existed long before edges did and an
absent edge has never meant "forbidden".

Together those mean the mechanism exists from now on, and lowering a ceiling is a
deliberate act somebody performs, never a behaviour change that arrives with a
deploy.

## Changing an edge

**Settings → Directory → Authority graph** lists every edge with its
relationship, inheritance mode and ceiling, each as a dropdown that shows what
the value *means* — "A2 — needs approval first" rather than "A2". A wrong guess
here quietly changes what everyone below can do, so the page spells it out and
says plainly that raising a ceiling grants nothing on its own.

The API is `/api/directory/organization-edges` (GET, POST, PATCH, DELETE),
guarded by `directory.organizations.manage` for writes — the same feature, and
the same risk class (E5, not delegable), as managing organizations themselves. A
second permission over the same act would be a second place to get it wrong.

Four things it refuses:

| Refusal | Why |
|---|---|
| An edge from an organization to itself | A cycle of length one, with nothing for the walk to terminate on |
| An edge pointing back up the tree | The tree scopes every query; an edge contradicting it makes "what is above this" have two answers |
| An organization from another tenant | A cross-tenant edge would be invisible rather than dangerous — and a write that silently does nothing is worse than one that fails |
| A stale update | Two tabs editing the same ceiling must not resolve to whichever saved last: for authority configuration, a lost update is a security change nobody chose |

Edits are audited (`directory.organization_edge`), and removal is a **soft**
delete — an authority change is worth being able to look back at.

## Try it

```bash
corepack yarn mercato auth authority:explain \
  --capability inbox_ops.replies.send --actor ai_worker \
  --org <organization id> --tenant <tenant id>
```

The `graph-ceiling` line appears among the rules with the edge's own explanation.

## What R6 is not

- **Not a DAG for scoping.** Extra edges (a consultancy that `advises` a company
  it does not own) are recorded and reasoned about for authority. They do not yet
  widen or narrow which records a query returns — that touches every scoped
  query in the platform and is its own piece of work.
- **Not enforcing.** Like R5, nothing calls it in the request path yet.
- **No cycle detection beyond self-edges.** The database rejects an edge from a
  node to itself; a longer cycle would be a corrupt tree, which the existing
  hierarchy rebuild already prevents.

## Where the code lives

| Path | What |
|---|---|
| `packages/shared/src/lib/authority/graph.ts` | the rules — pure, no database |
| `packages/core/src/modules/directory/services/authorityGraphService.ts` | loading a real path from the closure index |
| `packages/core/src/modules/directory/data/entities.ts` | `OrganizationEdge` |
| `packages/core/src/modules/directory/migrations/Migration20260809193000.ts` | table, constraints, seeding |
