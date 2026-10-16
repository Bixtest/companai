# Zulip Study — Batch 07: the synthesis

**Status:** DONE · **Date:** 2026-10-16 · **Pole:** synthesis
**Source:** `library/architecture/platforms/_extracted/zulip-main/` @ `12.0-dev+git`

**What this batch is.** Batches 00–06 are closed. This is the synthesis: the measured totals, the
ranked mechanisms, the pole map, the honest ledger, and the ranked actions. Per the method,
**the batches stayed comparison-free** — the comparisons here are *observations*, and the
decisions remain the owner's at the mapping pass.

---

## §7.1 The measured totals (rule 13 — every number re-checked)

| Fact | Value |
|---|---|
| Batches | **7** (00 pin + 01–06) |
| Total lines | **1,693** (pin 213 + findings 1,480) |
| `★`-named mechanisms | **12 ranked** — from **8 `★`-headed sections** in batches 02–06 (02/03/04/05 ×1, 06 ×4) plus 4 lifted from inside them (ambient realm · lateness cutoff · event-carried retry · bot-as-user); batch 01 contributes 3 (process topology · API surface · the silenced `auth.W004`) |
| Divergences / honest limits | **30** (5 per findings batch) |
| Zip md5 | `f9cea131769925ceb01e64ea78c4113e` |
| Extract completeness | **9,009 / 9,016 files = 99.92%** (7 Mattermost-import fixtures lost to MAX_PATH) |
| Python | **2,037 files / 425,702 LOC** (385,211 non-migration · 40,491 migration · **182,992 tests**) |
| TypeScript | **471 files / 153,253 LOC** (393 top-level `web/src` modules) |
| Docs | **426 `.md` / 63,546 lines / 365,693 words** tree-wide; `docs/` alone = **182 files / 41,582 lines / 249,763 words**, incl. **35 named subsystem docs** |
| Migrations | **789 numbered files, numbered `0001`–`0812`** — **27 numbers absent** (`0002`–`0028`, squashed away into `0001_squashed_0569.py`) and **4 numbers carry two migrations each: `0001`, `0209`, `0261`, `0501` — exactly the `MIGRATIONS_TO_SKIP` set** (§7.5) |
| REST paths | **119** in a **31,869-line** hand-written OpenAPI spec |
| Test suite | `zerver/tests` **150 files / 163,703 LOC** + 21 web e2e files |
| Guard surface | **9 `check-*` scripts · 65 executable tools** |

**The one number to distrust by habit:** the first measurement of Python LOC produced **13,952**
via `find | xargs wc -l | tail -1` — a **30× undercount** caused by `xargs` batching. The honest
figure is **425,702**. Recorded in batch 00 §2.3 as a standing hazard.

---

## §7.2 The ranked mechanisms (three tiers)

### Tier 1 — transferable now, no adaptation needed

1. **★ The ambient realm** (P2, batch 03). The tenant is **derived from the request's Host
   header, by subdomain**, and the fence is a single comparison
   (`user_matches_subdomain(request_subdomain, user_profile)`). **The tenant is the context of
   every request, not a parameter a caller passes.** The most important single idea in the study.
2. **★ The three-representation contract check** (`check-schemas`, PZ, batch 06). The events-API
   schema is described in the OpenAPI YAML, in Python test schemas, and in JS fixtures — and a
   guard **diffs them across language boundaries**. Nothing else in the study does this.
3. **★ The feature-level ratchet** (PZ, batch 06). Leave a `ZF-` marker in the API docs and the
   build fails **and the automated announcement is skipped, so a human must do it by hand.** A
   mechanical check coupled to a human obligation. `API_FEATURE_LEVEL = 513`.
4. **★ The five-fence LLM pattern** (P1, batch 02). Server opt-in → per-realm group permission →
   per-user monthly cost cap → operator-chosen provider/secret → **output through the platform's
   own Markdown sanitizer**. The smallest defensible way to admit a model.

### Tier 2 — transferable with adaptation

5. **★ The widget-as-event-log** (PX-W, batch 05). A widget is an **append-only `SubMessage`
   log**; state is *derived by replay*; late joiners are correct by construction; the existing
   message-event system is the transport. **The study's first real widget model.**
6. **★ The DB claim queue for exactly-once** (P3, batch 04). A three-field work claim
   (`scheduled_timestamp__lte=now, delivered=False, failed=False`) + `.select_for_update` +
   `@transaction.atomic(durable=True)` — **exactly-one-worker-per-item from an at-least-once
   base.**
7. **★ The lateness cutoff** (P3, batch 04). `SCHEDULED_MESSAGE_LATE_CUTOFF_MINUTES = 10`. After
   an outage, **prefer a missing reminder to a flood of stale ones.** "How late is too late"
   deserves a constant.
