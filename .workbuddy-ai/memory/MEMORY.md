# Project memory — Companai / open-mercato

> Detail → daily logs + `JOURNAL.md`; pre-2026-10-12: `extended_deep_memory.md`.

## ARCHITECTURE WORKSHOP — `library/architecture/`
Study platforms ONE AT A TIME against the three poles + escape hatch; map every pole across ALL platforms vs mercato → a clean SRS; then build one-tenant ↔ one-Hermes. **No development before a written requirement. Hermes is NOT forked or edited. Markdown is the source of truth.** **MAPPING FRAME (owner 2026-10-16): NOT limited by what mercato allows** — engineer the best version per pole.
**Rule 1: docs are claims, code is the authority. Rule 13: a committed number can be wrong — re-measure, and commit the fix *by name*.**

## ★ THE DONOR RE-READ — mandatory on every `SR-*` build (owner, 2026-10-17)
Full text: `library/architecture/mapping/00-PIN-AND-METHOD.md` §4.1. Three steps, in order, the third not optional:
1. **Plan it fully first** (written requirement, measured inventory, divergences named) — no code yet.
2. **Then open the donor's SOURCE at the line the `SR-*` row cites** — not the forensics digest, not `07-SYNTHESIS`. Digests answer *"does this mechanism exist?"*; a build needs *"what is the best version of it?"*, and the donor's author was solving the same problem one file away from the quoted line.
3. **Ask the enrichment question explicitly, in both directions, then proceed:** in that code's *structure, concepts, naming, invariants, constraints, error handling, migration discipline, tests* — what **improves, adds value, enriches, secures, or optimizes** the plan? **HARVEST** what is better (a constraint, a partial index, a state machine, a naming rule that makes a bug unrepresentable, a test). **REFUSE, by name, and say why** what is worse — a donor defect copied because it was there is the most expensive kind of fidelity. Record both in the discharge record.
**Worked example (`SR-02`):** the digest gave the requirement; reading Multica's migration/entity code added the nullable-`daemon_id` defect (refused → `NOT NULL`) and the unconstrained `name` (harvested → its own partial unique index). Neither was in the digest; both changed the schema.

## STANDING FORMAT — every turn MUST state (owner, 2026-10-16)
**(1) what was done, (2) its `CC-nn` address in `MASTER-CHECKLIST.html`, (3) what is next** — and update the HTML's `FRONTIER` array (LAST DONE + NEXT); the `.md` twin's §2 mirrors it. Syntax-check a script edit: extract `<script>`, `node --check` it.

## Standing hazards
- **MASTER-CHECKLIST.html is DATA-DRIVEN** — content lives in the JS arrays (`PHASES`…`SRSREG`); edit an array entry, never the markup. The `.md` twin is hand-synced — the two DO drift.
- Pure LF, never CRLF; never a BOM.
- **A bare-word grep is NOT a declaration census** — use `^\s*capability\s*:`. Git-Bash `grep -c` on CR LIES; byte truth is `tr -cd '\r' < f | wc -c`. **Never `git add -A`** — explicit paths.

## Live code frontier (`JOURNAL.md`)
**LAST DONE = `SR-02` slice 1 — an agent is not its runtime — 2026-10-17, `CC-99` closed.** Commits: code `be3f6258`, docs `df95472`. Register: **56 closed · 43 open · 99 total**.
- **Why it existed:** the kernel `Agent` has carried a `runtime` binding since `AH-1` (`ce.ts:128-136`) and **nothing read it** — so the slice's job was to give it its **first reader** (`lib/agent-runtime-registry.ts`), not just add a table.
- **`ai_agent_runtimes`** = the MACHINE (daemon/host/provider/tenant), **not** `ai_agent_runtime_overrides` (per-tenant config). Four partial unique indexes (house nullable-`org_id` pattern). **`daemon_id NOT NULL`** — the donor's nullable column voids its own uniqueness. `name` unique because the kernel agent stores its binding as **text** (`custom_entities_storage` cannot carry an FK) → resolves **by name**.
- **Refused by name:** no `status`/`last_seen_at` (no writer exists → same dead-control defect), no `runtime_mode`/`device_info`, no CHECK on `provider` (vocabulary grows; validated at the repository boundary).
- **`resolveTenantRuntime`**: 3 answers, 2 refusals — nothing falls back, nothing picks "the first". Selector: `engine` → `tenantRuntime.provider` → `AI_RUNTIME_ENGINE` → `opencode`.
- **Proof:** 64 tests / 4 suites (9·19·11·25); **12/12 mutations**; **133 suites / 1,943 tests green under the pinned Node 24**; `tsc` 0.
- **★ ALWAYS run the package suite with `workspace/.toolchain/node24/node.exe`** — under node 22.22.2 it reads "1,834/1,834 pass, 2 suites failing to LOAD" while **109 tests never ran**. A suite that fails to load reports no failures.
- **★ `CC-100` OPEN:** the MikroORM snapshot is stale AND consumed — holds neither `ai_agent_bindings` nor `ai_agent_runtimes`; `commands.ts:100` decides from it and `migrator.create()` diffs against it. Fix = regenerate against a live DB, never hand-edit.
**▶ NEXT = `SR-02` slice 2** (the retire guard — the `ON DELETE RESTRICT` promise held in code, since a custom-entity record cannot carry an FK) **+ `SR-07`** (a bot is a participant) **→ `SR-12`** (per-tenant engine home, the fix for open `CC-84`) **→ `P2-9b`.**
Owner decided: **core architecture first — business modules generated from the core workspace.**
