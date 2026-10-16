# Zulip Study — Batch 04: automations (P3)

**Status:** DONE · **Date:** 2026-10-16 · **Pole:** **P3 — automations**
**Source:** `library/architecture/platforms/_extracted/zulip-main/` @ `12.0-dev+git`

**The question this batch answers:** *how does something run without a human?* Zulip has **no
workflow engine and no DAG**. What it has instead is a **mature, boring, at-least-once queue
system** (RabbitMQ + a typed worker framework), a **cron-driven scheduled-message picker**, and
**outgoing webhooks with a bounded retry**. This batch reads all three and names their
guarantees.

**Headline before the detail:** Zulip's P3 is not automation-as-product; it is **automation as
plumbing** — the platform uses the same queue to send email, render thumbnails, deliver push
notifications *and* run bots, and the delivery guarantee it actually provides is
**at-least-once with a 3-retry bound and a disk-parked dead-letter**, not exactly-once.

---

## §4.1 The queue surface: 14 workers, one framework, a decorator registry

Measured: **17 `@assign_queue` sites**, of which **14 are real** and **3 are test-only**
(`test`, `noop`, `noop_batch` — all `is_test_queue=True` in `zerver/worker/test.py`):

| Queue | What it does |
|---|---|
| `email_senders`, `deferred_email_senders`, `digest_emails`, `missedmessage_emails` | Email |
| `missedmessage_mobile_notifications` | Push notifications |
| `embed_links`, `thumbnail` | Media processing |
| `embedded_bots`, `outgoing_webhooks` | The P1 bot seams |
| `email_mirror` | Inbound email → message |
| `user_activity`, `user_activity_interval`, `soft_reactivation`, `deferred_work` | Housekeeping |

**A queue is a decorated class** (`zerver/worker/base.py:54-65`):

```python
def assign_queue(queue_name: str, enabled: bool = True, is_test_queue: bool = False):
    def decorate(clazz):
        clazz.queue_name = queue_name
        if enabled:
            register_worker(queue_name, clazz, is_test_queue)
        return clazz
    return decorate

worker_classes: dict[str, type["QueueProcessingWorker"]] = {}
```

`register_worker` populates a module-level **registry dict**, and `manage.py process_queue
--queue=X` looks the class up by name. **Adding a queue is: write a `QueueProcessingWorker`
subclass, decorate it, and add its name to the `base_queues` list in the Puppet manifest**
(`docs/subsystems/queuing.md:30-35`). There is **no broker-side topology to configure** — the
queue exists the first time the worker publishes to it.

---

## §4.2 The worker framework: four named mechanisms

`QueueProcessingWorker` (`base.py`, 332 lines) — the base class every queue inherits:

1. **A batch-aware consumer loop.** `do_consume` wraps `consume(events)` and tracks statistics;
   `LoopQueueProcessingWorker` (`:306-333`) extends it for **batched** queues (`batch_size=100`).
   The abstraction is `consume_single_event` vs `consume_batch`.

2. **A hard per-batch timeout via `SIGALRM`** (`:196-208`):
   ```python
   signal.alarm(self.MAX_CONSUME_SECONDS * len(events))
   consume_func(events)
   ```
   `MAX_CONSUME_SECONDS = 30` (`:91`). **A single event gets 30 s; a batch of 100 gets 3,000 s.**
   If the alarm fires, `timer_expired` raises `WorkerTimeoutError` — the batch is treated as a
   failure, not a hang. **This is the study's most explicit statement of "a slow worker must
   never wedge the queue"**: the framework will actively kill a runaway consume.

3. **A bounded retry with a dead-letter that is a file** (`zerver/lib/queue.py:476-485`):
   ```python
   MAX_REQUEST_RETRIES = 3

   def retry_event(queue_name, event, failure_processor):
       if "failed_tries" not in event:
           event["failed_tries"] = 0
       event["failed_tries"] += 1
       if event["failed_tries"] > MAX_REQUEST_RETRIES:
           failure_processor(event)
       else:
           queue_json_publish_rollback_unsafe(queue_name, event)
   ```
   **Named: the retry budget is 3.** The counter rides *in the event itself*, so retries survive
   a worker crash. After 3, `failure_processor` runs and the event goes to the caller's
   `*.errors` file. (`base.py:278-288` writes a **tab-separated line — `time\torjson(events)` — into
   `QUEUE_ERROR_DIR/<queue>.errors`, under a lockfile**.) The message is **parked on disk**, not
   discarded and not in a broker DLQ.

