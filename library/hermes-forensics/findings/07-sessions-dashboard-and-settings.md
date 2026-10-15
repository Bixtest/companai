# Batch 07 — Sessions and the dashboard surface

**Status:** DONE — 2026-10-15 · **Source:** the pinned tree (`00-PIN-AND-METHOD.md` §1)
**Method:** doc claims checked against the Python source; code wins; divergences recorded.

---

## 0. What this batch is (in plain words)

Batch 06 covered **what the AI runs over time**. This batch covers **the record of what it did** and
**the surface a human uses to see and change it** — the durable session store, and the browser dashboard
that administers the whole installation (config, keys, sessions, cron, skills, MCP, channels).

It is deliberately **not** a tour of every CLI command (`reference/cli-commands.md` is 133 KB of flags, a
reference not a capability). This batch reads the two *capabilities*: a **session system** and an
**admin surface**.

---

## 1. What was read, and how big it is (measured)

| Doc (under `website/docs/`) | Bytes |
|---|---:|
| `user-guide/sessions.md` | (1,237 lines) |
| `user-guide/features/web-dashboard.md` | 82,422 |
| `user-guide/features/extending-the-dashboard.md` | 41,422 |
| `reference/slash-commands.md` | 48,570 |
| `reference/cli-commands.md` | 133,259 (skimmed — reference) |

| Code verified against | Evidence |
|---|---|
| `hermes_cli/config_defaults.py` | `DEFAULT_CONFIG` at line 33; the `sessions` block; **counted**: 99 sections / 816 leaf keys |
| `hermes_cli/main_dashboard.py` | `port = 9119` (line 57) |
| `hermes_cli/dashboard_procs.py` | the headless-serve PID matching (line 776) |
| `tools/session_search_tool.py` | the four calling shapes (FTS5) |
| `hermes_cli/dashboard_auth/`, `plugins/dashboard_auth/` | the auth provider implementation |

---

## 2. Sessions — the durable record

### 2.1 One store, every surface

Every conversation — CLI, TUI, Desktop, Telegram, Discord, Slack, WhatsApp, Signal, Matrix, Teams, cron,
kanban, ACP — is a **session** in one SQLite database: `~/.hermes/state.db`, with **FTS5 full-text
search** (`sessions.md:15–27, 1091–1135`). The schema is three tables: `sessions` (metadata, with a
**unique index on non-NULL titles**), `messages` (full history), `messages_fts` (the FTS5 index).

**Why this is the right shape:** there is **one** store, so `hermes sessions list`, `/sessions`, the
dashboard and the agent's own `session_search` tool all read the same truth. The doc explicitly warns
about the common misreading: `~/.hermes/sessions/sessions.json` is a **legacy gateway-routing mirror**,
not the session list (`sessions.md:1102`) — seeing only Telegram entries there does **not** mean CLI
sessions are missing.

### 2.2 Sources — ~24 platforms, one taxonomy

`sessions.md:111–142` enumerates every source tag: `cli`, `oneshot`, `telegram`, `discord`, `slack`,
`whatsapp`, `signal`, `matrix`, `mattermost`, `email`, `sms`, `dingtalk`, `feishu`, `wecom`, `weixin`,
`bluebubbles`, `qqbot`, `homeassistant`, `webhook`, `api-server`, `acp`, `cron`, `batch`, `kanban`,
`tool`. Two of them are **hidden from pickers by design** (`oneshot`, `kanban`, `tool`) because they are
*machinery, not conversations* — the same judgement the config makes with `show_subagents: false`.

### 2.3 Resume, naming and the lineage

- **Resume** by ID, by title, or `latest`; `-c` is **terminal-aware** — a breadcrumb under
  `~/.hermes/terminal-sessions/` means two side-by-side panes each continue *their own* conversation
  instead of both grabbing the newest (`sessions.md:165`).
- **Titles** are auto-generated (3–7 words, background aux model, once per session) or set manually;
  they are **unique**, **max 100 chars**, and **sanitized** (control chars, zero-width chars, RTL
  overrides stripped) (`sessions.md:328–333`). That sanitization is a small security detail worth
  noticing: a title can end up in a terminal listing, so it is treated as untrusted text.
- **Auto-lineage on compression** — a compressed session's continuation gets a numbered title
  (`"my project"` → `"my project #2"`), and resume-by-name picks the newest (`sessions.md:335–343`).

### 2.4 The lifecycle management set (this is the capability)

`hermes sessions` is a full lifecycle surface, and the breadth is the point:

| Verb | What it does | Design detail worth naming |
|---|---|---|
| `list` | filter by source/workspace; capped pages print `… more not shown` | a capped page is *never* mistaken for the full list |
| `export` | one surface, **4 formats**: `jsonl` (backup) · `md`/`qmd` · `html` · `trace` (HF Agent Trace Viewer) | `--redact` scrubs secrets on any format |
| `import` | pull in **Claude Code** and **Codex CLI** transcripts | foreign files are **only read**, never modified |
| `delete` / `prune` | remove ended sessions by any of ~20 filters | refuses mid-turn; **active sessions are never pruned** |
| `archive` | soft-hide (same flag as the Desktop sidebar) | returns on its own when the chat goes live again |
| `pin` | durable "keep" — exempt from the stale sweep | machine-readable `--json` for nightly pin backups |
| `optimize` | merge FTS5 segments + VACUUM, **non-destructive** | the recommended *first* answer to a large DB |
| `repair-routing` / `repair-prompts` / `repair-profiles` | three separate, evidence-gated repairs | see §2.6 |
| `stats` | totals by source, DB size | deeper analytics live in `hermes insights` |
| `discard` | acknowledge a turn lost in a gateway crash | refuses `without --yes` when stdin isn't a TTY |
| `set-journal-mode` | convert WAL ↔ DELETE safely | refuses while any process holds the file |

**The export honesty is notable.** A `jsonl` backup holds **every stored row** — including turns archived
by compaction and messages removed by rewind/edit. The doc says so plainly: *"Treat a backup as holding
everything the session ever contained."* To **share** a conversation you export a *display* format
(`md` / `html`) with `--redact` (`sessions.md:425`). Backup vs share are different operations with
different truth, and the docs keep them apart.

### 2.5 Automatic cleanup — with the reasoning shown

Auto-prune is **on by default** (`sessions.auto_prune: true`, `retention_days: 90`) and the doc explains
*why the default changed*: without it, `state.db` grows unbounded — *"multi-GB files within weeks were
reported on gateway + cron installs"*, and the observed failure mode is named (`sessions.md:1148, 1235`).

Two mechanics show the care:

- **VACUUM is gated twice** — only after a prune that *actually* deleted rows, only when at least
  `min_vacuum_interval_days` (**30**) have passed, **and** only when >25 % of pages are reclaimable. *"A
  dense database never pays for a full rewrite to reclaim a few MB"* (`sessions.md:1145`).
- **Stale automation sessions are *closed*, not deleted.** Cron/kanban/subagent/one-shot rows whose
  process died without ending the session are closed (`end_reason: startup_orphan_reap`), then get a
  **further full retention window** before removal. Closing is non-destructive — the session stays
  resumable (`sessions.md:1170–1183`).

**VERIFIED** (`config_defaults.py` `sessions` block): `auto_prune` True, `retention_days` 90,
`auto_archive` False, `auto_archive_days` 3, `show_subagents` False, `vacuum_after_prune` True,
`min_vacuum_interval_days` 30, `min_interval_hours` 24. **Doc claim: TRUE across the board.**

### 2.6 Guards that fail closed, and repairs that ask first

- **Oversized-transcript guards** — `max_resume_messages` / `max_export_messages` (both default
  **20,000**; `0` disables) stop a runaway transcript being loaded into memory at once. A refused resume
  returns error code **4130** naming the scope it was measured against (`across its lineage` vs
  `in its tip segment`) — a precise error, not a bare failure (`sessions.md:1185–1218`).
- **Three repairs, all evidence-gated and all refusing ambiguity:**
  - `repair-routing` adopts orphaned gateway rows **only** on *lineage* (a recorded parent fact) or
    *contiguity* (exactly one candidate). *"Anything ambiguous … is reported with a reason and left
    untouched — a wrong adoption would splice one conversation into another chat."* It is deliberately
    **not automatic** (`sessions.md:693–733`).
  - `repair-prompts` proposes a repair only on a **conjunction** — the stored prompt is missing the
    `## Skill Safety` guidance **and** the persisted `tools[]` pin contains `skill_manage`. Rows that
    can't be proven are reported **unverifiable** and left unchanged (`sessions.md:735–781`).
  - `repair-profiles` moves crossed state between profile stores, and **explicitly reports two cases it
    will not auto-repair** because *"the rows themselves cannot tell the two apart"* (`sessions.md:783–827`).

This is the same discipline that runs through the whole study: when the evidence can't distinguish two
causes, the tool **says so and stops**.

### 2.7 Session hygiene — the docs' own honest criticism

The doc makes an argument most products would hide: because gateway conversations **never expire on their
own**, it is easy to run one session for weeks — and that *"quietly defeats the learning loop and inflates
costs"* (`sessions.md:1045`). Memory is injected at session start; in a never-ending session everything is
still in context, so the agent never consults memory and memory distillation never runs. The advice:
end a session at natural stopping points, optionally nudging the agent to "remember anything worth
keeping." **Restarting the machine is not a boundary.**