8. **★ The event-carried retry counter** (P3, batch 04). `failed_tries` rides *inside the event
   payload*, so **retries survive a worker crash**. `MAX_REQUEST_RETRIES = 3`.
9. **★ `mark_sanitized`** (PZ, batch 06). A one-line identity function that is the **escape hatch
   for the project's own taint analyser** — 7 call sites, each with a written justification.
10. **★ The bot-as-user primitive** (P1, batch 02). A bot is a `UserProfile`; it is mentioned,
    DM'd, subscribed and permission-checked by the same code as a human. **No new "agent" object.**

### Tier 3 — decisions worth copying, not mechanisms

11. **★ The numeric audit-log namespace** (P2, batch 03). 117 event types where the *number
    alone* tells you the tier: 1xx–2xx realm, 9xx folder, **10xxx remote server (= realm + 10000)**,
    20xxx remote realm. **A data model that documents its own topology.**
12. **★ `AGENTS.md` + path-scoped `.claude/rules`** (PZ, batch 06). The contributor discipline
    **rewritten for an AI agent**, auto-loading per file path. The platform teaching its own
    guardrails to a machine.

---

## §7.3 The pole map

| Pole | Verdict | The one line |
|---|---|---|
| **P1 — the aissistant** | **Real but deliberately tiny** | *One* LLM feature (topic summarisation), fenced five ways; a bot is a user; the bot API is a 7-operation façade. No tools, no memory, no streaming, no RAG. |
| **P2 — the workspace** | **The strongest P2 in the study** | The realm is a 95-field config object, subdomain-resolved, **part of the user's identity** (email unique per-realm), governed by 5 roles / 8 system groups / **38 `can_*_group` permissions**, audited across 117 event types. **No database-level enforcement.** |
| **P3 — automations** | **Plumbing, not a product** | 14 queues, one worker framework, a 30 s `SIGALRM` per event, a 3-retry budget inside the event, **at-least-once** (`delivery_mode=2`), a **disk dead-letter**, and the scheduled-message claim queue with a 10-minute lateness cutoff. |
| **PX-W — widgets** | **★ The study's first real widget model** | A `SubMessage` event log + a zod discriminated union + a `GenericWidget` registry + the generic **zform** that bridges any bot. **No plugin model, no composer, no versioning — by decision.** |
| **PX-F — frontend** | **Deliberately old-school** | jQuery, 393 top-level TS modules, 462 hbs templates, 8 bundles, `blueslip`. No framework, no design-system package, no enforcement plugin. Readable, ordinary, unreusable. |
| **PZ — out-of-pole** | **The densest guard culture in the study** | `check-schemas` across three sources · the feature-level ratchet · `mark_sanitized` · a DEP-5 ledger that says "this script is not a lawyer" · `AGENTS.md` for AI agents. |

---

## §7.4 Zulip's one structural answer

**"Make the wrong thing hard to do, then catch the rest automatically."**

Every batch returned the same shape. The realm fence is a Host check so a developer cannot pass
the wrong tenant. The events API is described three times so drift is impossible. The API contract
has a ratchet so a half-finished change cannot merge. The taint analyser has a *named, justified*
escape hatch rather than a blanket ignore. The widget contract is a zod union validated on both
sides. The scheduled-message picker locks rows inside a transaction so two workers cannot collide.
**Zulip's architecture is not a set of features — it is a set of guardrails that happened to ship
a chat app.**

**The cost of that answer, stated plainly:** the machinery is enormous (65 tools, 425,702 LOC,
163,703 LOC of tests, 249,760 words of docs) and it is held together by **discipline, not
enforcement** in exactly the places that matter most — the tenancy fence has **no RLS**, the
taint escape hatch is **trust**, and the AI-agent policy is **advisory**. Zulip buys safety with
effort, and it says so.

---

## §7.5 The honest ledger (rule 10 — retirements and known gaps)

**Retirements observed in the tree:**
- **`tictactoe`** — a deleted legacy widget, still special-cased in
  `is_supported_widget_type` to suppress warnings (batch 05). **A scar, left in the code.**
