# 03 — THE WORKSPACE (P2)

**The pole:** whose data is this, who may see it, how is the boundary drawn.

**This pole drives the whole study.** `CC-84` — one superadmin identity for every worker MCP
call, one shared `HERMES_HOME` — is the defect that made us study platforms in the first
place. Every worker MCP call authenticates as one service identity, so a Hermes turn can run
platform tools *outside the chat's tenant*.

---

## 1. What the nine platforms do

### zulip — the ambient realm (★ STRONGEST IN THE STUDY)
The workspace is not a permission check. It is **derived from the request**:

> The tenant comes from the request's **Host header** (subdomain). The fence is **one
> comparison** — `user_matches_subdomain`. Email is unique **per realm**, not globally
> (revealed by a *silenced* `auth.W004` linter check).

The machinery: a **95-field `Realm`**, **5 roles / 8 built-in system groups / 38 `can_*_group`**
capabilities, and a **117-event audit log whose numeric namespace encodes the topology**
(`10xxx` = remote-server events, *"offset by exactly **+10000** from their realm twin"* — you
can read where an event happened from its number).

**The counterweight, which the first version of this file dropped:** zulip's own honest ledger
records D3-3 — *"There is **no Postgres row-level security** … **A query that forgets `realm=`
is a bug the model does not prevent**"* (§3.3). The ambient realm is the best P2 in the study
**and** it is held together by *"discipline and a very large test suite"* (§3.8). That is the
trade SR-10 inherits: a derived tenant is simpler than an explicit one, but nothing in the
database will catch a forgotten clause.

### n8n — projects and scopes
**`Project personal | team`** — two workspace kinds at the same level. **10 roles / 206
scopes** — a real, closed, enumerated scope set.

### buzz — community = tenant, with a three-fence contract and a number correction
The tenant is a **community**, host-resolved by the server. **Correction [C]:** the first
version of this file got buzz's proof surface wrong on four counts.

| First version said | The markdown says |
|---|---|
| "a 1,110-line prose contract (10 axioms, one conformance gate each)" | 1,110 lines / 58,845 B is correct, but the axioms and per-axiom gates are in buzz's **PZ** file (`06-out-of-pole §2.3`, F6-26), not this one. This file names no axiom count. |
| "`MultiTenantRelay.tla`, 12 invariants, 13 mutations, 4 deliberately-false vacuity probes" | **13 invariants**, not 12 — *"The 13 invariants (all measured in `Safety`, lines 1129–1142)"*. The 13 mutations and the four false probes are correct. (buzz's own PZ file says "12 safety invariants" — a discrepancy between two of buzz's own batches, reported not resolved.) |
| "Tamarin proof … 21 lemmas, security proven *under key compromise*" | **32 lemmas**, not 21 — twice: *"Tamarin: 32 lemmas, each paired with a witness"* and *"All **32 lemmas (S1–S8) verify green**"*. And **"key compromise" appears nowhere** in this file. |
| *"a lint fence, not a compiler fence"* | The actual words: *"This is a **lint-and-review fence, not a compiler fence.**"* |

And the fence is not three documents — it is three mechanisms: *"a **type fence**
(`tenant.rs` …), a **schema fence** (41/57 tables carry `community_id` …), and a **proof
fence** (TLA+ + Tamarin …)"* (§12, F3-1). The prose contract is documentation of the claim,
not one of the fences.

### Multica — the container
**144 tables, 82 carry `workspace_id`.** The workspace is the dominant axis of the schema —
more than half of every table knows whose it is. Per-workspace uniqueness patterns do exist
(`UNIQUE (workspace_id, number)`, a partial unique pending-invite index, `UNIQUE
(workspace_id, installation_id)`).

**Correction [C]:** the first version credited Multica with an *"authority layer capping
machine actors at approve-first."* **Multica's P2 file has zero mentions of "approve" or
"authority."** Its actual stance is the opposite — *"a lead that may be a **member or an
agent**"* (F03-07), machines as first-class owners. The approve-first cap is **mercato's own**
(SR-18) and must not be attributed to Multica.

