# buzz — Batch 04: the automations (P3)

**Pole: P3 (automations) — how work runs without a human pressing a button.**
**Source:** `platforms/_extracted/buzz-main/` at `v0.5.28`. **Rule 1 applies: the code is the
authority. Every number below was counted in the tree; every claim the docs make is checked
against the code and the divergences are recorded, not smoothed over.**

**Read for this batch:** `crates/buzz-workflow/` (5 files, **5,263 lines**),
`crates/buzz-db/src/store/workflow.rs` (**2,925 lines**) + `store/workflow/deletion.rs`
(210 lines), the workflow tables in `migrations/0001_initial_schema.sql`,
`crates/buzz-relay/src/handlers/command_executor.rs` (1,639 lines — the command half),
`crates/buzz-relay/src/api/bridge.rs` (the webhook route),
`crates/buzz-relay/src/webhook_secret.rs` (161), `crates/buzz-relay/src/workflow_sink.rs`
(1,525), `crates/buzz-relay/src/handlers/side_effects.rs` (the revocation path), and
the workflow UI under `desktop/src/features/workflows/`.

---

## 1. The shape: one crate, five files, and an unusually honest header

`buzz-workflow` is **small by this study's standards** — 5,263 lines, five modules:

| File | Lines | What it is |
|---|---|---|
| `schema.rs` | 1,001 | The YAML/JSON definition types and all validation |
| `executor.rs` | 1,981 | Sequential execution, templates, conditions, action dispatch |
| `lib.rs` | 2,090 | The engine, the event hook, the cron loop, authority gates |
| `error.rs` | 114 | The error enum **and its stable `code()` mapping** |
| `action_sink.rs` | **77** | **The trait, and nothing else** — the seam |

The crate header is worth quoting because it is the kind of honesty this study rewards:

> *"Action dispatch uses placeholder implementations that log intent. Real event emission is
> wired in WF-07/08 (relay integration)."* — `executor.rs:9-10`

That sentence is **the batch in miniature**: buzz ships a complete, validated, well-tested
*definition language and execution model* for automations, and a **separately wired
side-effect layer** — and the seam between them is one 77-line trait. Section 6 is about
what that seam does and doesn't carry.

**One measured design fact that stands out immediately.** The engine has **no queue**.
`max_concurrent` is a **100-permit semaphore** and the acquire is `try_acquire()` — a run
that finds no permit **fails immediately** with `CapacityExceeded` (`executor.rs:1071-1076`,
`1121-1126`). This is self-declared: *"Does NOT queue workflow runs when at capacity —
returns `CapacityExceeded` immediately"* (`ARCHITECTURE.md:663`). **It is the opposite of
every scheduler mechanism the earlier platforms in this study offered**, and it means buzz's
automation layer is **deliberately lossy under load** — a re-trigger is possible, a backlog
is not.

---

## 2. The definition language — YAML authored, canonical JSON stored

Workflows are authored in YAML and stored as **canonical JSON**, and `parse_yaml` validates
then re-serialises (`schema.rs:311-317`). The stored `definition` is that JSON; the
`definition_hash` is a SHA-256 over it. The definition carries five top-level fields —
`name`, `description`, `trigger`, `steps`, `enabled` (default `true`) — and the shape is
the same one every platform in this study arrived at: **a trigger, then an ordered list of
steps.**

### 2.1 Triggers — the code has FIVE; the doc says four

This is the batch's first **rule-1 divergence**, and it is a clean one.

`TriggerDef` is a serde **internally-tagged enum** on the key `on:`
(`schema.rs:36-71`). Counting the variants in the code:

| # | Variant | YAML tag | Fires on |
|---|---|---|---|
| 1 | `MessagePosted` | `on: message_posted` | kind **9** (`KIND_STREAM_MESSAGE`) in the workflow's channel |
| 2 | `ReactionAdded` | `on: reaction_added` | kind **7** (`KIND_REACTION`) |
| 3 | **`DiffPosted`** | `on: diff_posted` | kind **40008** (`KIND_STREAM_MESSAGE_DIFF`) |
| 4 | `Schedule` | `on: schedule` | the cron loop (`cron:` XOR `interval:`) |
| 5 | `Webhook` | `on: webhook` | `POST /hooks/{id}` |

**`ARCHITECTURE.md:632` states "4 trigger types: `message_posted`, `reaction_added`,
`schedule`, `webhook`" — and omits `diff_posted`.** The code has it, the tests cover it
(`lib.rs:1533-1545`, `schema.rs:984-1000`), and `trigger_matches_event` matches it against
kind 40008 (`lib.rs:1043`). **The doc is stale, not the code.** A reader who trusted the
doc would not know a diff-review trigger existed.

**The mapping is deliberately exact.** `trigger_matches_event` compares **single kind
numbers**, not ranges (`lib.rs:1038-1047`), and the tests pin it hard: `message_posted`
matches 9 and **must not** match 7 (reaction), 45001 (forum post) or 40002 (v2 stream
message); `diff_posted` matches 40008 only (`lib.rs:1438-1545`). This is the kind-integer
model holding under test: **a new feature is a new kind, and no old trigger silently adopts
it.**

**Trigger filters are `evalexpr`, evaluated at fire time, not match time.** `MessagePosted`,
`ReactionAdded` and `DiffPosted` each carry an optional `filter:` expression; the tests
state the split explicitly — *"the filter expression is evaluated at execution time, not
trigger-matching time"* (`lib.rs:1466`). `ReactionAdded` additionally carries an optional
`emoji:` which **is** checked at selection time (`should_fire_workflow`, `lib.rs:888-902`).

### 2.2 The `Schedule` trigger has three self-defending rules

The schedule trigger carries two mutually exclusive fields and **validates all three
combinations at definition time** (`schema.rs:244-275`):

1. **Neither `cron` nor `interval`** → rejected ("requires either 'cron' or 'interval'").
2. **Both** → rejected ("cannot specify both").
3. **A sub-minute interval** → rejected, and the error message names the reason:
   *"interval must be at least 60s (cron loop ticks every 60 seconds)"* (`schema.rs:269-273`).

Rule 3 is the kind of thing a careful engineer writes and a careless one doesn't: **the
scheduler's tick period is a hard constraint on the definition language, so it is enforced
where the author can see it rather than silently mis-firing at runtime.** The comment even
carries the fix number — `// Fix 4:`.

**Cron is normalised, not rejected.** The `cron` crate wants 7 fields
(`sec min hour dom month dow year`); buzz accepts **standard 5-field cron** and normalises
by prepending `0` and appending `*` (`normalize_cron`, `schema.rs:299-306`). 5-, 6- and
7-field forms are all accepted and all unit-tested (`schema.rs:828-946`). **This is a small
interoperability decision with a large effect**: an author pastes a familiar
`0 9 * * 1-5` and it works.

### 2.3 Actions — seven, and two of them do not work

`ActionDef` is serde-tagged on `action:` (`schema.rs:93-155`). **Seven variants**, and the
count matches the documentation exactly:

