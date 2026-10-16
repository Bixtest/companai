# THE MASTER CHECKLIST — everything we are building, in one place

**Purpose (owner, 2026-10-16):** *"I like to feel in control of what's done, where we are, and what's
left. One simple list that basically lists everything we will do with tick-boxes. When you say we
will do CC-84, I don't need to do an hour of research to see what that is, where it sits in the whole
development lifecycle."*

This is that list. **The HTML view is [`MASTER-CHECKLIST.html`](MASTER-CHECKLIST.html)** — open it in a
browser; it is self-contained and works offline. This markdown is its text twin and the anchor that
keeps it honest.

> **The rule this file obeys:** the detailed registers stay the source of truth. This is the **one
> index** that ties them together in plain English so no one has to hunt. When a status changes, it
> changes here **and** in the register it came from — never here alone.

---

## 1. Where the whole project stands — the headline

**78 of 321 units (~24%)**, derived from the ticked boxes, never typed. Counts on the checklist
rows (the 46 numbered vision rows plus `21b`, which is a row in its own right):

| Status | Rows | Meaning |
|---|---:|---|
| ✅ **done** | 32 | verified in code |
| 🟡 **partial** | 9 | capability built, a named remainder open |
| ☐ **open** | 4 | not started, trigger named |
| ⛔ **absent** | 2 | does not exist yet (business verticals) |
| | **47** | across 11 phases |

*(Counts measured from the checklist data, 2026-10-16 — the first draft of this line said 28/6/3/2
from memory and was wrong; Rule 13 applied.)*

**The honest headline:** the work that is *done* sits **high** in the stack — the AI-first loop is
largely built — while the **platform skeleton underneath it is only starting**. The next work goes
**down the stack** (the skeleton), not sideways into business modules.

**Source of truth for the number:** `platform_points.md` → THE ONE NUMBER.

---

## 2. ▶ The frontier — what is being built now

- **NOW — Row 28 (Phase 8):** the agent runtime behind one typed door. Sub-rows **R28-1 … R28-5 are
  DONE** (the port's shape · the first engine · the chat route moved onto it · the run closed at the
  door · the exit gate). Hermes is now **wired behind the door and live-proven** (`P2-5` selectable ·
  `P2-7`/`P2-8` live turns · `P2-9a` the MCP bridge — a real Hermes turn called one of the 21 platform
  tools). **R28-6 (deleting OpenCode, `CC-72`) waits on the `P2-9b` switchover decision** — the
  default-flip + the deletion + the `hermes-local` retirement, one change, paused on your stale-timeout
  ruling (the default toolset's ~16,757 tokens → a ~3000 s cold prefill vs the worker's own 2400 s
  stale ceiling).
- **ALSO NOW:** the architecture workshop's mapping pass is **DONE** (53 requirements,
  `SR-01`…`SR-53`); two platform studies remain (mattermost + activepieces), and the approved next
  build is the tooling set (`SR-38`/`39`/`41`/`46`) + `SR-08`.
- **Behind it:** Row 16 team-leg (`CC-51` — your go-ahead) and the `B-WS/B9` widget design.

---

## 3. The checklist — 47 rows in build order

Filterable in the HTML. IDs point at the register items that build each row, so a code-name always
resolves. The full per-row evidence is in `platform_points.md` → THE LIST.

