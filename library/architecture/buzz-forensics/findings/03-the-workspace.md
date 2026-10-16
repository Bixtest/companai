# buzz Study — Batch 03: the workspace (P2)

**Folder:** `library/architecture/buzz-forensics/` · **Batch 03 of 07** · **Pole: P2 — the workspace**

**What this batch answers:** the container — the event store, the channel/forum/DM model, the membership
gate, the community (tenant) boundary, **the TLA+/Tamarin isolation model read as a model**, the 62
migrations and the 57-table schema, the artifact system, and the community-deletion lifecycle.

**Rule 5 reminder:** no comparison to our own platform. **Rule 1 reminder:** this batch found the study's
**most interesting self-aware documentation** and one **self-declared HA non-conformance**; both are
recorded as found.

---

## 1. What was read, and its measured size

| Source | Size | What it gave |
|---|---:|---|
| **`docs/multi-tenant-relay.md`** | **1,110 lines / 58,845 B** | **the formal specification — the study's most sophisticated document** |
| **`crates/buzz-core/src/tenant.rs`** | ~200 lines | the tenant fence, in the type system, **with an explicit statement of what it does NOT guarantee** |
| **`docs/spec/MultiTenantRelay.tla`** | **61,202 B** | the TLA+ isolation model |
| **`docs/spec/MultiTenantAuth.spthy`** | **31,956 B** | the Tamarin authorization model |
| **`crates/buzz-conformance/`** | **1,775 lines / 5 files** | **the runtime trace checker that validates live executions against the TLA+ model** |
| `schema/tables/public/` | **57 table files / 147 files total** | one file per table, **41 carrying `community_id`** |
| `migrations/` | **62 files / 263,055 B** | the schema's real history |
| `NOSTR.md` | 398 lines | the NIP-29 interop matrix |
| `docs/nips/NIP-AR.md` · `NIP-ER.md` · `NIP-CL.md` · `NIP-RS.md` | — | artifacts, reminders, channel labels, read state |
| `ARCHITECTURE.md` §3–§8 | — | connection lifecycle, event pipeline, subscription system, security model |
| `VISION_SOVEREIGN.md` · `VISION_MODERATION.md` | 13,541 + 7,783 B | the operator/sovereignty model and the moderation surface |

---

## 2. The one-sentence gloss

> **The workspace is a signed-event store partitioned by a hostname.** A channel, a forum thread, a DM,
> a repo, a task and a workflow run are all rows in the same `events` table, fenced by `community_id`;
> **the only access control is channel membership**, and **the community boundary is proven with formal
> methods and then checked against the running code at runtime.**

---

## 3. The container: 57 tables, 41 fenced, and the fence is *lintable*

### 3.1 The measured shape

**57 table files** in `schema/tables/public/`; **41 of them carry `community_id`** (measured by grep).
**The 16 that do not are not an oversight — they are registered in a table.**

`schema/tables/public/_operator_global_tables.sql` is a **16-line file that creates an allowlist table
with a reason column**, and its header explains the whole mechanism:

> *"The explicit registry of tables that are deliberately operator-global (NOT tenant-scoped). **The
> migration-lint harness reads this: any table NOT listed here MUST carry a NOT NULL `community_id` and
> lead its uniques with it.** Making the allowlist a DB table (not a hard-coded list in the linter) keeps
> the registry **next to the schema it governs and reviewable in one migration diff.**"*

**★ Why this is a genuinely good idea, in plain words:** the rule is not "remember to scope your table."
The rule is: **you either carry `community_id` or you are on a list, and being on the list requires
writing a reason that a reviewer sees in the same diff as the table.** The linter's allowed exceptions
are **data**, so adding an exception is itself a reviewable migration. **This is the first mechanism in
the study where a security invariant's *exceptions* are as auditable as the invariant.**

### 3.2 The event store — one table, community-leading everything

`events.sql` is the canonical log. **The properties that matter:**

| Property | The code | Why it matters |
|---|---|---|
| **PK is `(community_id, created_at, id)`** | partition key first | **the same signed event may legitimately exist in two communities** — *"Cross-community dedup: same signed event may exist in two communities; `(community_id, created_at, id)` dedupes within one, allows across."* |
| **`PARTITION BY RANGE (created_at)`** | monthly partitions | retention is physical, not logical |
| **Every hot-path index leads with `community_id`** | 7 indexes, all community-leading | **the tenant predicate is never a filter bolted on; it is the index prefix** |
| **`search_tsv` is a GENERATED STORED column** | `to_tsvector('simple', content)`, **`CASE WHEN kind IN (…) THEN NULL`** | no sidecar indexer; **8 privacy-sensitive kinds are storage-level unsearchable** (a NULL tsvector never matches `@@`) |
| **`id` is `BYTEA`** | 32 raw bytes, not hex | the id is the content hash |
| **`deleted_at`** | soft delete | deletions are events too (kind 5) |