| Action | Fields | Executor behaviour |
|---|---|---|
| `send_message` | `text`, `channel?`, `reply_in_thread?` | **Real** — through the action sink |
| `send_dm` | `to`, `text` | **`NotImplemented`** 🚧 WF-07 |
| `set_channel_topic` | `topic` | **`NotImplemented`** 🚧 WF-07 |
| `add_reaction` | `emoji` | Real, **but only under the `reqwest` feature** |
| `call_webhook` | `url`, `method?`, `headers?`, `body?` | Real under `reqwest`; falls back to `skipped: true` |
| `request_approval` | `from`, `message`, `timeout?` (default `24h`) | Returns `Suspended` — **and the caller cannot use it** (section 5) |
| `delay` | `duration` | Real `tokio::time::sleep`, **capped at 270 s** |

**Two actions are honest stubs.** `SendDm` and `SetChannelTopic` both `warn!` then return
`WorkflowError::NotImplemented` (`executor.rs:655-665`), with `// TODO (WF-07)` comments.
`ARCHITECTURE.md:956` declares this in its Known Limitations table — **the doc and the code
agree here**, which is worth noting because they don't everywhere.

**`delay` has a cap the doc gets wrong.** `ARCHITECTURE.md:636` says "delay | Pause
execution (max 300 seconds)". The code caps at **270 seconds** — `MAX_DELAY_SECS: u64 = 270`
(`executor.rs:751`) — and the comment explains precisely why:

> *"Cap delay at 270 seconds (4.5 minutes) — must be less than default_timeout_secs (300s)
> to avoid non-deterministic StepTimeout. Long delays (hours/days) should use the scheduled
> resume pattern (future work: WF-09)."*

**This is a second rule-1 divergence, and a much better one than the first**, because the
code is not just different from the doc — **the code is right and the doc is a
simplification of a non-obvious interaction.** A 300-second delay under a 300-second step
timeout is a race; the author found it and left 30 seconds of headroom. The doc rounded.

### 2.4 Validation is a real gate, not a formality

`WorkflowDef::validate` (`schema.rs:173-278`) enforces five things, each with a test:

1. **Name non-empty** after `trim()` (so whitespace-only is rejected).
2. **At least one step.**
3. **Step IDs are `[A-Za-z0-9_]{1,64}`** — and the reason is stated in the error, not just
   the code: *"Step IDs become variable names like `steps_{id}_output_{field}`"*
   (`schema.rs:186-193`). **A step ID containing `-` would make `evalexpr` read
   `steps_my-step_output_field` as a subtraction** — the test at `schema.rs:880-897` says so
   in a comment. This is **variable-name injection closed at the definition boundary**.
4. **Step IDs unique.**
5. **`reply_in_thread: true` requires a message-based trigger** — rejected on `schedule` and
   `webhook` **at definition time**, with the error explaining that those triggers *"have no
   message to reply to"* (`schema.rs:216-242`). Explicitly `reply_in_thread: false` is fine
   on a schedule (test at `schema.rs:560-564`).

**Point 5 is a design decision stated as a validation rule**: buzz would rather refuse to
save a definition than save one that fails silently at 3 a.m. with nobody watching.

### 2.5 One flag with security weight: `requires_elevated_authority`

`WorkflowDef::requires_elevated_authority()` is **9 lines** (`schema.rs:165-169`) and it is
the whole of SEC-006's premise:

```rust
self.steps.iter().any(|s| matches!(s.action, ActionDef::CallWebhook { .. }))
```

**If a definition contains a `call_webhook` step, it needs owner-or-admin authority — to
save it and to run it.** The doc comment gives the reason in one sentence that is the
correct reason: *"a workflow forwards channel content with the **owner's** standing
authority long after the save."* This is the **confused-deputy** problem named exactly, and
it is the load-bearing security idea of the whole P3 layer. Section 6.2 traces where it is
enforced.

---

## 3. The executor — sequential, single-pass, and explicit about partial failure

The executor is **sequential by construction**. `execute_steps` is a `for` loop over
`def.steps.iter().enumerate()` (`executor.rs:1188`). There is no parallelism, no branching
graph, no fan-out — a workflow is a **straight line with optional skip gates.** Compared to
the graph engines of earlier platforms in this study, this is a **deliberately smaller
language**, and the schema keeps it that way by having no `goto`, no `parallel`, no
`foreach`.

Per step, four things happen in a fixed order (`executor.rs:1194-1300`):

1. **Condition.** If `if:` is present, evaluate it. `Ok(true)` → run; `Ok(false)` → push a
   `"skipped"` trace entry and `continue`; `Err` → **return the error with the trace so
   far**.
2. **Template resolution.** Substitute `{{...}}` in every action field.
3. **Dispatch under timeout.** `tokio::time::timeout(step.timeout_secs.unwrap_or(default), …)`
   — default **300 s**.
4. **Store the output** in `step_outputs` keyed by step ID, so later steps can reference
   `{{steps.ID.output.FIELD}}`.

**The `PartialProgress` pattern is the study-worthy part.** Every failure path returns
`(WorkflowError, PartialProgress)` where `PartialProgress { step_index, trace }`
(`error.rs:9-15`) carries the trace of steps that *did* complete. The comment says why:
*"rather than losing it when the in-memory `Vec` is dropped"* — and `finalize_run` writes
that partial trace to the DB alongside the failure (`lib.rs:278-303`). **A failed run is
still a readable run.** Three platforms in this study lost the trace on failure; buzz
returns it as a value.

### 3.1 Templates: single-pass, non-recursive, and unknown keys stay literal

`resolve_template` (`executor.rs:74-127`) supports two namespaces:

- `{{trigger.X}}` — `text`, `author`, `channel_id`, `timestamp`, `emoji`, `message_id`,
  plus **any key from the webhook body** (`TriggerContext::get_field`, `executor.rs:53-63`).
- `{{steps.STEP_ID.output.FIELD}}` — one level of JSON object navigation only
  (`json_get_str`, `executor.rs:158-166`).

**Two filters exist**, and the second one is a security decision:
- `| truncate(N)` — first N **characters** (not bytes; the test asserts `chars().count() == 5`).
- `| npub` — hex pubkey → full bech32 `npub`.

The comment on `npub` is worth quoting because it is the kind of reasoning this study looks
for: *"full bech32 npub — **truncated prefixes are grindable**"* (`executor.rs:194`). The
legacy alias `truncate_pubkey` is kept but now produces a **full** npub, i.e. **the name is
the bug that was fixed and the alias is kept for compatibility.** A reader who assumed
`truncate_pubkey` truncates would be wrong; the test pins the new behaviour
(`executor.rs:1381-1394`).

**Three deliberate behaviours that are all "fail soft":**
- **Unknown `{{key}}` is left as literal text**, not an error and not empty
  (`executor.rs:113-119`). Test: `resolve_unknown_variable_left_literal`.
- **Unclosed `{{` is emitted literally** and parsing stops, no panic
  (`executor.rs:90-98`).
- **A non-pubkey passed to `| npub` passes through unchanged** (test
  `executor.rs:1694-1705`).

But an **unknown filter name is an error** (`TemplateError`, `executor.rs:202-204`) — the
line is between *"data we don't have yet"* (soft) and *"a directive we don't understand"*
(hard). That is a defensible place to draw it.

### 3.2 Conditions: `evalexpr`, with three defences around it

`evaluate_condition` (`executor.rs:363-398`) is the most carefully defended piece of the
executor, and the defences are stated as comments that name the attack:

1. **`EVAL_TIMEOUT = 100 ms`** — *"`evalexpr` is not designed for adversarial input — a
   deeply nested or recursive expression can spin indefinitely"* (`executor.rs:350-355`).
2. **`MAX_EXPR_LEN = 4096`** — and the comment admits the limit of the first defence:
   *"The spawn_blocking thread **cannot be cancelled** by `tokio::time::timeout` — it will
   run to completion even after timeout. Length-limiting the expression prevents worst-case
   O(2^n) evaluation paths."* (`executor.rs:371-381`).
3. **Variable-name collision defence on webhook fields.** Webhook body keys are registered
   **first**, as `trigger_{key}`, and any key starting with `trigger_` or `steps_` is
   **skipped** — *"so that standard trigger fields inserted below always take precedence and
   cannot be spoofed"* (`executor.rs:282-292`).

**Defence 3 is the one that matters for P3.** A webhook is an unauthenticated-by-content
input path; without the skip, a caller could POST `{"text": "P1"}` and **overwrite
`trigger_text`**, forging the very field an `if:` filter compares against. The code closes
it, and the ordering comment says exactly which way the paint goes.

**Four custom functions are registered** because `evalexpr` v11 ships without them:
`str_contains`, `str_starts_with`, `str_ends_with`, `str_len` (`executor.rs:240-280`).

**The dot-to-underscore translation is documented as a table** (`executor.rs:212-222`) —
`trigger.text` → `trigger_text`. **And `trigger_is_reply` is deliberately a boolean, not a
string** (`executor.rs:308-314`) so a filter can write `trigger_is_reply == false`.

### 3.3 `trigger_is_reply` — a predicate that had to be re-derived three times

`event_is_reply` (`lib.rs:1012-1016`) does **not** look for any `e` tag. It delegates to
`buzz_core::nip10::parse_thread_markers` and returns `.reply.is_some()` — with a comment
explaining the lockstep requirement:

> *"a `root` marker alone is top-level, and a marker with a malformed (non-64-hex) event id
> is ignored by ingest, so it must not flip `trigger_is_reply` either — else a
> `trigger_is_reply == false` workflow would skip a message ingest stored as a new
> top-level post."*

**Five tests** pin every corner (`lib.rs:1609-1743`): root+reply → reply; reply only →
reply; **root only → not a reply**; bare `e` tag → not a reply; malformed reply id → not a
reply; valid root + malformed reply → not a reply. **This is a predicate that exists in
three places (ingest, NIP-10 parser, here) and the test suite is what keeps them in
lockstep.** It's the clearest example in this batch of the study's rule that *a claim
repeated in N places is still one claim* — and buzz **delegates rather than repeats**, which
is why it holds.

### 3.4 `author` comes from the signature, never from a tag

`build_trigger_context` (`lib.rs:942-1003`) sets `author = event.event.pubkey.to_hex()`, and
the comment states the rule:

> *"Workflow conditions make authorization decisions from `trigger_author`, so it must come
> from the event signature. An `actor` tag is ordinary signer-controlled metadata and cannot
> speak for another pubkey."*

**There is a test named `build_trigger_context_ignores_actor_tag`** where the signer
forges an `actor` tag naming a different pubkey, and the assertion is that the context
carries the **signer**. This is the P1 batch's NIP-OA/attestation theme reappearing as a
one-line rule in P3: **the signature is the identity; every tag is a claim about identity
that must be verified separately or ignored.**

**Reactions get special handling** (NIP-25): for kind 7, `emoji` = content, and
`message_id` = the target, found by scanning `e` tags **in reverse** for the first 64-hex
value (`lib.rs:963-988`). The test `test_build_trigger_context_reaction_multiple_e_tags`
proves the **last** `e` tag wins, not the first — so a reaction to a thread reply attaches
to the reply, not the thread root.

---

## 4. The engine — three doors into a run, and one gate in front of all of them

A workflow run can be created by exactly **three** paths, and this batch found them by
counting `create_workflow_run` callers:

| Door | Entry point | Trigger kind |
|---|---|---|
| **Event** | `WorkflowEngine::on_event` (`lib.rs:320-443`) | `message_posted`, `reaction_added`, `diff_posted` |
| **Schedule** | `WorkflowEngine::run` cron loop (`lib.rs:489-749`) | `schedule` |
| **Webhook** | `workflow_webhook` (`api/bridge.rs:2426`) | `webhook` |
| *(Manual)* | `handle_workflow_trigger` (`command_executor.rs:815`) | any — a signed command event |

### 4.1 The event door: fire-and-forget, and loop-proofed twice

`on_event` is called from the relay's ingest pipeline as **step 11**, *after* the event is
stored, and it is **spawned** — `ARCHITECTURE.md:291` says *"audit and workflow triggers are
spawned as independent async tasks. A failure in either does not fail the event
submission."* **The workflow layer cannot break message delivery.** That is a good property
and it is stated as one.

**Infinite loops are prevented at two independent layers** — belt and braces:

1. **Kind exclusion, before any work.** `is_workflow_execution_kind(kind)` — kinds
   **46001–46012** — returns early (`lib.rs:336-339`). The range function is a `const fn`
   with its own doc comment: *"These must not trigger workflows (prevents infinite loops)."*
   (`kind.rs:837-840`).
2. **A tag exclusion.** `ARCHITECTURE.md:295` adds *"relay-signed messages with
   `buzz:workflow` tag, and `KIND_GIFT_WRAP` are excluded"* — and the sink **sets that tag**
   on every message it emits (section 6.3). So **a workflow that posts a message cannot
   re-trigger itself through the message-posted door.**

**The test `workflow_execution_kinds_do_not_match_any_trigger`** asserts the range
`KIND_WORKFLOW_TRIGGERED ..= KIND_WORKFLOW_APPROVAL_DENIED` matches neither trigger
(`lib.rs:1487-1510`). **Two mechanisms, because one of them (`is_..._kind`) is a filter the
caller must remember to apply, and the other (`buzz:workflow` tag) is a property of the
emitted event.** That redundancy is the right call.

### 4.2 The cache: a 10-second window with a stated, deliberate non-guarantee

The enabled-workflow list per `(community_id, channel_id)` is cached in a **moka** cache,
capacity 10,000, **TTL 10 s** (`lib.rs:103-105, 118-121`). The doc comment is unusually
explicit about the limits of the invalidation:

> *"the relay invalidates this cache on its own pod at the two workflow mutation sites
> (command upsert, NIP-09 deletion). There is deliberately no cross-pod invalidation —
> **workflow triggering is not an access-control fence**, so the worst case on another pod
> is a just-deleted workflow firing (or a just-created one missing events) for up to the
> TTL."*

**This is the correct framing and this study has not seen it stated so cleanly elsewhere**:
the cache is allowed to be stale **because correctness does not depend on it**. What *does*
depend on it — authority — is checked **per fire**, not per cache fill (section 4.4). The
design pays one extra `SELECT`-free path for events and zero correctness.

### 4.3 The cron loop: a deterministic claim key is the whole trick

`WorkflowEngine::run` (`lib.rs:489-749`) is a `loop { sleep(60s); … }`. For each enabled
schedule workflow it computes a **`scheduled_for` instant** and then makes a **durable
claim** against it.

