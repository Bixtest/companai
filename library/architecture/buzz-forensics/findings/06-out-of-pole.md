# buzz — Batch 06: the out-of-pole surface (PZ)

**Pole:** PZ (the escape hatch — everything that does not sit on P1 aissistant, P2
workspace, P3 automations, PX-W widgets, or PX-F frontend).
**Source studied:** `buzz-main` @ v0.5.28, the extracted tree under
`platforms/_extracted/buzz-main/`.
**Method:** rule 0b / count FIRST, rule 1 / docs are claims, code is the
authority, rule 6 / name the capability, rule 10 / the retirement rule.

This batch covers six things that have no home in the pole frame:

1. **The type fence** — how buzz encodes "the server resolves the tenant" in Rust
   (§1). This is the *foundation* the whole multi-tenant story rests on, and buzz
   is unusually honest about where the fence stops.
2. **The formal models** — `MultiTenantRelay.tla` (1,142 lines) and
   `MultiTenantAuth.spthy` (748 lines), read as *models to be verified*, not
   guarantees to be accepted (§2). **The most rigorous formal-methods artefacts in
   this study.**
3. **The runtime conformance harness** — a 2,638-line gate that replays the
   relay's live decisions against a Rust re-implementation of the spec's `Next`
   relation, and **names the half of itself that is not yet armed** (§3).
4. **The audit chain** — a per-community hash chain with a *versioned* encoding
   whose v2 fixed a real ambiguity in v1 (§4).
5. **The security perimeter** — a 13-boundary egress guard with a
   **source-scanning inventory test that proves its own tripwires fire** (§5).
6. **The retirement surface and the rename hazard** — buzz · sprout · sprig, with
   the rename documented in the CHANGELOG as a sequence of PRs (§6).

The batch's headline: **buzz is the first platform in this study that treats its
own safety claims as artefacts to be *disproved* rather than asserted** — and then
writes down exactly which of them are still unproven. §7 collects the recommendation.

---

## 0. What I measured (rule 0b — counts first)

**The crate map — 34 crates** (from `Cargo.toml`, which excludes
`desktop/src-tauri` as a separate workspace):

`buzz-acp` · `buzz-admin` · `buzz-agent` · `buzz-audio-client` · `buzz-audit` ·
`buzz-auth` · `buzz-backend-kubernetes` · `buzz-cli` · **`buzz-conformance`** ·
`buzz-core` · `buzz-datastore-tracing` · `buzz-db` · `buzz-deletion` ·
`buzz-dev-mcp` · `buzz-feature-flags` · `buzz-media` · `buzz-mesh-smoke` ·
`buzz-pair-relay` · `buzz-pairing-cli` · `buzz-persona` · `buzz-pubsub` ·
`buzz-push-gateway` · `buzz-relay` · `buzz-relay-mesh` · `buzz-sdk` ·
`buzz-search` · `buzz-test-client` · `buzz-voice` · `buzz-workflow` ·
`buzz-ws-client` · `git-credential-nostr` · `git-sign-nostr` · `ifc-core` ·
**`sprig`**.

Four of those are load-bearing for this batch and their sizes are:

| Crate | Files | Lines | Role |
|---|---:|---:|---|
| `buzz-core` (`tenant.rs`) | 1 module | **352** | the type fence (§1) |
| `buzz-conformance` (all) | 7 `.rs` + 2 `.md` + 5 fixtures | **1,775** | the runtime gate (§3) |
| `buzz-audit` | 6 | **1,276** | the hash chain (§4) |
| `buzz-auth` | 23 | **12,908** | NIP-42/98, NIP-fi, replay, rate limit (§5) |
| `buzz-backend-kubernetes` | — | **6,429** | rolling deploy / reconcile (§6) |
| `buzz-pubsub` | — | **2,614** | cross-pod fan-out (§5) |

Two things the counts say before any reading:

- **`buzz-conformance` is a real crate with a real test surface** — 1,775 lines
  and, per its own `LIMITS.md`, **16 tests across three surfaces** (9 checker + 5
  fixture-replay + 2 guard). This is not a stub.
- **The formal models ship their runner configs** —
  `MultiTenantRelay.cfg` and `GitOnObjectStore.cfg` are present alongside the
  `.tla` files, including a concrete `CONSTANTS` block with two communities, five
  channels, three hosts, and one actor. **The model is runnable, not decorative.**

And one measurement that frames the whole batch: **`docs/spec/` holds three
files, and `crates/buzz-core/src/pairing/` holds a fourth** —
`MultiTenantRelay.tla` 61,202 B · `MultiTenantAuth.spthy` 31,956 B ·
`GitOnObjectStore.tla` 13,872 B · `NIP-AB.spthy` 15,147 B. **Four formal models,
~122 KB, in a product repository.** In this study, that is unique.

The fifth PZ document is not in `docs/spec/` at all: **`docs/multi-tenant-relay.md`,
1,110 lines / 74,264 B, status `draft`** — the **prose contract** the Tamarin header
defers to (§2.3). It is longer than any single formal model and it is the document
that binds them to each other, to the deployment (via ten named axioms and a
`§Conformance` gate per axiom), and to named code seams (via
`§Implementation Correspondence`). Counting it changes the shape of the batch: PZ
here is **five artefacts across three languages** — prose, TLA+, Tamarin — not a
stack of `.tla` files.

One further count belongs in the same table, because it is the mechanism P3 rests
on: **the NIP-98 replay guard is a pluggable trait with a Redis implementation** —
`Nip98ReplayGuard` (`buzz-auth/src/nip98_replay.rs`, `DEFAULT_REPLAY_TTL_SECS = 120`,
a `MAX_REPLAY_TTL_SECS` ceiling, and a compile-time `assert!(… >= 120)`) plus
`buzz_pubsub::RedisNip98ReplayGuard`, a literal `SET key 1 NX EX <ttl>` over a
community-scoped key. **The seen-set is shared and cross-pod.** This matters for
D6-1: the prose contract says the opposite about the shipped HA path.

---

## 1. PZ — the type fence, and an honest account of where it stops

### 1.1 The one invariant everything rests on

`crates/buzz-core/src/tenant.rs` (352 lines) is the smallest load-bearing file in
the platform. Its module doc states the invariant in one sentence:

> The whole multi-tenant safety story rests on one invariant from the formal model
> (conformance "row zero"): a request's community is *resolved from the connection
> host by the server*, never supplied or influenced by the client.

Two types carry it:

```rust
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, PartialOrd, Ord)]
pub struct CommunityId(Uuid);          // opaque newtype

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct TenantContext {
    community: CommunityId,            // private
    host: String,                      // private
}
```

`CommunityId` is deliberately **not** `Default`, **not** `Deserialize`, and has
**no `From<Uuid>`**. The only constructors are `CommunityId::from_uuid` (documented
as *"intentionally not a parse-from-client entry point"*) and
`TenantContext::resolved`, whose doc says *"Call this **only** from the
host-resolution path."*

**The consequence is stated as a type-signature argument** — `NewAuditEntry` in the
audit crate (§4) is typed with `CommunityId` rather than `Uuid` *"so the provenance
rule is visible in the signature"*, and it is deliberately **not
`Serialize`/`Deserialize`** so that *"there is no path by which a client-supplied
blob becomes a `NewAuditEntry` (and thus a `CommunityId`)."* buzz uses Rust's type
system to make "where did this tenant id come from?" a question the compiler
partly answers.

### 1.2 ★ The self-limiting paragraph

This is the part I did not expect, and it is the most quotable thing in the batch.
The module doc continues:

> This is a **lint-and-review fence, not a compiler fence.**
> `TenantContext::resolved` and `CommunityId::from_uuid` are public so the
> host-resolution path (in another crate) can call them — which means a determined
> caller elsewhere *could* call them too. The migration-lint harness forbids
> constructing a `TenantContext` outside host resolution and tests; the type only
> removes the *accidental* path (deserializing a client-chosen community), and
> review/lint closes the deliberate one. **We say this plainly rather than
> overclaim a guarantee the `pub` API doesn't give.**

**Rule 6 — name the capability:** the capability is *structural prevention of the
accidental path, plus a lint for the deliberate one.* It is **not** a compiler
guarantee, and buzz says so in the same file that provides it. Every one of the
three mechanisms is named with its own scope:

| Mechanism | What it prevents | What it does not |
|---|---|---|
| The type (no `Default`/`Deserialize`/`From<Uuid>`) | the **accidental** path — deserialising a client-chosen community | a determined caller inside the crate graph |
| The migration lint | constructing a `TenantContext` outside host resolution and tests | a caller that goes around the lint |
| Review | the deliberate case | — |

This is the exact discipline our own `library/development/WORKING-RULES.md` asks
for, applied to a safety claim. **A type fence documented as a lint fence is more
trustworthy than a type fence claimed to be a proof**, because the reader knows
where to look for the hole.

### 1.3 The host normalization rule, and why it is one function

The fence has a second half: the host string must normalize identically on both
sides, or a community gets split into two tenants. `normalize_host` is *"the **one**
normalization rule shared by both sides of the fence"*:

- ASCII-lowercase (RFC 3986 hosts are case-insensitive);
- strip a **single** trailing dot (the FQDN root label);
- strip a **default** port suffix (`:80`, `:443`) — *"non-default ports are kept,
  since a deployment may legitimately serve different communities on different
  ports of the same name."*