| # | Phase | What you can do after this | Status | Register IDs |
|---:|---|---|---|---|
| 1 | 0 | Every record has a stable ID, owner, version, who-changed-it trail | 🟡 | C1–C11 / P0-spec · CC-12, CC-6, CC-20 |
| 2 | 0 | Answer what-is-this / who-owns-it / what-depends from one registry | ✅ | G-01 |
| 3 | 1 | Users, login, password reset, a session that knows who you are | ✅ | P1 |
| 4 | 1 | An agent is a real object — owned, acting-as, with a role | ✅ | AH-1 |
| 5 | 2 | Several organisations with hard walls between them | ✅ | P2 |
| 6 | 2 | Organise a tenant into units/departments, scope data to them | ✅ | P2 |
| 7 | 3 | Roles + permissions enforced on every write, not just the UI | ✅ | P3 |
| 8 | 3 | Creating a table/column forces the permission question | ✅ | SD-1 / S2 / P3a / P3b |
| 9 | 3 | Permission rules stored and read back by the running app | ✅ | P3b / M3e |
| 10 | 3 | Every write passes one gate: allow / refuse / ask a human | ✅ | P18 / D0–D3 |
| 11 | 3 | Change behaviour by setting, not by deploying code | ✅ | D1 |
| 12 | 3 | A high-impact change can be sent for approval | ✅ | D3 · CC-15, CC-38 |
| 13 | 3 | See and change the rules that govern a structure, from a screen | ✅ | SD-4 / SD-5 · CC-34 |
| 14 | 4 | Sensitive fields marked; never logged, never exported by accident | ✅ | P4 |
| 15 | 5 | Every read filtered by permission at the data layer | ✅ | P10 / CC-46 / CC-47 |
| 16 | 5 | Restrict a person to their own / their team's rows | 🟡 | CC-50 (own) · CC-51 (team) |
| 17 | 5 | Permission coverage reaches every table; a new table can't be un-gated | ✅ | CC-52 |
| 18 | 5 | The AI's read path goes through the same gates as a human | ✅ | CC-53 · CC-54 |
| 19 | 5 | Every state-changing action goes through one typed command | ✅ | S5 / CC-61 · CC-63 |
| 20 | 5 | A generic state-machine engine for any stage→stage flow | 🟡 | G-22 · CC-42 |
| 22 | 5 | An AI user can run only the agents bound to it | 🟡 | CC-27 core · CC-55/56/57 legs |
| 21 | 6 | See who did what, when, on which record; export for compliance | ✅ | P4 · CC-64, CC-65 |
| 21b | 6 | Audit history independent of the business record (can't edit your past) | ✅ | P4a (hash-chained ledger) |
| 23 | 7 | Type a request in words; the platform makes a typed business request | ✅ | G-02 / G-17 · CC-58 |
| 24 | 7 | The AI is structurally constrained — it cannot hallucinate a table | ✅ | G-17 |
| 25 | 7 | The platform validates deterministically before anything runs | ✅ | G-02 |
| 26 | 7 | Every request ends one of three known ways | ✅ | G-21 · CC-13 |
| 27 | 7 | The user is told when blocked, noticed and suggested to | 🟡 | S3 / S8 · CC-66, CC-8, CC-9 |
| 28 | 8 | The agent runtime sits behind one typed door | 🟡 | B-05 / Port · R28-6 = CC-72 |
| 29 | 8 | An AI user bound to a specific agent, tools and scope | ✅ | CC-27 (= row 22) |
| 30 | 8 | Each AI job declares which model it uses | ☐ | S6 |
| 31 | 9 | Save a request as a Function that runs with zero AI | ✅ | G-03 |
| 32 | 9 | A Function's lifecycle is an enforced state machine | ✅ | G-03 · CC-32 |
| 33 | 9 | A published Function never calls a model at run time — proven by test | ✅ | G-03 |
| 34 | 9 | A Function runs from a Widget with typed inputs/outputs | ✅ | G-07 |
| 35 | 9 | Place Functions and Widgets on a Workspace and share it | ☐ | B-WS design · CC-62 build set |
| 36 | 10 | A complete business vertical runs end-to-end on the skeleton | 🟡 | B1–B14 |
| 37 | 10 | CRM: leads, contacts, deals, pipeline | ✅ | B1 |
| 38 | 10 | Sales: orders, quotes, invoices, returns | ✅ | B2 |
| 39 | 10 | Catalog: products and pricing | ✅ | B3 |
| 40 | 10 | Inventory / WMS: stock and warehouses | ✅ | B4 |
| 41 | 10 | Finance / accounting (GL, AP/AR) | ⛔ | B5 / M1 |
| 42 | 10 | Procurement / purchasing | ⛔ | B6 / M2 |
| 43 | 10 | HR / people (payroll absent) | 🟡 | B7 |
| 44 | 10 | Projects, shipping, payments, customer portal | 🟡 | B8–B14 |
| 45 | 11 | Entitlements separated from permissions | ☐ | blueprint §50 |
| 46 | 11 | Deployment, operations and the dev-doc set complete | ☐ | J / K · CC-19, CC-41 |

---

## 4. Open work — every unfinished item, with its trigger

**The trigger is the observable event that makes an item startable.** Full plain-English detail is in
`platform_points.md` → ⏳ OPEN WORK (29 items) and in the HTML view, grouped by row.

Startable now or near-term (no hard blocker): **CC-66(2)** the history read · **CC-54** on the next
index rebuild · **CC-63** when a command is next touched · **CC-41** on the next deploy.
Needs you: **CC-11** (arm enforce per-tenant) · **CC-51** (team-leg go-ahead) · **CC-65** (retention
policy). Trigger-blocked on another build: **CC-6 / CC-20 / CC-66(1)** on G-04 · **CC-32** on G-09 ·
**CC-72 (R28-6)** on the `P2-9b` switchover decision (Hermes is wired and live-proven; what gates the
deletion is your stale-timeout ruling, not the engine).

*Closed since the first draft, verified in code and in the register: **CC-60** (done by `P2-4` — the
runner agent `business_ir.query_runner` carries the fixed one-tool menu `business_ir.run_query`,
`ai-agents.ts:197`) and **CC-67** (row 28's door is complete; the open row-28 item is `CC-72`).*

---

## 5. The register — every named item, closed and open

The `CC-*` codes are the fine-grained items behind the rows above — the cuts, the findings, the fixes.
**Every one has an address here**: a code you meet anywhere in the documents resolves on this page.
**Closed** = built and proven (tests, mutations, a separate-agent hostile critic — the record is in
`COMPLETION-CALLBACKS.md`). States were read item by item from that register, not scanned by keyword.
**CC-75 was never assigned** — the numbering skips it. **45 closed · 38 open · 83 total.**

| Item | What it is, in plain words | State |
|---|---|---|
| CC-1 | The permission write now lands: the gate's defaulted outcome is applied to the tenant's grant role | ✅ closed |
| CC-2 | The batch route is gated at the route | ✅ closed |
| CC-3 | The module-install / CLI create paths are gated, fail-closed, grants after the flush | ✅ closed |
| CC-4 | A field re-type is gated on every write site that can re-type one | ✅ closed |
| CC-5 | The S11 grammar ships as a setting (five verbs — SD-4 Slice C) | ✅ closed |
| CC-6 | The data-axis row shape is not built (per-record view / manage) | ☐ open |
| CC-7 | The catalogue is in-process for recorded surfaces — a recorded field lives for the process, not a durable row | ☐ open |
| CC-8 | tool-test-runner runs a read-tool handler ungated (CLI-only today) | ☐ open |
| CC-9 | catalog / customers context calls a tool handler with userId: null | ☐ open |
| CC-10 | The HTTP RBAC path passes no invoker (the tool door does) | ☐ open |
| CC-11 | enforce is not armed for any tenant — the operator's per-tenant decision | ☐ open |
| CC-12 | The universal Resource envelope is not built (the registry half is done) | ☐ open |
| CC-13 | G-21's schema-mutation IR kind, its UI and its database row are not built | ☐ open |
| CC-14 | The escalation branch in the three parked modules is commented out | ☐ open |
| CC-15 | No live route proves the escalation (202 + a pending_acts row) end-to-end | ☐ open |
| CC-16 | The grant merge into role_acls.features_json is one atomic SQL UPDATE | ✅ closed |
| CC-17 | Both halves closed: the decision carrier (request header) exists and is checked | ✅ closed |
| CC-18 | The batch route names every key it is about to write | ✅ closed |
| CC-19 | dynamicLoader.tsconfig.test.ts fails under the full suite (environmental, not a code defect) | ☐ open |
| CC-20 | A custom field's permission is granted, but nothing reads it | ☐ open |
| CC-21 | The custom-entity install primitive is gated (upsertCustomEntity, fail-closed) | ✅ closed |
| CC-22 | Both HTTP reactivation paths are gated at the route | ✅ closed |
| CC-23 | The create branch of the grant write is atomic too | ✅ closed |
| CC-24 | A custom entity's HTTP reactivation is gated at the route (the CC-22 shape) | ✅ closed |
| CC-25 | The carrier read now checks the actor (decidedBy / grantTo verified) | ✅ closed |
| CC-26 | The create page carries the checkbox field | ✅ closed |
| CC-27 | An AI user can run only the agents bound to it (the core leg) | ✅ closed |
| CC-28 | The batch read-back inside GET is fixed | ✅ closed |
| CC-29 | The deletedAt clause is pinned in both consumers; the globalThis leak became a coverage gate | ✅ closed |
| CC-30 | The custom-entities storage entry corrected (the migration is unapplied on live DBs — noted) | ✅ closed |
| CC-31 | The core set is marked by column, not by name (Option B, owner ruling) | ✅ closed |
| CC-32 | A saved Function has no persistence — so it has no delete path to guard | ☐ open |
| CC-33 | The structural guard sees row writes, not raw DDL | ☐ open |
| CC-34 | The read / reference verbs are grammar postures, not write-path-enforceable | ☐ open |
| CC-35 | A structural re-type labelled 'create' would escape the guard | ☐ open |
| CC-36 | Several foreign guard-input builders omit actorKind | ☐ open |
| CC-37 | The structural settings ship the S11 grammar as a setting | ✅ closed |
| CC-38 | The escalate outcome has no approval-layer wiring — nobody files the pending act | ☐ open |
| CC-39 | The actor check reads live ACL state inside a guard's validate | ☐ open |
| CC-40 | auth:role is a declared kernel entity | ✅ closed |
| CC-41 | update.sh fix shipped; the closing proof is a double-build | ☐ open |
| CC-42 | G-22 Slice 2B — the state-machine engine's first caller (business work) | ☐ open |
| CC-43 | readTenantSurfaces is the live consumer of the persisted surfaces (the read half) | ✅ closed |
| CC-44 | The write-path gate is DEFAULT-DENY at the build | ✅ closed |
| CC-45 | Server-side exports consult the map and MASK marked fields | ✅ closed |
| CC-46 | All 53 searchable entities declare aclFeatures (+ a coverage gate) | ✅ closed |
| CC-47 | The human CRUD GET / list path IS permission-gated (403) | ✅ closed |
| CC-48 | The custom-entity records page's export goes through the server | ✅ closed |
| CC-49 | The customer-tasks export is built by the server | ✅ closed |
| CC-50 | The OWN leg of row 16 (opt-in owner scope) | ✅ closed |
| CC-51 | Row 16 Option B: own + TEAM row scope — deferred by the owner | ☐ open |
| CC-52 | Every table must be searchable / a read surface / allowlisted (233 tables) | ✅ closed |
| CC-53 | The AI read path applies the classification column-mask (+ the presenter / aggregate leak fixes) | ✅ closed |
| CC-54 | The index-time presenter can still promote any string field | ☐ open |
| CC-55 | The narrowing leg: tools INTERSECT, features UNION | ✅ closed |
| CC-56 | The confirm route re-checks the binding before executing | ✅ closed |
| CC-57 | The in-process helper consults the binding + threads its scope (the last named leg) | ✅ closed |
| CC-58 | The Business-IR screen (Stage C / B not started; Stage A in force) | ☐ open |
| CC-59 | The Business-IR chain's first production caller — registered and gated | ✅ closed |
| CC-60 | The tool's in-chat consumer — done by P2-4 (the runner agent's fixed one-tool menu) | ✅ closed |
| CC-61 | The command contract made uniform (all six facets on the action log) | ✅ closed |
| CC-62 | The workspace build set (menu join, thread lifecycle, collaboration, AI-as-participant, extensions) | ☐ open |
| CC-63 | The command contract's facets are declared by 0 of ~93 production commands | ☐ open |
| CC-64 | An undo's trace entry bypasses the hash-chained ledger | ☐ open |
| CC-65 | action_logs has no retention path | ☐ open |
| CC-66 | Row 27's remaining parts (reduced-marker, history read, offer, never-acts-without-asking) | ☐ open |
| CC-67 | Row 28's door: the platform's own runtime sits behind it; both window-walkers closed | ✅ closed |
| CC-68 | The non-deterministic MCP dev-key test fixed (not the product) | ✅ closed |
| CC-69 | The chat route's question short-circuit — RULED: stays a named, pinned, permanent exception | ✅ closed |
| CC-70 | The chat run's capabilityGrantId is carried but not consumed | ☐ open |
| CC-71 | The health endpoint's direct engine reach — RULED: stays a named, pinned, permanent exception | ✅ closed |
| CC-72 | Delete OpenCode from behind the door (R28-6) — the switchover's deletion half | ☐ open |
| CC-73 | The ai-assistant type gate says 0 (92 pre-existing test-only errors fixed) | ✅ closed |
| CC-74 | hermes-local retires in P2-9b (the retirement is the switchover's content) | ☐ open |
| CC-76 | The OpenCode adapter now honours the envelope's deadline (fixed in P2-6) | ✅ closed |
| CC-77 | The capability grant resolves to nothing — a label, not an authority | ☐ open |
| CC-78 | The task-shaped starting menu has no machinery behind it | ☐ open |
| CC-79 | The live worker bridge: the worker CAN knock on the door (P2-9a — a live turn called a platform tool) | ✅ closed |
| CC-80 | The ai-assistant suite is hermetic (measured on both sides) | ✅ closed |
| CC-81 | The base tool interfaces are not assignable from a narrowly-typed tool | ☐ open |
| CC-82 | The port carries no settings (model / toolset / prompt are deployment constants on the Hermes path) | ☐ open |
| CC-83 | P2-9b retires the only door that can write into a Hermes session | ☐ open |
| CC-84 | The worker's tool calls carry ONE identity (the superadmin's) — the live Hermes path bypasses per-user, per-tenant authority | ☐ open |

---

## 6. Platform study — 11 platforms

Nine closed; two pending your ask. They join as new `SR-*` columns, **no rework**.

- ✅ **Closed:** Hermes · Paperclip · CrewAI · Multica · Gas Town · n8n · buzz · openrig · zulip
- ⬜ **Pending your ask:** **mattermost** (226 MB zip on disk) · **activepieces** (added 2026-10-16 —
  `activepieces-main.zip` on disk, repo `activepieces/activepieces`)

---

## 7. The architecture requirements (SR) — every one, with its address

The mapping output — **53 requirements** across the poles — is in
`library/architecture/mapping/findings/08-THE-SRS.md`, with the filterable register in
`library/architecture/mapping/workshop-status.html`. **Every one of them has an address here** — the
table below, read straight from that register (its wording, not a rewrite). **Status meanings:**
**HAVE** = exists and is named · **BUILD** = planned, a register item builds it · **BORROW** = the
mechanism comes from a platform study · **RE-ENGINEER** = the target exceeds what mercato does today.
**3 HAVE · 10 BUILD · 38 BORROW · 2 RE-ENGINEER = 53.** The sequencing rule from the SRS: the tooling
set (`SR-38`/`39`/`41`/`46`) lands **first** — no blockers — and `SR-08` has no prerequisite at all.

| Item | Pole | What it is | From | State | Extends / gate |
|---|---|---|---|---|---|
| SR-01 | P1 | Typed engine port; nothing above it imports Hermes | Hermes | ✅ HAVE | `P2-1…P2-9a` (built) |
| SR-02 | P1 | An agent is not its runtime; uniqueness key as a DB constraint | Multica | ☐ BORROW | — |
| SR-03 | P1 | Permission policy ladder as data | openrig | ☐ BORROW | — |
| SR-04 | P1 | Two-surface rule: policy set by code, never config | openrig | ☐ BORROW | — |
| SR-05 | P1 | Sub-agent spawn cap (measured) + spawn ledger | n8n, Hermes | ☐ BUILD | corrected in the SRS (rule 13) |
| SR-06 | P1 | Skills as versioned `SKILL.md` artifacts | n8n, Hermes | ☐ BORROW | — |
| SR-07 | P1 | A bot is a participant, not a parallel object | zulip | ☐ BORROW | — |
| SR-08 | P1 | The triage core gets a production caller | mercato | ☐ BUILD | `G-21`, `CC-59`, `CC-60` — no prerequisite |
| SR-09 | P1 | Typed tool filter with `run_context`; typed tool failures | CrewAI | ☐ BORROW | A2UI moved to `SR-32a` |
| SR-10 | P2 | Ambient tenancy: tenant derived from the request | zulip | ☐ RE-ENGINEER | — |
| SR-11 | P2 | Scope enters once — collapse the double entry | mercato, zulip | ☐ BUILD | `CC-84` |
| SR-12 | P2 | One tenant ↔ one engine home; per-run credential | Multica | ☐ BUILD | `CC-84` — gates `P2-9b` |
| SR-13 | P2 | Identity keys unique per realm, DB-enforced | zulip | ☐ BORROW | — |
| SR-14 | P2 | Scope registry with a build-time ratchet | n8n | ☐ BORROW | — |
| SR-15 | P2 | Audit log with topology-encoded event numbering | zulip | ☐ BORROW | — |
| SR-16 | P2 | Personal / team workspace kinds | n8n | ☐ BORROW | — |
| SR-17 | P2 | Tenancy contract + prose + conformance harness + `LIMITS.md` | buzz | ☐ BORROW | — |
| SR-18 | P2 | Machine actors capped at approve-first, test-pinned | mercato | ✅ HAVE | authority layer (test-pinned) |
| SR-19 | P3 | Durable wake queue: at-least-once, retries in payload, late cutoff | zulip | ☐ BUILD | — |
| SR-19a | P3 | Budget per event, not just per queue — a single event gets bounded time | zulip | ☐ BORROW | `MAX_CONSUME_SECONDS = 30` (SIGALRM) |
| SR-19b | P3 | The row carries the obligation exactly-once; the wake is at-least-once | openrig | ☐ BORROW | baton + wake committed in one transaction |
| SR-20 | P3 | One-statement claim with health gate inside | Multica | ☐ BORROW | — |
| SR-21 | P3 | Closed failure taxonomy per attempt | Multica | ☐ BORROW | — |
| SR-21a | P3 | Recovery is a named set of sweepers, one per way a task can die — not a generic retry | Multica | ☐ BORROW | F04-03 |
| SR-22 | P3 | Every command declares risk + approval + expiry | mercato, buzz | ☐ BUILD | `CC-63` |
| SR-22a | P3 | A slower poller only hides the bug — a reconciler that honours human cancellation beats it | Paperclip | ☐ BORROW | the DOT-2 lesson |
| SR-23 | P3 | Transport does not decide | Gas Town | ☐ BORROW | "Zero Framework Cognition" |
| SR-24 | P3 | Durable hooks for side effects | Gas Town | ☐ BORROW | F03-03 — cited from the P2 file |
| SR-25 | P3 | Event-kind registry; kinds over endpoints | buzz | ☐ BORROW | — |
| SR-26 | P3 | Every approval gate ships a test that fires it | buzz | ☐ BUILD | — |
| SR-27 | PX-W | Widget = append-only log; state by replay | zulip | ☐ RE-ENGINEER | — |
| SR-28 | PX-W | Discriminated-union contract over widget kinds | zulip | ☐ BUILD | — |
| SR-29 | PX-W | One generic renderer: `WidgetIR` → DOM | zulip, mercato | ☐ BUILD | — |
| SR-30 | PX-W | Generic bridge: any backend drives any widget | zulip | ☐ BORROW | — |
| SR-31 | PX-W | Widget-kind registry; kinds register themselves | zulip | ☐ BORROW | — |
| SR-32 | PX-W | Composition canvas with CRDT collaboration | n8n | ☐ BORROW | — |
| SR-32a | PX-W | Widget **protocol**, not widget model — a declarative UI vocabulary a client renders | CrewAI | ☐ BORROW | new row; the A2UI find |
| SR-33 | PX-F | Design system + own ESLint plugin guarding composition | n8n | ☐ BORROW | — |
| SR-33a | PX-F | Deliberate non-features recorded: no plugin model, no dynamic loading, no schema versioning | zulip | ☐ BORROW | — |
| SR-34 | PX-F | Prohibition-constrained 3-package layering | Multica | ☐ BORROW | — |
| SR-35 | PX-W | UMES injection as the widget entry point | mercato | ✅ HAVE | kit |
| SR-35a | PX-F | Frontend as information architecture: a fetcher interface beats a widget tree | Gas Town | ☐ BORROW | the `ConvoyFetcher` find |
| SR-36 | PX-F | Dashboard + perspective screens | mercato | ☐ BUILD | `M5` |
| SR-37 | out | Plugin/module registry with full lifecycle | Hermes, Multica | ☐ BORROW | corrected in the SRS (rule 13) |
| SR-38 | out | Digital-twin harness; drift breaks the build | openrig | ☐ BORROW | **the next task — prerequisites measured in code** |
| SR-39 | **PZ** | One-truth check across every representation | zulip | ☐ BORROW | — |
| SR-40 | **PZ** | Feature-level ratchet only a human can raise | zulip | ☐ BORROW | trigger corrected in the SRS |
| SR-41 | **PZ** | Named, greppable escape hatches | zulip | ☐ BORROW | — |
| SR-42 | **PZ** | Exclusion ledger with mechanical expiry; ships empty | openrig | ☐ BORROW | — |
| SR-43 | **PZ** | Proof beside prose: contract + falsifiable check + `LIMITS.md` | buzz | ☐ BORROW | — |
| SR-44 | **PZ** | Retirement ledger; renames are tracked hazards | buzz, openrig | ☐ BORROW | — |
| SR-45 | out | Kinds-over-endpoints policy with conformance test | buzz | ☐ BORROW | — |
| SR-46 | out | Two-reads lint: any setting read twice must be read once | openrig | ☐ BORROW | — |

---

## 8. How this file relates to the other registers (no conflicts)

| Document | Role |
|---|---|
| **`platform_points.md`** | THE ONE NUMBER + THE LIST + ⏳ OPEN WORK — the detailed source of truth for status |
| **`BACKLOG.md`** | the roadmap — order is mine to set |
| **`BUILD-ORDER.md`** | the shape of the work — what comes before what |
| **`NEEDS-YOU.md`** | the owner-decision list |
| **`../architecture/mapping/`** | the platform research + the `SR-*` architecture requirements |
| **This file + `MASTER-CHECKLIST.html`** | the one plain-English index over all of it |

---

## 9. Keeping it current

When a status changes: update it here **and** in `platform_points.md` (the number is derived from the
boxes, never typed), then re-open the HTML — its data block mirrors this list and is marked with the
date it was last synced. If this index and a register disagree, **the register wins and this file is
the defect** — fix it here.

**Last synced:** 2026-10-16 (audit — the register section added: all 83 `CC-*` items carry an address;
the SR register added: all 53 architecture requirements carry an address (3 HAVE · 10 BUILD ·
38 BORROW · 2 RE-ENGINEER), read straight from `08-THE-SRS.md`; `CC-60` closed by `P2-4` and
`CC-67` closed, both verified in code and in the callbacks register; `CC-72` is the open row-28
item; the frontier boxes aligned across BACKLOG / platform_points / JOURNAL).
