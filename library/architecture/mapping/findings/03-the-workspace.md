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

The machinery: a **95-field `Realm`**, **5 roles / 8 groups / 38 `can_*_group`** capabilities,
and a **117-event audit log whose numeric namespace encodes the topology** (`10xxx` = realm +
10000 — you can read where an event happened from its number).

### n8n — projects and scopes
**`Project personal | team`** — two workspace kinds at the same level. **10 roles / 206
scopes** — a real, closed, enumerated scope set.

### buzz — community = tenant
The tenant is a **community**, host-resolved, with a contract enforced three ways: a
1,110-line prose contract (10 axioms, one conformance gate each), a **TLA+ model**
(`MultiTenantRelay.tla`, 12 invariants, 13 mutations, 4 deliberately-false vacuity probes),
and a **Tamarin proof** (`MultiTenantAuth.spthy`, 21 lemmas, security proven *under key
compromise*). The fence itself calls itself *"a lint fence, not a compiler fence."*

### Multica — the container
**144 tables, 82 carry `workspace_id`.** The workspace is the dominant axis of the schema —
more than half of every table knows whose it is. Plus the authority layer: machine actors
capped at approve-first.

### Paperclip — foundation
P2 is one of Paperclip's two strengths (with P3). No multi-tenancy, no composer — but the
workspace *shape* is sound.

### Hermes — profile isolation, which is not tenancy
Hermes isolates by *profile*. That is a personal boundary, not a commercial one. The study
records this explicitly so it is never mistaken for P2.

### openrig, Gas Town — no tenancy at all
openrig: **0 `tenant_id` occurrences**, a static bearer token = fully privileged, and the
boundary is *loopback / Tailscale*. Gas Town: no tenancy. Both are honest about it.

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
| **SR-17** | Tenancy contract with a prose document + conformance harness + `LIMITS.md` | buzz (TLA+ / Tamarin / 1,110-line contract) | **BORROW** |
| **SR-18** | Machine actors capped at approve-first, test-pinned | Multica / mercato authority layer | **HAVE** (test-pinned) |

**Prerequisites:** SR-12 is `CC-84` and gates `P2-9b` — the switchover cannot land before the
engine identity is per-tenant. SR-10 and SR-11 land together or not at all (the derived
tenant *is* the single scope entry).
**Triggers:** `P2-9b` waits on SR-12.

---

*Next: `04-automations.md`.*
