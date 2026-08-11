# The test gate — how it runs, and what makes it lie

**In one sentence.** `yarn test` runs twenty-two packages' Jest suites in
parallel through Turbo, and all three ways it has produced false reds are
consequences of that parallelism rather than of any test's logic.

**Why it matters.** A gate that goes red for reasons unrelated to the change under
test stops being read, and a gate nobody reads is worse than no gate — it costs
the time and returns none of the confidence.

---

## The shape of it

| | |
|---|---|
| Command | `yarn test` (Turbo fans out to each package's `test` script) |
| Packages | 22 |
| Tests | **12,770** (2026-08-11) |
| Wall time | **~6 minutes** on an idle machine |
| Runner | Jest, `jest-environment-node` by default; `@jest-environment jsdom` per file for React |

Full gate order, from `.ai/agentic.config.json`:

```bash
yarn generate && yarn build:packages && yarn typecheck && yarn lint && yarn test && yarn build:app
```

`build:app` is the only step that wants the local server stopped.

## Trap 1 — tests that write into a package source tree

**The rule: a test's scratch files never go under `packages/` or `apps/`.**

A dozen guard tests walk the source tree and read the files they find — checking
ACL coverage, optimistic-lock columns, capability declarations, import
conventions. If another package's test creates a temporary directory *inside* a
package while those guards run, a guard can list a path and then read it a moment
after it was deleted. The result is a red gate in a package the change never
touched.

Note what is **not** the problem: the directory existing. That was measured — a
fixture-shaped directory was planted in `packages/shared` and core, ui and cli ran
6,905 tests green against it. Only the deletion races.

**Where to put scratch files instead:**

| Situation | Use |
|---|---|
| The fixture needs no module resolution | `os.tmpdir()` |
| The fixture imports from the repo's `node_modules` (e.g. a MikroORM entity) | `<repoRoot>/node_modules/.cache/<name>` — inside the repo so walking up resolves, and no guard walks `node_modules` |

Both live examples are worth copying:
`packages/shared/src/lib/bootstrap/__tests__/dynamicLoader.tsconfig.test.ts`
(the resolution case, with a `findRepoRoot()` that walks for `yarn.lock` rather
than counting `../`) and `packages/cache/src/__tests__/service.test.ts`
(the simple case).

`packages/core/src/__tests__/test-scratch-outside-source-trees.test.ts` fails the
build if the pattern comes back. It matches a **textual shape**, so it catches the
recurrence, not the whole class — `const dir = process.cwd()` on one line and
`mkdtempSync(dir)` on another slips past it.

## Trap 2 — tests whose cost is filesystem I/O

**The rule: a test's runtime must not be a function of how busy the machine is.**

Sequential filesystem calls degrade non-linearly under parallel load, far more
than CPU work does. A measured example, from the CLI integration suite before it
was fixed:

| | Idle | Under 4 concurrent packages |
|---|---|---|
| One test doing ~8,700 sequential `stat` calls | 1,612 ms | **13,023 ms** |

Eight-fold, from only four of twenty-two packages. Against a 60-second per-test
budget, that is how a test that "passes in 17s alone" fails inside the gate.

**How to fix one:**

1. **Measure before theorising.** A custom Jest reporter printing per-test
   durations takes five minutes to write and tells you which tests to look at
   instead of which you assume.
2. **Reproduce the contention**, don't extrapolate from idle numbers — run the
   heavy packages concurrently and time the suspect file against them.
3. **Narrow the I/O, not the assertion.** Most such tests assert a *decision*;
   they walk the repository only because that is the default. Point them at a
   two-file fixture.
4. **Keep one test on the real defaults**, or they can rot to point at nothing
   and everything still passes. Make it cheap — the CLI suite backdates a
   timestamp so the staleness check returns on the first file it stats rather
   than the 8,700th.

## Trap 3 — asserting across an effect boundary

**The rule: await the thing you are asserting, not something that arrives near it.**

A React page that seeds local state from fetched data does it in two steps:

```tsx
const [logoUrl, setLogoUrl] = React.useState('')          // renders empty
React.useEffect(() => { setLogoUrl(data?.logoUrl ?? '') }, [data?.logoUrl])
```

So there is a render commit between *the fetched data being on screen* and *the
input holding its value*. A test that awaits the first and then synchronously
asserts the second is asserting into that window:

```tsx
expect(await screen.findByText('Organization branding')).toBeInTheDocument()
expect(screen.getByText('Acme')).toBeInTheDocument()             // reads `data` — passes
expect(screen.getByLabelText('Logo URL')).toHaveValue(url)       // reads state — races
```

It passed alone three times out of three and failed inside the full gate, because
the window is a scheduling detail and load widens it. `waitFor` closes it, and
`await act(async () => …)` around the render is the equivalent for tests that
drive the update themselves.

**Note what makes this one nastier than traps 1 and 2:** the failing assertion is
in the file you are looking at, the two lines above it pass, and the product is
correct. Nothing points at load until you notice it only fails in company.

## What the gate does not check

**It never starts the application.** Every step operates on code in isolation:
type checking, linting and unit tests all pass on a tree whose dependency
injection is broken, and both build steps succeed too. Three things only happen at
boot:

| Not checked by the gate | Fails at |
|---|---|
| DI wiring — whether every dependency actually resolves | `yarn start` |
| Migrations against the real schema | `yarn db:migrate` |
| Route registration and page metadata | first request |

On 2026-08-11 a constructor parameter named `delegations` against a registration
named `delegationService` passed 12,768 tests and could not boot ([[L37]]). The
container runs in Awilix **CLASSIC** mode, where **a constructor parameter name is
a dependency name**.

**So: after any change to DI, a service constructor, or module registration, start
the server.** Ninety seconds, and it is the only thing that tests the wiring.
`packages/core/src/__tests__/di-classic-constructor-names.test.ts` now catches the
common shape of it statically, but a static guard cannot see registrations made in
other packages — booting can.

## Diagnosing a red gate

1. **Is the failure in a package your change touched?** If not, suspect these
   traps before your change.
2. **Does it reproduce alone?** `yarn workspace @open-mercato/<pkg> test <pattern>`.
   Passing alone and failing in the gate is the signature of all three.
3. **Timeout, or assertion?** A timeout points at trap 2. An `ENOENT` inside a
   guard that walks files points at trap 1. An assertion that read an *empty* or
   *initial* value, in a test whose earlier lines passed, points at trap 3.
4. **Re-derive any recorded diagnosis before acting on it** — including your own.
   [[L36]] exists because a specific, plausible, written-down account of this exact
   flake sent the fix at eleven innocent files.

## Where the code lives

| Path | What |
|---|---|
| `.ai/agentic.config.json` | `validation.commands` — the gate's canonical order |
| `packages/core/src/__tests__/test-scratch-outside-source-trees.test.ts` | The trap-1 recurrence guard |
| `packages/cli/src/lib/testing/integration.ts` | `hasBuildInputChangesSince`, `buildCacheDefaults` — the `BuildCacheOptions` seam that lets a test narrow the walk |
| `packages/shared/src/lib/testing/renderWithProviders.tsx` | React tests: wraps a component in the query client and i18n provider |
| `packages/cli/src/lib/db/__tests__/advisoryLock.test.ts` | Trap-1-adjacent worked example: what a lock's tests can and cannot prove without two processes |
| `packages/core/src/modules/directory/backend/directory/branding/__tests__/page.test.tsx` | The trap-3 fix, with the reason written at the assertion |
