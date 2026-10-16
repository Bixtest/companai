# buzz Study — Batch 01: the platform overview

**Folder:** `library/architecture/buzz-forensics/` · **Batch 01 of 07** · **Status:** OPEN
**What this batch answers:** *What IS buzz* — the protocol it speaks, the shape of the monorepo, the
relay at its centre, the surfaces it presents, and the tenant model underneath. It is the **map**;
batches 02–06 drill into one pole each.

**Rule 5 reminder:** no comparison to our own platform appears in this batch. Cross-platform notes are
**observations** carried only where an earlier *study* (not our product) is named.

**Rule 1 reminder:** every load-bearing claim below was read from the source at the time of writing,
and **three doc-vs-code divergences were found and are recorded in §5**. The code wins in each case.

---

## 1. What was read, and its measured size

| Source | Size | What it gave |
|---|---:|---|
| `ARCHITECTURE.md` | **956 lines / 57,799 B** | the authoritative system design; the crate reference; **a "Known Limitations" section that names its own gaps** |
| `README.md` | 16,231 B (≈330 lines) | the product framing, the crate map, the quick start, **a "Works today / Being wired up / Strong opinions, pending code" table** |
| `VISION.md` | **246 lines / 13,507 B** | *"The relay is the workspace"*; the 7 surfaces; the Access table; the Communities section |
| `NOSTR.md` | **398 lines** | the protocol primer; **a NIP-29 client-compatibility matrix (what works / what doesn't)** |
| `crates/buzz-core/src/kind.rs` | **1,177 lines** | **the kind registry — the protocol's actual vocabulary, in code** |
| `Cargo.toml` + `Cargo.lock` | 7,403 B + 297,508 B | the 34-crate workspace, the pinned dependency surface |
| `migrations/` | **62 files / 263,055 B** | the schema's real history |
| `schema/tables/public/` | **57 table files** | the desired-state schema, one file per table |
| `crates/buzz-relay/src/` | **161,380 lines / 119 files** | the server's real structure (handlers, api, audio, tunnel, admission) |

---

## 2. The one-sentence gloss, then the detail

> **buzz is a self-hosted team workspace — chat, forum, DMs, agents, workflows, code hosting and voice —
> built on the Nostr protocol, where every one of those things is the SAME object: a cryptographically
> signed event with a `kind` integer, stored in one log, behind one relay, inside one community.**

Everything below is a consequence of that sentence. **The design bet is that one substrate replaces
seven tools** — the README states it directly: *"one community can do what teams currently fake with
chat, forges, bots, CI dashboards, release tools, search indexes, and a pile of glue code."*

---

## 3. The protocol — Nostr NIP-01, and why the choice is load-bearing

### 3.1 The event is the whole API

Every action in buzz is a JSON object with exactly six fields (`ARCHITECTURE.md` §2):

```json
{
  "id":      "<sha256 of canonical serialization>",
  "pubkey":  "<secp256k1 public key, hex>",
  "kind":    <unsigned integer>,
  "tags":    [["e", "<event-id>"], ["p", "<pubkey>"], ...],
  "content": "<JSON payload or plain text>",
  "sig":     "<Schnorr signature over id>"
}
```

**Plain meaning:** there is no REST resource model for conversation. A message, a reaction, a vote, a
workflow step, a huddle join, a git patch and an audit entry are **all the same six fields** — they are
distinguished only by the integer in `kind`. **Why it matters:** the relay's dispatch is a single
`match` on an integer. **Adding a feature is adding a kind number, and the README's claim is that this
is a zero-breaking-change operation** — *"New message type? New kind integer. Zero breaking changes."*

### 3.2 The kind registry — measured in code, and the divergence

**The `kind` integer is the protocol.** `crates/buzz-core/src/kind.rs` is the source of truth, and the
measurement is:

| Measure | Value | How measured |
|---|---:|---|
| `pub const KIND_*` constants | **135** | `grep -c 'pub const KIND_' crates/buzz-core/src/kind.rs` |
| Entries in the exported `ALL_KINDS: &[u32]` array | **136** | parsed the array literal |
| Duplicates in `ALL_KINDS` | **0** | a test in the file enforces this (`no_duplicate_kind_values`) |
| `KIND_AUTH` (22242) in `ALL_KINDS`? | **absent** | verified — it is deliberately excluded (AUTH events are never stored) |

> **⚠️ DIVERGENCE (doc vs code) — recorded per rule 1.** `ARCHITECTURE.md` makes **two different
> claims about the same number in the same document**: §2 says *"exports the full registry as
> `ALL_KINDS: &[u32]` (**127 kinds** at the time of writing)"*, and §6 says *"`pub const ALL_KINDS: &[u32]`
> // **80 entries** (KIND_AUTH excluded — never stored)"*. **Both are stale.** The code holds **135 kind
> constants and 136 array entries.** The likely explanation of the 80 is that it counted only the
> *custom* (40000+) kinds; the 127 is an older snapshot. **The code wins: this study uses 135/136.**

**The kinds are the domain.** Reading the registry is reading the product's feature list — and this is
the single most useful artefact in the repo, because **rule 1 says the registry cannot lie about what
exists**. Selected, with their real values:

| Kind | Constant | What it is |
|---|---|---|
| 0 / 1 / 3 / 5 / 7 | `PROFILE` `TEXT_NOTE` `CONTACT_LIST` `DELETION` `REACTION` | **standard Nostr** — buzz inherits the base protocol |
| **9** | `STREAM_MESSAGE` | **a chat message — NIP-29 group chat** |
| 40002 / 40003 / 40004–40008 | `STREAM_MESSAGE_V2` `_EDIT` `_PINNED` `_BOOKMARKED` `_SCHEDULED` `_REMINDER` `_DIFF` | **buzz-custom message extensions** |
| **40100** | `CANVAS` | **a canvas edit event — the collaborative surface** |
| 45001 / 45002 / 45003 | `FORUM_POST` `FORUM_VOTE` `FORUM_COMMENT` | **the Forum surface, as events** |
| **43001–43006** | `JOB_REQUEST` `_ACCEPTED` `_PROGRESS` `_RESULT` `_CANCEL` `_ERROR` | **the agent job protocol — six kinds** |
| 44200 | `AGENT_TURN_METRIC` | an agent turn's cost/latency, as a stored event |
| **46001–46012** | `WORKFLOW_*` | **workflow run lifecycle — 12 kinds (triggered, step started/completed/failed, completed, failed, cancelled, approval requested/granted/denied)** |
| 46020 / 46030 / 46031 | `WORKFLOW_TRIGGER` `APPROVAL_GRANT` `APPROVAL_DENY` | trigger + human-approval commands |
| **48100–48106** | `HUDDLE_STARTED` `_PARTICIPANT_JOINED` `_PARTICIPANT_LEFT` `_ENDED` `_LIVENESS` `_GUIDELINES` | **voice — the huddle lifecycle, as events** |
| **1617–1633** | `GIT_PATCH` `GIT_PULL_REQUEST` `GIT_PR_UPDATE` `GIT_ISSUE` `GIT_STATUS_OPEN/_MERGED/_CLOSED/_DRAFT` | **git — NIP-34, as events** |
| 30617 / 30618 / 30621 | `GIT_REPO_ANNOUNCEMENT` `GIT_REPO_STATE` `PROJECT` | repo + multi-repo project coordinates |
| **45010 / 45011** | `ARTIFACT` `ARTIFACT_REMOVAL` | **the artifact system (worked in batch 03)** |
| 30174–30179 | `AGENT_ENGRAM` `PERSONA` `TEAM` `MANAGED_AGENT` `TEAM_CATALOG` `PRIVATE_MANAGED_AGENT` | **the agent-identity kinds (batch 02)** |
| 20001 / 20002 / 20003 | `PRESENCE_UPDATE` `TYPING_INDICATOR` `AGENT_PRESENCE` | **ephemeral (never stored)** |
| 22242 / 27235 / 24242 | `AUTH` `HTTP_AUTH` `BLOSSOM_AUTH` | auth: NIP-42, NIP-98, Blossom |
| 9000–9022 | `NIP29_*` | **the NIP-29 group-management command set** — create group, add/remove user, edit metadata, leave, join |
| 9040–9044 | `MODERATION_*` | **moderation commands (ban, unban, timeout, untimeout, resolve report)** — *commands, not stored events* |
| 1984 | `REPORT` | a moderation report — persisted but **never fanned out** |

**Two observations the registry forces, both facts and not opinions:**

1. **Moderation commands (9040–9044) are "executed, never stored"** — the code comment says so, and a
   compile-time assertion enforces it (`is_moderation_command_kind`). **So not every kind is an event
   in the log: some are commands the relay consumes.** This is the first crack in the "everything is
   just an event" simplification and batch 02/03 must respect it.
2. **`KIND_AUTH` is excluded from `ALL_KINDS` and a compile-time `assert!` bounds `KIND_CANVAS`,
   `KIND_HUDDLE_GUIDELINES` and `KIND_AUTH` to `u16::MAX`** — i.e. **the code pins a sub-range of kinds
   at compile time.** That is a real constraint discoverable only from the source.

### 3.3 The wire protocol — eight messages, three limits

The full WebSocket vocabulary is eight messages (`ARCHITECTURE.md` §2). Three hard limits are declared:

| Constant | Value | Plain meaning |
|---|---:|---|
| `MAX_FRAME_BYTES` | **65,536** | a single WebSocket frame may not exceed 64 KiB |
| `MAX_SUBSCRIPTIONS` | **1024** | per connection |
| `MAX_HISTORICAL_LIMIT` | **500** | events returned per filter on a backfill |

### 3.4 NIP-29 interop — the protocol is *shared*, not bespoke

`NOSTR.md` (398 lines) is a **compatibility matrix**: buzz speaks **NIP-29 (relay-based groups)
natively**, so **a third-party Nostr client can connect to a buzz relay and chat**. The matrix is
honest — it marks two features ⚠️:

- **Edits (`kind:40003`) and rich content (`kind:40002`) "work on the wire but are Buzz-only — no
  standard NIP-29 client renders these".**

**Plain meaning:** buzz is a **protocol citizen with a bespoke extension layer**. A plain Nostr client
works for the base conversation; the extensions are where buzz's own features live. **This is a real
strategic choice** — the workspace is not a walled garden at the wire level.

**And `NOSTR.md` records a retirement in its own first line:** *"The old **NIP-28 compatibility proxy
has been removed**."* (Rule 10: a retirement entry, found by reading.)

---

## 4. The monorepo — measured shape

### 4.1 A polyglot workspace, Rust at the centre

| Area | Files | Bytes | What it is |
|---|---:|---:|---|
| **`desktop/`** | **3,424** | **47,007,177** | **Tauri 2 + React 19 desktop app — the largest area** |
| **`crates/`** | **645** | **21,720,897** | **the Rust server + tools — 34 crates** |
| `mobile/` | 904 | 15,272,755 | Flutter (iOS + Android) |
| `docs/` | 82 | 11,596,274 | docs **incl. screenshots** |
| `benchmarks/` | 116 | 1,344,876 | benchmarks |
| `migrations/` | 62 | 263,055 | schema history |
| `schema/` | 147 | 112,370 | desired-state schema |
| `web/` · `admin-web/` · `deploy/` · `scripts/` | — | — | browser client, admin console, deployment, tooling |

**★ The first structural surprise of this study: the CLIENT is bigger than the SERVER.**
`desktop/` is **5× the file count and 2× the bytes** of `crates/`. In n8n the product WAS the packages;
here the product is **a server plus three first-class clients** (desktop, mobile, web). **Anything this
study concludes about "the product" must say which of the four it means.**

### 4.2 The 34 crates, in dependency order

`buzz-core` is **zero-I/O** and everything builds on it; `buzz-relay` orchestrates all subsystems and
**is the only crate that does so** (`ARCHITECTURE.md` §1):

```
buzz-core  (zero I/O — types, Schnorr verify, filter matching, the kind registry)
   ├── buzz-db          (Postgres: events, channels, tokens, workflows, audit)
   ├── buzz-auth        (NIP-42, NIP-98, API tokens, scopes)
   ├── buzz-pubsub      (Redis pub/sub, presence, typing)
   ├── buzz-search      (Postgres FTS)
   ├── buzz-audit       (hash-chain tamper-evident log)
   └── buzz-workflow    (YAML-as-code automation engine)
        └── buzz-relay   (ties everything together — the server)

buzz-acp   (ACP harness: relay @mentions → AI agents)   buzz-sdk   (typed event builders)
buzz-cli   (agent-first CLI, JSON in / JSON out)        buzz-media (Blossom/S3)
buzz-admin (operator CLI)                               buzz-test-client (E2E harness)
```

**★ The isolation rule is the load-bearing architectural constraint, and it is stated as a
prohibition:** *"`buzz-workflow` never calls `buzz-pubsub`, `buzz-search` never calls `buzz-db`…
**Cross-subsystem coordination happens only through the relay.**"* **There is exactly one sanctioned
exception, and the doc names it:** *"`buzz-audit`, which calls `buzz_db::deletion::guard_community_write`
to admit each audit append into its community before taking the chain lock."*

**Why this matters for a reader:** a prohibition is a checkable design rule, and the exception is
declared. **This is the third study in the chain where the architecture is expressed as what is
FORBIDDEN rather than what is possible** (Multica's PX-F layering was the second) — and it is the
cleanest such statement so far, because it is about *crate boundaries* rather than UI folders.

### 4.3 The client is three clients, not one

| Client | Stack | Measured |
|---|---|---|
| **Desktop** | **Tauri 2 + React 19** | `desktop/` 3,424 files / 47 MB; supports **all seven surfaces** |
| **Mobile** | **Flutter** | `mobile/` 904 files / 15.3 MB; `.dart` 695 files / 7.3 MB |
| **Web** | browser client | `web/` 66 files; the repo browser at `myproject.com` |
| **Admin** | admin console | `admin-web/` 17 files; **"browse and moderate every community"** (v0.5.28 changelog) |

**CZ NOTE:** the desktop app is where the composite surfaces live (canvas), and the mobile app is a
**partial** surface (README: mobile is in *"🚧 Being wired up"*). Batch 05 reads all four.

---

## 5. The relay — the single source of truth

### 5.1 The claim, and the code behind it

`ARCHITECTURE.md` §1 is unambiguous: *"**The relay is the single source of truth.** All reads and writes
flow through it. **There is no peer-to-peer event exchange, no gossip, no replication** — just clients
connecting to one relay over WebSocket."*

**Measured against the code:** `crates/buzz-relay/src/` is **161,380 lines across 119 files** — the
largest crate by far (`buzz-db` is 83,502; `buzz-acp` 61,140; `buzz-agent` 41,813; `buzz-core` 11,108;
`buzz-media` 9,572; `buzz-workflow` 5,263). **The relay is 32 % of all Rust lines in the repo.** The
claim holds at the structural level.

**But the code contains a nuance the doc's summary omits, and rule 1 requires recording it:** there is a
**`crates/buzz-relay-mesh`** crate using **`iroh`** (a peer-to-peer transport) and a
**`crates/buzz-relay/src/tunnel/`** directory. **So "no peer-to-peer event exchange" is true of the
*event* path today, while a *mesh* transport exists as a separate crate** (note the comment in
`Cargo.toml`: *"Inter-relay mesh transport (buzz-relay-mesh)"*). **Batch 06 reads the mesh and states
exactly what it does and does not carry.** The doc's sentence is about the **event log**; the mesh is a
different question, and it is not silently dropped here.

### 5.2 The event pipeline — 11 steps, and which are fire-and-forget

`ARCHITECTURE.md` §4 gives the exact order. **The load-bearing parts:**

```
1. AUTH CHECK    → 2. PUBKEY MATCH → 3. KIND_AUTH REJECT → 4. EPHEMERAL ROUTE
5. VERIFY        (spawn_blocking — Schnorr + SHA-256)    → 6. MEMBERSHIP
7. DB INSERT     (idempotent; search_tsv generated synchronously)
8. REDIS PUBLISH (if channel-scoped)  → 9. FAN-OUT  → [OK sent to client]
10. AUDIT LOG    (spawned async, fire-and-forget)
11. WORKFLOW TRIGGER (spawned async, excludes kinds 46001–46012)
```

**Three facts worth naming, each with a consequence:**

- **The client is told `OK` AFTER fan-out, not after the DB insert** (step 9, not step 7). The doc says
  so explicitly.
- **Audit and workflow are fire-and-forget** — *"a failure in either does not fail the event
  submission."* **Plain meaning:** an accepted event is accepted even if the audit write later fails.
  That is a deliberate availability-over-strictness trade, and it is stated.
- **There is no asynchronous search indexer at all.** Search is a **generated Postgres column**
  (`events.search_tsv`, populated on insert, GIN-indexed). **`buzz-search` only queries it.** This
  removes an entire class of "index drifted from source" bugs — and it is why two of buzz's "Known
  Limitations" are absences rather than defects.

### 5.3 The fan-out security boundary (a rule stated twice, in two places)

**★ This is the strongest single security statement in the batch:**

> Step 9 (fan-out) **explicitly excludes global subscriptions** (no `channel_id` constraint) from
> channel-scoped events — **global subscriptions do NOT receive events from private channels,
> regardless of filter match.** This is a deliberate security boundary.

And the subscription system implements it as **three tiers**, where tier 3 (global) is consulted **only
for non-channel-scoped events**. **A private-channel message cannot reach a global subscriber.** The REQ
handler additionally **checks channel access BEFORE registering the subscription**, to close a
race window — and the code comment names the race: *"a non-member receives live fan-out events from a
private channel between registration and the access check."*

**This is the kind of finding the study exists to collect: a security boundary that is named, placed,
and explained at the exact point where it would otherwise leak.**

### 5.4 The Known Limitations section — buzz names its own gaps

`ARCHITECTURE.md` §9 is titled **"Known Limitations — these are verified gaps in the current
implementation, not design aspirations."** **Six gaps are listed**, and two are unusually candid:

| # | Gap | The doc's own words |
|---|---|---|
| 1 | No sqlx offline query cache | `sqlx::query()` (runtime) not `query!()` (compile-time) — *"Queries are not validated at compile time."* |
| **2** | **No rate limiting implementation** | *"`RateLimiter` trait exists… **Only implementation is `AlwaysAllowRateLimiter` (test stub)… rate limiting is not currently enforced.**"* `RateLimitConfig` defines **4 tiers (human, agent-standard, agent-elevated, agent-platform)** as a design target |
| 3 | No typing REST endpoint | typers are not queryable, only online/away |
| 4 | Huddle recording not built | kinds reserved, no producer |
| **5** | **Approval gates not wired end-to-end** | *"runs that hit an approval gate are marked as Failed (🚧 WF-08)"* |
| **6** | **Workflow actions partially stubbed** | `send_dm` and `set_channel_topic` *"return `NotImplemented`"* (🚧 WF-07) |

**Why this is the most valuable section in the repo:** it is the **counterweight**. buzz's vision docs are
ambitious (11 `VISION_*.md` files, §6 below); §9 is the honest ledger of what is not built. **A study
that read only the vision would be wrong about the product; a study that read only §9 would be wrong
about the direction. Both are needed.**

**CZ NOTE (cross-study, observation only):** n8n's synthesis found its ADRs *accurate*; buzz's
limitations section is the same species of honest artefact — **a self-written defect list that lets rule
1 be checked cheaply.** Gas Town and Multica had partial versions of this; buzz's is the most explicit.

---

## 6. The surfaces and the docs

### 6.1 Seven surfaces, three lenses over one log

`VISION.md` names **seven surfaces**, and the sentence that ties them together is *"One event log. One
search index. Three lenses."*

| Surface | Model | Default notifications |
|---|---|---|
| 🏠 **Home** | personalized feed | — |
| 💬 **Stream** | topic-based real-time chat (Slack-like) | **Zero** |
| 📋 **Forum** | async long-form threads (Discourse-like) | **Zero** |
| ✉️ **DMs** | 1:1 and group, **up to 9** | URGENT only |
| 🤖 **Agents** | directory · your agents · job board | — |
| ⚡ **Workflows** | YAML-as-code automation + traces | Approvals only |
| 🔍 **Search** | Cmd+K · instant · full-text | — |

**★ The "three lenses" claim is the architectural thesis, and it is measurable:** Stream
(`kind:9`), Forum (`kind:45001/45003`) and Workflow (`kind:46001–46012`) are **different kinds in the
SAME `events` table, indexed by the SAME `search_tsv`, delivered through the SAME fan-out.** The
difference is **the client's rendering and the notification policy** — not the storage. *"Stream —
Slack-like, fast… Forum — Discourse-like, slow… Workflow — structured, traceable."*
**Plain meaning: buzz does not have three products with a bridge; it has one log with three faces.**
That is the boldest design decision in the platform and **batch 03 tests whether the code backs it.**

### 6.2 The Access model — one gate, five role names

*"The relay enforces all access control. **Channel membership is the only gate.**"*

| Type | Visibility | Join | Create |
|---|---|---|---|
| Open channels | searchable by all members | self-join | any member |
| Private channels | hidden, invite-only | invited by member | any member |
| DMs | participants only | N/A (≤9) | any member |
| **Guests** | **scoped to specific channels** | invited | N/A |

**and `buzz-db` declares five member roles: `Owner`, `Admin`, `Member`, `Guest`, `Bot`.**
**★ `Bot` is a first-class membership role** — the same five-slot vocabulary a person gets.
`VISION.md` says the quiet part: *"Auth is simple — authenticated or not. Channel membership gates
content visibility."* **Plain meaning: buzz does NOT have a permission-flag system; it has ONE gate
(membership) and identity (the keypair).** A guest is not "a user with restricted scopes" — **a guest is
a member of fewer channels.** This is a distinctly different shape from every earlier platform in the
study (Multica's roles+scopes; n8n's 10 roles + 206 scopes) and **batch 03 reads its consequences.**

### 6.3 The Communities model — and why this study was chosen for the tenancy question

`ARCHITECTURE.md` §1 states the rule in code-shaped form:

> **`req.community = resolve_host(connection.host)`** is established **before** AUTH, EVENT, REQ, REST,
> media, git, search, workflow, or pub/sub handling. **Unknown hosts fail closed**, and NIP-98/API-token
> stamps must **agree with** the host-derived community rather than overriding it.

**Plain meaning:** *the URL is the tenant.* There is no tenant tag on the wire (the Nostr format does
not grow one) — the **host** determines the community, and **everything is scoped under it**: rows,
cache keys, search documents, workflow state, media metadata, git repo pointers, and **audit chains**.

**★ And this study's first genuinely novel artefact lives here: the isolation is PROVEN, not asserted.**
`VISION.md`: *"Isolation is the boundary, not a filter… This is proven, not asserted: the multi-tenant
relay spec mechanizes isolation in **TLA+** and authorization in **Tamarin**, with every guarantee
**mutation-tested**."* **Measured — the proof inputs are IN the tree:**

| File | Size | Models |
|---|---:|---|
| `docs/spec/MultiTenantRelay.tla` | **61,202 B** | **isolation** (TLA+) |
| `docs/spec/MultiTenantAuth.spthy` | **31,956 B** | **authorization** (Tamarin prover) |
| `docs/spec/GitOnObjectStore.tla` | 13,872 B | git-on-object-storage correctness |
| `crates/buzz-core/src/pairing/NIP-AB.spthy` | — | the pairing protocol |
| `docs/multi-tenant-relay.md` | **1,110 lines** | the spec itself |

**This is the first platform in the study to ship machine-checkable models of its guarantees.** Batch 03
reads them **as models to verify against the code (rule 1)** — not as guarantees to accept. **And the
honest reading today is already visible in §5.4 + the crate map:** the *semantic* boundary is designed
and modelled, while `RateLimitConfig`'s four tiers and sqlx compile-time checking are **declared
targets, not enforcement.**

### 6.4 The doc set: eleven VISION docs

**Measured: 11 `VISION_*.md` files** (plus `CONTEXT.md`), totaling ~78 KB — and they are not variants of
one document, they are **eleven different bet-the-product essays**:

| Doc | Size | The bet |
|---|---:|---|
| `VISION.md` | 13,507 B | **the relay is the workspace** — the master doc |
| `VISION_PROJECTS.md` | **15,808 B** | **the biggest of the eleven** — projects/repos in the same room |
| `VISION_SOVEREIGN.md` | 13,541 B | run your own, or an operator hosts thousands |
| `VISION_REMOTE_AGENTS.md` | 8,922 B | agents that live elsewhere (batch 02) |
| `VISION_MODERATION.md` | 7,783 B | moderation as a first-class surface (batch 06) |
| `VISION_MOBILE.md` | 6,866 B | the Flutter client |
| `VISION_ACTIVITY.md` / `_MESH.md` / `_AGENT.md` | 5,208 / 4,607 / 4,501 B | activity feed · relay mesh · the agent |

**★ The doc culture is the opposite hazard from CrewAI's.** CrewAI's repo was 93 % documentation and hid
its code. buzz has **~78 KB of vision docs against ~502,880 lines of Rust** — the docs are a small
fraction, they are *forward-looking*, and the **code is 60× the docs by size.** **The hazard here is not
"docs hide the code" but "the docs describe a future the code has not reached"** — which is exactly why
§5.4 (Known Limitations) and rule 1 matter so much.

---

## 7. Capability table (tagged by pole)

The batch-01 map, tagged so batches 02–06 inherit the frame.

| Capability | Plain gloss | Pole | Q1 · USER VALUE | Q2 · VISION VALUE |
|---|---|---|---|---|
| **One signed event log** | every action is the same six-field object | **P2** | one place where messages, code review, approvals and automation all live and are searchable together | a single substrate means one subscription/search/audit model instead of N |
| **The `kind` registry** | features are integers, not tables | **P2 / PX-F** | new features never break an old client | **additive evolution without migration** — the property our own workspace needs most |
| **7 surfaces, 3 lenses** | chat/forum/workflows are views over one log | **P2 / PX-W** | the right shape for the conversation (fast vs. slow) without a second tool | one storage + one index + N renderings = **lowest duplication ceiling in the study** |
| **Membership-is-the-only-gate** | access = which rooms you are in | **P2** | simple, explainable access — no permission matrix to audit | **identity-scoped, not flag-scoped** — the primitive we keep needing (cf. `CC-84`) |
| **Community = the URL** | the hostname is the tenant | **P2** | a workspace has a name and a door; nothing else to configure | **a tenant boundary that needs no new protocol field** |
| **Formal isolation models** | TLA+/Tamarin proofs ship in-tree | **P2 / PZ** | (indirect) a boundary that can be verified rather than trusted | **the study's first machine-checkable tenancy guarantee** — a method to borrow even if the code is not |
| **Relay is the single source of truth** | one process owns all state | **P2 / P3** | predictable: no replication lag, no split brain | a clear ownership model (and the doc states the mesh exception — §5.1) |
| **Fan-out excludes global subscribers** | private rooms cannot leak to a global listener | **P2** | a private channel is actually private | a **named** security boundary placed at the exact leak point |
| **Fire-and-forget audit/workflow** | an event is accepted before audit completes | **P3** | chat never blocks on the automation layer | **availability-over-strictness, declared** — a trade to weigh, not copy blindly |
| **`buzz-core` zero-I/O + one-way crate deps** | the shared layer cannot grow teeth | **PX-F / PZ** | (indirect) a fast, small core | **constraint-as-architecture** — third study where prohibitions are the design |
| **NIP-29 interop** | a plain Nostr client can connect and chat | **PZ** | your workspace is not a walled garden | **protocol citizenship** — a standard wire format with a bespoke extension layer |
| **Known Limitations §9** | the repo names its own gaps | **PZ** | honest expectations | **the artefact that makes rule 1 cheap** — a self-written defect list |
| **The relay is 32 % of all Rust** | one crate owns the wiring | **P3 / PZ** | one thing to operate | a concentration **risk and a clarity** in the same fact |

---

## 8. Findings carried forward (into batches 02–06)

**F1-1 · The kind registry is the product's true feature list, and it disagrees with the docs.**
135 constants / 136 array entries in `kind.rs` vs. **two different stale numbers in one document**
(127 and 80). **Action for later batches: any "what exists" claim is read from `kind.rs` first.**

**F1-2 · Not every kind is an event.** Moderation commands (9040–9044) are **executed, never stored**,
enforced by a compile-time assertion. **The "everything is an event" simplification has a measured
boundary.** → batch 02/03 confirm the full boundary set.

**F1-3 · The client is bigger than the server.** `desktop/` 3,424 files / 47 MB vs. `crates/` 645 /
21.7 MB. **Any "the product is X" statement must name which of server / desktop / mobile / web.**

**F1-4 · There is a mesh transport the summary omits.** `buzz-relay-mesh` (iroh) + `src/tunnel/` exist
alongside the "no peer-to-peer" claim. **The claim is about the event path; the mesh is a separate
question.** → batch 06.

**F1-5 · One gate, five role names, and `Bot` is one of them.** Access is membership, not permissions.
→ batch 03 is where this is tested.

**F1-6 · Isolation is modelled formally, and enforcement is partly a target.** TLA+/Tamarin inputs
ship in-tree; `RateLimitConfig`'s 4 tiers and sqlx compile-time checking are **declared, not enforced**.
**The model and the enforcement must be read as two different things.** → batch 03.

**F1-7 · Three surfaces are one table.** Stream/Forum/Workflow differ by kind and client rendering, not
storage. **This is the platform's boldest claim and the most checkable.** → batch 03/05.

**F1-8 · Six self-declared gaps, two of them material.** Approval gates mark runs **Failed**; `send_dm`
and `set_channel_topic` return **NotImplemented**. **The automation pole (batch 04) inherits these as
known-open, and any capability claim there must be checked against them.**

**F1-9 · Two retirements already found by reading.** The **NIP-28 compatibility proxy** was removed
(`NOSTR.md:1`); migration **`0044_drop_nip_fi_ledger.sql`** drops the entire Phase-A NIP-FI authority
ledger (**14 tables, `CASCADE`**) with the reason recorded in the file: *"OSS Buzz is stateless for
identity… the durable ledger tables are dead code."* **Rule 10 has a real surface here — 23 of 62
migrations carry a drop/remove/retire flavour.**

---

## 9. What batch 01 does NOT claim

- **It does not claim buzz works as advertised.** §5.4 lists six self-declared gaps; the vision docs
  describe a future. Batch 01 maps the *territory*; later batches test the *claims*.
- **It does not rank mechanisms.** That is batch 07's job.
- **It does not compare buzz to our own platform.** Rule 5; that is the later mapping pass.
- **It does not read the formal models.** It records that they exist (§6.3) and defers the reading to
  batch 03, where the tenancy boundary belongs.

---

*Batch 01 of 07. Written 2026-10-16. Next: `findings/02-the-aissistant.md` (P1) — `buzz-agent`,
`buzz-acp`, `buzz-dev-mcp`, agent identity and keys, the job protocol (kinds 43001–43006), personas,
managed agents, and remote agents.*