4. **Persistence and at-least-once, stated in the publish call** (`lib/queue.py:131`):
   ```python
   properties=pika.BasicProperties(delivery_mode=2),
   ```
   **`delivery_mode=2` = persistent.** A queued event survives a RabbitMQ restart. Combined with
   the ack-after-consume model (`:400-402`, `basic_ack(delivery_tag=…)`), **the guarantee is
   at-least-once** — a worker can ack *after* a partial side-effect, so a crash mid-handle can
   re-deliver. **There is no idempotency key in this layer**; correctness is the *handler's*
   problem.

---

## §4.3 ★ The scheduled-message picker: a row-lock inside a transaction

The cron-like heart of P3 is `zerver/actions/scheduled_messages.py`
(`try_deliver_one_scheduled_message`, `:431-465`). **This is the single most important piece of
Zulip's automation plumbing**, and it is short:

```python
@transaction.atomic(durable=True)
def try_deliver_one_scheduled_message() -> bool:
    # Returns whether there was a scheduled message to attempt
    # delivery on, regardless of whether delivery succeeded.
    scheduled_message = (
        ScheduledMessage.objects.filter(
            scheduled_timestamp__lte=timezone_now(),
            delivered=False,
            failed=False,
        )
        .select_for_update(no_key=True)
        .first()
    )
    if scheduled_message is None:
        return False
    ...
    try:
        send_scheduled_message(scheduled_message)
    except Exception as e:
        scheduled_message.refresh_from_db()
        was_delivered = scheduled_message.delivered
        scheduled_message.failed = True
        ...
```

**Named mechanisms:**

| # | Mechanism | Line | What it buys |
|---|---|---|---|
| **M1** | **`scheduled_timestamp__lte=now(), delivered=False, failed=False`** | `:437-439` | A **three-field work claim** — due, not-done, not-failed. Indexed (`scheduled_timestamp` is `db_index=True`). |
| **M2** | **`.select_for_update(no_key=True)`** | `:440` | **A row lock.** Two cron workers cannot grab the same message. |
| **M3** | **`@transaction.atomic(durable=True)`** | `:431` | The claim, the send, and the flag flip are **one transaction**. |
| **M4** | **`failed = True` + `failure_message`** on exception | `:455+` | A **per-message terminal state** — a failed reminder is not silently retried forever. |
| **M5** | **`SCHEDULED_MESSAGE_LATE_CUTOFF_MINUTES = 10`** | `:43` | A message is **not** sent if it is more than **10 minutes** late. |

**★ What M1+M2+M3 together are.** This is a **database-backed claim queue with exactly-one
worker-per-message**, achieved with the *same* pattern the study has seen before (Multica's
`FOR UPDATE SKIP LOCKED`) but here applied to a **user-visible deadline**, not an internal job.
The `delivered` / `failed` boolean pair is the entire state machine: `(False, False)` → claimable;
`(True, _)` → done; `(False, True)` → dead. **There is no "retry" state** — a scheduled message
that fails is failed, permanently, with a message stored.

**★ The 10-minute cutoff (M5) is the subtlety.** If the cron is down for an hour, Zulip does
**not** dump an hour of messages the moment it returns. It sends the ones still within the
10-minute window and lets the rest go. **This is a deliberate choice to prefer *a missing
reminder* over *a flood of stale reminders* — and it is the clearest "latency-limit" primitive
in the study.** (An exact-coupling: `deliver_scheduled_emails.py` uses the same
`scheduled_timestamp__lte=timezone_now()` pattern for emails.)

---

## §4.4 Reminders: scheduled messages wearing a delivery_type

**Reminders are not a separate subsystem** — they are `ScheduledMessage` rows with
`delivery_type = REMIND` (`zerver/models/scheduled_jobs.py:152`, `zerver/lib/reminders.py:170`):

```python
def access_reminder(user_profile, reminder_id) -> ScheduledMessage:
    return ScheduledMessage.objects.get(id=reminder_id, sender=user_profile, delivery_type=ScheduledMessage.REMIND)
```

The model carries the *origin message* (`reminder_target_message_id`) and an indexed
composite (`fields=["realm_id", "sender", "delivery_type", "scheduled_timestamp"]`,
`scheduled_jobs.py:208`) so "my reminders" and "this conversation's reminders" are index scans.
Reminder *content* is generated by `get_reminder_formatted_content` (a 181-line note-builder
with `MAX_REMINDER_NOTE_LENGTH` and `MAX_MESSAGE_LENGTH` caps). **"Remind me about this message
on Tuesday" and "send this message on Tuesday" are the same machine** — one delivery path, two
intents.