**★ F1-7 from batch 01 is now confirmed in code.** The claim was *"one event log, one search index,
three lenses."* **Here is the proof:** `channel_id` is a **nullable column on `events`**, `kind` is an
integer, and there is **no separate table for Stream, Forum, Workflows, git, voice or artifacts.** The
`search_tsv` generation is the same generated column for all of them. **The three-lens design is real at
the storage layer.**

**And the privacy list is where the design shows its judgement.** The excluded kinds are:
`1059` (NIP-17 gift-wrap DM) · `30179` (private managed agent) · `30300` (encrypted reminder) · `30350`
(push lease) · `30622` (DM visibility) · `44100`/`44101` (membership notices) · `44200` (agent turn
metric). **Plain meaning: the kinds whose *existence* is sensitive are excluded from full-text search by
construction, and the comment says why in one line — *"Privacy: encrypted/private routing wrappers and
p-gated membership notices must never be discoverable through NIP-50 full-text search."***

### 3.3 Channels, membership, and DMs — the same table with a type

`channels.sql` declares **`channel_type channel_type`** — and `buzz-db`'s enum (from batch 01) is
**`Stream` · `Forum` · `Dm` · `Workflow` · `System`.** **So the "surfaces" are a column, not a table.**

**The channel identity facts, in the schema's own comments:**

- **`PRIMARY KEY (community_id, id)`** — *"Channel UUIDs stay valid wire identifiers, but they are **NOT
  globally unique**: the PK is `(community_id, id)`, so **the same UUID may legitimately exist in two
  communities** (conformance lists 'same channel UUID collision in two communities' as a required
  isolation test)."*
- **`community_id` is immutably set at creation** — the migration lint asserts *"`channels.community_id`
  is never mutated after insert"* (§5.3 below).
- **DMs are channels with a `participant_hash`** — `UNIQUE (community_id, participant_hash) WHERE
  participant_hash IS NOT NULL`. **A DM is a channel whose uniqueness is derived from its participants.**
- **Guards that are visible in the schema:** `CHECK (cardinality(labels) <= 8)` (at most 8 channel
  labels) · `CHECK (id <> '00000000-…-000000000000')` (the nil UUID is refused) · `max_members` ·
  `ttl_seconds`/`ttl_deadline`.

`channel_members.sql` is the **access-control table**, and it is refreshingly small:

```
PRIMARY KEY (community_id, channel_id, pubkey)
role: member_role NOT NULL DEFAULT 'member'
joined_at · invited_by · removed_at · removed_by · hidden_at
FOREIGN KEY (community_id, channel_id) REFERENCES channels ON DELETE CASCADE
```

**★ The whole access model is one row's existence.** `removed_at` is a soft delete (re-adding reverses
it — batch 01's `buzz-db` finding). **There is no scope column, no permission JSON, no role→capability
matrix in the schema.** `role` is a four-value enum (`owner`/`admin`/`member`/`guest`/`bot`).

**CZ note (cross-study, observation):** Multica's tenancy was a role table plus a scope table; n8n's was
10 roles + 206 `resource:action` scopes. **buzz's is a composite-key row with a four-value enum and a
soft-delete timestamp.** The study now has **three genuinely different answers to "what is access
control?"** and this is the smallest.

### 3.4 `users` — one profile per (community, keypair)

`users.sql` declares `PRIMARY KEY (community_id, pubkey)` and the comment is the model in one line:
*"One profile per (community, pubkey): **the same key reposts `kind:0` in each community it joins.**"*

**Identity facts visible in the schema:**

- **`agent_owner_pubkey`** has a **self-referencing FK within the community**: `FOREIGN KEY
  (community_id, agent_owner_pubkey) REFERENCES users (community_id, pubkey)` — *"agent owner is a user
  in the SAME community."* **An agent cannot be owned across a tenant boundary — enforced by the DB.**
- **`channel_add_policy channel_add_policy NOT NULL DEFAULT 'anyone'`** — a per-user policy controlling
  whether others may add you to channels (`anyone` / `owner_only` / `nobody`; measured in `NOSTR.md`).
- **`nip05_handle` and `okta_user_id` are unique *within* a community, not globally.**
- **`capabilities JSONB`** — the one schema place where a capability bag exists, and it is per-user.

**★ The portability rule, stated as a measured test of the design:** `VISION.md` — *"**Your keypair is
yours across every community; your profile, DMs, and channel-less content live per-community.** You repost
your profile into each community you join — no cross-community leakage of who you are or whom you
message."* **Identity is portable; state is not.**

---

## 4. THE FORMAL MODEL — the study's most sophisticated artefact

**This is the part of buzz that has no analogue in the previous six platforms, and it deserves careful
reading rather than summary.**

### 4.1 What is being proven, and what is deliberately NOT