**The insight is that `scheduled_for` must be a function of the schedule, not of the
clock.** `cron_fire_instant` (`lib.rs:765-785`) uses **window-based matching**:

```rust
let window_start = now - chrono::Duration::seconds(window_secs);
sched.after(&window_start).next().filter(|t| *t <= now)
```

and returns **the cron's own scheduled instant**, never `now`. The comment states the
cross-pod consequence:

> *"The returned instant is the cron's own scheduled time (not `now`), so **every pod
> evaluating the same expression in the same window computes the same value** — making it a
> safe, deterministic claim anchor for cross-pod at-most-once firing."*

Window matching also **tolerates tick drift**: the test
`cron_fire_instant_within_drift_window_anchors_on_scheduled_time` fires at 09:00:45 for a
`0 9 * * *` schedule and asserts the anchor is **09:00:00** — so a second pod ticking five
seconds later computes the **identical claim key**.

**Interval triggers get the same treatment via bucket quantisation.**
`interval_fire_instant` (`lib.rs:796-822`) computes `floor(now / interval) * interval` from
the Unix epoch, so two pods at 12:34:56 and 12:59:01 on a 1 h interval **both** floor to
12:00:00 (test `interval_fire_instant_quantizes_to_bucket_boundary`).

**The claim SQL is a single `INSERT … ON CONFLICT DO NOTHING`** (`store/workflow.rs:530-544`):

```sql
INSERT INTO scheduled_workflow_fires (community_id, workflow_id, scheduled_for)
SELECT w.community_id, w.id, $3 FROM workflows w
WHERE w.community_id = $1 AND w.id = $2
ON CONFLICT (community_id, workflow_id, scheduled_for) DO NOTHING
RETURNING …
```

**The loser gets zero rows and skips before creating a run or doing anything else.** The PK
is the mutex. This is the **third** platform in this study to use `INSERT`-conflict as the
dedupe primitive, and the storage layer's own comment names the design lineage — *"Plan §5:
the at-most-once cron fire claim."*

### 4.4 The authority gate: one function, called at four doors, before the claim

`check_owner_authority` (`lib.rs:148-171`) is **fail-closed by construction** — a lookup
*error* is `Unauthorized`, not `Ok`:

> *"Any lookup error denies (fail-closed): a removed owner must never keep exfiltration
> authority because a membership read happened to fail."*

The pure decision is 6 lines (`owner_authority_allows`, `lib.rs:1029-1035`) and has **three
dedicated tests**:
- **not a member → deny, always** (even for ordinary definitions);
- **member → allowed for ordinary definitions**;
- **elevated definition → `owner` or `admin` only** — a plain `member` is refused.

**Where it is called is the design.** All four doors call it **immediately before creating
the run**:
- event door: `lib.rs:393-402`
- cron door: `lib.rs:606-615` — and the comment explains the *ordering*: **before** the
  claim, because *"placing the gate after the claim would let a revoked owner's workflow
  consume the at-most-once fire slot (claims are never re-fired), turning revocation into a
  denial-of-fire for a later re-enable."*
- webhook door: `bridge.rs:2529-2533`
- manual trigger door: `command_executor.rs:872-880`

**That cron-ordering comment is the sharpest single sentence in this batch.** It identifies
a real bug class — *revocation as a resource-exhaustion attack on your own future* — and
fixes it by moving a check, not by adding a mechanism.

**And there is a durable second half.** When a member is removed from a channel,
`disable_departed_member_workflows` (`side_effects.rs:199-231`) sets `enabled = FALSE` on
their workflows and invalidates the cache. The comment states the division of labour:

> *"A workflow runs with its owner's standing authority; once the owner is no longer a
> member their workflows must stop firing on every path … The per-fire authority gate in
> `buzz-workflow` is the **fail-closed backstop**; this makes the revocation **durable and
> immediately visible**."*

**Failures of the disable write are logged, not propagated** — *"membership removal has
already been committed, and the per-fire gate still denies a removed owner even if this
disable write is lost."* **Two mechanisms, one load-bearing, one for latency** — and the
code says which is which. This is the study's pattern of *"correctness does not depend on
the fast path"* appearing a second time in one batch.

### 4.5 The interval cold-start: a liveness bug found and fixed in-tree

The interval path has a genuinely subtle failure and the fix is documented in full at
`lib.rs:445-476`. A brand-new interval workflow has **no in-memory anchor and no prior
claim**, so `last` resolves to `None`; `interval_should_fire` then defaults `last = now`,
**suppresses**, and writes nothing. But the in-memory anchor is only written *after a
successful claim*, and **no claim is attempted until the prefilter passes** — so *"every
subsequent tick repeats with `last = None` and the workflow suppresses forever."*

**The fix is to seed `now` on the `None` suppress path only** — *"We seed ONLY when `last`
was `None`; when `last` is `Some` we are correctly mid-interval and must not advance the
anchor, or it would never elapse."* **Three tests** cover it, including a regression for
the inverse bug: `interval_prefilter_does_not_advance_existing_anchor_on_suppress`.

