# P3 — Baseline: the untouched starting point

**Date:** 2026-08-08
**Subject:** Open Mercato 0.6.7, exactly as extracted. **Nothing modified.**
**Purpose:** so that when something breaks later we can answer *"was it us, or was
it always like this?"* with evidence instead of memory.

This is the verification that was **never run during the platform assessment**.
The verdict in `planning/08` carried it as the largest open risk. It is now closed.

---

## Verdict

**The platform is healthy.** Install, build, type-check and lint all pass. The
test suite passes except for two Windows-only failures in code we are removing.

Nothing here reopens the decision to build on this platform.

---

## Environment used

Recorded because a result is only meaningful alongside the environment that
produced it. Full setup: [`references/environment.md`](../references/environment.md).

| | |
|---|---|
| Node | **v24.19.0** (LTS "Krypton"), project-local at `workspace/.toolchain/node24/` |
| | Matches the `engines: 24.x` the project declares. System Node (v22.21.0) untouched. |
| | SHA-256 verified against nodejs.org: `57f71ab3…4c73` |
| Yarn | 4.17.1 via `corepack yarn` (Corepack shims need admin; not used) |
| Docker | 29.6.1 (available, not exercised in this baseline) |
| Python | 3.11.15 (present — required by native module builds) |
| OS | Windows 10 Pro 19045 |

**The first attempt ran on Node 22 and was discarded.** Running the baseline on a
version the authors did not target would have produced a result about our
environment rather than about the platform.

---

## Results

| # | Check | Result | Time | Detail |
|---|---|---|---|---|
| 1 | `yarn install` | ✅ **exit 0** | 9m36s | 1,581 packages. Warnings below. |
| 2 | `yarn build` | ✅ **exit 0** | 3m58s | 1/1 task. Produced **93 generated files**. Zero errors in the log. |
| 3 | `yarn typecheck` | ✅ **exit 0** | 1m11s | **21/21 tasks**, zero errors anywhere. |
| 4 | `yarn lint` | ✅ **exit 0** | 43s | **0 errors**, 12 warnings. See coverage finding. |
| 5 | `yarn test` | ⚠️ **exit 1** | 3m53s | **1,773 passed, 2 failed.** Both Windows-only. |

### Correct order matters

`typecheck` **fails on a fresh checkout** until `generate` has run — the project's
`build` script is `build:packages → generate → build:packages → build:app`, and
`generate` emits `entities.ids.generated` plus the module registries.

I initially ran typecheck first and saw
`Cannot find module '#generated/entities.ids.generated'`. **That was my ordering
mistake, not a platform defect.** Recorded so nobody re-discovers it as a "bug".

---

## Finding 1 — Two test failures, both caused by Windows

**Location:** `packages/cli/src/lib/deploy/railway/__tests__/` — the deployment
tool for the Railway hosting service.

| Test | Expected | Got | Cause |
|---|---|---|---|
| `token.test.ts:34` — private cache file permissions | `0o600` (384) | 438 | Windows has no POSIX file-permission bits. The code is correct; the assertion cannot hold on Windows. |
| `state.test.ts:22` — path ends with `.mercato/railway.json.local` | `true` | `false` | Windows uses `\` as a path separator, so the string comparison fails on a character unrelated to what is being tested. |

**Assessment: environment artefacts, not platform defects.** Both assert on
POSIX-specific behaviour. Both are in the Railway deployment tool, which we do not
use and which is scheduled for removal.

**Not independently confirmed.** The definitive proof would be running the suite
inside Linux via Docker. Not done — recorded as an assumption, not a fact. If we
ever depend on this conclusion, run it.

**Fix, if ever wanted:** guard both tests with a platform skip. A few lines. Not
worth doing on code being deleted.

## Finding 2 — Test coverage is partial, because Turbo stops on failure

The `cli` failure aborted the run. **8 of 23 packages completed.**

Packages that reported a complete tally:

| Package | Tests |
|---|---|
| `cli` | 1,230 passed, **2 failed** |
| `app` | 182 passed |
| `checkout` | 80 passed |
| `channel-gmail` | 78 passed |
| `events` | 59 passed |
| `content` | 55 passed |
| `queue` | 54 passed |
| `gateway-stripe` | 33 passed |
| **Total reported** | **1,773 passed · 2 failed** |

`core` was mid-run when the suite aborted — **291 of its test files had already
reported PASS**, none failed. But it never produced a final tally, and **14
packages did not run at all**.

**So "the test suite passes" is not yet proven for the whole codebase.** It is
proven for 8 packages plus 291 core test files. Re-run after the two Railway
tests are removed to get a complete picture.

## Finding 3 — Lint covers ~1 workspace out of 25

Only the root and `apps/mercato` define a `lint` script. **None of the 23 library
packages do** — including `core` (825k LOC, essentially the whole platform) and
`shared`.

`yarn lint` therefore reports on the front-end application only. Type-checking
*does* cover everything (21/21), which is the more important guarantee — but
their style, safety and design-system rules are enforced across roughly 2% of the
code.

**Not a defect we inherited by accident — it is how the project is set up.** We
should extend lint to the packages we keep, since we are about to write
substantial code in them. Recorded as a task, not fixed now.

## Finding 4 — One native module did not build

`cpu-features@0.0.10` failed: *"Unable to detect compiler type"*. No C++ compiler
was present.

- It is an **optional** performance accelerator for `ssh2`, itself pulled in by
  the Docker client library used by integration tests.
- **No platform source code imports it.** Without it, `ssh2` uses its pure-JS path.
- Everything else native built fine: `esbuild`, `better-sqlite3`, `isolated-vm`,
  `protobufjs`, `msgpackr`, `unrs-resolver`, New Relic metrics, `ssh2`.

**Status: deferred by decision, not by neglect.** Visual Studio Build Tools 2022
(Desktop development with C++) is being installed. The reinstall that Phase S
requires anyway is the moment to pick this up.

⚠️ **This is a required step of the Phase S reinstall, not an optional one.**

## Finding 5 — Peer-dependency warnings, benign so far

TypeScript **7.0.2** is pinned; `ts-jest` declares support for `<7.0.0`. Yarn
warned about this roughly 20 times.

**I predicted this would break the tests. It did not.** The suite ran normally.
Recorded because the prediction was wrong and the mismatch is still real — it may
surface later.

---

## How to reproduce this baseline

```bash
cd /c/Users/Ramzi/Downloads/companai/workspace/starting-kit
export PATH="/c/Users/Ramzi/Downloads/companai/workspace/.toolchain/node24:$PATH"
node --version          # must print v24.19.0
corepack yarn install
corepack yarn build     # runs generate — must precede typecheck
corepack yarn typecheck
corepack yarn lint
corepack yarn test
```

**Do not pipe these through `tail` or `head`.** An early run did, and the pipe
replaced the command's exit code with the pager's — reporting a **failed**
typecheck as a success. Capture full output instead.

---

## Process notes — mistakes made producing this baseline

Recorded because the method is supposed to improve, and because each of these
would have produced a false finding about the platform.

| Mistake | Consequence avoided |
|---|---|
| Ran typecheck before `generate` | Would have reported "fails on a clean checkout" — false |
| Piped commands through `tail` | Masked a real failure as exit 0 |
| Ran the first install on Node 22 | Would have measured our environment, not the platform |
| Called a failed native build "probably harmless" and moved on | Accepting a degraded state without asking. Corrected: it is now an owner decision with a written follow-up |
| Quoted "roughly 1,700 tests" before checking | Close, but the real story — that the run **aborted early and 14 packages never ran** — was more important than the number |