---

## §4.5 Outgoing webhooks: the one place P1 and P3 meet

`zerver/lib/outgoing_webhook.py` (432 lines) + `zerver/worker/outgoing_webhooks.py` (30 lines):

- The **worker is async**: the bot's reply arrives on the `outgoing_webhooks` queue, off the
  request path. The originating message is *not* blocked on a third-party HTTP call.
- **Retry uses the shared `retry_event`** — so a webhook that times out is re-published up to
  `MAX_REQUEST_RETRIES = 3` times, then `failure_processor`.
- **The request is authenticated outbound** (`token` + `User-Agent: ZulipOutgoingWebhook/` +
  `OUTGOING_WEBHOOK_TIMEOUT_SECONDS`).
- **The reply can be a widget** — `OutgoingWebhookResult` carries `widget_content: str | None`
  (`:30-32`). **A bot's automated reply can be a poll/TODO, not just text.** (Batch 05 picks
  this up.)

**Two failure modes named in the doc** (`docs/subsystems/queuing.md:5-12`): email sends that
"would otherwise time out when 100s are triggered at once", and analytics updates that "don't
have any immediate runtime effect." **The queue exists because a chat app must not block a user
on a slow side-effect** — that single sentence is the design intent.

---

## §4.6 The three levels of "without a human" (a summary table)

| Level | Mechanism | Trigger | Guarantee |
|---|---|---|---|
| **1. Reactive** | Queue worker | An event (message sent, upload, user action) | **at-least-once** (`delivery_mode=2` + ack-after) |
| **2. Deferred / batched** | `LoopQueueProcessingWorker` (`batch_size=100`) | Queue depth / timer | Best-effort batch |
| **3. Time-based** | `try_deliver_one_scheduled_message` cron | `scheduled_timestamp__lte=now()` | **exactly-one-per-message** (row lock + txn), **with a 10-minute lateness cutoff** |
| **4. Third-party** | Outgoing webhook worker | A @-mention of a webhook bot | **≤3 retries**, then a disk dead-letter |

---

## §4.7 Divergences and honest limits (batch 04)

| # | Divergence / limit | Detail |
|---|---|---|
| **D4-1** | **At-least-once, with no idempotency layer** | `delivery_mode=2` + post-consume ack means a crash can re-deliver. **Nothing in the queue layer dedupes.** Email senders and thumbnails must be idempotent by construction (they mostly are: an email is sent once per event object) — but the *framework* does not enforce it. |
| **D4-2** | **The dead-letter is a file** | `QUEUE_ERROR_DIR/<queue>.errors`, a TSV line under a lockfile. No retry-from-dead-letter tooling in this tree; recovery is manual. |
| **D4-3** | **A failed scheduled message is terminal** | `failed=True` is a one-way door; there is no user-facing "retry reminder". The `failure_message` is stored for diagnosis only. |
| **D4-4** | **`rollback_unsafe` is in the retry path's name** | `queue_json_publish_rollback_unsafe` (`queue.py:485`) — the function name *admits* it republishes outside the DB transaction. If the DB transaction rolls back after a republish, the retry is orphaned. **The name is the honest document (rule 1).** |
| **D4-5** | **No workflow/DAG concept at all** | There is no scheduler abstraction beyond "a cron calls one function". All ordering is implicit in the code. |

---

## §4.8 Batch-04 verdict

Zulip's automations are **plumbing, not a product**: 14 queues behind one decorator-registered
worker framework, with a 30-second `SIGALRM` per event to kill runaways, a 3-retry budget that
travels *inside the event*, a persistent-message `delivery_mode=2` ack-after-consume guarantee
(**at-least-once**), and a **dead-letter that is a lockfile-guarded TSV on disk**. The one
genuinely elegant piece is the **scheduled-message picker** — a three-field work claim, a row
lock, one transaction, and a **10-minute lateness cutoff** that deliberately prefers a missing
reminder to a flood of stale ones.

**The three things to carry forward:** (1) the **event-carried retry counter** (`failed_tries`
rides in the payload, so retries survive a crash); (2) the **`select_for_update` + atomic claim**
for exactly-once-per-item from an at-least-once base; and (3) the **lateness cutoff** as a named
policy — the idea that "how late is too late" deserves a constant (`SCHEDULED_MESSAGE_LATE_CUTOFF_MINUTES`),
not a judgment call.

---

*Batch 04 · Zulip · no DAG, one queue · persistent, at-least-once, 3 retries, disk dead-letter
· the cron claims rows with a row lock · 10 minutes is the lateness limit.*
