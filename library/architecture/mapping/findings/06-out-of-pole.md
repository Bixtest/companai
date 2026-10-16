# 06 — OUT OF POLE: THE INSPIRED ADDITIONS

**The owner's instruction, verbatim:** *"we want to engineer the best, richest, most versatile
and integratable version of each pole plus the extra features, plugins, modules, ideas,
architecture, etc the platforms inspire and reengineer accordingly."*

This file is the "plus" half. Everything here is outside the five poles — mechanisms,
products, and ideas the nine platforms inspired that do not belong to a single pole.

---

## 1. Plugin and module architecture

### The retirement surface is the richest in the study (buzz)
23 of 62 migrations have a drop/retire flavour; migration `0044` drops a whole **14-table
ledger**. The `sprout → buzz` rename left residue in a repo URL, an `AGENTS.md`, and a crate
still named `sprig`.

> **The versioned audit hash chain is rule 10 done RIGHT** — retirement recorded, chained,
> and verifiable.

**Multica's Plugin V1 deletion:** migration `344` deletes the **entire** Plugin V1 — **14
DROP TABLEs** — leaving 3 tables. A plugin system that ships with its own obituary is a
plugin system you can trust.

**What we build:** a plugin/module registry with a full lifecycle — *register → version →
enable → disable → retire* — where every retirement is a recorded, chained event with a
reason, and where renaming a module is a tracked hazard, not a side effect.

## 2. The digital-twin harness (openrig ★)

> Fixtures are **typechecked against the real interfaces**, so **drift breaks the build**.

A fake that no longer matches the real thing stops compiling. This is the single cheapest
correctness mechanism in the study and it belongs beside every integration surface we build.

## 3. The one-truth check (zulip ★)

> **`check-schemas`** verifies the **same fact in three representations**: OpenAPI YAML, the
> Python test schemas, and the JS fixtures.

One check, three files, one truth. Wherever we hold a contract in more than one place, this
is the mechanism.

## 4. The feature-level ratchet (zulip ★)

> **`API_FEATURE_LEVEL = 513`** — a number that only rises. Raising it **fails the build AND
> skips the auto-announcement**, so **a human must do it**.

A version number that cannot be bumped by a machine is a version number that means
something.

## 5. The named escape hatch (zulip ★)

> **`mark_sanitized`** — a one-line identity function that is the **named, justified** hole
> in a guard, findable by grep and reviewable by a human.

The lesson is not "have escape hatches" — it is **name them**, so a reviewer can find every
one in the codebase in one search.

## 6. The exclusion ledger with mechanical expiry (openrig ★)

> A **4-rail exclusion ledger**: green-with-exclusions, where **every exclusion expires
> mechanically** — no human needed to enforce it. It **ships EMPTY by design**.

> *"A green is only as good as what could have been red."*

> *"Two reads of the same flag can diverge; one cannot."*

A guard report that lists nothing is a guard report nobody trusts. This ledger makes the
*absence* of exclusions a fact you can check.

## 7. The proof surface (buzz ★)

Four artefacts, three languages:
- A **1,110-line prose contract** — 10 axioms, one conformance gate each.
- **`MultiTenantRelay.tla`** — 12 invariants, 13 mutations, **4 deliberately-false vacuity
  probes** (proving the checker can actually fail).
- **`MultiTenantAuth.spthy`** — the lemma count is **32**, not 21: *"Tamarin: 32 lemmas, each
  paired with a witness"* and *"All **32 lemmas (S1–S8) verify green** (Tamarin 1.12.0 / Maude
  3.5.1, ~12 s)."* **"Security proven under key compromise" appears nowhere** — that was an
  invention of the first version.
- A runtime **conformance harness** whose **`LIMITS.md` names 7 blind spots** — including one
  deliberately un-armed read seam.

**Correction [C] — two errors in this section.** First, the count: buzz says **five artefacts
across three languages**, not four. F6-24's four formal models include `GitOnObjectStore.tla`
and `NIP-AB.spthy`, both silently dropped from the first version. Second, the blockquote below
was **fabricated** — *"Guard-as-document: the proof is only as good as the document that says
where it stops"* appears nowhere in the corpus. The real line is F6-12: **"A gate that ships
its own limits is a gate you can trust."**

> **"A gate that ships its own limits is a gate you can trust."** — buzz, F6-12

**What we build:** wherever we claim a security property, the claim ships with a prose
contract, a falsifiable check, and a `LIMITS.md`.

## 8. The retirement ledger (buzz)

Every drop, rename, and removal recorded with its reason. Renames are hazards — openrig's
`RIGGED` rename touched **284 occurrences across 85 files**.

## 9. The kinds-over-endpoints policy (buzz)

> *"Prefer a new kind over a new HTTP endpoint."*

136 kinds in `ALL_KINDS` (0 duplicates, enforced by `no_duplicate_kind_values`), in a closed
registry. Endpoints are for transport; **kinds are the extension surface**.