`docs/multi-tenant-relay.md` opens with its own scope, and **the non-goals are as important as the
claims**:

> *"This specification proves **safety** ('nothing bad happens'). It deliberately does **not** prove:
> **liveness or performance** … **Postgres's internal correctness** … **Cryptographic primitives** …
> **Physical-resource isolation** … **Above-the-interface client leakage.**"*

**And then the sentence that makes the whole document trustworthy:**

> *"**Stating this boundary is part of the claim.** 'Provably isolated' without naming the trust boundary
> does not survive scrutiny; '**isolation is machine-checkable relative to these stated axioms**, with
> every shared logical channel either closed in-model or closed by a named axiom' does."*

**Plain meaning: the document refuses to say "provably isolated" without saying *relative to what*.**
That is rule 1 practised by the platform itself.

### 4.2 The theorem is *non-interference*, not a WHERE clause

> *"Tenant isolation is stated as **non-interference**: for any two executions equal on community B's
> inputs and initial B-visible state, B's observable outputs are equal regardless of community-A-only
> actions… **A `WHERE community_id = $1` row-return invariant is only *one projection* of this
> theorem — it implies nothing about timing, errors, uniqueness collisions, projection rebuild, or the
> auth gate.**"*

**The encoding used is a label-flow invariant:** *"every state element … carries the community label it
originated from, and the single-run safety invariant is *'no high-labeled value ever flows into a
low-labeled observation.'*"* And the reason for that choice is stated: **the encoding forces you to
enumerate every state element, which is what catches the projection-rebuild and error-surface channels
that a predicate hides.**

### 4.3 The channel classes — and the honesty of naming carve-outs

Three classes are enumerated, and the classification is the intellectual core:

**(C1) Declared, out of scope** — *"buffer cache, autovacuum, planner statistics, partition right-edge
throughput, connection-pool tail latency… **We do not claim timing non-interference.**"* Modelled
explicitly on how *"git-on-s3 declares physical pack pruning: **named, with a deferred future bandwidth
bound.**"*

**(C2) In scope, enumerated, each closed** — *"**These are not carve-outs; a B-scoped connection can
observe them at the interface, so each must be closed in-model or by a named axiom**"*:

| # | Channel | How it is closed |
|---|---|---|
| **C2.1** | **Event-id existence oracle** — `ON CONFLICT DO NOTHING` would let B learn that someone wrote that id | **By a composite unique key over `(community_id, …, id)` — so B's write at A's id gets a *fresh* key, not a conflict.** The doc is precise that the hash axiom is *supporting* (it rules out adversarial search for a colliding id), **while the *residual* — ids B already knows out-of-band via a NIP-19 share or a multi-tenant UI — is closed by the index, not the hash**, and is *"a named residual … not a relay-closed channel."* |
| **C2.2** | **Constraint-violation error surface** — Postgres errors leak constraint names and tuples | **Closed by a fixed "sanitized error alphabet" and the obligation that the relay emits only errors from it** — *"an implementation code-fence, proven relative to it."* |
| **C2.3** | **Projection rebuild path** — a rebuild touches every community | **Closed by the invariant that rebuild writes server-side tables only and NEVER serves rows to a tenant-scoped connection.** |
| **C2.4** | **Unauthenticated global surface** — the NIP-11 doc at `/` is tenant-unscoped by construction | **Closed by a "typed-input code-fence": the doc-build function consumes only relay-static config types — no DB handle, no tenant context.** And the doc records the *exact fragility*: *"Today `RelayInfo::build` takes only static inputs … so the surface is clean — **but by current code, not by the proof**: adding a `total_events` counter is one `&PgPool` argument away and the labeling invariant catches none of it."* |

**(C3) Declared, out of scope** — *"**Historical writes after revocation.** … Revocation removes the
current `admittedMembers` row and therefore the capability, but it does **not** relabel or delete rows the
actor wrote while admitted… **We do not claim historical writes are revoked when a member is
revoked.**"*

**★ Plain reading: this is a threat model written by people who were looking for ways it could be
wrong.** Two of the four in-scope channels are closed by *"code-fences"* rather than by the proof, and
the document says so at the point of the claim, with the file and line where the fence currently holds.

### 4.4 Non-vacuity: 13 mutations, all confirmed red

**The property that distinguishes a real proof from a decorative one is that the invariants can fail.**
The document proves this by **mutation testing the model itself** — *"Non-vacuity of the invariants
themselves is shown by **thirteen mutations (M1–M13), each confirmed to produce a counterexample**"* —
and it names the counterexample's shape for each:

| Mutation | What it removes | Result |
|---|---|---|
| **M1** | unscoped direct-by-id lookup (the doc calls it *"the `get_accessible_channel_ids` landmine"*) | `Safety` violated at **depth 4** |
| **M2** | widening the sanitized-error label to all communities | violated at **depth 2** |
| **M3** | global-id conflict key (`id` alone) — *"the missing-`community_id`-in-the-unique-index footgun"* | violated at **depth 3**, *"with a B-scoped `WriteResult` observation carrying `labels |-> {commA}` — the existence-oracle leak C2.1 closes"* |
| M4–M5 | host-default-tenant mutation | `Inv_HostBindingFence` at **depth 2** |
| **M8 / M8-dup** | the host/channel-agreement fence | violated by 2- and 3-state traces |
| **M9** | re-keying admission from same-community to any-community | **violated in TWO surfaces** — *"The two M9 variants prove both the `AddMembership` gate and the channel-less-read gate are **independently load-bearing, not just one**."* |
| M10–M13 | open-AUTH stamp, channel-create stamp, feed admission, aux admission | each confirmed red |

**And an extra discipline worth naming:** *"each new conjunct earns a confirmed red"* — and
**reachability probes**: *"four intentionally-false reachability probes (`Probe_OpenAuthRegistration_Unreachable`
…) each asserts the corresponding witness set stays empty, so each must go red if its action fires — and
all four do."* The purpose is stated: *"**A vacuously-passing new conjunct over an unfireable action is
therefore ruled out, not assumed.**"*

### 4.5 The TLA+ run is reported with real numbers

**The study can cite a real model-checking result** — `MultiTenantRelay.tla` (61,202 B) on its finite
harness (2 communities × 4 channels):

> *"TLC completes exhaustively: **Model checking completed. No error has been found.** — **472,530,528
> states generated, 16,226,016 distinct, 0 left on queue, depth 13** (8 workers, ~5m)."*

**And the document records the *growth history* of the distinct-state count** —
**4,350,464 → 5,091,328 → 5,621,760 → 9,232,992 → 16,226,016** — with the reason for each increment
(*"precisely because the channel-less write path, the fail-closed unmapped-host path, … are genuinely
reachable — **new behavior, not dead code**"*). **Plain meaning: when they added a feature, the state
space grew, and they checked that the growth came from reachable behaviour rather than dead model code.**

**Conflict-resolution discipline worth copying:** *"The host-fence and new-surface figures above are
counterexample **trace lengths** … which unlike TLC's run-dependent 'depth of complete graph search'
total **are reproducible from the printed error trace.**"* **A reported number that a reader can
re-derive is different from one they must trust.**

### 4.6 Tamarin: 32 lemmas, each paired with a witness

`MultiTenantAuth.spthy` (31,956 B): *"All **32 lemmas (S1–S8) verify green** (Tamarin 1.12.0 /
Maude 3.5.1, ~12 s) — **each safety lemma paired with a verified exists-trace sanity lemma**, and the
documented mutations … confirmed red."*

**And the machine-check hygiene paragraph is the most honest thing in the document:**

> *"S1–S8 lemmas close by two distinct shapes. **Rule-shape closure** … These are well-formedness guards
> on the model's action labels; **the substantive security claim is carried by the corresponding rule
> design and mutation** … **Substantive closure** requires cross-rule reasoning … Tamarin proves both
> kinds identically; **the distinction is for reviewer hygiene, not a weakened theorem claim.**"*

**Plain meaning: "32 lemmas green" would be misleading if half of them were tautologies about the
model's own labels — so the document separates the two kinds and says which is which.** It even notes
the paragraph is *"prose-only to preserve the `.spthy` byte hash above"* — i.e. they keep a hash of the
model file in the doc, so **editing the model to match the prose is not possible without detection.**
(That answers rule 1's core worry in the most direct way this study has seen: **the model cannot be
quietly edited to fit the documentation.**)

---

## 5. The runtime half: **trace conformance** — the model checks the running code

**★ This is the second half of the mechanism and, in engineering terms, the more unusual one.**

`crates/buzz-conformance/` (1,775 lines) is not a test suite. Its own header states the north star:

> *"North star (from the runtime-formal-compliance skill): **don't ask 'did the model pass'; ask 'did the
> running code emit a trace the model accepts.'**"*

**What it is:**
- **a schema** — `TraceStep`, `TraceAction`, `AbstractState` — *"that the relay emits at its
  ingest/read accept-reject boundary"*;
- **an independent replay checker** — `check_trace` consumes the trace and validates it against the
  TLA+ spec's `Next` transition relation.

**What it is NOT — and this is the load-bearing discipline:**

> *"Not a proof. Trace conformance only checks executions you ran. Coverage is widened by integration
> tests, property tests, and adversarial fixtures. **Not a re-export of production helpers. Sharing
> normalization helpers between the emitter (which projects implementation state) and the checker (which
> judges that projection) would let a bug in the helpers hide itself from both** — exactly the failure
> the skill calls out."*

**★ Plain meaning: the checker re-implements the spec's actions in Rust deliberately, so a bug in the
production code cannot make the check pass.** That is a **third party to a two-party argument** — the
kind of thing that only gets built when someone has been burned by a self-confirming check.