The docblock gives the design consequence directly: *"Because both sides agree by
construction, `Relay.Example`, `relay.example.`, and `relay.example:443` all
resolve to the one community — **they can never split into distinct tenants**."*
And an empty result is **fail-closed**: *"resolution treats an empty or unmapped
host as a fail-closed rejection, never a default tenant."*

Three companion functions close the practical gaps, each with a stated failure it
prevents:

- **`validate_community_host`** — accepts *only* a bare `name[:port]` of DNS
  labels, so schemes/paths/queries/userinfo/IP-brackets are *"all rejected rather
  than normalized away."* The test enumerates 18 rejections including
  `"user@buzz.example"`, `"[::1]"`, `"buzz.example."` (trailing dot rejected on
  the *input* side), and a 64-char label.
- **`relay_url_authority`** — extracts the authority from a relay URL *"in the same
  normalized shape as request `Host` headers"*, preserving an explicit non-default
  port and IPv6 brackets, **"both of which a naive `host_str()` drops."** Its test
  names the concrete bug it prevents: *"the admin lookup misses the community
  startup seeded."*
- **The IPv6 note** — the port-strip only touches an exact `:80`/`:443` suffix
  *"so IPv6 literals like `[::1]` (which contain colons but no trailing
  `:80`/`:443`) are left intact."*

**This is the batch's first pattern:** the fence is not one type, it is **a
provable invariant plus the small functions that make it hold at every real
boundary**, each documented with the concrete failure it prevents.

### 1.4 The migration lint — a structural rule enforced over the whole schema

The type fence is backed by a **schema lint** in
`crates/buzz-db/src/runtime/migration.rs`, and it is a genuine structural check,
not a sample test. Three of its tests define the rule:

- `migration_lint_detects_tables_missing_community_id_by_default` — a table that
  is "scoped" (i.e. not listed in `_operator_global_tables`) **must** have a
  `NOT NULL community_id`.
- `migration_lint_detects_scoped_key_constraints_not_led_by_community_id` — every
  scoped **PRIMARY KEY / UNIQUE / FOREIGN KEY** must be **led by `community_id`**.
- `migration_lint_accepts_scoped_key_constraints_led_by_community_id` — the
  positive case.

and two more run it **over the entire migration set**:

- `all_non_operator_global_tables_have_not_null_community_id` — *"every table not
  listed in `_operator_global_tables` must carry NOT NULL community_id."*
- `scoped_primary_key_unique_and_foreign_key_constraints_lead_with_community_id`.

**This is the load-bearing enforcement mechanism for the whole tenancy claim**, and
three details matter:

1. **There is an explicit, auditable escape hatch** — `_operator_global_tables`, a
   table whose rows are `(table_name, reason)`. To make a table global you must
   **insert a row naming the reason**, in the migration. The exemption is data with
   a justification column, not a comment.
2. **The constraint rule is scoped-key-led-by-community.** Every index and FK must
   *lead* with `community_id`, so a scoped lookup is a prefix seek **by
   construction** — you cannot write a query that reads across tenants without
   noticing the key shape. This is the schema-level analogue of §1.1's type fence.
3. **The linter is tested on synthetic SQL, including a negative fixture.** That is
   why `CREATE TABLE widgets` appears in the tree at all — it is the deliberate
   "table that fails the lint". (This is the same fixture that made batch 05's
   widget negative result *provable*.)
4. **Measured:** **62 migrations** (`0001_initial_schema.sql` …
   `0062_system_channel_type.sql`), **24 `DROP TABLE`/`DROP COLUMN`/`RENAME TO`
   statements** across them, and **zero `CREATE POLICY`** — there is **no
   Postgres RLS in the migrations**. Rule 1 applies: the tenancy enforcement is
   *application-level plus lint*, not *database-enforced by RLS*. That is a
   legitimate choice (RLS has its own operational costs) but it must be stated,
   because a reader who assumes RLS would over-trust the schema. buzz's own TLA+
   model actually *models an RLS-shaped defence* (`ReadForgotPredicateWithRLS`,
   mutation **M4**) *and* the application predicate, which is the honest way to
   cover both.

---

## 2. PZ — the formal models

### 2.1 `MultiTenantRelay.tla` — 1,142 lines, 13 mutations, several confirmed red

The model's header states what its obligation is, and it is **not** the naive one:

> The master proof obligation is NOT merely "no row with the wrong `community_id`
> is returned." The theorem contract is **non-interference** encoded as a
> label/taint invariant: every state element and every observation carries the
> community labels that influence it; **no value labeled outside a connection's
> resolved community may flow into that connection's typed observational
> interface.**

That is an information-flow property, and it is stronger than row-scoping. buzz
then applies the discipline that makes a formal model trustworthy — **it says what
it does not model**:

> **C1 carve-out (not modeled as a security theorem):** bandwidth-limited physical
> resource timing channels such as buffer cache, autovacuum, planner stats, hot
> partition tails, and connection-pool latency.

and then enumerates the channels it *does* model and close (**C2**): the
event-id existence oracle, the constraint/error surface, and projection rebuild.
**Every carve-out and every closed channel is named.** A model that lists its own
exclusions is a model a reviewer can audit.

**The 13 invariants** (all measured in `Safety`, lines 1129–1142):

| Invariant | What it states |
|---|---|
| `Inv_NonInterference` | `∀ o ∈ observations : o.labels ⊆ {o.community}` — the master property |
| `Inv_LabelPropagation` | labels are *derived*, not annotated: a `ResultRows` observation's labels equal its rows' labels |
| `Inv_ReadConfinement` | every returned row's community equals the observation's |
| `Inv_ResolutionFence` | persisted writes are labelled by the **resolved** community, never a client claim |
| `Inv_HostBindingFence` | every accepted write carries its host, and `HostCommunity[host] = w.community` |
| `Inv_ChannelCommunityImmutable` | a channel is stamped at most once; ownership rows agree |
| `Inv_AdmissionFence` | NIP-43 admission is scoped by `(community, actor)`, not relay-global |
| `Inv_AcceptedWritesPersist` | an accepted append stays in the log |
| `Inv_MessageKeyUnique` | ids are unique **within a community**, not globally |
| `Inv_NoTenantContextFailsClosed` | a missing tenant context serves **no rows** |
| `Inv_ProjectionDerived` | projections are derived-only |
| `Inv_SanitizedErrors` | the only client-visible error surface is a closed alphabet |
| `TypeOK` | the state is well-typed |

**The mutations are the real evidence, and they are unusually specific.** M1–M13
each name a *concrete regression*, and **six are labelled "Confirmed red" with the
trace length**:

- **M3** — *"WriteDuplicate conflict on id only … not (community,id) → cross-community
  suppression labels a B write result with A … **Confirmed red: Safety violated at
  depth 3** (see `GlobalConflictRows`)."*
