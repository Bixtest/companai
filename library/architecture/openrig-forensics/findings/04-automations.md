# OpenRig Study — Batch 04: automations (P3)

**Folder:** `library/architecture/openrig-forensics/` · **Batch 04 of 08** · **Status:** OPEN
**Pole:** **P3 — automations** (where agents work on and assign tasks)
**What this batch answers:** how work *moves* in OpenRig — the durable queue and its baton, the
transactional handoff, the wake ladder that stops a handed-off task from silently parking,
message delivery, the watchdog, and how a rig survives a reboot. In OpenRig the "automation"
is not a visual workflow; it is **an obligation on a row that a wake must carry.**

**Rule 5 reminder:** no comparison to our own platform appears in this batch.

**Rule 1 reminder:** every claim was read from source; divergences are in §8.

---

## 1. The one-sentence shape

**OpenRig's automation is a queue of obligations.** Work is a row in `queue_items`; it moves
between *seats* (addresses) through a **transactional handoff**; every handoff stages a
**durable wake intent** that is delivered after commit; a **wake ladder** retries and escalates
so a baton never silently parks; and the row carries its obligation **exactly once** while the
wake is **at-least-once.** There is no visual workflow canvas — the graph is the *topology* (P2)
and the *transitions* are the automation.

---

## 2. The coordination primitive — five host-scoped tables

`docs/as-built/architecture/coordination-primitive.md` (396 lines) calls this layer *"the
SQLite-canonical durable-work layer the daemon exposes through `/api/stream` and
`/api/queue`"*. **Five tables, one per migration `023`–`027`:**

| Table | Migration | Role | Key property |
|---|---|---|---|
| **`stream_items`** | `023` | L1 append-only intake/audit root | **immutable after emit** — only `archived_at` may be set; idempotent on `stream_item_id` |
| **`queue_items`** | `024` | **L3 owned-work queue** | 8 states; closure columns; baton columns |
| **`queue_transitions`** | `025` | **append-only transition log** — the authoritative audit trail | *"Domain code never updates its rows"* |
| **`inbox_entries`** | `026` | mailbox receive | idempotent on `inbox_id`; 3 states (`pending/absorbed/denied`) |
| **`outbox_entries`** | `027` | sender-side record **+ durable wake intents + retained messages** | idempotent on `outbox_id`; 7 delivery states |

**Six services implement it** (`stream-store`, `queue-repository`, `queue-transition-log`,
`hot-potato-enforcer`, `inbox-handler`, `outbox-handler`) — *"routes import these; services are
Hono-free"*, so the domain layer has **no HTTP dependency**. *(P3/PX-F.)*

> **Named mechanism (rule 6): *the two-log pattern*.** `stream_items` is an append-only intake
> log; `queue_transitions` is an append-only state log; both are **never updated** (except a
> retention move). **The current state of a task is derived, and the logs are the audit.**

---

## 3. ★ The hot-potato closure contract — you cannot close work without saying where it went

`hot-potato-enforcer.ts` is a **pure validator** for *"the load-bearing API contract"*
(`validateClosure`, `:59`). The rule:

> **`state = done` requires a `closure_reason`**, from **7 values**
> (`CLOSURE_REASONS`, `:18`): `handed_off_to · blocked_on · denied · canceled ·
> no-follow-on · escalation · superseded`.
>
> **And three of them *additionally* require a `closure_target`** (`:86`):

| Reason | Meaning | `closure_target` is |
|---|---|---|
| **`handed_off_to`** | work continues with a different seat | the **new owner** |
| **`blocked_on`** | parked pending another item | the **blocker `qitem_id`** |
| `denied` | receiver rejected it | the reason text |
| `canceled` | sender/receiver withdrew | a note |
| `no-follow-on` | terminal — nothing else needed | *(none)* |
| **`escalation`** | kicked up a tier | the **escalation target** |
| `superseded` | replaced by cancel-and-replace | the **successor qitem** (recorded on `canceled`, refused without it — `queue-repository.ts:2629`) |