**The three failure modes are enumerated**, and **coverage breach is called out as load-bearing**:
*"the traced action is not allowed from the checker's current model state"* · *"state mismatch —
`state_after.row_labels` includes a community other than the resolved tenant (`Inv_NonInterference`)"* ·
*"coverage breach — an unknown critical action, a critical seam exit without a trace step
(`TraceAction::ImplBug`), or a scenario-required action that never appeared."* And: *"**Without it,
trace conformance is decorative logging.**"*

**CZ note (cross-study, observation):** this study has now seen four *"make the claim checkable"*
patterns — n8n's 299 hashed architectural violations, its 110 boundary issues, its pinned agent harness,
and `agent-check.mjs`. **buzz's is different in kind: it checks the *running system* against a *formal
model*, not the code against a rule list.** That is a higher-order artefact.

---

## 6. The tenant fence in the type system — and its stated limit

`crates/buzz-core/src/tenant.rs` is ~200 lines and contains **the most self-aware passage in the study**.

**The invariant it encodes:**

> *"The whole multi-tenant safety story rests on one invariant from the formal model (conformance 'row
> zero'): **a request's community is resolved from the connection host by the server, never supplied or
> influenced by the client.**"*

**How:** `TenantContext` and `CommunityId` have **no `Default`, no `Deserialize`, and no way to parse a
community from client input.** A `CommunityId` *"only ever comes from host resolution or from a DB row
the server already scoped."*

**★ And then the paragraph that earns the study's respect:**

> *"This is a **lint-and-review fence, not a compiler fence.** `TenantContext::resolved` and
> `CommunityId::from_uuid` are **public** so the host-resolution path (in another crate) can call them —
> which means **a determined caller elsewhere *could* call them too.** The migration-lint harness
> forbids constructing a `TenantContext` outside host resolution and tests; **the type only removes the
> *accidental* path** (deserializing a client-chosen community), and review/lint closes the deliberate
> one. **We say this plainly rather than overclaim a guarantee the `pub` API doesn't give.**"*

**Plain meaning: the type system closes the mistake, not the loophole — and the code says so, names the
loophole, and names what closes it.** *CZ observation: this is precisely the distinction our own
`CC-84` question turns on — **what a mechanism prevents by construction versus what it merely discourages
by convention** — and here the platform drew the line itself, in a comment, before anyone asked.*

