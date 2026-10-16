# Zulip Study — Batch 06: out-of-pole (PZ)

**Status:** DONE · **Date:** 2026-10-16 · **Pole:** **PZ — the escape hatch** (security,
tooling, and the verification culture)
**Source:** `library/architecture/platforms/_extracted/zulip-main/` @ `12.0-dev+git`

**The question this batch answers:** *what exists outside the three poles that nonetheless
determines how the code is written?* For Zulip the answer is overwhelming: **a guard culture**.
This is the batch where Zulip's real genius shows — not in any single feature, but in the
**systematic machinery that makes the other features hard to break**.

**Headline before the detail:** Zulip has built the study's densest **verification culture**:
9 dedicated `check-*` guard scripts, **65 executable tools**, a **cross-source schema validator**
that makes three independent descriptions of the events API agree, a **taint-analysis escape
hatch** (`mark_sanitized`), a **DEP-5 licence ledger**, a **`feature level` ratchet** on the API,
and — remarkably — **a set of in-tree instructions for AI coding agents** (`.claude/rules/` +
`AGENTS.md`).

---

## §6.1 The guard surface: 9 `check-*` scripts, each with one job

Measured in `tools/`:

| Guard | What it enforces |
|---|---|
| **`check-schemas`** | ★ **Three independent descriptions of the events API must agree** (see §6.2) |
| **`check-feature-level-updated`** | ★ **If you touch any API doc, you must bump `API_FEATURE_LEVEL`** |
| **`check-capitalization`** | Title-case conventions in user-facing strings (with an allow-list) |
| **`check-frontend-i18n`** | Translatable strings contain no unescaped handlebars; correct `t()` usage |
| **`check-thirdparty`** | The **DEP-5 licence file** is syntactically valid and matches dependencies |
| **`check-provision`** | Provision-version invariants |
| **`check-templates`** | Template consistency |
| **`check-issue-labels`** | Commit/PR hygiene |
| **`check-openapi.ts`** | The OpenAPI spec is well-formed |

Plus `renumber-migrations`, `commit-message-lint`, `run-mypy`, `run-tsc`, `run-dev`,
`review`, `self-review`, `diagnose`, `build-docs`, and **65 executable tools** total.

**The pattern (rule 6):** each guard is **a small, single-purpose script that exits non-zero**,
runnable from the CLI *and* in CI. There is no guard framework — the framework is "a script that
fails."

---

## §6.2 ★ `check-schemas`: one truth enforced across three representations

The most important PZ artefact in the tree (`tools/check-schemas`, its own docstring):

```
# Validates that 3 data sources agree about the structure of Zulip's events API:
#
# * Node fixtures for the server_events_dispatch.js tests.
# * OpenAPI definitions in zerver/openapi/zulip.yaml
# * The schemas defined in zerver/lib/event_schema.py used for the
#   Zulip server's test suite.
#
# We compare the Python and OpenAPI schemas by converting the OpenAPI data
# into the event_schema style of types and the diffing the schemas.
```

**What this means, and why it is the study's strongest PZ finding.** The events API — the
server→client push contract that batch 01 identified as the heart of real-time sync — is
described in **three places**: the hand-written OpenAPI YAML (31,869 lines), a **Python schema
module used by the test suite**, and **JavaScript test fixtures**. Drift between any two is
caught automatically. **This is the only place in the study where a contract is enforced
across language boundaries by a differ**, and it is the mechanism that makes Zulip's
`API_FEATURE_LEVEL` a real number rather than a comment.

---

## §6.3 ★ The `API_FEATURE_LEVEL` ratchet

`tools/check-feature-level-updated` — the whole guard, essentially:

```python
api_docs_folder = Path("api_docs")
api_docs_paths = list(api_docs_folder.glob("*.md"))
api_docs_paths.append(Path("zerver/openapi/zulip.yaml"))
for api_docs_path in api_docs_paths:
    with open(api_docs_path) as file:
        if "ZF-" in file.read():
            content = f"[Build] ... has failed: Feature level not replaced in '{api_docs_path}'..."
            print(f"fail=true\ntopic={topic}\ncontent={content}")
            sys.exit(0)
```

**The mechanism (rule 6 — name it): the feature-level ratchet.**
1. A contributor writing an API change runs `tools/create-api-changelog`, which creates a
   changelog file containing a **placeholder `ZF-<random-id>`**.
2. When they actually implement it, they **replace `ZF-` with the new feature level** in the
   changelog.