> **★★ This is the study's cleanest "no-work-vanishes" rule.** A task cannot reach a terminal
> state without a *named* disposition, and the three reasons that imply a successor
> **cannot be recorded without naming it**. The enforcer is **pure** (no I/O, no DB), so the
> contract is testable in isolation. *(P3 — headline mechanism.)*

---

## 4. The transactional handoff — the baton, in one transaction

`queue-repository.ts` exposes two handoff operations and the doc is precise about them:

- **`handoffAndComplete`** (`:1833`) — *"close the source as done"* **plus** create the new
  owned qitem, **in a single transaction**.
- **transactional handoff** (`:1656`) — *"close source as `handed-off` plus create new owned
  qitem in a single transaction."*

**And the wake is staged in the same transaction** (`:1412–1424`, `:1475–1483`): create,
handoff and handoff-and-complete each **stage a deterministic `wake-intent-<qitem>` outbox
row inside the transaction and deliver it after commit.**

> **★ The durability trick, named:** the baton *and its wake* are written together, so a crash
> **after** commit cannot leave a handed-off task with no pending wake. **Startup reconciles
> and drains intents left pending by a crash once** (`startup.ts:2361–2362`). If the intent
> cannot be retained, the task is **still saved** and the row records
> `failed:wake not retained: <reason>`. *(P3.)*

**Nothing in the daemon writes `last_heartbeat`** (`queue-pickup.ts:16`) — so a heartbeat is a
**claim by the seat**, not something the platform fabricates. *(P3.)*

---

## 5. ★ The wake ladder — the platform's answer to the *silent park*

`domain/queue-wake-ladder.ts` has the longest and most revealing header comment in the study so
far. It opens by naming the problem it fixes:

> *"S01 — WAKE OR ESCALATE ON BATONS. A handoff whose wake fails must never silently park:
> **today one failed nudge is recorded and nothing follows (the measured dominant 0.5.3 failure
> class — a perfect surviving packet, a recipient never woken).**"*

It then states **a named invariant**:

> ### **"THE ROW CARRIES THE OBLIGATION EXACTLY-ONCE; THE WAKE IS AT-LEAST-ONCE."**
> *"The ladder retries the NUDGE — an envelope pointer at the row — never the content, so a
> re-attempt can never double-deliver the obligation."*

**The mechanism, in five measured parts:**

1. **A bounded retry ladder, then named escalation rungs**: destination's orchestrator
   (*"aggregated per destination, never a duplicate row per baton"*), then the operator surface.
   **Each step is a recorded transition; none is silent.**
2. **The transitions ARE the ladder state** — *"every tick DERIVES its position from them — a
   daemon restart can neither forget a ladder (silent park returns) nor restart its counts (cap
   violated by repetition)."*
3. **`rendered-unconfirmed` outcomes NEVER retry** (`delivered-ack-pending`, `indeterminate:*`,
   `gateway-owned:*`) — *"the measured false-negative class"* — but they **enter the ladder on a
   confirmation path**: unconfirmed + zero pickup evidence within a window **escalates directly,
   skipping the retry rung**, because *"escalation is not a re-send; it cannot double-deliver."*
4. **Suspension is DERIVED, never declared**: the destination's post-handover state suspends
   wake attempts, with suspend/resume recorded; the manual override survives *"ONLY as an
   operator override"* (`OPENRIG_WAKE_SUSPEND`, fresh-read).
5. **The rungs DELIVER, not just record**: the orchestrator rung attempts a *real* wake on the
   aggregate row; a rung whose own wake fails advances after one bounded cycle. The operator
   rung's delivery leg **is the delivery rules engine** — *"exactly one delivery per episode,
   never immediate-plus-deferred."*

> **★★★ Why this is the batch's centre:** OpenRig found its *dominant real-world failure* ("a
> perfect surviving packet, a recipient never woken") and built a mechanism whose **invariant is
> stated in words, whose state is derivable from a log rather than held in memory, and whose
> false-negative class is named and handled differently from the true-failure class.** This is
> production-grade distributed-systems reasoning, in a local tool. *(P3 — top-tier.)*

---

## 6. Delivery honesty — "a claim isn't proof that the body was read"

The doc devotes a section to *"Which field answers 'did it reach them'"* and the answer is
deliberately split:

| Field | What it honestly means |
|---|---|
| `deliveryOutcome` | the **gateway/human** ledger (`posted`, `transport-failed`, `never-posted`); **`null` for a pane-only task** |
| `lastNudgeWireResult` | the wake send's result **as stored** (`verified`, `delivered-ack-pending`, `indeterminate:…`, `retained:…`, `failed:…`) |
| `lastNudgeResult` | **as presented** — a claimed row whose stored result is unconfirmed reads **`claimed`** |
| `claimedAt` | when the destination claimed it; closing does not clear it |
| `pickup` | derived: `unclaimed · working · stalled-after-claim · parked · terminal` |

And the honesty is spelled out: *"A claim isn't proof that the body was read or that the
terminal render was verified … `rig queue create --verify` says 'Terminal receipt unconfirmed,
but the seat has claimed the item (claimed).' … **'A claim shows the seat took the item; it does
not prove the body was read.'**"*

> **★ Named mechanism: separate *stored* from *presented* delivery state, and refuse to
> overclaim.** `lastNudgeWireResult` (truth) vs `lastNudgeResult` (what a claim turns it into)
> is a UI-honesty boundary enforced in the domain layer. *(P3 — and see F2-9's drift discipline:
> the same "prove, don't assume" instinct.)*

---

## 7. The standing detectors and the watchdog

### 7.1 The stuck sweep — a detector with an evidence contract

`queue-stuck-sweep.ts` is a **standing detector** with **6 finding kinds** (`:50`). It creates
findings **through the queue repository** (not by writing rows), each carrying
`evidenceRef: rig queue show <source-qitem-id>` (`:605`) — *"pointing to the underlying durable
work row"*, *"satisf[ying] the existing human-route evidence contract."* Routing: *"a finding
goes to the destination's orchestrator when one is derivable, otherwise to the destination
itself, and that seat may be dead."* Repeated detections **refresh** the existing finding; when
the condition resolves, **the sweep closes its own finding** (`:612–637`).

> **★ The detector is a *participant in the same contract*:** it opens and closes its own
> findings as queued work, with an evidence pointer, using the same closure rules. **A
> self-monitoring system that obeys the rules it monitors.** *(P3.)*

### 7.2 The watchdog engine — a 4-way action state machine

`watchdog-policy-engine.ts` runs a **per-evaluation state machine**: resolve a policy by name
(unknown → terminal) → parse YAML spec → evaluate → handle one of **`skip | send | terminal`**.
Key details:

- **Quiet vs loud skips**: a `skip` records history + emits an event **only if the reason is
  "loud"** (not in `QUIET_SKIP_REASONS`) — so the event log is not flooded.
- **An active-wake throttle**: a `send` is suppressed as `active_wake_not_due` if it already
  fired within `active_wake_interval_seconds`.
- **`not_due` polls are filtered upstream** by the scheduler and never reach the engine.
- **Four built-in policies** are registered by import: `artifact-pool-ready`,
  `edge-artifact-required`, `periodic-reminder`, `context-usage-threshold`.

Plus a **watchdog scheduler**, a **jobs repository**, a **history log**, **due** computation,
and **auto-registration** — eight files. *(P3.)*

---

## 8. Restore honesty — the reboot story

`lifecycle-snapshot-restore.md` (398 lines) describes the *"core product loop"*:
**`down` (auto-snapshot) → `up <name>` (auto-restore) → handoff**, with the explicit promise
*"restore replays it honestly (**no silent fresh-fallback**)"*.

The **`NodeRestoreOutcome`** enum has **9 values**: `resumed · rebuilt · fresh · fresh-primed ·
awaiting-decision · failed · attention_required · operator_recovered · n-a` (the result itself
has 8, without `n-a`). Where each is set is documented to the line — e.g. `resumed` is returned
**only** by `finishJoinedResume` *"after it has rebound and verified the pane; otherwise that
becomes `attention_required`."*

> **★ Restore does not pretend.** A conversation that cannot resume becomes
> `awaiting-decision` (the original can't resume; choose `--fresh`) or `attention_required` —
> **never a silent fresh start.** *"A file write does not prove that an existing conversation
> loaded it"* (echoed from the permission skill). *(P3 — the platform's honesty discipline,
> third instance.)*

