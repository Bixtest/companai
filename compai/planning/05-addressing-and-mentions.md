# 05 — Addressing & Mentions

**Status:** provisional
**Implements:** Idea 4 — an @mention system to notify, delegate, add to team, etc.,
for humans and AI workers, individually or by role.

---

## 1. The core move

An @mention looks like a notification feature. In a platform where some of the
mentioned parties are workers that will *act* on being mentioned, it is something
much larger: **the universal addressing and invocation syntax of the product**.

Three consequences follow immediately, and they shape the whole design:

1. **Mentioning an AI worker is invoking work**, so it must pass through the
   authority gate like any other work invocation.
2. **A mention must therefore carry authority context** — and per invariant
   **I4**, carry it without amplifying it.
3. **Intent must be explicit.** "Notify" and "delegate" and "approve" cannot be
   guessed from prose when one of them transfers responsibility for real work.

## 2. The addressable space

One namespace, many kinds of target.

| Handle form | Kind | Resolves to | Example |
|---|---|---|---|
| `@name` | principal | one human, AI worker or service | `@anna`, `@nora` |
| `@role:x` | role | current holders of a role | `@role:finance-approver` |
| `@team:x` | team | team members | `@team:customer-launch` |
| `@dept:x` | department | department, routed by policy | `@dept:legal` |
| `@duty:x` | duty rotation | whoever is on duty now | `@duty:security-oncall` |
| `@skill:x` | skill | holders certified in a skill | `@skill:contract-review` |
| `@lens:x` | lens | the people/workers a lens scopes | `@lens:acme-account-team` |

`@skill:` and `@lens:` are the interesting additions beyond the obvious ones.
"Whoever can review a contract" and "whoever works on Acme" are how people
actually think about routing, and they are both computable from data the platform
already holds.

### 2.1 Resolution strategies

A group handle must say what it means, or the same mention will behave
differently in two places and nobody will trust it.

```yaml
addressable:
  handle: "role:finance-approver"
  kind: role
  resolution: any_of           # see table
  fallback: "role:finance-director"
  reachability_check: true
  notify_policy:
    respect_working_hours: true
    respect_absence: true
  ai_invocable: false          # may an AI worker address this handle?
```

| Strategy | Meaning | Typical use |
|---|---|---|
| `direct` | The one principal | Individuals |
| `broadcast` | Everyone, informational | Team announcements |
| `any_of` | Any one may act; first claim wins, others are released | Approver pools |
| `all_of` | Every member must act | Dual control, sign-offs |
| `rotation` | Whoever is on duty at that moment | On-call |
| `escalation_chain` | First target, then next after timeout | Escalations |
| `least_loaded` | Balanced by current queue | High-volume routing |

**Reachability guarantee.** A handle that resolves to nobody — an empty role, an
absent sole approver, a rotation with a gap — must not silently swallow the
mention. It escalates to the handle's owner with the reason. Black-hole mentions
are how work quietly dies, and they are entirely preventable.

## 3. Intent

A bare mention means *notify*. Everything else is a typed act with real
consequences, and per **D-10** it is never silently inferred from prose.

| Intent | Effect | Requires |
|---|---|---|
| `notify` | Attention only | — |
| `ask` | A question with a response expectation and SLA | — |
| `assign` | Transfers ownership of a task | Assign authority over the task |
| `delegate` | Transfers authority to act, scoped and time-boxed | The delegator to hold that authority |
| `invoke` | Starts work by an AI worker | Resolver decision |
| `review` | Requests a deliverable-gate review | — |
| `approve` | Requests an action-gate approval | Target to hold approval authority |
| `add_to_team` | Membership change | Team management authority |
| `escalate` | Raises with context per the escalation chain | — |
| `inform_fyi` | No action, no queue entry, no SLA | — |

### 3.1 How intent is captured

Natural language is *offered*, never *assumed*:

```text
User types:  "@nora please chase the Acme invoice and @anna approve the
              write-off if it's under €500"

Composer shows:
  ┌──────────────────────────────────────────────────────────┐
  │ Detected 2 actions — confirm before sending              │
  │                                                          │
  │  @nora    [invoke ▾]  Chase Acme invoice                 │
  │           → creates task · grade G1 · est. €0.40         │
  │                                                          │
  │  @anna    [approve ▾] Write-off under €500               │
  │           ⚠ this reads like a standing approval.         │
  │             Create one instead? (scoped, expiring)       │
  └──────────────────────────────────────────────────────────┘
```

The parse is a *suggestion with a visible object*. The user confirms or corrects.
This is slightly more friction than magic, and it is the right trade: a
misparsed "delegate" is a security incident, and a misparsed "notify" is nothing.

The nudge in the second row matters — prose that implies a standing grant should
be converted into a real, scoped, expiring standing approval
([02 §7.1](02-authority-and-autonomy.md)) rather than left as an informal
instruction in a message that nobody can revoke.

## 4. Authority

### 4.1 Mentions carry, never amplify

```text
effective_ceiling = min(
    mentioned_worker.own_ceiling,      # what it may do at all
    mentioner.authority_ceiling,       # what the asker could have done
    task_grade_floor,                  # what the work permits
    delegation_ceiling                 # if explicitly delegated
)
```

A support agent mentioning the Finance AI cannot obtain a refund the support
agent could not authorise. The worker will do the work it can and stop at the
gate, producing a proposal routed to whoever *does* hold the authority — with the
original request attached, so the escalation is complete rather than a fragment.