**And the normalization rule is the second half of the fence** (`normalize_host`): lowercase, strip one
trailing FQDN dot, strip a default port (`:80`/`:443`). **Stored and resolved with the *same function*
so *"`Relay.Example`, `relay.example.`, and `relay.example:443` all resolve to the one community — they
can never split into distinct tenants."*** Plus `validate_community_host` (strict DNS-label validation)
and `relay_url_authority` (**shared by host resolution, startup seeding and the admin CLI "so all of
these derive the byte-identical authority that live request resolution produces"**). **Plain meaning:
the fence has to be the *same function* on every path, or a bootstrapped community lands under a host no
request ever resolves to** — a bug class the comment names explicitly.

---

## 7. The community-deletion lifecycle — the workspace's own end-of-life

**This is the most operationally detailed subsystem in the batch, and `ARCHITECTURE.md` §1 gives it more
space than anything else.** Six tables exist for it alone: `community_deletion_requests` ·
`community_deletion_approvals` · `community_deletion_checkpoints` ·
`community_deletion_executor_heartbeats` · `community_deletion_manifest_keys` ·
`community_serving_write_leases`.

**The flow, in the doc's own terms:**

- Admission is by **operator-signed NIP-98** HTTP request to `POST /operator/communities/delete`,
  **accepting only an exact normalized, archived community whose asserted pubkey is its sole current
  owner.** The caller supplies the **request UUID as the stable idempotency identity.**
- **Admission returns `202` at the `submitted` stage and performs NO inventory, approval, quiescing,
  object-store access, or deletion execution synchronously.**
- **Stages:** `submitted` → `inventoried` → `approved` → `fenced` → `drained`.
- **Recovery is a privileged abort "which stays open across the reversible `submitted`, `inventoried`,
  `approved`, and `fenced` stages — releasing the request fence while leaving the community archived —
  and closes from `drained` onward, when tenant-state destruction may have begun."**
- **Replay converges:** *"Replaying the same UUID converges to its current stage; a different UUID
  conflicts with the existing one-active-request invariant until that request is aborted."*

**★ And then the honesty about the consent model, which is remarkable:**

> *"**Owner consent on this path is asserted, not proven.** The mediating operator authenticates the
> owner and collects the deletion acknowledgement **out of band, upstream of the relay**; the request
> itself carries only the operator's NIP-98 signature… **No owner-signed attestation is required or
> checked, and owners have no self-service cancellation.**"*

**And the follow-on subtlety, which shows how carefully the invariants were thought through:**
ownership is mutable *only while a community is active*; archiving **freezes the owner**; and *"manual
operator handoff converges on an admitted owner request only when `buzz-admin deletions submit
--requested-by` **repeats the owner pubkey recorded on the row** … passing the operator's own pubkey
**does not converge — it conflicts** with the existing one-active-request invariant instead."*

**Plain meaning: the process distinguishes *who asked*, *who attested*, and *who executes* — as three
recorded pubkeys — and refuses to let them collapse into one.** The doc also names the residual gap: the
one-shot drain may claim an *"operator-attested owner-origin"* request and auto-freeze an approval, and
it says exactly what that means: *"The mediating operator remains the approval actor; **the owner
acknowledgement is pre-inventory intent, not a claim that the owner reviewed the digest.**"*

---

## 8. What else the workspace contains (named, per rule 6)

| Subsystem | Where | Plain gloss |
|---|---|---|
| **Artifacts (NIP-AR, `kind:45010`)** | `artifact_heads.sql` + `artifact_revisions.sql` + `NIP-AR.md` | **a typed record system as events** — each artifact has *"one home channel"* which determines who can read it; content types are client-defined (*"`buzz.task` or `buzz.project`"*) with tags for `title`, `assignee`, `project`, and an `op` (create/update) — **so tasks and projects are first-class records over the same log, and `artifact_heads` is explicitly "independent of event retention"** |
| **Event reminders (NIP-ER, `kind:30300`)** | `NIP-ER.md` | **encrypted, author-only reminders**: a **public `not_before` tag** for scheduling, everything else NIP-44-encrypted to the author. *"The relay learns that an author has a reminder due at a time. **It does not learn what the reminder is about.**"* |
| **Read state (NIP-RS)** | `personal_read_accounts` · `personal_read_frontiers` · `NIP-RS.md` | per-user read position, **its own tables** — a *personal* (not tenant-shared) read model |
| **Thread windows (`kind:39006`/`39007`)** | `thread_metadata.sql` + `docs/thread-window-deployment.md` | *"the relay is a relay-only kind"* — windowed thread loading with relay-computed bounds |
| **Forum** | `kind:45001`/`45002`/`45003` | posts, **votes**, comments — a full forum model as kinds |
| **Moderation** | `moderation_actions.sql` · `moderation_reports.sql` · `community_bans.sql` + `VISION_MODERATION.md` | ban/timeout/report with `kind:9040–9044` **commands** and `kind:1984` reports (**persisted, never fanned out**) |
| **Push** | **10 `push_*` tables** | leases, wake outbox, match queue, installations, endpoint quotas, **delivery/work-request replay tables** — the largest table family in the schema (batch 06) |
| **Git hosting** | `git_repo_names.sql` + relay `src/api/git/` | a repo registry; **NIP-34** patches/PRs/status as kinds; `GitOnObjectStore.tla` models the storage |
| **Audit** | `audit_log.sql` + `buzz-audit` | **hash-chain, per-community head**, `pg_advisory_xact_lock` single-writer, `catch_unwind` for lock release on panic |
| **Invites / join policy** | `relay_invites.sql` · `join_policy_acceptances.sql` | invite-based admission with a recorded policy acceptance |
| **Relay operators** | `relay_operators.sql` · `relay_admin_actions.sql` · `relay_admin_outbox.sql` · `relay_operator_audit.sql` | **the operator as a distinct principal from the member** |
| **Storage accounting** | `storage_accounting_snapshots.sql` · `storage_taxonomy_sweeps.sql` | per-community storage measurement |

**★ Two table families the reader should notice**: **10 push tables** and **6 community-deletion
tables** — out of 57. **Together they are 28 % of the schema, and neither is a "feature" a user sees.**
*Plain meaning: this platform spent nearly a third of its schema on delivery infrastructure and
tenant teardown.* That is a real statement about where the engineering effort went, and **batch 06 reads
both.**

---

## 9. The migrations — the honest history, and rule 10

**62 migrations**, `0001_initial_schema.sql` → `0062_system_channel_type.sql`. Measured:

- **23 of 62** migrations carry a **drop / remove / retire** flavour.
- **Exactly 1** performs `DROP TABLE`: **`0044_drop_nip_fi_ledger.sql`.**
- **The schema is maintained as desired-state, one file per table** (`schema/tables/public/*.sql`), with
  **a comment on each naming its conformance clause** — e.g. `events.sql`: *"Conformance: 'Channel-less
  global events and DMs'"*; `channels.sql`: *"Conformance: 'Channels and channel membership'"*;
  `communities.sql`: *"Conformance: **row zero** (host binding)"*. **The schema files point back at the
  spec, so a reader can go from a column to the property it exists for.**

**★ `0044` is the retirement worth quoting in full** (rule 10): it drops **14 tables** with `CASCADE`
and its header records the decision:

> *"Remove the Phase-A NIP-FI relay-side authority ledger (migrations 0041 and 0042). **Will+Tyler
> resolved 2026-09-01: OSS Buzz is stateless for identity ('Buzz speaks Nostr, nothing else').** The
> merged NIP-FI spec v2 (PR #7214, squash `d4420eb47`) requires the nostr_pubkey claim + NIP-42 proof
> unconditionally; **the durable ledger tables are dead code.**"*

**Plain meaning: a whole identity-authority subsystem was built, then removed, and the migration names
the people, the date, the PR, the resolution and the reason.** *CZ note (cross-study): Multica's
retirement lesson was that "the migration chain, not the schema, is the truth." **buzz's `0044` is the
cleanest single example of that in the study** — the schema alone would never reveal that
`authorization_invalidation_floors` had once existed.*

**And there is a second retirement in the same family:** `NOSTR.md`'s first line — *"The old **NIP-28
compatibility proxy has been removed**."* Two retirements found by reading, in the first three batches.

---

## 10. The self-declared HA non-conformance (a material finding)

**★ `docs/multi-tenant-relay.md` §Conformance contains a finding the platform made against its own
shipped deployment configuration.** The NIP-98 replay-protection seen-set (capacity 10,000, TTL 120 s
= 2× the ±60 s window) is `Arc<AppState>`-scoped, **not cross-pod**. Two gates must hold, and the doc
states the consequence:

> *"**Per-pod scope.** The seen-set is `Arc<AppState>`-scoped, not cross-pod, so **the same replayed
> event reaching two pods succeeds once on each.** P3 therefore requires *either* NIP-98 mints be
> pod-sticky on `event_id` *or* the seen-set be shared across pods… **The chart default
> (`replicaCount: 1`) satisfies this gate today; the shipped HA examples (`replicaCount: 3` in
> `deploy/charts/buzz/examples/argocd-app.yaml:27` and `…flux-helmrelease.yaml:35`) are
> P3-non-conforming as shipped unless the operator adds one of: (a) … (b) …**"*

**It then evaluates both fixes honestly** — (a) an ingress hash on the `Authorization` header, with
**two named caveats** (*"it couples replay-stickiness to literal-byte-identity of the auth header … and it
does not extend to any mint path that moves off HTTP"*) — and **recommends (b)**, a shared seen-set in
the Redis already present for git-pubsub: *"**This is the recommended path** — no new infra surface and
none of (a)'s fragility."*

**Plain meaning: the platform's own spec says its shipped multi-replica example does not satisfy the
replay-protection property, names the two example files and line numbers, and recommends a fix.** That is
the strongest form of the self-audit pattern this study has been collecting.

---

## 11. Capability table (tagged by pole)

| Capability | Plain gloss | Pole | Q1 · USER VALUE | Q2 · VISION VALUE |
|---|---|---|---|---|
| **One log, three lenses (proved in schema)** | Stream/Forum/Workflow differ by `kind` + client, not storage | **P2 / PX-W** | the right shape per conversation without a second tool | **one index, N renderings** — the lowest duplication ceiling in the study |
| **Membership as the only gate** | access = which rows exist in `channel_members` | **P2** | explainable access; one table to audit | **identity-scoped access with no permission engine** |
| **Community = hostname, with a normalization fence** | the URL is the tenant, resolved and stored by the same function | **P2** | a workspace is a name and a door | **a tenant boundary that needs no protocol field** |
| **The `_operator_global_tables` allowlist** | a table either carries `community_id` or is on an auditable list | **P2 / PZ** | (indirect) fewer scope bugs | **the exception is as reviewable as the rule** — a mechanism to borrow outright |
| **Composite `(community_id, …)` uniqueness** | the existence oracle is closed by the key, not by a hash argument | **P2 / PZ** | no cross-tenant hints | **a leak class closed structurally rather than by policy** |
| **Sanitized error alphabet** | errors are drawn from a fixed set | **P2 / PZ** | no confusing cross-tenant errors | **an error surface treated as an attack surface** |
| **`search_tsv` GENERATED + a privacy kind list** | search is a stored column; 8 sensitive kinds are structurally unsearchable | **P2 / PZ** | fast search with no drift | **privacy enforced at the storage layer, not the query layer** |
| **Spec-in-tree + 13 model mutations** | the theorem is checkable and shown non-vacuous | **P2 / PZ** | (indirect) a boundary that survives scrutiny | **the study's first machine-checkable tenancy guarantee** |
| **Runtime trace conformance** | the running relay emits traces the model must accept | **P2 / PZ** | fewer silent isolation regressions | **a checker deliberately independent of the code it judges** |
| **The `tenant.rs` fence + its stated limit** | the type closes the mistake, review closes the loophole — and the code says so | **P2 / PZ** | (indirect) | **the precise language for construction-vs-convention** — directly relevant to `CC-84`'s question |
| **Per-community audit chain** | hash-chained log with a per-tenant head | **P2 / PZ** | tamper-evident history | a chain that **cannot be spliced across tenants** (Tamarin S3/S4 mutations) |
| **Community deletion as a staged, idempotent lifecycle** | six tables, five stages, a UUID idempotency key, a privileged abort | **P2 / PZ** | a tenant can be safely retired | **teardown treated as a first-class state machine** — rare and valuable |
| **"Consent asserted, not proven"** | the deletion path records who asked vs who attested vs who executes | **PZ** | honest expectations | **a named provenance model instead of an implied one** |
| **Artifacts (NIP-AR)** | tasks/projects as typed, channel-homed records | **P2 / P3** | work items live beside the conversation | **a record system that reuses the log** — handed to batch 04 |
| **`_operator_global_tables` split: operator vs member** | operators are a distinct principal | **P2 / PZ** | clear roles | a two-tier principal model worth weighing |
| **62 migrations; `0044` drops 14 tables with a dated reason** | the history is readable | **PZ** | (indirect) | **rule 10 has a rich, honest surface here** |

---

## 12. Findings carried forward (into batches 04–07)

**F3-1 · The tenant fence is real, provable, and *lintable* — and the platform states precisely what it
does not guarantee.** Three layers: a **type fence** (`tenant.rs` — no `Default`/`Deserialize`; "removes
the accidental path", with the deliberate path named), a **schema fence** (41/57 tables carry
`community_id`; the exceptions are an auditable table), and a **proof fence** (TLA+ + Tamarin + 13/32
mutations). → **batch 07 weighs this as the study's most transferable mechanism.**

**F3-2 · Isolation is stated as non-interference, not as a WHERE clause — and the difference is
enumerated.** Four in-scope channels (C2.1–C2.4), two closed by *code-fences* whose fragility is
documented (*"clean — but by current code, not by the proof"*). → carried to batch 06.

**F3-3 · The runtime half is the unusual half.** `buzz-conformance` checks **executions against the
model**, with the checker **deliberately re-implementing the spec** so production helpers cannot hide a
bug from both sides. → batch 07.

**F3-4 · One log, three lenses is true at the storage layer** (nullable `channel_id`, integer `kind`, one
`search_tsv`; no per-surface tables). **F1-7 is confirmed in code.** → batch 05 reads the client side.

**F3-5 · Privacy is partly a storage-layer property.** 8 sensitive kinds are structurally unsearchable
by a `NULL` tsvector; DM channels are `hidden`; gift-wrapped DMs are stored channel-less. → batch 06.

**F3-6 · The schema is desired-state, one file per table, each naming its conformance clause** — so a
column can be traced to the property it exists for. **And `schema/tables/public/_operator_global_tables.sql`
makes the tenant-fence exceptions reviewable in one diff.** → batch 07.

**F3-7 · A staged, idempotent community-deletion lifecycle with six tables and a five-stage state
machine; consent is "asserted, not proven"; three pubkeys are kept distinct (requester, attestor,
executor).** → batch 06.

**F3-8 · Material: the shipped 3-replica HA example is self-declared NON-CONFORMING on NIP-98 replay
protection, with the files and lines named and a recommended fix.** → batch 06 must carry this; it is a
deployment-level, not architectural, gap.

**F3-9 · Two retirements found by reading in three batches:** the NIP-28 compatibility proxy
(`NOSTR.md:1`) and the whole Phase-A NIP-FI authority ledger (migration `0044`, 14 tables, dated
reason). **Rule 10's surface here is the richest in the study — a renaming product plus 23 migration
files with a drop/retire flavour.** → the synthesis.

**F3-10 · 41 of 57 tables carry `community_id`; 10 are push tables and 6 are community-deletion tables —
28 % of the schema is delivery infrastructure and teardown.** → batch 06.

---

## 13. What batch 03 does NOT claim

- **It does not re-verify the proofs.** It reads the spec's *claims about its models* (state counts,
  lemma counts, mutation outcomes) and records them as the document's claims; **re-running TLC or Tamarin
  is not part of this study** and would require the toolchain. Where the document's own words are quoted,
  they are quoted as its claims — **which is the whole point of rule 1 being about code, not docs.**
- **It does not claim the *implementation* satisfies the model.** That is exactly what the
  `buzz-conformance` crate exists to widen coverage on, and it says plainly: *"Trace conformance only
  checks executions you ran."*
- **It does not compare buzz to our own platform.** Rule 5.

---

*Batch 03 of 07. Written 2026-10-16. Next: `findings/04-automations.md` (P3) — `buzz-workflow`:
YAML-as-code, the 4 triggers, the 7 actions, approval gates, the cron scheduler, webhooks, huddles, and
the six-kind job protocol inherited from batch 02.*