- **M8** — an A-host operating on a B-channel *"→ an accepted write or recorded
  duplicate carries a host whose mapping ≠ its stamp. **Confirmed red:** … a 2-state
  trace (`Init -> WriteInsert`) for the insert path and a 3-state trace
  (`Init -> WriteInsert -> WriteDuplicate`) for the duplicate path. **(Trace length,
  not TLC's run-dependent "depth of complete graph search" line.)**"*
- **M9**, **M10**, **M11**, **M12**, **M13** — same treatment, each with the trace.

That parenthetical in M8 is worth dwelling on: the author distinguishes **trace
length** from **TLC's reported search depth**, because the latter is an artefact of
the model-checker's execution order and is *not* a stable property. Getting that
right requires having actually run TLC and noticed the number move. **This is a
model that was executed, not one that was written to look rigorous.**

**And the model guards against its own vacuity.** Six invariants are deliberately
**false** — `Probe_OpenAuthRegistration_Unreachable`, `Probe_CreatedChannel_Unreachable`,
`Probe_HostFeedRead_Unreachable`, `Probe_HostAuxRead_Unreachable` — with the
mechanism spelled out:

> These are intentionally false invariants: checking one ad hoc with `INVARIANT`
> (plus the normal constraints) must produce a short counterexample trace. **If it
> stays green, the corresponding action is unreachable and the safety proof is
> vacuous there.**

**A safety proof is only as good as the state space it covers**, and buzz
instrumented the coverage of its own proof. This is the single best idea in the
batch.

### 2.2 `MultiTenantAuth.spthy` — 748 lines, 21 lemmas, and honest drafting

The Tamarin model covers *symbolic* security: NIP-98 minting, stamped bearer-token
use, per-community signing keys, and independent per-community audit chains. It
opens by naming its own status:

> **Final theorem wording is expected to be tightened by the prose contract in
> `docs/multi-tenant-relay.md`. Until then these lemmas are the intended shape,
> not the final public statement.**

Measured: **8 security lemmas and 13 anti-vacuity lemmas** (21 total). The
security ones, grouped by the claim they support:

- **S1 — token confinement.** `token_confinement` (a token authorises only in its
  stamped community) and — the one that makes it meaningful —
  **`leaked_token_blast_radius_contained`**: the same confinement **holds even when
  `Leak_Token` gives the bearer token to the adversary.** Proving a property *under
  key compromise* is the difference between a security lemma and a tautology.
- **S1-host — the confused-deputy fence.** `channelless_use_confined_to_host_community`,
  `channelbearing_use_agrees_with_host`, `channelless_token_agrees_with_host`,
  `host_token_mismatch_not_authorized`. The comment names the *current* weakness
  this closes: *"Today the relay resolves a channel-bearing op's community from the
  `h` tag (the channel mapping) alone; this lemma proves that the host must **ALSO**
  agree, so an A-host presenting a B-channel-bearing request cannot authorize as B."*
- **S2 — mint integrity.** four lemmas that every minted token has exactly one
  stamp and every requested channel resolved to that stamp, plus
  `cross_community_mint_yields_no_token_for_that_request`.
- **S3 — system events.** acceptance requires the **same** community's key *or that
  key's compromise* — and, separately, **`other_community_key_compromise_does_not_authorize`**:
  compromising B's key does not authorise into A, *"because the signed preimage
  includes the community id."*
- **S5 — NIP-43 admission.** `nip43_admission_confined_to_signing_community` and its
  sibling `other_community_key_compromise_does_not_admit`, with the reason:
  *"B's key cannot mint an admission into A."*
- **S4 — audit.** `audit_append_advances_same_community_head` and
  `cross_community_audit_splice_attempt_is_not_append`.

**Three techniques are worth naming** (rule 6):

1. **Mutation hooks are *in* the model.** The docblocks refer to
   `MUTATION_Use_Token_ChannelLess_Ignore_Host` and `MUTATION_Use_Token_Ignore_Host`
   — *"enabling … falsifies this fast."* The model ships the switches that break it,
   so a reviewer can watch the lemma go red rather than take its word.
2. **Single-fact lemma design, with the reason stated.** Two lemmas are explicitly
   shaped to read **one** action fact: *"A single-fact assertion means a
   counterexample is one rule instance, not a multi-fact join or adversary
   reconstruction."* The lemma's *shape* is an engineering decision to make
   falsification cheap, and it is documented.
3. **"Host wins over the token's stamp"** — stated as the tie-break rule, with the
   note that the **proof is what forced the rule**: *"In the real rule both are
   `comm` (host wins), so the confinement lemma is [satisfiable]."*

**Matching the model to the code.** The `.tla` grounds itself in named source:
*"`crates/buzz-db/src/event.rs`: `EventQuery` has `channel_id`/`channel_ids` but
**no `community_id`**; inserts use `ON CONFLICT DO NOTHING`"* and
*"`crates/buzz-db/src/channel.rs`: `get_accessible_channel_ids` currently unions
**all** open channels in the DB; **that unscoped variant is the explicit I1
mutation.**"* The model points at the exact current code that motivates it.

### 2.3 ★ `docs/multi-tenant-relay.md` — the prose contract, 1,110 lines

The `.spthy` header defers its "final theorem wording" to *"the prose contract in
`docs/multi-tenant-relay.md`."* That contract exists: **`docs/multi-tenant-relay.md`,
1,110 lines / 74,264 B, status `draft`.** It is the single most important document in
this batch, because it is the **prose layer that binds the two mechanized models to
each other, to the deployment, and to named code seams** — and it is the artefact
that makes buzz's PZ content a *system* rather than four files of formalism. Its
structure, in order: Abstract · **Scope and Non-Goals** · System Model · Isolation
Boundary (with a *typed observational interface* and *label-propagation rules*) ·
**Axioms** · **Safety Theorems** · **Conformance** · Prior Art · Mechanized
Verification · **Implementation Correspondence** · Summary.

Four things in it are worth carrying forward (rule 6 names them):

**1. The Non-Goals section names five things it does *not* prove, and the naming is
the claim.** It proves safety, not liveness/performance (empirical, *"characterized
by the perf rig, not by theorem"*); not Postgres internals (RLS, MVCC, `ON CONFLICT`
are *trusted and stated as axioms* — *"We prove our composition on top of them; we
do not reprove them"*); not the crypto primitives (Schnorr/BIP-340, NIP-98 binding,
second-preimage resistance are *"the Tamarin model's equational theory, not
reproven"*); not physical-resource isolation (communities share *"an id space, time
partitions, a connection pool, and a CPU"* — a named C1 carve-out); and not
**above-the-interface client leakage** (a leaked `nevent`, screenshot, or log can
hand a user an out-of-band id from community A — and the doc still walks the
consequence: *"the composite-index closure (A-RLS-5) means the probe still reveals
nothing"*, then states the residual plainly: closing it *"for any weaker index shape
is above the interface and is the client's obligation, not the relay's"*). The
paragraph closes with the sentence that should be the workshop's own standard:

> **Stating this boundary is part of the claim. "Provably isolated" without naming
> the trust boundary does not survive scrutiny; "isolation is machine-checkable
> relative to these stated axioms, with every shared logical channel either closed
> in-model or closed by a named axiom" does.**

**2. Every axiom is a *testable assumption admitted per deployment*, not a piece of
prose.** The **Axioms** section lists ten, and the load-bearing ones are labelled:

- **A-RLS-1..5** — the SQL-level backstop: RLS enabled with a restrictive policy on
  every tenant-bearing table (1); the request role is non-superuser, `NOBYPASSRLS`,
  non-owner-or-FORCE (2); `app.community_id` is set transaction-locally via
  `SET LOCAL` before any query (3); no `SECURITY DEFINER`/`leakproof` function in the
  request path reads tenant tables without re-establishing context (4); and —
  the closure that makes the existence-oracle argument work — **uniqueness and FK
  constraints include `community_id`**, so a foreign id can never collide with a
  local one and reveal its existence (5).
- **P-APPEND** — append is `INSERT … ON CONFLICT (community_id, created_at, id) DO
  NOTHING` (idempotent, tenant-keyed).
- **P-SIG** — no one can forge a valid BIP-340 Schnorr signature.
- **P-RESOLVE** — `resolve : channel_id → community_id` is a total function over
  channels, read under the operation's own snapshot.
- **P-RESOLVE-HOST** — `resolve_host : host → community_id ∪ {⊥}`, the upstream
  mapping; an unmapped host binds to no community and the connection is rejected
  **fail-closed, never defaulted**.
- **A_HASH** — the event id is second-preimage resistant.
- **P3** — NIP-98 mint freshness (the one the *Conformance* section then tests
  against the deployment).

Then **§Conformance maps each axiom to a gate that must pass or the deployment is
rejected**: A-RLS-1..5 by a startup/CI assertion suite that *enumerates every
tenant-bearing table*; P-RESOLVE by the `channels.community_id NOT NULL` constraint
plus an immutability migration lint; P-SIG/A_HASH by *"using the audited libraries
the rest of Buzz uses"*; and P3 by the NIP-98 seen-set, with **two structural gates
stated as conformance checks precisely because *"the implementation is silent if
either is violated"*** — a capacity-vs-rate inequality
(`capacity ≥ peak NIP-98 RPS × 120 s`) and the per-pod scope. **An axiom that cannot
be checked is not an axiom here; it is a wish, and the doc does not have any.**

**3. The Implementation Correspondence section is where the abstraction is paid
for.** It maps model obligations to *named code seams* with line numbers — and, more
importantly, **flags the ones that are invisible to both proofs**:

> *"it is invisible to both the labeling invariant and the Tamarin lemmas (the
> proofs would silently weaken, not fail), so it is enforced by a migration lint."*

That sentence is the batch's intellectual centre (and the same idea as F6-13): some
obligations **do not go red when you break them** — the proof just proves less, and
you never find out. The doc names exactly which ones (the composite index; the
immutability of `channels.community_id`; the `RelayInfo::build` signature) and moves
each to a **lint that fails the build** instead of a theorem that silently narrows.
It also enumerates the shared logical channels the move to a row-level boundary
creates and closes each by name: NIP-11 identity, Git Smart HTTP namespaces, Blossom
media descriptors, Redis pub/sub **keys** (`buzz:{community}:channel:{channel_id}`
— the current unprefixed keys are *"admissible only for the degenerate
single-community deployment or physically isolated Redis"*), the Postgres FTS index
(*"shared infrastructure, not a shared result space"*), workflow trigger evaluation,
and relay membership (`(community_id, pubkey)` — mechanized, not asserted, via
`admittedMembers`/`IsAdmitted` and mutation M9).

**4. The Subscription-pipeline abstraction is the honest half of the "coarser, not
wrong" admission.** The mechanized models represent the `REQ → register → match →
fan-out → access-filter → EVENT/EOSE` pipeline as synchronous `Read*` actions with
*"no `sub_id`, no `Register`, no `Match`, no `FanOut`, no `EOSE`, no filter state."*
The doc says the refinement from aggregate to per-sub-stream is *"coarser than the
interface, not wrong"* — **and then does not leave it there.** It states a
**governing rule**: *"Every observation kind enumerated in §The typed observational
interface must either (i) be discharged by a TLA+ invariant or Tamarin lemma, or
(ii) appear by name in this subsection with a code-fence and a closure
obligation. New observation kinds … require a new entry here in the same commit."*
It then discharges the three it names — **EOSE cardinality** (count equals the
filtered, scope-resolved set), **EOSE → late-EVENT temporal pairing** (the closure
being the visibility short-circuit at `event.rs:91-96`, *"a transient DB error during
the late-EVENT window returns an empty fan-out for the whole event, not a relaxed
predicate"*), and **`sub_id` reuse/collisions** (per-connection namespace, proven
from `SubRegistry.subs` being keyed `entry(conn_id)…`). The doc even names what the
rule *caught*: *"This rule is what surfaced F1 (A_HASH closure mis-attribution) and
F2 (the subscription-pipeline abstraction itself)."*

**Verdict on this document (rule 1 applied to a doc that talks about itself).** It is
an unusually honest artefact — it names its trust boundary, its five non-goals, the
obligations invisible to its own proofs, and the one abstraction it does not
mechanize. Its weakness is the ordinary one: **it is a snapshot, and the code moves**
— see **D6-1**, where its P3/deployment status is now behind the shipped code. Read
it as *the design contract of the multi-tenant move*, not as the current state of
`main`; the invariants it names are still the right invariants, but its *status*
sentences have aged.

---

## 3. PZ — the runtime conformance harness

### 3.1 The north star

`crates/buzz-conformance` exists to answer one question, stated at the top of
`TRACE_SCHEMA.md`:

> Don't ask "did the model pass." Ask **"did the running code emit a trace the
> model accepts."**

The mechanism: the relay emits one `TraceStep` per decision at the
**ingest/auth/read seam**; the checker replays the trace against a **Rust
re-implementation of the spec's `Next` relation** — and, stated explicitly,
**"it does not call any production reducer."** The checker is independent of the
code it checks.

**Measured structure:**

| Piece | Lines | What it is |
|---|---:|---|
| `src/lib.rs` | — | `SCHEMA_VERSION = 1`, the `TraceAction` enum, the `Tracer` trait |
| `src/transitions.rs` | — | the spec's `Next`, re-implemented (`check_step`, `bootstrap`) |
| `src/checker.rs` | — | the replay engine + **9 unit tests** |
| `tests/proptest_checker.rs` | 431 | property tests |
| `tests/replay_fixtures.rs` | 324 | **5 tests** over committed JSONL traces |
| `crates/buzz-relay/src/conformance/mod.rs` | 784 | the emitter + `EmitGuard` + **2 self-tests** |
| `crates/buzz-relay/src/conformance/tracers.rs` | 79 | `NoopTracer` (prod default) / `JsonlTracer` |

### 3.2 ★ The three projection rules, and why each is load-bearing

`TRACE_SCHEMA.md` devotes a section to "Three projection rules that are
load-bearing" — *"the places a buggy relay could emit an in-spec trace if you
normalized away the violation."* This is the design pattern to steal:

1. **`claimed_community` is recorded separately from `resolved_community`.** *"If
   they ever disagree, the spec says 'resolved wins'; the trace must show both so
   M2 (claimed-driven auth) can bite."* **If you project away the claim, you
   cannot detect claim-driven authorisation.**
2. **`row_communities` is a `Vec`, not a `Set`, and is not filtered to the resolved
   tenant.** *"If two rows in the result set belong to different communities, the
   checker must see both labels — otherwise it cannot fail closed on
   `Inv_ReadConfinement`."* **A `Set` would silently dedupe the leak; filtering
   would delete the evidence.** The projection is shaped so the *violation survives
   projection*.
3. **`SanitizedReason` is a closed alphabet.** *"A fourth variant is a CI failure,
   not a silent bucket."*

**And the projection deliberately discloses nothing new.** The `state` block
carries a **16-hex prefix of the authed pubkey**, with the justification: *"The
`actor` prefix is a *hash already* from the client's POV (Schnorr X-only) — so the
prefix discloses nothing the relay's existing logs don't already. This avoids
dragging a hash dep into observability code."* The read projection records *"the
server-resolved community UUID"* and explicitly **not** *"client-claimed `h` tag,
event id, payload"* — a table that states both what each field carries and what it
does not.

### 3.3 `EmitGuard` — a `Drop` guard that turns a silent omission into a failure

The mechanism is small and elegant (measured, `mod.rs`):

```rust
pub struct EmitGuard { inner: Arc<dyn Tracer>, state: AbstractState,
                       counter: Arc<AtomicUsize>, kind: &'static str }

impl Drop for EmitGuard {
    fn drop(&mut self) {
        if self.counter.load(Relaxed) == 0 {
            self.inner.record(TraceStep::new(
                TraceAction::ImplBug { kind: self.kind.to_string() },
                self.state.clone()));
        }
    }
}
```

A `CountingTracer` wrapper bumps a counter on every emit; **if the seam exits with
zero emits, `Drop` records an `ImplBug`, which the checker treats as a
`CoverageBreach` and fails closed.** The docblock states the property: *"an entry to
a critical seam that doesn't emit *any* action records `ImplBug`, which fails
closed."*

**The subtle part is the `enabled()` delegation**, and the comment says why:

```rust
/// Delegate, never inherit the `true` default. This wrapper is transparent:
/// whether emits are observed is a property of the tracer underneath it.
/// Returning `true` over a `NoopTracer` would reintroduce the overhead the gate
/// exists to remove; returning `false` over a real tracer would suppress the
/// emits whose absence the `EmitGuard` reports as a coverage breach.
fn enabled(&self) -> bool { self.inner.enabled() }
```

**A transparent wrapper that must not inherit a default, with both wrong answers
named.** This is the same class of care as batch 05's `CountingTracer`-adjacent
reasoning and n8n's pinned constants.

### 3.4 ★★ `LIMITS.md` — the harness documenting what it does not catch

This is the single most valuable document in the batch, and it is the reason to
trust everything else. Its opening:

> The runtime conformance harness is **not a proof.** It says only this: *for the
> executions that actually ran with tracing on*, the relay's ingest/read decisions
> matched a trace the spec accepts. **Coverage is exactly the set of code paths
> exercised — no more, no less.** This file says what the gate **doesn't** catch,
> so reviewers and operators don't read more into a green run than is there.

Then it enumerates seven blind spots, in each case naming the owner:

| Blind spot | Stated reason |
|---|---|
| **DB-layer leaks the projection doesn't read** | how the emitter computes `row_community` *"is the design question for the held-back `req.rs` patch — the honest options are per-row channel→community lookup, or recording the resolved community uniformly (**which makes the gate decorative for read confinement**)."* |
| **Cross-pod leaks** | *"The harness traces one process … Cross-pod attacks are Sami's adversarial lane, not the conformance gate's."* |
| **Time-bounded properties** | *"The spec is untimed; the gate is untimed."* |
| **Pubsub fan-out** | *"Fan-out is **not** a spec action"* — a leak *"shows up in the receiver's ingest/read trace, not the publisher's."* |
| **Type-level fence violations** | *"`CommunityId` having no `From<Uuid>` is enforced by the Rust compiler, not by this gate. If somebody adds `From<Uuid>` for `CommunityId`, the production fence is broken and **this gate won't say so**."* |
| **Spec bugs** | *"The checker re-implements the spec; if the spec is wrong, both pass. Spec correctness is the proof obligation of `MultiTenantRelay.tla`, machine-checked by TLC."* |
| **Coverage can only fire on armed paths** | *"If a new endpoint is added that bypasses `EmitGuard::arm`, the gate is blind."* |

**And the biggest admission is at the top: half the gate is not armed.**

> the read-seam half of the gate is **not yet armed** … The integration replay
> (live relay → `JsonlTracer` → `check_trace`) lands with the read-seam patch onto
> Max's `req.rs` work.

`TRACE_SCHEMA.md` corroborates it in the emitter table: *"`handlers/req.rs` —
**held back** — additive patch for integration onto Max's `req.rs` work."*

**Rule 1 and rule 6 together:** the capability is *a write-path conformance gate
with a designed read-path extension that has not landed.* A lesser document would
have shipped the gate silently. buzz **names the missing half, names the owner, and
names the design question that must be answered before it lands.** It even names
the wrong answer (*"which makes the gate decorative"*).

**The self-test discipline is equally careful.** `LIMITS.md` states the CI
contract as **three surfaces totalling 16 tests**, with the mutate-bite *proven* —
*"mutate-bite proven for the NI, `IllegalTransition`, and `CoverageBreach`
gates"* — and the checker's own test list (measured) includes
`empty_trace_is_coverage_breach`, `cross_community_row_bites_non_interference`,
`auth_allow_with_foreign_claim_bites_m2`,
`state_after_changing_mid_request_is_state_mismatch`, and
`required_critical_action_missing_bites_coverage_breach`. **Every assertion that
the gate *bites* has a test that makes it bite.**

And the honest operational note: *"`Tracer = NoopTracer` (the production default)
makes every emit and guard arm a no-op call … The gate is **observation only** —
it does not feed back into the decision. Turning it off only loses observability."*
**A safety mechanism that cannot change behaviour cannot break production** — which
is exactly why it is safe to ship on by default in CI and off by default in prod.

---

## 4. PZ — the audit chain, and a hash-versioning lesson

`crates/buzz-audit` is 1,276 lines. The chain model is stated in `entry.rs`:

> Rows are keyed `(community_id, seq)`: `seq` is monotonic *within one community*,
> and `prev_hash` chains to the previous entry *of the same community*. **The chain
> is independent per tenant.**

So there is **no single global audit log** — each community has its own chain, and
`community_id` **leads the hash preimage** (`append_tlv(&mut encoded, 1,
entry.community_id.as_bytes())`). `hash.rs` has a test asserting exactly the
property this buys: `community_id_is_part_of_identity` — *"the same logical entry in
two communities hashes differently, so a row can't be replayed across chains."*

### 4.1 The versioned encoding, and the bug v1 had

`CURRENT_HASH_VERSION = 2`, and **v1 is retained for historical rows**. The comment
on v1's function is a candid bug report:

> `// Preserve historical digests. This encoding retains its original ambiguity;`
> `// only the version 2 writer prevents bytes from moving between fields.`

Two tests **prove the ambiguity was real**, by exhibiting two *different* entries
that v1 hashed identically:

- `object_id_and_detail_have_distinct_boundaries` — in v1, `object_id="record1"` +
  `detail=23` and `object_id="record12"` + `detail=3` **both concatenate to
  `"record123"`**. *"The old encoding concatenated both pairs as `"record123"`."*
- `actor_and_object_id_have_distinct_boundaries` — *"Moving the old presence byte
  into the object ID preserved its hash."*

v2 fixes it with **TLV** (tag + big-endian u64 length + value) — *"Version 2 uses
one-byte tags and big-endian u64 byte lengths … absent optional fields are omitted,
while present empty values retain their tag and zero length."* A third test,
`omitted_fields_are_distinct_from_empty_values`, asserts the distinction v1 could
not make.

**Rule 10, the retirement rule, lands cleanly here**: v1 is **not deleted** — it is
*retained and labelled as ambiguous*, because the historical digests depend on it.
`encoding_versions_have_stable_digests` pins **both** digests as hex constants and
asserts an unknown version is a typed error
(`Err(AuditError::UnsupportedHashVersion { version: 99 })`). **Retrofitting a
hash format without invalidating history is exactly the shape rule 10 asks for.**

### 4.2 The timestamp trap, found and closed at the enforcement point

The best single piece of engineering in the crate is `to_storage_precision`, and its
docblock names the failure precisely:

> `audit_log.created_at` is `TIMESTAMPTZ`, which Postgres keeps at **microsecond**
> resolution. `compute_hash` covers `created_at.to_rfc3339()`, and **that string's
> sub-second digit count follows the value** (chrono emits 0, 3, 6 or 9 digits), so
> a timestamp carrying nanoseconds hashes to a digest that **can never be recomputed
> from the stored row** — the entry is written with one preimage and verified
> against another. **Every `created_at` must therefore pass through here *before* it
> is hashed and stored, so the in-memory entry and the row are byte-identical.**

The test `rfc3339_sub_second_width_follows_the_value` pins the *preimage*, not the
digest, and says why: *"...which is what made every entry fail `verify_chain` with
`HashMismatch`."* And — the discriminating detail — the fix is applied **inside
`compute_hash` itself** (`compute_hash_normalizes_sub_microsecond_timestamps`:
*"even handed an untruncated `created_at`, `compute_hash` digests the
storage-precision value, so a write path that forgot to truncate cannot split the
write/read preimage"*). **The normalization is at the enforcement point, not at the
call site**, so a future caller cannot forget it.

`canonical_json` is the second piece: sorted keys, deterministic output, and an
explicit refusal to swallow errors — *"a hash must never silently stand in an empty
value for a real payload."* That is Review-Proven Rule 1 (from batch 05's
`AGENTS.md`) applied inside a hash function: **never collapse a failure into a
plausible-looking success.**

---

## 5. PZ — the security perimeter

### 5.1 ★ The egress guard — 13 boundaries and a self-proving inventory

`desktop/src-tauri/src/egress_guard.rs` is **63 lines of implementation** and
protects a single rule: **the local NIP-49 key backup (`ncryptsec1…`) must never be
transmitted to a relay.** Its docblock opens with a **13-row table**, each row
naming a boundary and its file:

> | 1 | `submit_signed_event_at_with_keys` (funnel for `submit_event*`) | `relay/submit.rs` |
> | 2 | `sync_managed_agent_profile` | `relay.rs` |
> … | 13 | `fetch_feedback_attachment` (attachment URL, before signing) | `commands/admin/attachment.rs` |

The guard itself is 12 lines: reject if the text contains `ncryptsec1` **or its
all-uppercase form** `NCRYPTSEC1`. The uppercase handling is justified: *"Bech32 also
permits an ALL-UPPERCASE encoding of the same payload (BIP-173); an uppercased valid
backup decodes identically … Mixed case is invalid bech32 and cannot decode — a
substring matching either all-lower or all-upper prefix covers every decodable
form."*

**Scope is stated with its own exception:** *"Scope: `ncryptsec1` only. The raw
`nsec` intentionally transits the NIP-44-encrypted pairing session … guarding it
here would break pairing. **Raw-key DLP is separate policy work.**"* The guard's
boundary is explicit, and the unguarded case is named as owned elsewhere.

**The reason this is a top-tier finding is the test file — 510 lines, and it is not
a unit test suite.** It has three layers:

1. **Unit behaviour** (5 tests) — including `passes_clean_payloads_including_raw_nsec`,
   which asserts the raw `nsec` is **not** blocked (so the scope is pinned in both
   directions), and `byte_variant_matches_text_variant`, which passes invalid UTF-8
   *around* an intact `ncryptsec` and asserts the guard still trips.
2. **Runtime injection per boundary** — each test *"drives the real production
   function with an ncryptsec-bearing payload and asserts the guard aborts the
   operation **before any network I/O** (no listener exists at the target address; a
   distinctive guard error — not a connection error — proves the abort happened
   first)."* They point at `http://127.0.0.1:9` (*"discard port — must never be
   reached"*). **The seam is the production function, not a helper** — batch 05's
   Review-Proven Rule 3, made executable.
3. **★★ The structural tripwire** — `EVENTS_INVENTORY`, a table of
   `(file suffix, expected non-comment /events occurrences, expected guard-call
   sites)` scanned over all of `src-tauri/src`, with the design stated:

   > Every entry pairs the URL-construction count with the guard-call count for that
   > file, so **BOTH** of these fail the scan (not just a brand-new file):
   > - adding an unguarded ninth `/events` site inside an already-listed file, and
   > - removing/refactoring away a guard call while its egress site remains.

   **And the tripwire proves itself with three mutation-style tests:**
   `inventory_scan_catches_new_site_in_allowlisted_file`,
   `inventory_scan_catches_removed_guard_call`, and
   `inventory_scan_catches_new_unlisted_file`. The first *injects* a new
   `/events` site into `relay.rs` in memory and asserts the scan catches it.

   The needles are **assembled at runtime** — `fn events_needle() -> String {
   ["/ev", "ents"].concat() }` — with the reason: *"so this scan file itself
   contains no contiguous match and needs no self-referential inventory row."*
   **The scanner cannot match itself**, which is the bug every hand-rolled scanner
   has.

   And a second allowlist test, `ncryptsec_handling_is_confined_to_allowlisted_files`,
   asserts that `ncryptsec` / `EncryptedSecretKey` / `nip49` appear **only** in 20
   named files. A new file touching NIP-49 material fails the build.

**Rule 6 — the capability is four things at once:** a fail-closed runtime check, a
complete inventory of the boundaries it covers, a source scan that fails when a new
boundary appears unguarded, and a **mutation test proving the source scan fires.**
That last one is what separates a guard from a gesture — the same discipline as
`LIMITS.md`'s *"mutate-bite proven"*.

### 5.2 The auth crate: replay, rate limits, and the drafts

Measured: `buzz-auth` is **23 files / 12,908 lines**, covering NIP-42, NIP-98,
**NIP-fi** (a 15-file identity-federation subsystem with its own JWKS, verifier, and
startup modules), replay protection, and rate limiting. Three items matter here:

- **NIP-98 replay protection** (`nip98_replay.rs`, 249 lines) states the shape and
  the arithmetic: *"shared state (Redis), atomic set-if-absent, TTL ≥ 120s"*, keyed
  community-scoped, because *"with multiple relay pods … an in-process cache (moka,
  DashMap) does not carry the freshness proof across pods, so replay protection is a
  §5 hard gate."* The **order** is specified and justified: *"Verify first, then
  mark. Burning a seen-set slot on a forgery would let an attacker who knows a
  future event id of a victim DoS the legitimate event."* And the TTL derives from
  the clock-skew tolerance: *"±60s, so the window over which a duplicate event id is
  even plausible is 2×60 = 120s."* **A number derived from another number, with the
  derivation shown** — that is the batch-04 discipline again.
- **Rate limiting** states its own algorithmic limitation **in the module doc, with
  a warning glyph**: *"⚠️ Fixed windows allow up to **2× burst at boundaries**.
  Upgrade to sliding window or token bucket for strict limiting."* A known weakness,
  documented at the top of the file that has it.
- **`nip_fi/deny_map.rs` and `denial.rs`** exist as separate modules, which suggests
  a deny-by-default posture, but **I did not read them in this batch** — recorded as
  unread, not as claimed (rule 1).

### 5.3 What the perimeter does *not* have

Stated plainly, because a security section without negatives is marketing:

- **No Postgres RLS** (measured: zero `CREATE POLICY` in 62 migrations). Tenancy is
  application + lint enforced (§1.4).
- **The egress guard covers `ncryptsec` only**, by design; raw-key DLP is *"separate
  policy work"* per its own docblock.
- **Cross-pod leaks are explicitly out of the conformance gate's scope** (§3.4).
- **The read-seam half of the conformance gate is not armed** (§3.4).

---

## 6. PZ — the retirement surface and the rename hazard

### 6.1 ★ The rename, documented as PRs

Batch 00 recorded the hazard: **the product renames itself in-tree — buzz · sprout ·
sprig.** The CHANGELOG (2,567 lines, 103 version headings) shows it was a **real
retirement, executed over many PRs.** Measured entries, in CHANGELOG order:

- `refactor: rename sprout backend to buzz (#958)`
- `fix(release): update repository name check from block/sprout to block/buzz (#1012)`
- `fix(cli): publish ephemeral events over WebSocket via sprout-ws-client (#876)`
- `feat(sprout-dev-mcp): add read_file tool … (#928)`
- `docs: fix stale sprout repo references in RELEASING.md (#1043)`
- `docs: update sprout repository references and document buzz mem (#1333)`
- `sprout-agent: make Databricks defaults env-only (#868)`

**The residue that never got renamed** (measured, still present in v0.5.28):

- `Cargo.toml` `[workspace.package]` — **`repository = "https://github.com/block/sprout"`**.
  The *product* is buzz; the *workspace metadata* still points at the sprout URL.
  Confirmed as a live inconsistency, not a historical artefact.
- `AGENTS.md` — **`squareup/sprout-oss`** and **`squareup/sprout-backend-blox`**
  appear in the repo-topology table and its ASCII diagram, with the pipeline
  `buzz → sprout-oss (relay Docker image → ECR)`.
- **`crates/sprig/`** — a real, listed workspace member.
- `scripts/build-sprig.sh`, `scripts/sprig-entrypoint.sh`.

**Rule 10 verdict:** three names, one product, and the rename is **documented in the
CHANGELOG as a sequence of scoped PRs rather than as a single sweep** — which is the
*right* way to do it (small, reviewable, each step shippable) and is also *why a
residue survives*. `sprout` in the workspace metadata and `sprig` as a crate name
are the two that will mislead a future reader. **Names are an unusually active
retirement surface here**, and the CHANGELOG is the audit trail.

### 6.2 `sprig` — a busybox-style argv[0] multiplexer

This is a small, genuinely interesting discovery. `crates/sprig/src/main.rs`
dispatches on **the basename of `argv[0]`**:

```rust
let cmd = Path::new(&argv0).file_name()...to_ascii_lowercase();
match cmd.as_str() {
    "buzz-acp" | "git-credential-nostr" | "git-sign-nostr" => buzz_acp::run(),
    "buzz-agent" => buzz_agent::run(),
    "sprig" => match args.nth(1) {
        Some("-V") | Some("--version") => println!("sprig {}", CARGO_PKG_VERSION),
        Some("-h") | Some("--help") | None => { print_usage();
            Err("error: invoke Sprig via a personality symlink".into()) }
        ...
```

**One binary, several personalities installed as symlinks** — the busybox pattern.
The error message names the mechanism directly: *"invoke Sprig via a personality
symlink."* Measured consumers: `scripts/build-sprig.sh`, `scripts/sprig-entrypoint.sh`,
and the k8s backend crate's image/config modules.

**Why it belongs in PZ:** it is a *packaging* decision that changes how the
deployment model works (one container image, many command names) and that depends
on `argv[0]` surviving the container entrypoint. It is the kind of thing the pole
frame has no slot for, and it is exactly the kind of thing that silently breaks when
a process manager invokes a binary by absolute path.

### 6.3 The deployment surface

Measured: `buzz-backend-kubernetes` is **6,429 lines** across a clean module split —
`cluster.rs`, `config.rs`, `image.rs`, `intent.rs`, `observe.rs`, `pod.rs`,
`reconcile.rs`, `wire.rs` — plus `tests/wire_fixtures.rs`. The presence of **both**
`intent.rs` and `observe.rs` and a `reconcile.rs` says the shape is **declarative
reconciliation** (desired state → observed state → reconcile) rather than imperative
orchestration, and `wire_fixtures.rs` pins the HTTP wire format to fixtures.

`desktop/src-tauri/src/commands/canvas.rs` (batch 05) *"needs relay-side
linearization (phase 2)"* and `nip98_replay.rs`'s multi-pod requirement (§5.2) are
the two places where the **multi-pod** deployment model changes a correctness
argument. Both are named in-tree. **Recorded but not pursued in this batch** — the
deployment story is a batch of its own and the pole frame does not ask for it.

---

## 7. Findings (F6-n)

**F6-1.** **`CommunityId` is an opaque newtype with no `Default`, no `Deserialize`,
and no `From<Uuid>`** — the provenance invariant made type-visible, and `NewAuditEntry`
is deliberately non-deserializable so *"there is no path by which a client-supplied
blob becomes a `CommunityId`."*

**F6-2.** ★ **The fence documents its own limit.** *"This is a **lint-and-review
fence, not a compiler fence** … the type only removes the *accidental* path … We say
this plainly rather than overclaim a guarantee the `pub` API doesn't give."* Three
mechanisms, three scopes, stated in the same file.

**F6-3.** **Host normalization is one shared function** with a stated consequence
(*"they can never split into distinct tenants"*), plus `validate_community_host` and
`relay_url_authority` closing the input and URL sides — the latter keeping the port
and IPv6 brackets *"both of which a naive `host_str()` drops."*

**F6-4.** ★★ **The migration lint is the load-bearing tenancy enforcement**: every
scoped table must have `NOT NULL community_id`, and every scoped PK/UNIQUE/FK must
**lead with `community_id`**. The escape hatch is a table of exemptions **with a
`reason` column**. Measured over all **62 migrations**.

**F6-5.** **There is no Postgres RLS** (zero `CREATE POLICY` in 62 migrations) —
tenancy is application + lint enforced. The TLA+ model nonetheless covers **both**
the RLS-shaped and the application-predicate defence (mutation M4 vs M1).

**F6-6.** ★ **`MultiTenantRelay.tla` — 1,142 lines, 12 safety invariants, 13 named
mutations, 6 "Confirmed red" with trace lengths.** The obligation is
**non-interference via a label/taint invariant**, not row-scoping. It states a
**C1 carve-out** for timing channels, and its M8 note distinguishes **trace length**
from TLC's *"run-dependent 'depth of complete graph search'"* line — evidence it was
actually run.

**F6-7.** ★★ **The TLA+ model guards against its own vacuity** with four
deliberately-false `Probe_*_Unreachable` invariants: *"If it stays green, the
corresponding action is unreachable and the safety proof is vacuous there."*
**Instrumenting proof coverage is the best idea in the batch.**

**F6-8.** **`MultiTenantAuth.spthy` — 748 lines, 8 security lemmas + 13 anti-vacuity
lemmas**, and it **drafts honestly**: *"these lemmas are the intended shape, not the
final public statement."* Its strongest lemma is
**`leaked_token_blast_radius_contained`** — confinement *held under adversary key
compromise*. Mutation switches (`MUTATION_Use_Token_Ignore_Host`) ship **in the
model**, and the S1-host lemmas close *"the confused-deputy fence"* the current
`h`-tag-only resolution leaves open.

**F6-9.** ★★ **The runtime conformance gate is independent of the code it checks** —
*"it does not call any production reducer"* — and its north star reframes the
question: *"Don't ask 'did the model pass'. Ask 'did the running code emit a trace
the model accepts'."*

**F6-10.** **Three projection rules make the violation survive projection**:
`claimed_community` recorded separately from `resolved_community`;
`row_communities` a **`Vec` not a `Set`** and unfiltered (*"a `Set` would dedupe the
leak; filtering would delete the evidence"*); and `SanitizedReason` a **closed
alphabet** (*"a fourth variant is a CI failure, not a silent bucket"*).

**F6-11.** **`EmitGuard` turns a silent omission into a `CoverageBreach`** via a
`Drop` guard, and its `enabled()` delegating comment names **both** wrong answers
(*"returning `true` over a `NoopTracer` would reintroduce the overhead … returning
`false` over a real tracer would suppress the emits whose absence the guard
reports"*).

**F6-12.** ★★★ **`LIMITS.md` documents seven blind spots, each with an owner, and
declares that the read-seam half of the gate is "not yet armed."** It names the
design question (*"per-row channel→community lookup, or recording the resolved
community uniformly — **which makes the gate decorative for read confinement**"*)
and the owner (*"Eva's review call"*). **A gate that ships its own limits is a gate
you can trust.**

**F6-13.** **The gate is observation-only and cannot change behaviour** (*"it does
not feed back into the decision … turning it off only loses observability"*) — which
is *why* it is safe to arm in CI and leave `NoopTracer` in production.

**F6-14.** **The audit chain is per-community**, keyed `(community_id, seq)`, and
`community_id` leads the hash preimage with a test asserting the same entry in two
communities hashes differently (*"a row can't be replayed across chains"*).
**Rule 10 is honoured exactly**: v1 is **retained, not deleted**, labelled *"this
encoding retains its original ambiguity"*, with **both** digests pinned as hex
constants and an unknown version a typed error.

**F6-15.** ★ **Two tests prove the v1 encoding was genuinely ambiguous**:
`object_id="record1"`+`detail=23` and `object_id="record12"`+`detail=3` both
concatenated to `"record123"`. v2 fixes it with TLV (tag + big-endian u64 length).

**F6-16.** ★ **The RFC-3339 sub-second-width trap was found and closed at the
enforcement point.** chrono emits 0/3/6/9 fractional digits *depending on the value*,
so a nanosecond timestamp and its microsecond truncation are different strings —
*"which is what made every entry fail `verify_chain` with `HashMismatch`."* The fix
lives **inside `compute_hash`**, not at the call site. `canonical_json` refuses to
substitute a placeholder: *"a hash must never silently stand in an empty value for a
real payload."*

**F6-17.** ★★ **The egress guard covers 13 named boundaries with a source-scanning
inventory** that pins **both** the `/events`-site count **and** the guard-call count
per file, so it catches a **new site in a listed file** *and* **a removed guard
call** — and it **proves itself** with three mutation-style tests. Its needles are
assembled at runtime so *"this scan file itself contains no contiguous match."*

**F6-18.** **The egress guard's scope is stated with its exception** (*"raw `nsec`
intentionally transits the NIP-44-encrypted pairing session … Raw-key DLP is
separate policy work"*) and pinned in both directions by a test asserting the raw
`nsec` is **not** blocked.

**F6-19.** **Every boundary injection test drives the real production function**
against a discard port (*"must never be reached"*) and argues the abort happened
first because the error is the guard's, not a connection error. **Review-Proven Rule
3 (bind the production seam, be falsifiable) made executable.**

**F6-20.** **NIP-98 replay protection is a cross-pod hard gate** with the derivation
shown: TTL ≥ **120 s** because the clock-skew tolerance is **±60 s**, and the order
is *"verify first, then mark"* so a forgery cannot burn a seen-set slot and DoS the
legitimate event.

**F6-21.** **Rate limiting states its own weakness in its module doc, with a
warning glyph**: fixed windows allow up to **2× burst at boundaries**.

**F6-22.** ★ **The rename is a documented retirement** — `sprout → buzz` executed as
scoped PRs (#958, #1012, #1043, #1333), with **residue that never got renamed**:
`Cargo.toml`'s `repository = "…/block/sprout"`, `squareup/sprout-oss` in `AGENTS.md`,
and **`crates/sprig/`**. Three names, one product.

**F6-23.** **`sprig` is a busybox-style `argv[0]` multiplexer** — one binary,
several personalities installed as symlinks, dispatching on the basename of
`argv[0]`, with the mechanism named in its own error message (*"invoke Sprig via a
personality symlink"*).

**F6-24.** **Four formal models (~122 KB) ship in a product repo** —
`MultiTenantRelay.tla` (61,202 B), `MultiTenantAuth.spthy` (31,956 B),
`GitOnObjectStore.tla` (13,872 B), `NIP-AB.spthy` (15,147 B) — **with their TLC
runner configs including concrete `CONSTANTS`.** Unique in this study.

**F6-25.** **The k8s backend is 6,429 lines as declarative reconciliation**
(`intent.rs` + `observe.rs` + `reconcile.rs`) with wire fixtures pinned to a test
file.

**F6-26.** ★★ **The prose contract `docs/multi-tenant-relay.md` (1,110 lines,
`draft`) is the batch's highest-value artefact, and it is built to be *falsifiable
about itself*.** It states, in one document, a **Scope and Non-Goals** section naming
**five** properties it does *not* prove; a **typed observational interface** plus
**label-propagation rules**; **ten axioms** (A-RLS-1..5 · P-APPEND · P-SIG ·
P-RESOLVE · P-RESOLVE-HOST · A_HASH · P3) each *admitted per deployment* by a named
**`§Conformance` gate that rejects the deployment if it fails**; **Safety Theorems**
mechanized in TLA+ and Tamarin; **Prior Art** (Goguen & Meseguer 1982 for
non-interference; Sabelfeld & Myers for label-flow; Jacqueline/LWeb as the closest
mechanized analogs; the confused-deputy framing for resolution-as-capability); and an
**Implementation Correspondence** section that maps each obligation to a code seam
*and names the ones that would fail silently if broken* (*"invisible to both the
labeling invariant and the Tamarin lemmas (the proofs would silently weaken, not
fail), so it is enforced by a migration lint"*). Its governing sentence is the
workshop's own standard: *"'Provably isolated' without naming the trust boundary does
not survive scrutiny."* See §2.3.

**F6-27.** **NIP-98 replay protection is a pluggable trait with a *shared,
cross-pod, community-scoped* Redis implementation — and the cross-pod case is tested
by name.** `Nip98ReplayGuard` (`buzz-auth/src/nip98_replay.rs`) carries
`DEFAULT_REPLAY_TTL_SECS = 120` as the *floor* and a `MAX_REPLAY_TTL_SECS` ceiling,
with **compile-time assertions** (`assert!(DEFAULT_REPLAY_TTL_SECS >= 120)`)
preventing the doc's arithmetic from drifting from the constant. The shipped
implementation, `buzz_pubsub::RedisNip98ReplayGuard`, is a literal
**`SET key 1 NX EX <ttl>`** over a **community-scoped** key, with the ttl *clamped*
into `[floor, ceiling]`. The guard error path **fails closed**. And the HA scenario
the prose contract worries about is mechanized as a test —
`nip98_replay_guard_rejects_cross_pod_replay_on_bridge_path` builds two guards over
one pool, has pod A claim an event id, and asserts pod B is rejected **within** a
community while a **different** community is admitted. **The code is stricter than
the prose spec claims (§D6-1).**

---

## 8. Divergences (D6-n) — where a doc and the code disagree

**D6-1. `docs/multi-tenant-relay.md` says its own P3 obligation is not carried in
the shipped HA deployment and tells the operator to add a shared seen-set — but the
code has since closed exactly that gap, and the shipped chart now requires the store
it says is missing.** This is the sharpest divergence in the batch, and it runs in
the **unusual direction**: the *spec is behind the code*, not ahead of it.

The prose contract's §Conformance states that the seen-set is
*"`Arc<AppState>`-scoped, not cross-pod"*, that *"the shipped HA examples
(`replicaCount: 3`) are **P3-non-conforming as shipped** unless the operator adds"*
either a header-stable sticky-routing annotation or *"(b) a shared seen-set backed
by a store with atomic insert-if-absent and TTL ≥ 120 s (e.g. Redis …). **This is
the recommended path.**"* §Implementation Correspondence repeats it: *"today's
in-process moka cache carries P3 for the chart default (`replicaCount: 1`) … but the
shipped HA examples … do **not** carry P3 as shipped."*

**The code no longer matches either sentence.** Measured:

- The seen-set is **no longer in-process.** There is a `Nip98ReplayGuard` trait in
  `crates/buzz-auth/src/nip98_replay.rs` (with `DEFAULT_REPLAY_TTL_SECS = 120` and a
  `MAX_REPLAY_TTL_SECS` ceiling) and a **Redis implementation**,
  `buzz_pubsub::RedisNip98ReplayGuard` (`crates/buzz-pubsub/src/nip98_replay.rs`),
  whose docblock names the seam: *"The correctness boundary is the shared,
  community-scoped Redis seen-set on `AppState`, not process-local memory."* The
  mechanism is a literal **`SET key 1 NX EX <ttl>`** — atomic set-if-absent — with
  the ttl **clamped** to `[DEFAULT_REPLAY_TTL_SECS, MAX_REPLAY_TTL_SECS]` so *"a
  buggy caller cannot send a Redis-incompatible `EX` arg or pin a slot for
  implausibly long."* The exactly-recommended path (b) is the shipped one.
- The floor is a **compile-time invariant, not a comment**:
  `assert!(DEFAULT_REPLAY_TTL_SECS >= 120);` and
  `assert!(DEFAULT_REPLAY_TTL_SECS < MAX_REPLAY_TTL_SECS);` live in the trait's own
  test block, so the doc's *"TTL ≥ 120 s"* prose cannot drift from the constant
  silently.
- The cross-pod case is **tested by name**:
  `nip98_replay_guard_rejects_cross_pod_replay_on_bridge_path` builds two guards
  over one pool, lets pod A claim an event id, and asserts pod B on the **same**
  community is rejected while a **different** community is admitted. That is the
  doc's own HA scenario, mechanized.
- Failure is **fail-closed at the guard boundary**: the guard error path *"rejects
  the request fail-closed"* (`bridge.rs`, `check_nip98_replay_with_guard`), matching
  the doc's *"A failing test or an unmet gate rejects the deployment."*

And the deployment side agrees with the *code*, not with the spec: the chart README
says **"`replicaCount > 1` hard-requires Redis"** and **"The chart template-fails if
the Redis invariant is broken at `replicaCount > 1`. No silent degradation"** — and
the chart's own test suite proves it, asserting `failedTemplate` with the message
**`"minimum replica count 3 requires Redis"`** (`tests/validation_test.yaml`). The
chart's stated reason for that requirement is `buzz-pubsub` fan-out, not the replay
guard directly; but the store it *forces* on every HA release is the same shared
store the replay guard reads, so the operator on the recommended path is not "adding"
a shared seen-set — the topologies the chart will render already have one. On the
path the spec called non-conforming, that is no longer a silent gap.

**Why it matters.** A reader who trusts the prose contract walks away believing
buzz's HA ships non-conforming and needs an operator fix; the code and the chart
claim the opposite. This is the **second-order version of the batch-00 rename
hazard**: not a name left behind, but a *safety status* left behind. It is benign in
the safe direction (the code is stricter than the doc claims), which is why it is a
divergence to *record* rather than a hazard to *fix* — but it is exactly the class of
error rule 1 exists to catch, and the prose spec is the **most likely place in the
whole repo for a false negative to hide**, because it is long, confident, and cites
line numbers that no longer resolve (`state.nip98_seen`, `state.rs:249`/`:407` and
`bridge.rs:76-94` are all stale; `check_nip98_replay` is now `bridge.rs:276`).

**D6-2. The conformance harness's own schema doc describes emit sites in
`handlers/req.rs` as *"held back"* while `LIMITS.md` states the read-seam half is
*"not yet armed."* The two docs agree** — I record this as a **non-divergence
deliberately**, because it is the rare case in this study where two documents describe
the same incomplete feature *identically and honestly*. Worth one line so the batch-07
synthesis does not mistake a consistent admission for a contradiction.

**D6-3. `AGENTS.md`'s repo-topology table still describes the pipeline as
`buzz → sprout-oss`, and `Cargo.toml` still names the `sprout` repository URL,**
while the product, the crate names, the CHANGELOG, and the release tooling all say
buzz. The rename is complete in code and **incomplete in metadata.** This is the
rename hazard from batch 00, confirmed as a live inconsistency rather than a
historical note.

**D6-4. The TLA+ model's grounding comments describe `crates/buzz-db/src/event.rs`
as having *"no `community_id`"* and `get_accessible_channel_ids` as *"currently
unions all open channels in the DB."*** Both are described as **today's code** and
both are cited as the **motivation for a mutation** (I1). The model is written
**against a known-current weakness**, which means its unmutated pass is a statement
about the *intended* post-fix behaviour, not necessarily about the shipped code.
buzz says so (*"that unscoped variant is the explicit I1 mutation"*), and it is the
single most important caveat for anyone reading the `.tla` file as a claim about
`main`. **Not a doc error — a doc-to-intended-state mapping** — but recorded because
a reader who skips the header would over-read the file.

---

## 9. Pole verdict

**PZ — the out-of-pole surface.** buzz's PZ content is **the strongest of any
platform in this study**, and it is not an accident of one module: it is a
**consistent practice** of treating safety claims as artefacts that must survive
attempted falsification.

Four mechanisms demonstrate it, and they are the same idea at four layers:

| Layer | Mechanism | How it proves itself |
|---|---|---|
| **Type** | `CommunityId` newtype, no `Deserialize`/`From<Uuid>` | documents that it is a **lint** fence, not a compiler fence (F6-2) |
| **Schema** | migration lint: `NOT NULL community_id`, community-led keys | runs over **all 62 migrations**; negative fixture included (F6-4) |
| **Model** | `.tla` 12 invariants + 13 mutations + 4 **false** probes | **6 mutations "Confirmed red"** with trace lengths; probes catch a **vacuous** proof (F6-6, F6-7) |
| **Runtime** | 16-test conformance gate with `EmitGuard` | **mutation-bite proven**; `LIMITS.md` names **7 blind spots** and the **unarmed half** (F6-12) |

And a fifth, at the boundary: **the egress guard's source scan is itself
mutation-tested** (F6-17). At every layer, the question buzz asks is not *"does it
work?"* but ***"does it fail when it should?"*** — and where the answer is *"we
don't know yet,"* the document says so.

**The single most valuable artefact is `LIMITS.md`.** A gate that publishes the list
of things it cannot catch, names the owner of each gap, names the *wrong* answer to
the open design question, and states which half of itself is not armed is worth more
than a gate that reports green — because a reader can calibrate.

**Two smaller PZ notes.** The **audit chain's versioned encoding** (F6-14, F6-15) is
a textbook rule-10 retirement: v1 is retained and labelled ambiguous, its ambiguity
is *proven by a test*, and v2 fixes it without invalidating history. And the
**rename hazard** (F6-22, F6-23) is confirmed live: three names for one product, a
`argv[0]` multiplexer named `sprig`, and a `sprout` URL still in the workspace
manifest.

**What PZ does not have, stated plainly.** No RLS. Raw-key DLP is deferred. Cross-pod
leaks are out of the conformance gate's scope. The read-seam conformance half is not
armed. PZ's own prose contract has **aged behind the code** on its P3/HA status
(D6-1). **Every one of these is stated in-tree by buzz itself** — the non-negatives
by design, the last by drift — which is exactly why the rest of the PZ surface is
credible.

---

## 10. Ranked actions

| # | Action | Why |
|---|---|---|
| 1 | **Adopt `LIMITS.md` as a required artefact for every gate, ratchet, and guard we ship** — name the blind spots, the owners, and any half that is not armed. | It is the cheapest and highest-value pattern in the batch, and it makes every other mechanism trustworthy (F6-12). |
| 2 | **Adopt "prove the guard's tripwire fires"** — a mutation-style test that injects the violation in memory and asserts the check catches it. | buzz does this for the egress inventory, the conformance gate, and the TLA+ probes. **A check without this test is a gesture** (F6-7, F6-12, F6-17). |
| 3 | **Adopt "project so the violation survives projection"** — record claimed *and* resolved; use a `Vec` not a `Set`; never filter the evidence; close error alphabets. | The three rules are general and each has a stated wrong answer (F6-10). |
| 4 | **Adopt the structural-inventory test with a *paired* count** (sites vs guard-calls) and **runtime-assembled needles** so the scanner cannot match itself. | It catches both a new unguarded site *and* a removed guard, which a plain allowlist cannot (F6-17). |
| 5 | **Adopt the type fence *with its own limit stated*** — a newtype for the tenant key, no `Deserialize`/`From`, plus a lint for construction, plus the sentence saying which is which. | The honesty is the feature; an over-claimed fence is worse than an honestly-scoped one (F6-2). |
| 6 | **Adopt the schema lint** — every scoped table `NOT NULL <tenant>`, every scoped key **led by** `<tenant>`, with an exemption table carrying a **`reason` column**. | It is the load-bearing enforcement for any tenancy claim, and the exemption table makes the exceptions auditable (F6-4). |
| 7 | **Adopt "normalize at the enforcement point, not the call site"** (the RFC-3339/microsecond fix) and **pin the preimage, not just the digest**. | A future caller cannot forget it, and pinning the preimage names the *trap* rather than the symptom (F6-16). |
| 8 | **Adopt hash-versioning discipline** — version the encoding, retain the old one, label its known ambiguity, and pin both digests. | Exactly rule 10, with a worked example of why the ambiguity test is the valuable part (F6-14, F6-15). |
| 9 | **Fold the formal-methods practice into our own SRS work at one small scale**: pick the tenancy invariant, write the mutations *and the false probes* first, and only then check it. | We do not need TLA+ to copy the practice. **The transferable idea is the mutation list and the vacuity probe**, not the tool (F6-6, F6-7). |
| 10 | **Keep the rename hazard on the retirement checklist** — grep the *metadata* (manifest `repository`, CI topology docs), not just the code. | buzz's rename is complete in code and incomplete in metadata; that is the residue that misleads a newcomer (F6-22, D6-3). |
| 11 | **Write the prose contract *beside* the formalism, and make its status sentences carry dates or gates** — a Non-Goals section, one axiom per assumption, and a `§Conformance` gate per axiom. | buzz's `docs/multi-tenant-relay.md` is the best template in the study for stating a safety claim (*"stating this boundary is part of the claim"*), and its one weakness is exactly the fixable one: its **status sentences aged behind the code** (F6-26, D6-1). |
| 12 | **Make the freshness TTL a compile-time floor, and test the cross-node case by name.** | `assert!(DEFAULT_REPLAY_TTL_SECS >= 120)` plus `nip98_replay_guard_rejects_cross_pod_replay_on_bridge_path` is how a number derived from another number stays true (F6-27). |

**Recommendation.** Take **#1, #2, #3, #4, #7** — `LIMITS.md` for every gate, a
mutation test that proves the tripwire fires, the three projection rules, the
paired-count inventory with self-immune needles, and normalize-at-the-enforcement-point
with preimage pinning. These five are small, transfer without any of buzz's stack,
and each has a *stated wrong answer* in the source that tells us what we would get
wrong. **#5, #6, #8 are for when we build the tenancy layer itself** — they are the
patterns our own `CC-84` work will need, and buzz is the best worked example in the
study. Treat the formal models (**#9**) as a **practice to borrow at one small
scale, not a toolchain to adopt**; the transferable idea is the mutation list.
**#11 is the one to act on immediately for our own SRS work** — the prose contract is
cheap, it is what makes the formalism legible to a non-specialist, and its single
failure mode (status drift) is preventable with the discipline we already apply to
retired mechanisms. **#12 is a two-line habit** for any TTL or window we ship.

---

**Next:** `findings/07-synthesis.md` — the batch that ranks buzz's mechanisms across
all six poles, states what buzz contributes to the cross-platform mapping, and
records which mechanisms are decided limits. Then the **buzz reader on port 3600**,
built from the markdown, and only then the ask about the next platform
(openrig / mattermost / zulip).