---

## 3. The dashboard — the human admin surface

### 3.1 What it is

A **browser-based** admin panel, running entirely on the machine (`hermes dashboard` →
`http://127.0.0.1:9119`) — *"no data leaves localhost"* (`web-dashboard.md:7–17`). **VERIFIED**: default
port `9119` at `hermes_cli/main_dashboard.py:57`.

Two design decisions stand out:

- **It is machine-level, not single-profile.** One server manages **every profile on the machine**, with a
  sidebar profile switcher; while a non-own profile is selected an **amber banner names the managed
  profile** so *"the write target is never ambiguous"* (`web-dashboard.md:44–60`). The selection lives in
  the URL (`?profile=worker`), so deep links land preselected.
- **A public bind always requires auth.** `--insecure` is a **deprecated no-op** — it no longer disables
  authentication; binding off-loopback requires a password or OAuth provider (`web-dashboard.md:23–32`).

### 3.2 Pages

Status · Chat · Config · API Keys · Sessions · Logs · Analytics · Cron · Profiles · Skills · MCP ·
Webhooks · Pairing · Channels · System (`web-dashboard.md:107–434`). The **Status** page carries a
**resource-pressure banner**: memory (elevated <128 MiB / critical <64 MiB), disk (<512 MB / <256 MB), and
**a suspected-OOM restart notice** read from the lifecycle ledger — severity-ordered, dismissal scoped to
the current gateway boot (`web-dashboard.md:120–140`).

### 3.3 The Config page — and the divergence

The dashboard renders `config.yaml` as **auto-discovered** form fields: dropdowns for known valid values,
toggles for booleans, text inputs otherwise, with Save / Reset / Export / Import, and changes taking
effect on the next session or gateway restart (`web-dashboard.md:229–258`).

**DIVERGENCE FOUND.** The doc says the Config page covers *"All **150+** configuration fields."* I
**counted** `DEFAULT_CONFIG` in `hermes_cli/config_defaults.py` (line 33) with an AST walk:
**99 top-level sections, 816 leaf keys.** The doc's "150+" understates the real surface by more than
**5×**. Code wins — the number is **≥800 configurable leaves**, and the doc's figure is stale. This matters
for the platform: the settings surface is **much** larger than the doc implies, which is itself a finding
about the size of the configuration space (and its cost of ownership).

### 3.4 The REST API and extension

The dashboard exposes a **REST API** (`GET /api/status`, `/api/sessions`, `/api/config`, `PUT /api/config`,
`/api/env`, `/api/logs`, `/api/analytics/usage`, the `/api/cron/*` family, `/api/skills`, …)
(`web-dashboard.md:445–601`), and is **extensible** (`extending-the-dashboard.md`, 41 KB) — the same
plugin-style surface seen in batch 05.

---

## 4. The capability table — the owner's two questions