### Paperclip — the portable company package
**Correction [C]:** the first version said "P2 is one of Paperclip's two strengths … no
composer" — unsupported. Paperclip's actual P2 headline is the **company-as-portable-markdown
package** (C3-1): *"the most P2-relevant mechanism in the platform"* and *"the strongest single
idea Paperclip offers P2"* (§8). Plus workspace skill policy (C3-5), the operator triage rule
(C3-4), and directory restore locks (C3-7). It is **single-tenant** — *"No multi-tenancy."*

### Hermes — profile isolation, which is not tenancy
Hermes isolates by *profile* — one home per agent. That is a personal boundary, not a
commercial one.

**Correction [C]:** the first version claimed *"The study records this explicitly so it is
never mistaken for P2."* No such statement exists, and the markdown leans the other way:
`02-bots...` §5.1 reads *"the per-tenant / per-employee boundary the platform needs"*, and
`07-sessions...` §4.2 describes an *"operator console"* over many tenants. The only explicit
negative is §2.2 — *"Profiles do **not** sandbox the agent"* — which is about filesystem reach,
not commercial tenancy. What Hermes *does* give us is the **one-writer rule** (*"Never point
two agent processes at the same profile"*), per-profile credential scoping (C8-3, *"the exact
pattern the platform's per-company isolation needs"*), and the **boards-hard / tenants-soft**
ladder (boards are the hard isolation boundary; tenants are a soft filter).

### openrig, Gas Town, CrewAI — the honest negatives
openrig: **0 `tenant_id` occurrences**, a static bearer token = fully privileged, and the
boundary is *loopback / Tailscale* (*"the tailnet is the auth boundary"*). It is the only
platform that states this as a deliberate design: *"Why this is coherent, not a gap."*

**Correction [C] on Gas Town:** the first version said "no tenancy … both are honest about it."
Gas Town's P2 file contains **zero** mentions of tenancy or tenant — it neither claims nor
disclaims it. What Gas Town *does* contribute to this pole is elsewhere: the **Hook as
durability primitive** (F03-03), a **4-layer config stack with veto** (F03-02), a **two-tier
ledger** (F03-05), **ZFC** (F03-06), and the town-root mutation guard (F03-09).

**Correction [C] — CrewAI was missing entirely.** CrewAI's own P2 file carries an explicit
instruction: *"**must not be conflated in the mapping pass**"* (§8, 3.12) and *"the mapping must
say which CrewAI ideas survive the change of substrate"* (§10). Its workspace is a **text
folder** (§3.1), with five named rejections (§3.2), string-reference resolution (§3.4), and
`FileMode` (§3.8). Its tenancy verdict, from its synthesis: *"Tenancy of any kind"* is absent —
*"no tenant type/column/param anywhere"*.

---

## 2. What mercato has

| HAVE IT | Where | Notes |
|---|---|---|
| Threads | `AiChatConversation` / `Participant` / `Message` | The conversation objects |
| Tenancy module | complete | |
| Scope enters **twice**, fail-closed | | Two independent writes of the same value; deliberately defensive, and the thing CC-84 attacks |
| Hermes gateway | `P2-1 … P2-9a` | |

**OPEN — `CC-84`:** every worker MCP call runs as **one superadmin service identity**; there
is **one shared `HERMES_HOME`**. A Hermes turn can therefore run platform tools outside the
chat's tenant. Ranked options on record: **per-run minted credential** (recommended) →
interim fail-closed guard → doc-only (rejected).

**PLANNED — `P2-9b` THE SWITCHOVER:** default-flip `AI_RUNTIME_ENGINE` to Hermes + OpenCode
deletion + `CC-74` retirement. Gated by the measured stale-timeout-vs-toolset trade.

---

## 3. The gap

Mercato has a tenancy *module* and a *scope* — but the scope is entered twice by hand, and
the engine identity is global. The consequence is exactly CC-84: the aissistant's tools run
with a single privileged identity, so tenant isolation stops at the application layer and
does not reach the engine.

## 4. The target — RE-ENGINEER IT

**The workspace as an ambient, derived, per-tenant boundary — one tenant ↔ one engine home.**

1. **Ambient tenancy.** The tenant is derived from the request (host / subdomain / token),
   not passed around as a parameter to be remembered. The fence is one comparison.
2. **Scope enters once.** The double entry collapses to a single derived value. This is both
   a simplification and a *correctness* fix: two writes of the same value can diverge.
3. **One tenant ↔ one engine home.** Per-tenant engine isolation with the uniqueness
   constraint as the primitive. This *is* the fix for CC-84.
4. **Identity keys unique per realm.** Email (and friends) unique per realm, enforced by the
   database, with the linter check that catches the mistake **left unsilenced**.
5. **Roles as data, scopes as a closed set.** A scope registry with a ratchet: referencing an
   undeclared scope fails the build.
6. **An audit log with encoded topology.** Event-type numbering that tells you where the
   event happened, so the log is queryable by realm without a join.
7. **Two workspace kinds.** Personal and team at the same level — the smallest honest answer
   to "whose workspace is this".
8. **A proof beside the tenancy contract.** Any formalism we adopt ships with a prose
   contract and a conformance harness naming its blind spots.

## 5. Requirements

| ID | Requirement | Source | HAVE / BUILD / BORROW / RE-ENGINEER |
|---|---|---|---|
| **SR-10** | Ambient tenancy: tenant derived from the request; fence = one comparison | zulip (`user_matches_subdomain`, Host header) | **RE-ENGINEER** — replaces explicit scope entry |
| **SR-11** | Scope enters once — collapse the double entry to a derived value | mercato + zulip | **BUILD** — part of `CC-84` |
| **SR-12** | One tenant ↔ one engine home; per-run minted engine credential | Multica uniqueness + `CC-84` | **BUILD** — `CC-84`, recommended option |
| **SR-13** | Identity keys unique per realm, DB-enforced; linter check unsilenced | zulip `auth.W004` | **BORROW** |
| **SR-14** | Scope registry with a build-time ratchet | n8n (206 scopes) | **BORROW** |
| **SR-15** | Audit log with topology-encoded event numbering | zulip (117 events, `10xxx`) | **BORROW** |
| **SR-16** | Personal / team workspace kinds | n8n `Project personal\|team` | **BORROW** |
| **SR-17** | Tenancy contract with a prose document + conformance harness + `LIMITS.md` | buzz — the 1,110-line contract and axioms live in its **PZ** file (`06-out-of-pole §2.3`, F6-26); the P2 fences are type + schema + proof (F3-1) | **BORROW** |
| **SR-18** | Machine actors capped at approve-first, test-pinned | **mercato only** — Multica's P2 file has zero mentions of approve/authority; its stance is machines as first-class owners (F03-07), the opposite of a cap | **HAVE** (test-pinned) |

**Prerequisites:** SR-12 is `CC-84` and gates `P2-9b` — the switchover cannot land before the
engine identity is per-tenant. SR-10 and SR-11 land together or not at all (the derived
tenant *is* the single scope entry).
**Triggers:** `P2-9b` waits on SR-12.

**Corrections [C] applied 2026-10-16 against the markdown:** buzz's Tamarin lemma count is
**32**, not 21; "security proven under key compromise" appears nowhere; buzz's fence is
**type + schema + proof**, not three documents; Multica has no approve-first authority layer
(it makes machines first-class owners); Paperclip's P2 is the portable-markdown company
package, not a vague "foundation"; Hermes has no explicit "not tenancy" statement and its own
markdown leans the other way; Gas Town's P2 file says nothing about tenancy at all; and
**CrewAI was missing entirely**, despite its own file saying *"must not be conflated in the
mapping pass."*

**Added to the target from the same pass:** zulip's D3-3 counterweight — *"no Postgres
row-level security … a query that forgets `realm=` is a bug the model does not prevent"* — plus
its `REALM_HOSTS` custom-domain path (D3-2, wildcard DNS dependency), the one place ambient
derivation can silently go wrong.

---

*Next: `04-automations.md`.*