**`restore-check` is a *separate read-only readiness probe*** — so "will this restore?" is a
question you can ask **without** performing a restore. *(P3.)*

---

## 9. The scenario harness — automation tested as *pairs*

`packages/test-system/scenarios/` holds **23 files, 16 declaring `scenario:`**. The scenario
**names are the specification**, and they read like a quality bar:

```
queue-baton-survives-restart.yaml          kill-daemon-mid-handoff.yaml
locked-restore-never-permissive.yaml       one-view-state-after-mutation-storm.yaml
send-verify-means-rendered.yaml            policy-posture-survives-structural-edit.yaml
home-divergence-preseed-visible.yaml       clean-lifecycle-no-residue.yaml
compaction-restore-resumes-role.yaml       stream-emit-durable-replay-live.yaml
```

**And a scenario "counts only as a pair"** (`ARCHITECTURE.md:261`): *"it passes on healthy code
and fails on the seeded run."* The runner uses **the real CLI, daemon, tmux and SQLite with
scripted stub agents and no model cost**, in a **private daemon and private tmux server**
building its environment from `HOME`, `PATH` and `TERM` only — *"so your session's `TMUX` and
daemon variables are dropped and it is safe to run from inside tmux, including an agent's
pane."*

> **★ Named mechanism: a seeded-defect scenario pair.** A scenario is not a happy-path test; it
> is **a test plus the fault injection that must make it fail.** `locked-restore-never-permissive`
> and `kill-daemon-mid-handoff` are the platform's own statements of the invariants this batch
> found. *(P3/PZ.)*

### 9.1 What the runner still cannot bind

`ARCHITECTURE.md:258-260` is honest: *"Today the runner binds `up`, `down`, `send`, `restart`
and `daemon`. `restore`, `emit`, `mutate` and `policy` fail with `UnboundActionError`, and
`seed_regression` needs a fault controller."* **The scenario vocabulary is ahead of the runner**
— a target state declared, partially reached. *(P3 — a declared gap, not a hidden one.)*

---

## 10. Divergences (rule 1)

| # | Claim | Reality | Verdict |
|---|---|---|---|
| **D4-1** | `coordination-primitive.md` says the daemon has **96** migrations | `ARCHITECTURE.md` says **94**; **disk has 105** | **DIVERGED** (a third different number — the doc set disagrees with itself *and* the disk) |
| **D4-2** | the doc's §1 says *"later migrations add columns to these tables"* and `067_i3_identity_provenance` adds `identity_provenance` to `stream_items` | confirmed in the migration list | **HOLDS** (a doc that points at a later migration and is right) |
| **D4-3** | `ARCHITECTURE.md` calls `queue_transitions` *"authoritative audit trail"* with "the one delete is the retention runner" | disk shows `054_queue_transitions_archive` + `queue-retention.ts` — **the one delete is an archived move, in one transaction** | **HOLDS** (and unusually precise) |
| **D4-4** | the wake-ladder header says the 0.5.3 dominant failure was *"a perfect surviving packet, a recipient never woken"* | this is a **claim about history**, verifiable only against 0.5.3; the *mechanism* that responds to it is present and named | **ACCEPTED AS STATED** (a design rationale, flagged as historical) |
| **D4-5** | the scenario template and the runner disagree: the doc lists `restore/emit/mutate/policy` verbs | *"the runner binds `up`, `down`, `send`, `restart` and `daemon`"*; the others throw `UnboundActionError` | **DIVERGED — but self-declared** (the doc says so itself) |

---

## 11. Findings (batch 04)

**F4-1.** ★★ **The hot-potato closure contract: `done` requires one of 7 closure reasons, and
three of them additionally require a `closure_target` naming where the work went.** A pure,
I/O-free validator owns it. **No unit of work can vanish.** *(P3 — headline.)*

**F4-2.** ★★★ **The wake ladder's stated invariant: *"THE ROW CARRIES THE OBLIGATION
EXACTLY-ONCE; THE WAKE IS AT-LEAST-ONCE."*** It retries the *pointer*, never the *content*, so
a retry cannot double-deliver. *(P3 — top-tier.)*

