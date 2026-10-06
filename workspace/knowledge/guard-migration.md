# Retiring the deprecated guard resolver, one module at a time (`D2-wide`)

**In one sentence.** Write routes on this platform used to check the mutation guard by calling a
`@deprecated` pair that resolves **only the single DI-registered service** and silently skips the guard
registry; the fix is a thin per-module wrapper over `runRouteMutationGuards()`, applied one module per
commit, each with a two-mutation proof and a tracked count that only ever decreases.

**Why it matters.** A route on the deprecated resolver is a route **no registered guard and no Hermes
authorization can reach** — the write happens as if the guard layer did not exist. The count is the
deliverable: if you cannot say how many call sites are left and which module is next, you are guessing.

## How it works

Two mechanisms exist, and only one is correct:

| | The deprecated path | The registry path (use this) |
|---|---|---|
| Entry point | `validateCrudMutationGuard()` / `runCrudMutationGuardAfterSuccess()` | `runRouteMutationGuards()` |
| File | `packages/shared/src/lib/crud/mutation-guard.ts` (`@deprecated`) | `packages/shared/src/lib/crud/route-mutation-guard.ts` |
| Guards run | **only** the single DI-registered `crudMutationGuardService` | **every** guard from the global store, **plus** the bridged legacy service (`bridgeLegacyGuard()`) |
| Returns | flat `{ ok, status, body, shouldRunAfterSuccess, metadata }` | `{ ok:true, runAfterSuccess }` or `{ ok:false, errorStatus, errorBody, response }` |

`runRouteMutationGuards()` takes one object: `{ container, req, auth: { userId, tenantId, organizationId }, input: { resourceKind, resourceId, operation, mutationPayload } }`.

**The wrapper pattern.** Each module gets `packages/core/src/modules/<module>/api/mutation-guard.ts`
exporting `begin<Module>MutationGuard(ctx)` → `{ blockedResponse, runAfterSuccess }`. The routes call it
before the write and `runAfterSuccess()` after the commit. Proven in eight modules (`entities`,
`data_sync`, `dictionaries`, `dashboards`, `workflows`, `inbox_ops`, `perspectives`).

**The registry operation mapping.** `operation: 'custom'` (a state-changing action endpoint) is mapped
to the registry's `'update'` — `runMutationGuards` only understands `create | update | delete`
(`toRegistryMutationOperation()` in the route-mutation-guard file).

## How to do the common thing — migrate one module

1. **Measure the module first — calls AND files.** The plan's figure drifts; the call count is usually
   right and the **file count is often wrong**. (One plan said "8 calls / 4 files"; the truth was
   "8 calls / 3 files".)
   ```sh
   for f in $(grep -rl "validateCrudMutationGuard(\|runCrudMutationGuardAfterSuccess(" \
     packages/core/src/modules/<MOD> --include="*.ts"); do
       echo "$(grep -c 'validateCrudMutationGuard(\|runCrudMutationGuardAfterSuccess(' "$f")  $f"
   done | sort -rn
   ```
2. **Create the wrapper** by copying the most recent module's `api/mutation-guard.ts` and renaming.
   Record its `md5sum` — you will prove you restored it byte-identically after the mutation proof.
3. **Repoint the routes.** Replace the validate/after-success pair with
   `const guard = await begin<Mod>MutationGuard({...}); if (guard.blockedResponse) return
   guard.blockedResponse; ...write...; await guard.runAfterSuccess()`.
4. **Repair the module's tests** — see "What goes wrong" below; this is where proofs die.
5. **Prove it with two mutations** of the wrapper (see the section below).
6. **Recount repo-wide by two independent tools**, update the docs that quote the number, and commit.
   The count command is in `library/development/BACKLOG.md`, item **D2-wide**.

## The count — measure it two independent ways, and re-derive the "before"

The number goes in the plan, so two routes must agree before it does:

- **Method 1** — `grep -rn … | grep -v comment-lines | grep -v tests | grep -v "api/mutation-guard.ts"
  | grep -v the two shared declaration files | wc -l`.
- **Method 2** — `git grep -n -e "validateCrudMutationGuard(" -e "runCrudMutationGuardAfterSuccess("`
  piped through a **script** that classifies each line (different tool, different parse).

**The comment-line trap:** a classifier that strips only *trailing* `//` comments still counts lines
whose content *begins* with `//`, `*` or `/*` (JSDoc continuations). Both methods must drop leading-comment
lines. A false `126 vs 127` disagreement traced to exactly this.

**Re-derive the "before" figure too** — do not carry forward the last module's "after". Park your work
with `git stash push -u`, run the **same** classifier on the clean tree, `git stash pop`. The delta must
equal **exactly this module's** call count; if it does not, something else moved and that is a finding.

## What goes wrong

| Symptom | Cause | Fix |
|---|---|---|
| Both mutations leave the suite **green** | the test mocked the **module wrapper** (or the deprecated pair), so the mutated line never executes | stub **only** `@open-mercato/shared/lib/crud/route-mutation-guard`'s `runRouteMutationGuards`; let the module wrapper run for real |
| The count is 1 higher than expected | a comment line beginning `//` or `*` slipped past a trailing-comment-only filter | drop lines where `content.strip()` starts with `//`, `*` or `/*` |
| The plan's file count is wrong | it was never re-derived, only the call count was | measure both; your measurement wins |
| A module measures **0** deprecated calls but is still wide open | the count only sees routes that *used to call* the resolver; a route that calls **no guard at all** is invisible | measure the sibling gap separately (see below) |
| "every write in this module is guarded" turns out false | that sentence was assumed, not measured | count the module's write routes and how many reference a guard |
| A doc says the wrapper's md5 is X, but `md5sum` shows Y | the wrapper was edited **after** the mutation proof (even a comment) | write **both** hashes and why they differ; if only a comment changed, say so |

## The scope question — measured, and it goes both ways

`D2-wide` retires the deprecated resolver **where a route already calls it**. It says nothing about a
route that calls **no guard at all** — that is a sibling defect, tracked separately.

```sh
for f in $(grep -rl "export async function \(POST\|PUT\|PATCH\|DELETE\)" \
  packages/core/src/modules/<MOD>/api --include="*.ts"); do
    g=$(grep -c "begin<Mod>MutationGuard\|runRouteMutationGuards\|makeCrudRoute" "$f")
    [ "$g" = "0" ] && echo "UNGUARDED  $f"
done
```

Measured so far: `workflows` **13 of 19** write routes unguarded; `inbox_ops` **10 of 14**;
`perspectives` **0 of 3** — the first module with **no gap**. So the finding is **either way**: state
"no gap" when that is the measurement, and never assume a gap by analogy with the previous module.
Record it in the **wrapper's own header** either way.

## Where the code lives

- `packages/shared/src/lib/crud/route-mutation-guard.ts` — `runRouteMutationGuards()`, the correct entry point
- `packages/shared/src/lib/crud/mutation-guard.ts` — the `@deprecated` pair (do not call it)
- `packages/shared/src/lib/crud/mutation-guard-registry.ts` — `bridgeLegacyGuard()`, `runMutationGuards()`
- any migrated module's `api/mutation-guard.ts` — the wrapper to copy (most recent: `perspectives`)
- `library/development/BUILD-ORDER.md` **§2e** — the per-module plan, and each module's proof record
- `library/development/BACKLOG.md` item **D2-wide** — the live count and the exact count command
