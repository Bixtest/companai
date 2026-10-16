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
- **`MultiTenantAuth.spthy`** — 21 lemmas, security proven **under key compromise**.
- A runtime **conformance harness** whose **`LIMITS.md` names 7 blind spots** — including one
  deliberately un-armed read seam.

> **Guard-as-document: the proof is only as good as the document that says where it stops.**

**What we build:** wherever we claim a security property, the claim ships with a prose
contract, a falsifiable check, and a `LIMITS.md`.

## 8. The retirement ledger (buzz)

Every drop, rename, and removal recorded with its reason. Renames are hazards — openrig's
`RIGGED` rename touched **284 occurrences across 85 files**.

## 9. The kinds-over-endpoints policy (buzz)

> *"Prefer a new kind over a new HTTP endpoint."*

136 kinds in `ALL_KINDS`, in a closed registry. Endpoints are for transport; **kinds are the
extension surface**. A registry with a conformance test is what makes "extensible" true
rather than aspirational.

## 10. The permission policy ladder (openrig)

Five policies, as data, per agent per workspace — carried into P1 as SR-03, but noted here
because it is a *product surface* as much as an architecture one: the user should be able to
see and choose how much rope their agent has.

## 11. The two-reads rule (openrig)

> *"Two reads of the same flag can diverge; one cannot."*

Anywhere we read a setting twice, we will eventually disagree with ourselves. The rule is a
build-time lint, not a convention.

---

## 12. Requirements

| ID | Requirement | Source | Status |
|---|---|---|---|
| **SR-37** | Plugin/module registry with lifecycle: register → version → enable → disable → retire; retirement is a chained, reasoned event | buzz + Multica `344` | **BORROW** |
| **SR-38** | Digital-twin harness: fixtures typechecked against real interfaces; drift breaks the build | openrig | **BORROW** |
| **SR-39** | One-truth check across every representation of a contract | zulip `check-schemas` | **BORROW** |
| **SR-40** | Feature-level ratchet that only a human can raise | zulip `API_FEATURE_LEVEL` | **BORROW** |
| **SR-41** | Named escape hatches, greppable by convention | zulip `mark_sanitized` | **BORROW** |
| **SR-42** | Exclusion ledger with mechanical expiry; ships empty | openrig 4-rail ledger | **BORROW** |
| **SR-43** | Proof-beside-prose: any claimed security property ships a contract, a falsifiable check, and a `LIMITS.md` | buzz | **BORROW** |
| **SR-44** | Retirement ledger; renames are tracked hazards | buzz rule 10 + openrig `RIGGED` | **BORROW** |
| **SR-45** | Kinds-over-endpoints: closed event-kind registry with conformance test | buzz `ALL_KINDS` | **BORROW** |
| **SR-46** | Two-reads lint: any setting read twice must be read once | openrig | **BORROW** |

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

---

*Next: `07-SYNTHESIS.md`.*