`Verdict` empty (that is Batch 12's job).

### 4.1 Sessions

| Capability | What it is (plain) | Q1 · user value | Q2 · vision value | Phase |
|---|---|---|---|---|
| **One SQLite store for every surface** | all conversations in one searchable DB | "where did I say that?" works across every channel | **one record of all work**, by construction | `now` |
| **`session_search` (FTS5, free)** | agent recalls past conversations itself | the AI remembers what was discussed, unprompted | **unlimited recall at zero token cost** (batch 04) | `now` |
| **Resume / naming / lineage** | pick up any past conversation by name | continuity without bookkeeping | long-lived workstreams | `now` |
| **Export in 4 formats + `--redact`** | backup vs share kept distinct | take your history with you safely | **data portability / no lock-in** | `now` |
| **Import from Claude Code / Codex** | pull in another agent's transcript | keep history when switching tools | **integratability** — reads rivals' formats | `now` |
| **Auto-prune + gated VACUUM** | disk never grows without bound | the install stays healthy | **operational hygiene as a default** | `now` |
| **Evidence-gated repairs (3)** | safe fixes that refuse ambiguity | no silent corruption of history | **trust through conservatism** | `now` |
| **Pinning / archiving** | keep, or soft-hide, without deleting | control over what you see | retention policy as data | `now` |

### 4.2 The dashboard

| Capability | What it is (plain) | Q1 · user value | Q2 · vision value | Phase |
|---|---|---|---|---|
| **Local browser admin panel** | configure everything without YAML | a non-technical owner can run it | **a control room for the AI organisation** | `soon` |
| **Config auto-discovered from defaults** | every setting has a form field | nothing hidden from the owner | **full config transparency** | `soon` |
| **Machine-level, multi-profile switcher** | one panel manages all profiles | one place for the whole machine | **operator console** over many tenants | `soon` |
| **Sessions page (browse/search/export/prune)** | see and manage every conversation | visibility + control | **the record, human-readable** | `soon` |
| **Cron / Skills / MCP / Channels pages** | manage autonomy from a UI | no CLI needed | **the same surfaces the agent uses, exposed** | `soon` |
| **REST API** | automate the admin panel | script the operations | **headless / embedded administration** | `soon` |
| **Resource-pressure + OOM banner** | tells you when the host is failing | fewer silent deaths | **self-diagnosing infrastructure** | `soon` |
| **Dashboard extension (plugins)** | add your own pages | fit it to your business | **an admin surface you can extend** | `later` |

---

## 5. Divergence and boundary notes

- **DIVERGENCE (documented above):** the dashboard doc's *"All 150+ configuration fields"* is wrong —
  the measured `DEFAULT_CONFIG` holds **99 sections / 816 leaf keys**. Code wins; the settings surface is
  >5× larger than the doc states.
- **Positive finding:** every session-lifecycle default in the docs matches `config_defaults.py` exactly
  (auto_prune True · 90 · 30 · 24 · auto_archive False/3 · show_subagents False). Same as batches 03/04 —
  the config defaults block is consistently the best-kept doc.
- **The doc's own honest boundaries:** `sessions.json` is a **legacy mirror**, not the session list;
  `--insecure` is a **deprecated no-op**; reindexing/repairs **refuse while a gateway owns the store**
  (it holds state in memory); `--delete-after-verified` is deliberately limited to one explicit session
  with `--yes`.
- **A cost/consistency note worth carrying:** the dashboard's Sessions page **streams** rows on export and
  is **not capped** by `max_export_messages`, whereas `hermes sessions export` **is** — the same
  operation has different bounds on different surfaces (stated in the doc).
- **`show_subagents` / hidden sources** (`oneshot`, `kanban`, `tool`) are the same judgement applied
  twice: machinery is *not* shown as a conversation by default.

---

## 6. Items carried forward

| # | Item | Goes to |
|---|---|---|
| C7-1 | A machine-level admin panel with a **profile switcher + amber write-target banner** is a good model for a multi-tenant operator console | batch 12 |
| C7-2 | The dashboard's **REST API** is the headless administration seam — compare against the platform's own admin surface | batch 12 |
| C7-3 | **Evidence-gated repairs that refuse ambiguity** are a trust pattern to reuse in the platform's own data migrations | synthesis |
| C7-4 | **Backup vs share** are different exports (jsonl vs redacted display) — a distinction the platform should keep | batch 08 |
| C7-5 | Config surface is **816 leaf keys** — the cost of configuration is real; the platform should measure its own | synthesis |
| C7-6 | Session **auto-prune + gated VACUUM** is the operational-hygiene default the platform should copy for its run/audit history | synthesis |
| C7-7 | Importing **rival agent transcripts** (Claude Code, Codex) is an integratability pattern | synthesis |
| C7-8 | Session hygiene (= ending sessions to make learning fire) ties directly to how the platform's own learning loop is triggered | batch 12 |

---

## 7. The two value questions, answered at the batch level

**Q1 — USER VALUE.** High: the user gets **one searchable record of everything** the AI has done on every
channel, can resume any of it by name, export it (in a shareable, redacted form), and — on the dashboard —
**see and change every setting without editing YAML**. The honesty is again the differentiator: an
oversized resume returns a *precise* error (code 4130, with the scope), a repair refuses to guess a
conversation's lineage, and the docs openly tell you the one habit (`/new` at boundaries) that keeps cost
down and the learning loop working.

**Q2 — VISION VALUE.** This is the **record-and-control half** of the platform vision. Three things map
directly onto an "AI-first business and resource planner": (1) **one store, every surface** means the
business has a single, queryable history of all work — the raw material for planning; (2) the
**machine-level dashboard with a profile switcher and an unambiguous write-target banner** is a working
model of an **operator console over many tenants** — exactly the seat a business owner needs over a fleet
of agents; (3) the **REST API + config auto-discovery + plugin extension** make that console
*scriptable and extensible*, which is what turns an admin panel into a platform surface. The measured
**816-key config surface** is a caution as much as a capability: power this broad has a real cost of
ownership, and the platform should size its own settings surface deliberately rather than by accretion.

**Learning lens (explicit).** Batch 06 = execution; **batch 07 = the record and the console**. Where batch
06 asked "what does it run?", this batch asks "*what does it keep, and who can see and change it?*"

---

*Batch 07 of 12 complete. Divergences found this batch: 1 (the dashboard doc's "150+ config fields" —
measured 99 sections / 816 leaf keys). Next: `08-security-approvals-secrets-and-sandboxing.md`.*