This closes what would otherwise be the platform's most obvious privilege
escalation path, and it is the reason mention handling cannot be a UI feature
built on top; it has to run through the kernel.

### 4.2 Delegation by mention

`@anna delegate: approve refunds under €500 for Acme until Friday` creates a real
delegation object — grantor, recipient, capability, scope, limits, start, end,
revocation state (SRS FR-110) — signed by the grantor, visible on both records,
and expiring by construction. It never becomes an informal understanding.

Delegation chains preserve the original authority source (SRS FR-111), so an act
performed three delegations deep still names the human whose authority it rests on.

## 5. Mentions are durable objects

A mention is not an event that fires and disappears. It is a stateful record,
which is what lets it drive the work surfaces.

```yaml
mention:
  id: mnt-88213
  source: { type: comment, ref: cmt-4471, in: task-9932 }
  author: human:erik
  authority_snapshot: <ref>          # what Erik could do at that moment
  target: { handle: "@nora", resolved: [ai:nora] }
  intent: invoke
  payload: "Chase the Acme invoice"
  grade: G1
  state: in_progress   # pending|acknowledged|in_progress|actioned|
                       # declined|expired|escalated|superseded
  sla: { respond_within: 30m, complete_by: 2026-08-09T12:00Z }
  escalation: { after: 4h, to: "@role:ar-manager" }
  outcome_ref: task-9945
```

This drives:

- the personal work view (SRS FR-520) — mentions are first-class work items;
- the attention system (SRS FR-510) — a G3 `approve` outranks a G0 `notify`,
  which is how the platform avoids notifying about everything;
- SLA tracking and automatic escalation;
- the audit trail — *who asked for this work* is part of the attribution chain
  ([06](06-attribution-and-audit.md)).

### 5.1 AI workers acknowledge deterministically

A mentioned AI worker responds within seconds with one of: **accepted** (with a
plan and cost estimate), **needs clarification** (with the specific question),
**blocked at a gate** (with what approval is needed and from whom), or
**declined** (with the mindflow clause or charter scope that refuses it).

Silence is never a valid state for an AI worker. A mention that gets no
acknowledgement within the timeout is a system fault and is surfaced as one.

## 6. Containment

AI workers mentioning each other is genuinely useful — it is how specialist
routing works — and it is also how you get a runaway loop that spends a budget
overnight. Controls:

| Control | Default |
|---|---|
| **Mention depth** | An invocation chain may not exceed 4 hops; the 5th is refused and escalated to a human |
| **Loop detection** | A worker cannot be re-invoked for the same task+intent within a window |
| **Budget attribution** | Cost accrues to the *root* human-initiated request, not to each hop; the root's budget bounds the whole chain |
| **Rate limits** | Per-worker outbound mention rate, per hour |
| **Broadcast ban** | AI workers may not address `@dept:`, `@team:` or any broadcast handle without explicit charter grant |
| **`ai_invocable` flag** | Every addressable declares whether AI workers may address it at all; approver pools default to `false` |
| **Human-in-the-chain rule** | A chain that has not touched a human in *N* hops must report before continuing |

The last one is the important one conceptually: **the platform prefers chains
that surface, not chains that complete silently.**

## 7. Notification is a separate decision

Being mentioned and being interrupted are different things. Resolution decides
*who*; the attention policy decides *how loudly*.

```text
mention → resolve → for each recipient:
    grade + intent + role + relationship + presence + working hours
        ↓
    interrupt now  |  inbox  |  digest  |  record only
```

- G3/G4 `approve` and `escalate` interrupt.
- `notify` on G0/G1 goes to a digest.
- Human working hours and absence are respected except for grades that declare
  themselves as out-of-hours-capable (incidents).
- AI workers have schedules too — outside active hours the mention queues rather
  than waking a runtime, unless the charter says otherwise.

This is SRS FR-510 made concrete: the platform is not deciding *whether* to
record, only whether to interrupt.

## 8. UX

- **`@` anywhere** — messages, comments, task descriptions, documents,
  approval notes, even inside generated app fields.
- **Grouped picker** — People · AI workers · Roles · Teams · Duties · Skills,
  ranked by context (people already on this task first), each showing what it
  will resolve to: *"@role:finance-approver → any one of 3 · Anna is on duty"*.
- **Intent chip** appears after selection, defaulting to `notify`, one click to
  change. The chip shows the consequence: *"assign — Erik becomes the owner"*.
- **Pre-send gate preview** — mentioning an AI worker for gated work shows the
  gates the request will hit *before* sending ([02 §6.3](02-authority-and-autonomy.md)
  preflight), so nobody discovers the approval requirement two hours later.
- **Mention state is visible in place** — the original message shows acknowledged
  / in progress / done / declined inline, so the asker never has to go looking.
- **Undo window** — a mention that starts AI work has a short cancel window before
  execution begins.

## 9. Open points

- **`@everyone` and broadcast to humans.** Necessary occasionally, abused always.
  Probably: restricted by capability, rate-limited, and always digest-delivered.
- **Cross-tenant mentions.** Mentioning a supplier's worker in a shared workspace
  is desirable and raises the same authority questions as cross-tenant capability
  grants. Deferred with the same reasoning as in [02 §10](02-authority-and-autonomy.md).
- **Mention editing.** Editing a message that contained a mention which already
  triggered work — what happens? Likely: the mention object is immutable once
  actioned, and an edit creates a superseding mention rather than mutating it.
- **Language.** Intent parsing across the platform's supported languages is a real
  NLP scope; the fallback (explicit chips only, no parsing) must remain fully
  usable so parsing quality is never on the critical path.
