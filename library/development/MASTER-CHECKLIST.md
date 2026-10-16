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
  door · the exit gate). **R28-6 (deleting OpenCode, `CC-72`) is trigger-blocked** until a second
  engine — Hermes — is wired behind the door.
- **ALSO NOW:** Row 16 team-leg (`CC-51` — your go-ahead) and the `B-WS/B9` widget design.
- **Behind it:** the platform-skeleton work (the Phase 5 remainders).

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
| 23 | 7 | Type a request in words; the platform makes a typed business request | ✅ | G-02 / G-17 · CC-58, CC-60 |
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
`platform_points.md` → ⏳ OPEN WORK (30 items) and in the HTML view, grouped by row.

Startable now or near-term (no hard blocker): **CC-66(2)** the history read · **CC-54** on the next
index rebuild · **CC-63** when a command is next touched · **CC-41** on the next deploy.
Needs you: **CC-11** (arm enforce per-tenant) · **CC-51** (team-leg go-ahead) · **CC-65** (retention
policy). Trigger-blocked on another build: **CC-6 / CC-20 / CC-66(1)** on G-04 · **CC-32** on G-09 ·
**CC-72 (R28-6)** on a second engine behind the door.

---

## 5. Platform study — 11 platforms

Nine closed; two pending your ask. They join as new `SR-*` columns, **no rework**.

- ✅ **Closed:** Hermes · Paperclip · CrewAI · Multica · Gas Town · n8n · buzz · openrig · zulip
- ⬜ **Pending your ask:** **mattermost** (226 MB zip on disk) · **activepieces** (added 2026-10-16 —
  `activepieces-main.zip` on disk, repo `activepieces/activepieces`)

The mapping output — **53 requirements** across the poles — is in
`library/architecture/mapping/findings/08-THE-SRS.md`, with the filterable register in
`library/architecture/mapping/workshop-status.html`.

---

## 6. How this file relates to the other registers (no conflicts)

| Document | Role |
|---|---|
| **`platform_points.md`** | THE ONE NUMBER + THE LIST + ⏳ OPEN WORK — the detailed source of truth for status |
| **`BACKLOG.md`** | the roadmap — order is mine to set |
| **`BUILD-ORDER.md`** | the shape of the work — what comes before what |
| **`NEEDS-YOU.md`** | the owner-decision list |
| **`../architecture/mapping/`** | the platform research + the `SR-*` architecture requirements |
| **This file + `MASTER-CHECKLIST.html`** | the one plain-English index over all of it |

---

## 7. Keeping it current

When a status changes: update it here **and** in `platform_points.md` (the number is derived from the
boxes, never typed), then re-open the HTML — its data block mirrors this list and is marked with the
date it was last synced. If this index and a register disagree, **the register wins and this file is
the defect** — fix it here.

**Last synced:** 2026-10-16 (mapping pass closed at 53 requirements; activepieces added as an 11th
platform).