3. **If a merged PR leaves any `ZF-` marker in the API docs or the spec, this guard fails the
   build** — and it *also skips the job that posts the announcement to the API-docs channel*,
   and tells the author to post it manually.

**★ This is a ratchet with a *social* consequence attached.** The guard does not just say "you
forgot"; it says *"and now the announcement will not post itself, so do it by hand."* It couples
a mechanical check to a human obligation. **`API_FEATURE_LEVEL = 513`** (version.py) is thus a
**monotonically increasing, guard-enforced counter** — the number of times the public API
contract has changed.

---

## §6.4 ★ The taint-analysis escape hatch: `mark_sanitized`

`zerver/lib/pysa.py` is the entire module:

```python
from typing import TypeVar
T = TypeVar("T")

def mark_sanitized(arg: T) -> T:
    return arg
```

**A function that does nothing** — used in exactly **8 files** in `zerver/` (7 call sites plus
`pysa.py` itself). Its purpose is visible in the call sites. In `zerver/views/auth.py:124-127`:

```python
# Mark as safe to prevent Pysa from surfacing false positives for
# open redirects. In this branch, we have already checked that the URL
# points to the specified 'redirect_host', or is relative.
return urljoin(redirect_host, mark_sanitized(url))
```

And in `zerver/worker/base.py:282` (batch 04's dead-letter writer):

```python
# Use 'mark_sanitized' to prevent Pysa from detecting this false positive
# flow. 'queue_name' is always a constant string.
fname = mark_sanitized(f"{self.queue_name}.errors")
```

**★ This is the study's most elegant PZ mechanism, and it is a *negative* capability.** Zulip runs
**Pysa** (Facebook's static taint-analysis tool for Python) over its codebase. When Pysa raises a
*false positive* — a flow that looks like a vulnerability but is not, because a human has proven
it safe — the developer **annotates the line with `mark_sanitized` and writes a comment saying
why.** The annotation:
- is a **no-op at runtime** (identity function),
- makes the intent **explicit and greppable**,
- and — crucially — **must be justified by a comment**, which means every "we know it's safe"
decision in the security model is written down.

**The count matters: 7 call sites across 8 files.** Zulip does not spray `mark_sanitized` to
silence a noisy tool; it appears where a specific, defensible taint flow was proven safe.
**This is the anti-pattern of `# type: ignore` used as a sledgehammer** — and it is the first time
in the study that a platform has shipped an *escape hatch for its own security tooling*, with the
discipline to use it sparingly.

---

## §6.5 The licence ledger: a DEP-5 file, guarded

`docs/THIRDPARTY` is a **DEP-5** (Debian machine-readable copyright) ledger of every third-party
dependency and its licence. `tools/check-thirdparty` validates it — and its own docstring is a
model of honesty:

> `# Disclaimer: This script is not a lawyer. It cannot validate that the claimed licenses are
> # correct. It can only check for basic syntactic issues.`

**★ "This script is not a lawyer"** is the single most quotable line in the Zulip tree. It states
precisely what an automated guard can and cannot do — a rarity in tooling. Combined with the
DEP-5 format, Zulip gets **a machine-checkable licence manifest that admits its own limits**.

---

## §6.6 The testing culture, measured

| Fact | Value |
|---|---|
| `zerver/tests/` | 150 files / **163,703 LOC** |
| Web e2e tests (Puppeteer) | 21 `.ts` files |
| Test rules shipped in-tree | `.claude/rules/testing.md`, `ui-testing.md` |

**The philosophy is written down** (`.claude/rules/testing.md`):

> *"Write end-to-end tests when possible verifying what's important, not internal APIs."*
> *"A good failing test before implementing is good practice so your test and code can jointly
> verify each other."*
> *"Remember to always assert state is correctly updated, not just 'success'."*

And from `AGENTS.md` (see §6.7): **"What isn't tested probably doesn't work"** — applied to
visual changes "just as much as to backend logic."

---

## §6.7 ★ The AI-agent instruction set, shipped in-tree

A PZ finding unique to Zulip: **`AGENTS.md` + `.claude/rules/*.md` + `.claude/skills/*`** — a
complete, in-tree instruction manual for **AI coding agents**, with:

- **6 rules** (`api-changelog.md`, `css.md`, `frontend.md`, `python.md`, `testing.md`,
  `ui-testing.md`) — each with a **`paths:` front-matter** so it auto-loads when an agent touches
  the relevant files (`.claude/rules/testing.md` opens with `paths: - "zerver/tests/**"`).
- **9 skills** (`commit-message`, `fix-backend-coverage`, `fetch-zulip-messages`,
  `self-review`, `visual-test`, `write-changelog`, …).
- **An explicit philosophy** (`AGENTS.md:28-40`):

> *"Zulip's coding philosophy is to focus relentlessly on making the codebase easy to understand
> and difficult to make dangerous mistakes. This applies equally to AI-generated contributions."*

> *"Zulip's engineering strategy is to 'move quickly without breaking things'. This is possible
> because the project has invested years in testing, tooling, code structure, documentation, and
> development practices that catch bugs systematically rather than relying on individual
> vigilance."*

> *"There is no category of 'minor issue' that is acceptable to ship… The right attitude is:
> 'What could go wrong, and how do I verify that it doesn't?' not 'It looks fine to me.'"*

**★ Why this belongs in PZ, not P1.** This is not an AI *feature* (that was batch 02's one
summariser). This is **the platform teaching its own guardrails to an AI contributor** — the same
`AGENTS.md` that tells a human how to work tells a Claude Code agent how to work, with
path-scoped rules and named skills. **Zulip has made its PZ machinery legible to a machine.** The
first line even sets the policy: *"Do not submit an AI-generated PR you haven't personally
understood and tested."*

---

## §6.8 Divergences and honest limits (batch 06)

| # | Divergence / limit | Detail |
|---|---|---|
| **D6-1** | **`tools/lint` is an entry point to a repo not in this tree** | `tools/lint` is a 7,475-byte executable that drives the **`zulip-lint`** repository (a separate project). The 100+ custom lint rules are **not visible in this extract**. The guard *surface* is readable; the guard *bodies* are not. |
| **D6-2** | **No `.github/workflows` in the extract** | `.github/` exists but the CI workflow YAMLs are not present (the README badge references `zulip-ci.yml`, which is absent). **The CI is therefore documented, not measured** — this batch reads the guards, not the pipeline that runs them. |
| **D6-3** | **Pysa's configuration is not in this tree** | The 7 `mark_sanitized` call sites are visible, but the taint-model/stubs config that makes Pysa run is elsewhere. **The escape hatch is visible; the analyser is not.** |
| **D6-4** | **`mark_sanitized` is a no-op by design — trust rests on the comment** | Nothing *enforces* that the justification is correct. If a developer marks a real vulnerability safe, no tool catches it. **The mechanism raises the cost of a lie; it does not forbid it.** |
| **D6-5** | **The AI-agent instructions are advisory** | `AGENTS.md` says "do not submit an AI-generated PR you haven't personally understood" — a policy, not a gate. No automated check verifies a human reviewed an AI PR. |

---

## §6.9 Batch-06 verdict

Zulip's out-of-pole surface is the **densest verification culture in the study**, and its centre
is a single idea: **make the wrong thing hard to do, then catch the rest automatically.** The
mechanisms that carry that idea:

1. **`check-schemas`** — the events-API contract enforced across **three independent
   representations** (OpenAPI YAML, Python test schemas, JS fixtures) by a differ. Unique in the
   study.
2. **The `API_FEATURE_LEVEL` ratchet** — a guard that fails the build *and skips the automated
   announcement* if a placeholder marker survives, coupling a mechanical check to a human
   obligation. `513` is a guard-enforced monotonic counter.
3. **`mark_sanitized`** — a one-line identity function that is the **escape hatch for the
   project's own taint analyser**, used exactly 7 times, each with a written justification.
   The first time in the study a platform ships an escape hatch *for its own security tooling*
   and uses it sparingly.
4. **The DEP-5 licence ledger** — machine-checkable, and guarded by a script that says **"This
   script is not a lawyer."**
5. **`AGENTS.md` + `.claude/rules` + `.claude/skills`** — the whole contributor discipline,
   **rewritten for an AI agent**, with path-scoped auto-loading rules.

**The honest counterweights:** the actual lint rules live in a repository not in this extract
(D6-1), the CI workflows are absent (D6-2), the taint analyser's config is absent (D6-3), and the
two most safety-critical mechanisms — `mark_sanitized` and the AI-agent policy — are **trust,
not enforcement** (D6-4, D6-5). **Zulip's culture is real and measurable, but its deepest layer
is held by a written norm.**

---

*Batch 06 · Zulip · a guard culture · check-schemas across three sources · a feature-level
ratchet with a human consequence · mark_sanitized as the taint analyser's escape hatch ·
AGENTS.md teaches the machine.*