- **The `GenericWidget` wrapper** — an acknowledged transitional abstraction ("as of January
  2026"), with concrete classes planned.
- **Migration renumbering** — `tools/renumber-migrations` exists *because* backports collide
  (it skips `0209`, `0261`, `0501`, `0001`), and its own comment says *"the migrations graph
  structure, not the IDs, is what matters."* **Verified in this batch:** those four numbers are
  exactly the four that **each carry two migration files** (`0001_initial` + `0001_squashed_0569`;
  `0209_stream_first_message_id` + `0209_user_profile_no_empty_password`; and two more pairs) —
  and numbers `0002`–`0028` are absent entirely, squashed away. **The skip list is a precise
  index of the collisions, not an arbitrary list.** A useful lesson: a maintenance script's
  constant set can be read as a fossil record of the mistakes it was written to absorb.

**Known, named, unfixed gaps (all in the code's own words):**
- The **AI cost-cap race** — checked pre-call, stat incremented post-call; a TODO describes the
  fix (a transaction-locked reservation) and it is **not implemented** (batch 02).
- **Summary caching** — "does not attempt to make use of caching previous summaries… Doing so
  correctly will require careful work around invalidation" (batch 02).
- **Widget schema versioning** — "This has yet to be designed" (batch 05).
- **`queue_json_publish_rollback_unsafe`** — republishes outside the DB transaction; the
  function *name* is the honest document (batch 04).
- **`react` and `update_message`** on the bot façade — declared, empty, "Not implemented"
  (batch 02).
- **The aged widget doc** — cites `submessage.js`/`poll_widget.js` while the tree has
  `widgetize.ts`/`poll_widget.ts`. The architecture is right; the filenames moved (batch 05).

---

## §7.6 Ranked actions

| # | Action | Why | Cost |
|---|---|---|---|
| 1 | **Take the ambient-realm pattern for the workspace fence.** Resolve the tenant once from the request context; never let a caller pass it. | The single most robust P2 idea measured; it makes a whole class of cross-tenant bug *unwritable*, not merely testable. | Medium — needs a middleware boundary. |
| 2 | **Adopt a contract-checked API schema in ≥2 representations.** Pick the two cheapest (spec + test schemas) and diff them in CI. | `check-schemas` is the only cross-language contract guard in the study; it is what makes `API_FEATURE_LEVEL` a real number. | Low–medium. |
| 3 | **Take the five-fence LLM pattern** (opt-in → group permission → per-user cost → provider-neutral → sanitised output) for any future AI feature. | It is the smallest defensible way to admit a model, and it reuses existing primitives rather than adding an agent framework. | Low. |
| 4 | **Add a lateness cutoff constant to any scheduler** (the `LATE_CUTOFF_MINUTES` idea). | Prevents the post-outage stampede; makes an explicit product decision that is otherwise made implicitly. | Very low. |
| 5 | **Put the retry counter in the event payload**, not in the worker's memory. | Retries survive a crash; a worker restart cannot lose the budget. | Very low. |
| 6 | **Name every "we know it's safe" decision** in the security model (the `mark_sanitized` idea) — a no-op annotation plus a one-line justification. | Turns invisible trust into greppable, reviewable intent. | Very low. |
| 7 | **Ship an `AGENTS.md`-class file** with path-scoped rules for AI contributors. | Zulip proves the contributor discipline can be made legible to a machine; we will be working with agents. | Low. |
| 8 | **If we ever add a widget model, start from the event-log design**, not a config object. | State-by-replay gives multi-user interaction, late-join correctness, and no second transport — for free. | High (only when needed). |
| 9 | **Do NOT copy the queue layer as-is.** At-least-once with no idempotency key and a file dead-letter is a conscious trade for simplicity. | If we adopt it, we must own handler idempotency and add a dead-letter tool. | — |

**My recommendation:** take **1, 2 and 3** first — the ambient realm, the two-representation
contract check, and the five-fence LLM pattern. They are the three that change what a *future
bug* looks like, they are the cheapest, and they do not require Zulip's scale.

---

## §7.7 The verdict

**Zulip is the most mature, largest, most conventionally-engineered platform in the study** — and
the most instructive, because its engineering quality is not a feature but a *method*: a
31,869-line hand-maintained API contract checked against two other representations; a tenancy
fence that is the ambient context of every request; a taint analyser with a named, justified
escape hatch; an AI-agent instruction set shipped beside the code.

**It contributes three things no other platform in this study did:** the **first real widget
model** (the `SubMessage` event log), the **strongest P2** (the ambient realm, identity-embedded),
and the **densest PZ** (`check-schemas`, the feature-level ratchet, `mark_sanitized`, `AGENTS.md`).

**And it is honest about its own limits in a way worth copying:** 30 recorded divergences, 6 named
unfixed gaps, 3 acknowledged retirements, an aged document, a 99.92% extract — and a licence guard
that says, of itself, **"This script is not a lawyer."**

---

*Batch 07 · Zulip · 7 batches · 1,693 lines for batches 00–06 (1,876 with this file) ·
12 ranked mechanisms · 30 divergences ·
the answer is "make the wrong thing hard to do, then catch the rest automatically."*