**Correction [C]:** "a registry with a conformance test" overstates what exists. The only test
in the file enforces **duplicate detection**; buzz's own PX-W file records that the
cross-language kind mirror has *"**no lockstock check** … I found no test asserting that the
TS/Dart constants equal"* the Rust set. So SR-45 asks us to build the test buzz does not have.

## 10. The permission policy ladder (openrig)

Five rungs, as data, per agent per workspace — carried into P1 as SR-03, but noted here
because it is a *product surface* as much as an architecture one: the user should be able to
see and choose how much rope their agent has.

## 11. The two-reads rule (openrig)

**Correction [C]:** the quote *"Two reads of the same flag can diverge; one cannot"* is **not
in the corpus** — it was my paraphrase. What openrig actually states is the skill-translation
requirement behind its two-surface rule (`02-the-aissistant §6.1`): a config-file policy whose
schema a vendor may change *"must go through a **skill** that reads the installed version and
adapts."* The build-time lint idea is sound; the quote was not.

Anywhere we read a setting twice, we will eventually disagree with ourselves. The rule is a
build-time lint, not a convention.

---

## 12. Requirements

| ID | Requirement | Source | Status |
|---|---|---|---|
| **SR-37** | Plugin/module registry with lifecycle: register → version → enable → disable → retire; retirement is a chained, reasoned event | Hermes (`12-SYNTHESIS §3.2` versioned compat contract + deprecation window) + Multica (`07-SYNTHESIS §7.3 #12` plugin contract; migration `344` = the obituary) | **BORROW** |
| **SR-38** | Digital-twin harness: fixtures typechecked against real interfaces; drift breaks the build | openrig (`05-widgets-and-frontend §8`, F5-3) | **BORROW** |
| **SR-39** | One-truth check across every representation of a contract | zulip `check-schemas` (`06-out-of-pole §6.2`) | **BORROW** |
| **SR-40** | Feature-level ratchet that only a human can raise — **the build fails when the level is NOT raised** | zulip (`06-out-of-pole §6.3`, `API_FEATURE_LEVEL = 513`) | **BORROW** |
| **SR-41** | Named escape hatches, greppable by convention | zulip `mark_sanitized` (`06-out-of-pole §6.4`) | **BORROW** |
| **SR-42** | Exclusion ledger with mechanical expiry; ships empty | openrig 4-rail ledger (`06-out-of-pole §4`, F6-1) | **BORROW** |
| **SR-43** | Proof-beside-prose: any claimed security property ships a contract, a falsifiable check, and a `LIMITS.md` | buzz (`06-out-of-pole §2.3`, F6-26; `§3.4`, F6-12) | **BORROW** |
| **SR-44** | Retirement ledger; renames are tracked hazards | buzz rule 10 (`06-out-of-pole §4`) + openrig `RIGGED` (284 occurrences / 85 files, `07-synthesis`) | **BORROW** |
| **SR-45** | Kinds-over-endpoints: closed event-kind registry — **and the cross-language lockstock check buzz does not have** | buzz (`ALL_KINDS` 136, `01-platform-overview`; the missing test is `05-widgets-and-frontend §3.5`) | **BORROW** |
| **SR-46** | Two-reads lint: any setting read twice must be read once | openrig (two-surface rule, `02-the-aissistant §6.1`) | **BORROW** |

**Correction [C] on SR-40 — the trigger was inverted.** The markdown says the build fails when
the level is **not** raised: *"If a merged PR leaves any `ZF-` marker in the API docs or the
spec, this guard fails the build — and it *also skips the job that posts the announcement*"*
(`06-out-of-pole §6.3`). The human must replace the `ZF-` marker **and** post the announcement
by hand. The design is a ratchet with a **social consequence attached** — that is the part
worth borrowing, not the direction of the trigger.

**None of these has a blocker.** They are the independent, tooling-heavy, high-leverage
items — the ones that can land first and make everything after them cheaper.

---

## PART II — THE GUARD POLE (PZ), GATHERED

The guard is a pole of its own, but its mechanisms are **cross-cutting by nature** — every
one of them guards something in another layer. So they are filed here rather than in a
separate pole file, and gathered below so the pole is not lost.

The guard is where the study is *densest*: **zulip** has the densest guard culture, **buzz**
the strongest proof surface, **openrig** the most transferable honesty machinery. The verdict
that names the pole:

> **"Make the wrong thing hard to do, then catch the rest automatically."** — zulip

The PZ requirements, gathered:

| ID | Mechanism | Source |
|---|---|---|
| **SR-39** | One-truth check across every representation of a contract | zulip `check-schemas` |
| **SR-40** | Feature-level ratchet only a human can raise | zulip `API_FEATURE_LEVEL=513` |
| **SR-41** | Named, greppable escape hatches | zulip `mark_sanitized` |
| **SR-42** | Exclusion ledger with mechanical expiry; ships empty | openrig 4-rail ledger |
| **SR-43** | Proof beside prose: contract + falsifiable check + `LIMITS.md` | buzz |
| **SR-44** | Retirement ledger; renames are tracked hazards | buzz + openrig |

