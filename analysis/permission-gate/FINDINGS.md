# The permission gate — measured across every enabled module (row 7)

**Measured:** 2026-10-09. **Tool:** `analysis/permission-gate/measure.js` (re-runnable; `--json` for machines, `--check` for a pass/fail gate).
**Repo:** `workspace/starting-kit`, HEAD `168f9e09` (the row-9 read half). **Scope:** the **35 enabled modules** — the ones actually mounted in the running app (the enabled set is read from `apps/mercato/src/modules.ts`, so it can never drift from the app's own registry).

## What this measures, and why it is separate from D2-gap

Platform point **row 7** claims: *"You can define roles and give them permissions, and the platform
**enforces** every one on every write — not just in the UI."*

That is a claim about the **feature gate** — the "does this actor hold the permission for this action?"
decision. There are **two independent mechanisms** on the write path, and they answer different questions:

| Mechanism | Question it answers | Where it lives | Instrument |
|---|---|---|---|
| **feature gate** | *may this actor do this?* | `metadata.requireFeatures` → the dispatcher's `checkAuthorization` (`apps/mercato/src/app/api/[...slug]/route.ts`) | **this tool** |
| **guard registry** | *is this write structurally permitted?* (record locks, authority rules, review queues) | `runRouteMutationGuards` / `makeCrudRoute` | `analysis/d2-gap/measure.js` |

**D2-gap measures the guard registry and reads 0 unguarded.** That number is correct and says nothing
about the feature gate. A route can run a guard and still have **no feature check**. Row 7 needs its own
instrument, which is why this directory exists.

## The two facts that make the claim honest

1. **There IS a central chokepoint.** `checkAuthorization` enforces `requireFeatures` before the handler
   runs. It is not per-route UI logic. Proven by `apps/mercato/src/__tests__/api-authorization.test.ts`
   (`should deny access when required features are missing on POST`).
2. **The gate is OPT-IN — and that is a design property, not a bug.** The dispatcher enforces only when
   `requiredFeatures.length > 0` (`route.ts:207`). A route that declares `requireAuth: true` and **no**
   `requireFeatures` has **no feature check**. That behaviour is itself tested
   (`should allow any authenticated user when only deprecated requireRoles is set (no feature gate)`) — so
   it is deliberate, not a silent hole. There is **no default-deny**.

## The headline

| | count |
|---|---|
| enabled modules with a source tree | **35** |
| write route files in those modules | **169** |
| **feature-gated** (`requireFeatures` declared → the central gate fires) | **158** (93.5%) |
| factory-supplied features (a `makeCrudRoute`/shared factory *alone*) | **0** |
| **guard-only** (a structural guard, no feature check) | **5** |
| **neither** (no feature gate and no guard) | **6** |
| **neither that is NOT a by-design exception** | **0** |

**Feature-covered = 158 / 169.** Every write route that is neither feature-gated nor guard-backed is a
**by-design exception** (see below). **No genuine resource-mutating, staff-facing write lacks a
permission check.**

## The 6 by-design exceptions (named, with their real authorisation)

| Route | Mechanism |
|---|---|
| `auth/api/locale` (POST) | self-service — sets the caller's own locale cookie (`requireAuth:false`) |
| `auth/api/profile` (PUT) | self-service — the caller edits their OWN profile (`requireAuth:true`, own password re-verified) |
| `communication_channels/api/post/webhook/[provider]` (POST) | signature-verified inbound webhook (`requireAuth:false`) |
| `communication_channels/api/post/webhooks/gmail` (POST) | JWT-verified inbound webhook (`requireAuth:false`) |
| `webhooks/api/inbound/[endpointId]` (POST) | signature-verified inbound webhook (`requireAuth:false`, `adapter.verifyWebhook`) |
| `ratelimit_probe/api/ping` (POST) | rate-limit probe endpoint (`requireAuth:false`); touches no resource |

Each is authorised by a **different, deliberate** mechanism (a session over one's own record, or a
provider signature), where a role permission would be meaningless. The list lives in
`measure.js` → `BY_DESIGN_NO_FEATURE`, each entry carrying its reason, so a reader re-verifies rather
than trusts.

## The 5 guard-only routes (a structural check, no feature check)

`notifications/api/{mark-all-read, [id]/action, [id]/dismiss, [id]/read, [id]/restore}` — these reach the
guard registry via the module's `runGuardedNotificationWrite` helper but declare no `requireFeatures`.
Named here, not hidden: they are **guard-only**.

## The gate is enforced going forward (`--check`)

`measure.js --check` **exits 1** if a write route appears that is neither feature-gated nor a named
by-design exception — so the opt-in gap cannot silently widen. Proven by mutation: adding a probe route
with `metadata = { POST: { requireAuth: true } }` makes the check **FAIL** (exit 1); adding
`requireFeatures` back makes it **PASS**. It also warns when an allowlisted route is no longer an
exception (a stale entry).

## Hostile-critic pass (2026-10-09) — one real defect found and fixed

A separate hostile-critic agent independently re-ran every claim above (the central chokepoint is real
and *called* on the live path; the 169/158/5/6 numbers reproduce; all 6 exceptions are genuinely
by-design; the shim-following holds; the `--check` gate returns the exit codes claimed; the code tree is
clean). It found **one real defect in the tool**:

> The classifier matched `requireFeatures:` against the **raw** file text, so a route gated *only* by a
> **comment** mentioning `requireFeatures:` — e.g. `// TODO requireFeatures: ['x']` — would have been
> counted as feature-gated. It checked and found **0** files currently affected (so the measured numbers
> were unchanged), but the over-claim class was real.

**Fixed:** the tool now strips comments and string/template literals (`stripCommentsAndStrings`) before
testing for the declaration and for the guard calls. **Re-proven:** the baseline is **unchanged**
(169/158/5/6 — confirming zero files were comment-gated), and a new mutation (**M3**) — a route gated
only by a comment — now correctly reads **NEITHER** and makes `--check` **FAIL (exit 1)**.


## The honest limit (stated so the number is not over-read)

- The tool proves a **declaration**, not an **enforcement** — the enforcement is proved by
  `api-authorization.test.ts`.
- The gate is **opt-in**; this tool measures the exposure, and does **not** claim default-deny. If the
  owner wants a **default-deny** ("every write must declare a feature or an explicit `requireAuth:false`,
  or the build fails"), that is a **new policy** and a **new item** — not something this measurement
  silently assumes. It is recorded as `CC-44` in `COMPLETION-CALLBACKS.md`.
- A `NEITHER` route is classified by a **human**, not the tool — the tool lists; the judgement is here.

## Reproduce

```bash
node analysis/permission-gate/measure.js          # the counts + the lists
node analysis/permission-gate/measure.js --json   # machine-readable
node analysis/permission-gate/measure.js --check   # exit 1 on an unexplained gap (CI gate)
```

## Mutations (RED-then-GREEN, all with the tree restored)

| # | Change | Expected | Observed |
|---|---|---|---|
| M1 | add a write route with `metadata = { POST: { requireAuth: true } }` (no features, no guard) | `--check` FAIL | **exit 1**, route named |
| M2 | M1 + `requireFeatures: ['x']` on that route | `--check` PASS | **exit 0** |
| M3 | a route gated **only by a comment** (`// requireFeatures: ['x']`) | `--check` FAIL (the comment is not a gate) | **exit 1** |

Every probe file was deleted after the run; the code tree is clean.