The test module header even names the person who found it — *"Interval cold-start liveness
(Max's blocker on the scheduled lane)"* — which is the kind of provenance a future reader
needs and which most codebases throw away.

### 4.6 Two small things the loop does right

- **The anchor is pruned.** `last_fired.retain(…)` against the active set each tick
  (`lib.rs:741-747`), so the in-memory map can't grow forever as workflows are deleted.
  The comment labels it `// Fix 1`.
- **A failed run-insert keeps the claim.** If `create_workflow_run` fails after a won claim,
  the row **stays with `workflow_run_id` NULL** and is not re-fired — *"at-most-once is
  preserved over exactly-once on transient run-insert failures."* **The team chose the
  failure mode explicitly and said so.** `attach_scheduled_workflow_run` is a *separate,
  best-effort* link for audit forensics only.

---

## 5. The approval gate — infrastructure built, wiring absent, and **dead code by measurement**

This is the batch's largest finding and it needed counting, not reading.

**What the docs say:** `ARCHITECTURE.md:650` and `:955`, and `VISION.md:127` and `:231` all
say the same thing — the schema, REST endpoints, MCP tool and UI exist; **the executor does
not persist the approval token or suspend execution**, so a run that hits `request_approval`
is marked **Failed** (🚧 WF-08). `VISION.md:127` summarises it as *"The infrastructure is
there; the wiring is next."*

**What the code does** — and the docs are substantially right, but the measurement goes
further:

1. `dispatch_action` handles `RequestApproval` by generating a token and returning
   `StepResult::Suspended { approval_token }` (`executor.rs:725-744`), with the literal
   `// TODO (WF-08): create approval record in DB, emit kind:46010.`
2. `execute_steps` sees `Suspended` and **returns early** with the token in the
   `ExecutionResult` (`executor.rs:1279-1292`).
3. `finalize_run` receives that result, sees `approval_token.is_some()`, logs
   *"Workflow hit approval gate — not yet implemented, marking as failed"*, and writes
   `RunStatus::Failed` with `error_code: "approval_not_supported"` (`lib.rs:229-256`).
   The comment is explicit about the choice: *"Fail explicitly rather than creating
   unreachable WaitingApproval rows."*

**So far the doc is accurate. Now the measurement.**

`RunStatus::WaitingApproval` exists (`store/workflow.rs:89`) and **grep finds it in exactly
three kinds of place: its own definition/parse/display, two *comparisons* in
`command_executor.rs`, and the comment above.** **No production code path ever *writes*
it.** The two comparisons are `if run.status != RunStatus::WaitingApproval { warn!(…);
return; }` at `command_executor.rs:1231` and `:1290` — i.e. **guards that can only ever
take the bail-out branch.**

And `create_approval` — the function that would mint the row — has **zero production
callers**. Every hit is a test file (`admission_postgres_tests.rs`, `deletion_tests.rs`,
`store/workflow.rs`'s own tests).

**Therefore: `handle_approval_grant` (`command_executor.rs:1020-1130`),
`handle_approval_deny` (1132→) and `resume_workflow_after_approval` (1273-1352) — roughly
**330 lines of approval plumbing** — are reachable only from a run state that nothing can
produce.** An approval can be granted only if a pending approval exists; a pending approval
can only be created by `create_approval`; `create_approval` is never called in production.
**The chain is air-gapped from its own precondition.**

**And the project knows this.** The multi-tenant conformance suite leaves the approval lane
as an explicit `pending_lane`:

> *"nothing *mints* a pending approval over the wire: the executor's approval gate is an
> explicit TODO … and `create_approval` is only reached from unit tests. **A green
> end-to-end approval-isolation test therefore cannot be exercised today; writing one would
> violate this file's contract (a green run can never be faked by an empty/DB-only body).**
> It lands with WF-08."* — `conformance_multitenant.rs:1864-1871`

**That is an exemplary engineering artefact.** The team refused to write a test that would
pass without testing anything, and instead wrote a **named obligation with its dependency
named** (`WF-08 (approval minting)`) and the reason the fence it will exercise is *already
landed* (`get_approval_by_stored_hash(community, hash)` is community-scoped today). **A
pending lane that names its blocker is worth more than a green test that means nothing.**

**And the security work is genuinely done.** `workflow_approvals` has **PK
`(community_id, token)`** where `token` is a **SHA-256 hash**, never plaintext
(`store/workflow.rs:34-40`, migration `0001:411-431`). `check_approver_spec`
(`command_executor.rs:995-1018`) accepts **only** an exact 64-hex pubkey match or the
literals `""`/`"any"`, and **fails closed on anything else** — *"approver spec '{}' is not
yet supported"*. The `from: "@release-manager"` role syntax that `schema.rs:142` documents
is therefore **reachable in YAML and refused at grant time** — a documented-but-unsupported
field, which is a rule-1 divergence of the third kind (the schema is wider than the
enforcer). `generate_approval_token` uses `Uuid::new_v4()` from the OS CSPRNG and
**deliberately does not mix in `run_id`/`step_id`** — *"the UUID's own randomness is
sufficient and avoids the predictability of time-based entropy"* (`executor.rs:785-793`).

**Verdict on the approval gate: the fence is built, the gate is not.** buzz has a complete,
hashed-token, community-scoped approval *data model* and a complete, correctly-guarded
approval *command handler*, connected by **a missing call.** This is the study's cleanest
example of *"infrastructure exists"* meaning something precise: **the hard parts (scoping,
hashing, fail-closed authorisation) are done; the missing part is one `create_approval` call
and one status write.**

---

## 6. The side-effect seam — and the one interface that carries everything

### 6.1 The sink is 77 lines and it replaced an HTTP loopback

`ActionSink` (`action_sink.rs`) is one trait with **one method**, returning
`Pin<Box<dyn Future>>` for dyn-compatibility (the engine stores `Arc<dyn ActionSink>`). The
doc comment records *why it exists*:

> *"This replaces the HTTP loopback where the executor POSTed to the relay's REST API
> (**which failed with 401 auth errors**)."*

**A production bug, named, with its replacement.** And the design consequence is good:
`buzz-workflow` **never** depends on `buzz-relay` (confirmed in `Cargo.toml` — `buzz-core`,
`buzz-db`, `buzz-deletion`, plus pure utility crates). The dependency arrow points **in**:
the relay implements the trait and hands it to the engine via `set_action_sink`
(`lib.rs:177-181`), a `OnceLock` that **panics if set twice**.

### 6.2 The sink is the third place the community fence is re-checked

`RelayActionSink::send_message` (`workflow_sink.rs:205-…`) does its own tenant binding, and
the comment explains why it can't trust anything downstream:

> *"The run carries its owning community. Re-deriving the tenant from `config.relay_url`
> would post a community-B workflow's output into the deployment/default community under
> N>1. Read the community's host back to form a complete `TenantContext` (**host is for
> labelling only — the community is already fixed** and is never re-derived from it). Fail
> closed if the community no longer maps to a host."*

Then it **re-checks membership** at the destination: `is_member_cached(…)`, and if the owner
is not a member **and** the channel is not `open`, it refuses
(`workflow_sink.rs:270-280`). **So the owner's authority is checked three times on one run**
— at run creation, at the per-fire gate, and at the side effect. Not redundant by accident:
the engine *can outlive the request that spawned it* (stated at `executor.rs:549-552`), and
a long-lived task must not carry a stale authorisation.

### 6.3 The emitted message carries provenance in tags, and one tag is authority-bearing

Every workflow-posted message is signed **by the relay keypair** with the owner attributed
in tags (`workflow_sink.rs:305-330`):

| Tag | Meaning |
|---|---|
| `p` (owner hex) | attribution |
| `h` (channel UUID) | NIP-29 channel scope, canonical |
| `buzz:workflow` = `"true"` | **prevents recursive triggering** |
| `buzz:workflow-owner` | lets harnesses apply the owner's inbound policy after verifying the relay signature |
| `p` per resolved mention | preserves wake/feed behaviour |
| `buzz:workflow-mention` | **only** when the target was named in the owner's **stored, unrendered** template |

**That last row is the subtle one, and it is a security boundary.** The sink takes **two**
versions of the text: `text` (rendered, may contain `{{trigger.text}}` substitutions) and
`authored_text` (the owner's stored template). The doc comment on the trait parameter says
it outright: *"consumers must use this rather than trigger-controlled rendered output when
attaching authority-bearing metadata"* (`action_sink.rs:59-61`). The plan comment in the
sink is blunter: *"**trigger-controlled template substitutions cannot create it.**"*

**So an attacker who can cause a workflow to fire with a crafted message body cannot forge a
`buzz:workflow-mention` tag naming an agent** — because that tag is built from the
*author's* stored text, not the *trigger's* content. **This is the template-injection
variant of the confused-deputy problem, closed by carrying two strings instead of one.**

`resolve_mention_pubkeys` (`workflow_sink.rs:44-…`) defines the reverse-parse contract and
its doc comment is a list of five deliberate conservatisms — members only, exact display
name, greedy-longest non-overlapping, and **ambiguous names wake no one** (*"arbitrary
selection would silently misroute and tagging all of them is a false-wake firehose"*).

### 6.4 `call_webhook` is the one action with a real SSRF defence

`call_webhook_impl` (`executor.rs:874-962`) plus `check_ssrf` (838-867) is defensive
programming worth recording in full, because each line names its attack:

1. **DNS is resolved once and pinned into the client** via `.resolve(host, SocketAddr)` —
   *"without pinning, reqwest performs its own DNS resolution which could return a different
   address than the one validated above (DNS rebinding TOCTOU)."*
2. **Every resolved IP is checked** against `is_private_ip`; **any** private address rejects
   the whole request.
3. **`.no_proxy()`** — *"A system proxy would resolve the original hostname itself, bypassing
   the validated and pinned address."*
4. **`.redirect(Policy::none())`** — *"a redirect to an internal host bypasses the SSRF check."*
5. **10-second timeout.**
6. **The response is read in chunks with a 1 MiB cap** — *"`resp.bytes()` would buffer the
   entire body before we could check the size; chunked reading lets us abort early."*

**Six defences, six stated reasons, and items 3 and 4 are the two that most SSRF
implementations miss.** The `ARCHITECTURE.md:873` security table lists `CallWebhook` as an
application point for the shared validation pattern; `:892` correctly notes the webhook
*secret* is **not** an HMAC (*"compares the secret directly, not a body MAC"*) — the doc is
honest about the weaker construction rather than overclaiming.

### 6.5 The webhook door: same generic 404 for four different failures

`workflow_webhook` (`bridge.rs:2426-2586`) is the unauthenticated-by-default entry point,
and its dominant design decision is **one indistinguishable error**:

- **Row zero binds the tenant from the request `Host`**, not from the workflow row —
  *"a request for community A's host may only reach community A's workflows, even when the
  same workflow UUID also exists in community B."*
- **Unmapped host, lookup failure, and non-existent-in-this-community all return the same
  generic 404** — *"so a caller cannot probe which hosts or workflow ids exist on other
  tenants."*
- **A wrong secret returns the same 404**, not 401/403 — *"Until the caller proves the
  secret, every failure answers like a missing workflow, so the response never reveals that
  the workflow exists, its trigger type, or whether a secret was configured."*
- **A revoked owner returns the same 404** — *"so a revoked-owner workflow is
  indistinguishable from a nonexistent one."*
- **A workflow with no `channel_id` fails closed** — *"No channel scope means no channel
  authority to verify."*

**Four distinct failure causes, one byte-identical response.** This is the enumeration-oracle
defence, and the multi-tenant conformance suite tests it directly
(`workflow_trigger_is_community_confined` asserts the rejection *"must be the generic
`workflow not found` (no enumeration oracle)"* — with a **positive control** that the same
trigger succeeds under host A, so the rejection can't be attributed to an untriggerable
workflow).

**The secret is stored inside the definition JSON** under `_webhook_secret`
(`webhook_secret.rs`), and the module documents a **hash-ordering contract** that was
evidently once violated:

```
1. Build/update the definition JSON.
2. inject_secret(&mut def, &secret)   ← secret is now part of def
3. Compute definition_hash over def   ← hash covers the secret
4. Persist def + hash
```

> *"Reversing steps 2 and 3 (the previous bug) means the hash is computed over a definition
> that does not yet contain `_webhook_secret`, so every subsequent comparison fails."*

**A retired bug, documented as an ordering contract, with the failure mode named.** Secret
comparison is a hand-rolled XOR-fold constant-time compare, and the code **admits its own
limit**: *"a length mismatch is revealed immediately (not constant-time), but an attacker who
can observe response latency already knows the expected length from the generation algorithm
(UUID v4 → always 36 bytes), so leaking the length check provides no additional
information."* **An honest caveat beats a claimed constant-time compare that isn't.**

### 6.6 `send_message` re-validates the channel on every hop

The one action that really works validates more than the docs suggest: content non-empty
(not just non-NULL — `text.trim().is_empty()` → `EmptyContent`), UUID parse, **channel
exists**, **channel not archived** (`channel.archived_at.is_some()` → `ChannelArchived`),
owner is a member **or** the channel is `open`, and author pubkey parses. Five refusals
before a byte is written.

**A channel-scope decision worth noting:** `resolve_send_message_channel`
(`executor.rs:486-528`) **forbids cross-channel posting** for a channel-bound workflow —
the override must **equal** the workflow's channel or it's an `InvalidDefinition`
(*"channel override must match the workflow channel"*), with two tests pinning both the
refusal and the legitimate global-workflow case. So a definition cannot be used to make a
workflow post into an unrelated channel it happens not to be scoped to.

---

## 7. The schema — four tables, and the community fence is a composite PK

Four workflow tables, all created in `0001_initial_schema.sql`, all keyed by
`(community_id, …)` (`:362-466`):

| Table | PK | Notes |
|---|---|---|
| `workflows` | `(community_id, id)` | FKs to `communities`, `users(community_id, pubkey)`, `channels(community_id, id)` |
| `workflow_runs` | `(community_id, id)` | FK to `workflows` **`ON DELETE CASCADE`** |
| `workflow_approvals` | `(community_id, token)` | `token` = **SHA-256 hash**; two cascading FKs |
| `scheduled_workflow_fires` | `(community_id, workflow_id, scheduled_for)` | FK to runs uses **`ON DELETE NO ACTION`** |

**Two choices in this table set are worth calling out because the migration comments
*justify* them rather than just declaring them** — this schema is unusually well-annotated:

1. **`workflow_approvals`' PK is `(community_id, token)`, not `(token)`** — *"token-hash
   lookup scoped: approval token grants cannot act on another community's same hash
   (conformance)."* **The same hash value in two communities is two different rows.**
2. **The claim→run FK is `NO ACTION`, deliberately not `SET NULL`**, and the comment gives
   the mechanical reason: *"`community_id` is shared with the claim PK and is NOT NULL, so
   SET NULL is unimplementable here; a future delete of a still-linked run is blocked rather
   than orphaning the at-most-once claim row."* **A DDL constraint explained by the
   constraint that made the obvious option impossible.**

**`idx_workflows_enabled` is a partial index** (`WHERE enabled`) — *"Scheduler scans enabled
schedule workflows; community_id returned per row so side effects run under the owning
tenant's context."* And `definition_hash` is stored beside `definition` so
*"the same signed command cannot silently redefine a live workflow."*

**The deletion path is a fourth door and it is careful.** `delete_workflow_by_coordinate`
(`store/workflow/deletion.rs:30-43`) shares a **replacement advisory lock** with definition
saves, **treats a deletion older than the live definition as a no-op** (*"clients may
intentionally publish backdated definitions"*), and **retains no tombstone**. The doc states
the policy: *"Deletion is not a permanent coordinate ban: clients may publish a distinct
signed definition afterward, including a backdated version, to recreate the workflow."*
**A deletion policy stated as a policy, with its rejected alternative ("a deletion
watermark") named.** `WorkflowDeletionOutcome` returns `channel_id` **for trigger-cache
invalidation** — the invalidation the cache comment promised.

**Every list query is bounded.** `LIST_DEFAULT_LIMIT = 100`, `LIST_MAX_LIMIT = 1000`, and
the module header states the rule: *"Never uses string interpolation for query values — all
user data goes through bind parameters"* + *"Approval tokens are stored as SHA-256 hashes
(never plaintext)"* + *"All list queries have a bounded LIMIT to prevent unbounded scans."*
**Three stated invariants at the top of the file; all three verifiable in the file.**

### 7.1 The definition language is a Nostr event — kind 30620

Workflows are **not** created through a REST endpoint in normal use; they are created by
publishing a **kind 30620** event (`KIND_WORKFLOW_DEF`), a **NIP-33 parameterized
replaceable** (range 30000–39999, `d`-tag = the workflow UUID), whose **content is the
YAML** (`handle_workflow_def`, `command_executor.rs:638-700`). There is a compile-time
assertion that 30620 lands in the replaceable range (`kind.rs:912`).

The **execution** kinds (46001–46012) are the *observations*: `TRIGGERED`, `STEP_STARTED`,
`STEP_COMPLETED`, `STEP_FAILED`, `COMPLETED`, `FAILED`, `CANCELLED`,
`APPROVAL_{REQUESTED,GRANTED,DENIED}` — **twelve kinds that describe a run.** And
`KIND_WORKFLOW_TRIGGER` (46020) / `KIND_APPROVAL_GRANT` (46030) / `KIND_APPROVAL_DENY`
(46031) are the **commands**. So the whole feature is **commands in, observations out, all
through the same event log** — the batch-01 thesis holding in P3.

**Note this is not a NIP.** `docs/nips/` has 20 files; **none is a workflow NIP.** The
workflow protocol is specified in `ARCHITECTURE.md` §buzz-workflow, and the only workflow
obligation in `docs/multi-tenant-conformance.md` is **row 49** ("Workflows, runs, approvals,
webhooks, schedules"). **buzz has standardised 20 of its own extensions and left its
automation engine as an internal architecture chapter** — a deliberate boundary, and one a
reader should know before looking for the spec.

---

## 8. The frontend of P3 — 57 files, and a real authoring UI

The workflow UI is not a stub. **57 product `.ts`/`.tsx` files, 11,804 product lines, plus
2,645 test lines** under `desktop/src/features/workflows/` and `desktop/src/shared/api/`.
That is a **substantial authoring surface**, and it includes editors that plainly encode the
same rules the Rust schema enforces:

`CronExpressionInput`, `WorkflowScheduleFields`, `WorkflowTriggerConditions`,
`WorkflowMessageTextConditionEditor`, `WorkflowWebhookHeadersEditor`,
`WorkflowWebhookSecretDialog`, `WorkflowDurationField`, `WorkflowEmojiField`,
`WorkflowFormBuilder`, `WorkflowTemplateTextarea`, `WorkflowRunTrace`,
`WorkflowApprovalCard`, `WorkflowYamlDocument`, plus pure-logic modules
(`cronExpression.ts`, `workflowConditionExpression.ts`, `workflowDuration.ts`,
`workflowTemplateVariables.ts`) each with its own test.

**Two details worth recording, because they show the schema rules escaped the crate and
reached the author:**

- `workflowDuration.ts` exists, which means the duration grammar is a **shared contract**
  between the Rust parser and the UI — and the UI can refuse a sub-60 s interval before the
  server does.
- `WorkflowApprovalCard.tsx` exists — **a UI for a feature whose engine half is not wired**
  (section 5). This is the "infrastructure is there" claim made visible: the card is built,
  the run never gets to a state where it's shown.

**`desktop/src/features/workflows/` is the P3 surface, and the batch-05 frontend pass will
read it properly** — here it is noted only as evidence that buzz treats automations as a
**first-class product surface with a form-based editor and a raw-YAML view**, not as an
API-only feature.

---

## 9. What buzz's P3 does *not* have (measured, not assumed)

Negative results, each verified by search rather than by absence of memory:

- **No queue.** `try_acquire` + `CapacityExceeded`; no backpressure, no retry, no dead-letter.
  Self-declared (`ARCHITECTURE.md:663`).
- **No parallelism and no branching in a workflow.** A step list is a straight line; there is
  no `parallel`, `foreach`, `switch`, or `goto` in `ActionDef`/`Step`.
- **No retry policy on any action.** `call_webhook` has a timeout; no attempt count.
- **No run-history retention policy in code.** `workflow_runs` are *"not pruned today"*
  (stated in the `0001` comment); `scheduled_workflow_fires` **does** have
  `prune_scheduled_workflow_fires_before`, with a retention warning attached
  (`store/workflow.rs:626-632`).
- **No idempotency key on the webhook door beyond the secret.** A hostile caller with a valid
  secret can create runs at will; the only limiter is the 100-permit semaphore.
- **No approval-gate wiring** (section 5), and **no role-based approver** — `from:
  "@release-manager"` parses but `check_approver_spec` rejects it.
- **No `send_dm` and no `set_channel_topic`** (WF-07 stubs).
- **No workflow NIP**, and no `docs/` page for workflows (section 7.1).
- **`delay` cannot express hours.** 270 s cap (WF-09 named for the scheduled-resume pattern).

---

## 10. Findings

**F4-1 — The engine has no queue, on purpose, and it fails loudly.** `max_concurrent = 100`,
`try_acquire()`, `CapacityExceeded` returned immediately. `ARCHITECTURE.md:663` declares it.
**A workflow run under load is dropped, not deferred** — and the drop is a *typed* error
recorded on the run, not a hang.

**F4-2 — The docs under-count triggers: the code has 5, the doc says 4.** `diff_posted`
(kind 40008) is implemented, tested, and matched — and absent from
`ARCHITECTURE.md:632`'s list. Rule-1 divergence, code correct, doc stale.

**F4-3 — The docs over-state the delay cap: `ARCHITECTURE.md:636` says 300 s, the code caps
at 270 s.** The comment gives the reason (must be < the 300 s default step timeout to avoid a
non-deterministic `StepTimeout`). **Here the code is not just newer — it is more correct than
the doc.** Divergence #2.

**F4-4 — `from: "@role"` in `request_approval` parses and is refused at grant time.**
`schema.rs:142` documents a role mention; `check_approver_spec` (`command_executor.rs:995`)
accepts only a 64-hex pubkey or `""`/`"any"` and **fails closed** on anything else. **The
definition language is wider than the enforcer** — a third kind of divergence, and the safe
direction for it to be wrong in.

**F4-5 — The approval chain is air-gapped from its own precondition, and the project says
so.** `WaitingApproval` is **never written** by production code; `create_approval` has **zero
production callers**; therefore ~330 lines of grant/deny/resume in `command_executor.rs` are
unreachable. The conformance suite leaves the lane as a **named `pending_lane` that refuses
to fake a green** — *"writing one would violate this file's contract."* **The best artefact
in this batch is a test that was deliberately not written.**

**F4-6 — `if:` filters are defended against webhook-body variable spoofing.** Webhook keys
are registered **first**, as `trigger_{key}`, and any key starting with `trigger_`/`steps_`
is **skipped** so the standard fields cannot be overwritten (`executor.rs:282-292`). Without
this, `POST {"text": "P1"}` would forge the field a filter compares against.

**F4-7 — `authored_text` vs rendered `text` closes template injection of authority tags.**
The sink receives both; `buzz:workflow-mention` is built **only** from the owner's stored
template, so *"trigger-controlled template substitutions cannot create it."* A second string
carried through one interface is the whole defence.

**F4-8 — Determinism, not locking, is the cross-pod at-most-once primitive.** `scheduled_for`
is the **cron's own instant** (window matching) or the **interval bucket boundary**
(floor-division quantisation), so every pod computes the **same** claim key and the PK
`(community_id, workflow_id, scheduled_for)` + `ON CONFLICT DO NOTHING` resolves the race in
one statement. **No distributed lock is involved.**

**F4-9 — The authority gate is called at all four doors, and at the cron door it is
deliberately placed *before* the claim.** The comment names the bug class it avoids:
*"placing the gate after the claim would let a revoked owner's workflow consume the
at-most-once fire slot … turning revocation into a denial-of-fire for a later re-enable."*
**A check moved, not a mechanism added.**

**F4-10 — Revocation is durable (a disable write) *and* fail-closed (a per-fire gate), and
the code says which is load-bearing.** *"Failures are logged, not propagated … the per-fire
gate still denies a removed owner even if this disable write is lost."*

**F4-11 — The webhook door answers four distinct failures with one byte-identical generic
404**, tested with a **positive control** so the rejection can't be misattributed.
Enumeration-oracle defence, stated and exercised.

**F4-12 — `call_webhook` carries six SSRF defences with six stated reasons**, including the
two usually missed (`no_proxy` — a system proxy re-resolves the hostname; redirects disabled
— a 302 to an internal host bypasses the check) and a **pinned-DNS client built per request**
against rebinding TOCTOU.

**F4-13 — The interval cold-start liveness bug was found, fixed, and regression-tested in
both directions** — seed only on the `None` suppress path, never advance a `Some` anchor.
Test names the reporter. **A subtle bug with a durable memory.**

**F4-14 — The data model is complete where it matters and the missing part is one call.**
`workflow_approvals` has PK `(community_id, token)` with a **hashed** token and cascading
FKs; the grant path is community-scoped and fail-closed. **"Infrastructure is there" is
literally true: the hard parts are done.** What is absent is the *call*.

**F4-15 — The whole feature is events.** Definitions arrive as **kind 30620** (NIP-33
replaceable, YAML in `content`); commands are 46020/46030/46031; observations are
46001–46012. **There is no workflow NIP** — the spec is an `ARCHITECTURE.md` chapter, and the
only conformance obligation is row 49 of `multi-tenant-conformance.md`. buzz standardised 20
extensions and **chose not to standardise this one.**

---

## 11. Documents that claim things the code contradicts

Collected in one place, because rule 1 says the divergence *is* the finding:

| # | Claim | Where | Reality in code |
|---|---|---|---|
| D4-1 | "**4 trigger types**" | `ARCHITECTURE.md:632` | **5** — `diff_posted` (kind 40008) is implemented and tested |
| D4-2 | `delay` "max **300** seconds" | `ARCHITECTURE.md:636` | **270 s** (`executor.rs:751`), to stay under the 300 s default step timeout |
| D4-3 | `request_approval` `from:` accepts a **role** | `schema.rs:142` (doc comment) | `check_approver_spec` accepts only an exact 64-hex pubkey, `""`, or `"any"`; **roles fail closed** |
| D4-4 | "approval gates … the engine does not yet persist the token" | `ARCHITECTURE.md:650`, `:955`, `VISION.md:127` | **Accurate** — and the measurement adds that `WaitingApproval` is *never written* and `create_approval` has *zero production callers*, so the grant path is unreachable, not merely unwired |
| D4-5 | The workflow engine "is fully implemented" (cron) | `ARCHITECTURE.md:652` | **Accurate** — with the caveat that a *failed run-insert* leaves the claim held (at-most-once over exactly-once, stated) |

**Two divergences where the doc is stale, one where the doc is wider than the enforcer, and
two where the doc is right and the code merely needed counting to see how right.** The
*correct* direction of the approval claim (D4-4) is worth noting: the project's own docs
**under**-state the gap, and the conformance suite states it precisely. **The most accurate
document about the approval gate is a skipped test.**

---

## 12. The pole, plainly

**What P3 is:** a **channel-scoped, YAML-authored, sequentially-executed automation engine**
whose triggers, actions, commands and observations are all **signed events in one log**. Five
triggers, seven actions (two of them stubs), a real template language with one level of step
output, real conditions with three defences, a 60-second cron loop whose dedupe is
**determinism rather than locking**, one authority gate called at all four doors, and one
77-line side-effect seam that the relay implements.

**What is genuinely strong:**
- **The cross-pod at-most-once claim.** Deterministic instant + PK conflict = no locks, no
  coordinator, restart-safe, and the interval anchor is read back from the claim table.
- **`check_owner_authority`'s placement and its fail-closed shape.** Four doors, one
  function, and the ordering argument at the cron door is a real bug class named and closed.
- **The SSRF work on `call_webhook`.** Six defences with six reasons; two of them
  (`no_proxy`, no-redirect) are the ones implementations usually miss.
- **The two-string seam (`text` vs `authored_text`).** Template injection of authority tags
  closed with one extra parameter.
- **`PartialProgress`.** A failed run keeps its trace. Three earlier platforms lost it.
- **The `pending_lane` refusal.** A test deliberately not written, with its blocker named.
- **`trigger_is_reply` delegating to the shared parser** rather than re-deriving the
  predicate — and five tests pinning every corner of agreement.

**What is genuinely weak or incomplete, stated without softening:**
- **Approval gates do not work**, and not in the "unwired" sense the docs imply — the whole
  grant/deny/resume path is **dead code**. The token, the hash, the scoping and the fail-closed
  approver check are done; the *mint* is missing.
- **Two of seven actions are stubs** (`send_dm`, `set_channel_topic`), so a definition using
  them saves successfully and fails at run time.
- **No queue, no retry, no parallelism, no branching.** Under load a run is dropped; a
  transient webhook failure is permanent.
- **`add_reaction` and `call_webhook` are feature-gated on `reqwest`, and the *non*-featured
  path returns `{"skipped": true}` with the run reporting `Completed`** — a green run that
  performed no side effect. **I checked whether this bites in practice, and it does not in the
  shipped topology:** `crates/buzz-relay/Cargo.toml:67` declares
  `buzz-workflow = { workspace = true, features = ["reqwest"] }`, so the relay always enables
  it. **The correct statement is therefore a latent hazard, not a live bug** — the graceful
  degrade is the right call for a library, but *any other consumer of `buzz-workflow` that
  forgets the feature gets silently-green no-op steps*, and the run trace will not say so.
  Worth recording precisely because the failure mode is invisible by construction.
- **The doc drift on triggers and the delay cap** — small, but both are the kind of number a
  reader would rely on.

**The one-line verdict for the mapping pass:** *buzz's P3 is a **small, careful, event-native
automation engine whose security thinking is ahead of its feature completeness** — the
concurrency story is deterministic rather than locked, the authority story is fail-closed at
every door, and the approval story is a finished data model waiting on one missing call.*

---

**Batch 04 of 07. Written 2026-10-16. Next: `findings/05-widgets-and-frontend.md` (PX-W /
PX-F) — the composition surface and the frontend architecture: whether buzz has a widget or
composer model at all (four platforms so far have none), the desktop React 19 + Tauri 2
client's structure, the Flutter mobile tree, the design-token story, and the deepest question
this platform poses — **is an event log the same thing as a widget model?** Then batch 06
(out-of-pole, PZ) and batch 07 (synthesis).**