**What mercato already has in this pole** — and it is the strongest starting position of any
pole: the **guard engine (`P18`) is complete** with `D0–D3` fixed; the **authority layer**
caps machine actors at approve-first and is **test-pinned**; there is a **hash-chained
ledger**, **RED-GREEN mutation proofs**, and **build-time fences (`CC-44`)**.

**What is open:** `CC-38` (approval intake), `CC-34` (read enforcement), `CC-10` (HTTP authz
invoker), `CC-77` (capability grant), `CC-63`/`CC-64`/`CC-65`.

The target for this pole is therefore not "build a guard" — it is **"keep the guard we have,
and make it honest"**: mechanical expiry instead of remembered exceptions, one truth instead
of three representations that can drift, a ratchet instead of a number a machine can bump,
named holes instead of unnamed ones, and a `LIMITS.md` beside every gate.

**Correction [C] — five platforms were missing from this pole entirely.** The first version
gathered only zulip, buzz, and openrig. The markdown shows guard material in every one of the
nine:

- **Hermes** (`08-security...`): four **context-aware approval modes, all defaulting to
  `deny`** (C8-1); a **`HARDLINE_PATTERNS` floor that sits below the off-switch** (C8-2);
  write-guard refusals plus `HERMES_WRITE_SAFE_ROOT` (§4); container hardening with a measured
  **`_DEFAULT_PIDS_LIMIT = "2048"`** — note the doc says 256 and is stale (§7); an
  **env-sanitization allow-list in four places** (C8-4); **per-profile credential scoping**
  (C8-3, *"the exact pattern the platform's per-company isolation needs"*); an **SSRF blocklist
  naming metadata endpoints** (§6.4); MCP error redaction (§6.3); gateway authz order (§6.5);
  and memory-injection scanning (`04-memory-and-context §2.4`). Plus **platform toolsets as
  least privilege per door** (`05-tools... §2.1`) and the **iron-proxy** egress guard (C8-6).
- **Gas Town** (`06-out-of-pole §2.1–2.3`, F06-02/03/04): a genuine **3-layer sandbox** — mTLS
  CA + **cert denylist at the TLS handshake**, a CLI allow-list returning 403, and a git
  smart-HTTP proxy. Its synthesis ranks this **#1** (§10). Plus the doctor's **75 fixable
  checks** (F06-06) and deterministic plugins with *"no AI interpretation"* (F06-07).
- **n8n** (`06-out-of-pole §1`): **two ratchets that can only shrink** — 110 open issues, and
  299 lint violations across 127 files and 6 rules (F06-01/02) — plus a pinned lock-validated
  harness (F06-03), a context-budget runner (F06-04), an `@Licensed` decorator (F06-05), and a
  provenance scanner (F06-07).
- **Paperclip** (`06-out-of-pole-findings §1`, C6-1): **MCP access governance** — risk levels,
  quarantine of unexpected writes, and audit-preserving disable. Plus a fail-closed tenancy
  crack (C6-6).
- **CrewAI** (`06-out-of-pole §6.2`, F6-3): **authentication without authorization** — and the
  line worth pinning above the desk: *"a seam nobody populates is indistinguishable from a
  feature nobody shipped"* (§6.5, F6-6).

**Buzz omissions, also corrected:** the migration lint with its reason-column exemption table
and zero-RLS negative (§1.4, F6-4/F6-5); **EmitGuard** turning silent omission into
`CoverageBreach` (§3.3, F6-11); the three projection rules (F6-10); the **13-boundary egress
guard with a self-proving source scan** (§5.1, F6-17); the NIP-98 TTL floor (F6-20/F6-27);
and — the one that matters most — **`bypass-permissions` is buzz's DEFAULT permission mode**
(`02-the-aissistant`, F2-2: *"Any statement about buzz's agent safety posture must start
here"*). The first version of this pole never flagged it.

**Zulip omissions, also corrected:** the **DEP-5 licence ledger** — *"This script is not a
lawyer"* (§6.5); `AGENTS.md` plus path-scoped `.claude/rules` (§6.7); **9 guard scripts / 65
tools** (§6.1); and its own counterweights, *"trust, not enforcement"* (D6-4/D6-5).

**Multica omissions:** write-path **secret redaction**, each rule naming the leak it closes
(`06-out-of-pole §2`, F06-02); a capability gate that fails installation loudly (F06-04); and
the non-inheriting binding pattern (F06-05).

**Openrig omissions:** the mutex with 5 pins and its rejected alternatives (§3.2, F6-4);
**honest-unknown refusal** (F6-5); the tombstone self-destruct with a guarding test (F6-8); a
compiled-package probe (F6-12); the **advisory/enforcing three-tier vocabulary** (§5, F6-7);
and **RED-FIRST expected-red** (F6-13).

---

*Next: `07-SYNTHESIS.md`.*