**F4-3.** ★★ **The ladder's state is DERIVED from the transition log, not held in memory** — *"a
daemon restart can neither forget a ladder (silent park returns) nor restart its counts."*
**Crash-safety by derivation.** *(P3.)*

**F4-4.** ★ **OpenRig distinguishes a *false negative* (`rendered-unconfirmed`) from a *true
failure*** and handles them differently: the former **never retries** but **escalates directly**
(because escalation cannot double-deliver). *(P3 — the sharpest single detail in the batch.)*

**F4-5.** **The baton and its wake are staged in the SAME transaction**, delivered after commit,
and **reconciled once at startup**. A crash after commit cannot orphan a handed-off task. *(P3.)*

**F4-6.** ★ **Stored delivery state and presented delivery state are separated, and the platform
refuses to overclaim**: *"A claim shows the seat took the item; it does not prove the body was
read."* `lastNudgeWireResult` (truth) vs `lastNudgeResult` (presented). *(P3.)*

**F4-7.** **The two-log pattern**: `stream_items` (intake, immutable) + `queue_transitions`
(append-only, never updated) — **current state is derived; the logs are the audit.** *(P3.)*

**F4-8.** ★ **The stuck sweep is a participant in its own contract** — it opens/closes findings
as queued work with an `evidenceRef` pointer, using the same closure rules, and closes its own
finding when the condition resolves. *(P3.)*

**F4-9.** **The watchdog is a 4-way action state machine** (`skip | send | terminal`) with a
**quiet-vs-loud skip distinction** (so the event log is not flooded) and an **active-wake
throttle**; `not_due` polls never reach the engine. *(P3.)*

**F4-10.** ★ **Restore honesty is enforced by a 9-value outcome enum with "no silent
fresh-fallback"** — `resumed` is returned **only** after the pane is rebound and verified;
otherwise `attention_required`. A `restore-check` probe answers the question **without
performing the restore**. *(P3.)*

**F4-11.** ★ **A scenario counts only as a PAIR — it must pass on healthy code and fail on the
seeded run.** The names (`locked-restore-never-permissive`, `kill-daemon-mid-handoff`) are the
platform's own invariant statements. *(P3/PZ.)*

**F4-12.** **The scenario vocabulary is ahead of the runner**, and the doc says which verbs are
unbound (`restore/emit/mutate/policy` → `UnboundActionError`). **A declared, partial
capability — stated, not hidden.** *(P3.)*

**F4-13.** **Domain services are Hono-free** — *"routes import these; services are Hono-free"* —
so the automation core has **no HTTP dependency** and is testable without a server. *(P3/PX-F.)*

---

## 12. Plain-English summary of batch 04

OpenRig's automation is **not a canvas — it is a queue of obligations that must be carried.**
Work lives as a row; the row moves between seats through a handoff; and the platform's central
rule is that **you cannot finish a task without saying where it went**: finishing requires one
of seven closure reasons, and three of those require you to *name the successor*. The handoff
and the wake that announces it are written **in the same transaction**, so a crash cannot leave
a task handed off with nobody told.

What makes this batch notable is the **wake ladder** — OpenRig found its worst real failure
("a perfect surviving packet, a recipient never woken") and built a retry-and-escalate ladder
whose **invariant is stated in words** (*the obligation exactly-once, the wake at-least-once*),
whose **state is derived from the log** so a restart cannot lose it, and which treats a *false
negative* differently from a *true failure*. Around it: a stuck-detector that obeys the same
closure rules it enforces, a watchdog state machine that keeps quiet skips out of the event log,
and a **restore** that reports nine honest outcomes and never silently starts fresh. The tests
make the philosophy explicit: a scenario only counts if it **fails when the defect is seeded.**

**Next: batch 05 — widgets and frontend (PX-W / PX-F).** The TUI topology views, the web UI in
maintenance mode, the design system, and context packs.

---

*Batch 04 of 08 — automations (P3). All claims read from source at `0.6.10`. 5 divergences;
13 findings (F4-1..F4-13).*
