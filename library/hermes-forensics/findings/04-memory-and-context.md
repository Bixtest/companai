# Batch 04 — Memory and context

**Status:** DONE — 2026-10-15 · **Source:** the pinned tree (`00-PIN-AND-METHOD.md` §1)
**Method:** doc claims checked against the Python source; code wins; divergences recorded.

---

## 0. What this batch is (in plain words)

Batch 03 covered the AI's **procedures** (skills). This batch covers the AI's **memory** — how it
remembers *facts* across sessions — and the **context** that shapes every turn: project instruction files,
`@`-references to files/URLs, and the compression that keeps a long conversation within the model's window.
Together with skills, this is the other half of the learning loop.

Four separate mechanisms, which the batch keeps distinct:

1. **Persistent memory** — two small always-loaded files (`MEMORY.md`, `USER.md`).
2. **Session search** — full-text search over every past conversation.
3. **Context files** — project instruction documents auto-loaded into every conversation.
4. **Context management** — `@`-references, compression, prompt caching.

---

## 1. What was read, and how big it is (measured)

| Doc (under `website/docs/`) | Bytes |
|---|---:|
| `developer-guide/context-compression-and-caching.md` | 47,308 |
| `user-guide/features/memory-providers.md` | 47,604 |
| `user-guide/features/memory.md` | 32,069 |
| `user-guide/features/context-files.md` | 12,549 |
| `user-guide/features/context-references.md` | 5,390 |
| **Total** | **144,920** |

| Code verified against | Evidence |
|---|---|
| `tools/memory_tool_store.py` | the two limits at line 186 |
| `tools/memory_tool.py` | tool wiring, lines 56 |
| `agent/agent_init.py` | limit defaults at 1335–1336 |
| `tools/session_search_tool.py` | FTS5-backed search (lines 5, 358, 382) |

---

## 2. Persistent memory, in plain words

Two files, both injected into the system prompt at session start:

| File | Purpose | Limit |
|---|---|---|
| `MEMORY.md` | the agent's own notes — environment facts, conventions, lessons | **2,200 chars** (~800 tokens) |
| `USER.md` | the user's profile — preferences, style, expectations | **1,375 chars** (~500 tokens) |

Stored in `~/.hermes/memories/`. **VERIFIED IN CODE** (`tools/memory_tool_store.py:186`):
`def __init__(self, memory_char_limit: int = 2200, user_char_limit: int = 1375, …)`. **Doc claim: TRUE.**

### 2.1 The size limit is a design choice, and it fails loudly

Memory is **bounded on purpose** — *"character limits keep memory focused."* It does **not** auto-compact:
when a write would exceed the limit, the tool **returns an error** and the agent must **make room itself**
(consolidate or remove entries in one batch) before retrying. **Why this matters:** memory is a *curated*
asset, not a dumping ground — the discipline is enforced by the mechanism, not by hope.

### 2.2 The frozen-snapshot pattern

Memory is captured **once at session start** and **never changes mid-session** — deliberately, to preserve
the model's prefix cache. Writes during a session are **persisted to disk immediately** but appear in the
prompt only **next session**. Tool responses show the live state.

**A consequence the docs spell out honestly:** the whole memory system is built around the moment a
session **ends**. Inside one session the machinery *"has a reason to run"* only rarely. So the docs
advise running `/new` at natural boundaries — the moment memory pays off is the moment a session closes.

### 2.3 The two targets, and how writes work

Every `memory` call carries a top-level `target`: `"memory"` (agent notes) or `"user"` (user profile).
Actions are **add / patch / remove** — and **there is deliberately no `replace`** (it used to wipe the
other facts in a multi-fact entry; a `replace` call now returns an error pointing at `patch`). Substring
matching means the agent does not need the full entry text.

**`write_approval`** works exactly as it did for skills (batch 03): `false` (default) = write freely;
`true` = require approval — **inline prompting in the interactive CLI** (memory entries are small enough
to read in full), **staging everywhere else** (messaging, scripts, the background review). This is the
**same governance switch** applied to the facts half of learning.

### 2.4 Security scanning

Memory entries are **scanned for injection and exfiltration patterns before acceptance**, *"since they're
injected into the system prompt."* Content matching threat patterns (prompt injection, credential
exfiltration, SSH backdoors) or containing **invisible Unicode characters** is **blocked**.

**Why this is worth naming:** memory is a **write-to-the-system-prompt** channel — a natural attack
target — and Hermes treats it as one.

---

## 3. Session search — the unlimited half

`session_search` searches **every past conversation**. All CLI and messaging sessions are stored in
**SQLite** (`~/.hermes/state.db`) with **FTS5 full-text search** (VERIFIED: `tools/session_search_tool.py`
references FTS5 at lines 5/358/382). **Search returns actual messages from the DB — no LLM summarisation,
no truncation.** It supports discovery, scrolling within a session, and browsing; time bounds
(`after`/`before`, `7d`, `24h`, `2w`) and session exclusion are supported.

| | Persistent memory | Session search |
|---|---|---|
| Capacity | ~1,300 tokens total | unlimited (all sessions) |
| Speed | instant (in the prompt) | ~20 ms FTS5 query |
| Cost | a token cost in *every* prompt | **free — no LLM calls** |
| Management | curated by the agent | automatic (all sessions kept) |

**The key insight for a platform:** the small, always-loaded facts are the **index**; the entire history is
the **archive**, free to search. That pairing is what lets an AI remember a fortnight-old decision without
carrying a fortnight of tokens in every prompt.

### 3.1 `/journey` — the learning timeline, and where you prune it

`/journey` renders a **timeline of everything Hermes has learned** — saved skills and memory entries over
time — with a scrubber that replays the build-up. Crucially it is also the **prune-and-correct surface**:
`hermes journey list` / `delete <node>` / `edit <node>`. Skills are **archived** (restorable); memory
chunks are **removed**; `edit` opens the content in `$EDITOR`.

**This is the human-facing window onto the learning loop** — the thing a business needs to *see* what its
AI has learned and to correct it.

---

## 4. Context files — the project's own instructions

Hermes auto-discovers context files that shape behaviour, from the working directory upward
(`context-files.md:15–20`):

| File | Role |
|---|---|
| `.hermes.md` / `HERMES.md` | project instructions (**highest priority**) |
| `AGENTS.md` | project conventions, architecture |
| `AGENTS.override.md` | personal per-directory override |
| `CLAUDE.md` | Claude Code context files (also detected) |
| `SOUL.md` | **global** personality — loaded from `HERMES_HOME` only |
| `.cursorrules` | Cursor IDE conventions |

**Why this matters:** a company can drop its own conventions file into a folder and the AI follows them —
and the same discovery already understands the formats other tools (Claude Code, Cursor) use. That is
**integratability with the tools a team already has**.

**`@`-references** (`context-references.md`) let a user type `@` plus a file, folder, git diff or URL and
have Hermes **expand and append the content inline** to the message — a precise, per-message way to put
exactly the right material in front of the AI.

---

## 5. Context management — compression and caching

Compression was partly measured in Batch 01 (§2.7); this section adds the doc's account and the caching
side. Compression triggers **preflight** (>50 % of the window, before a call) and, more aggressively,
between turns in the gateway (>85 %). During compression, memory is flushed to disk first, middle turns
are summarised, the recent tail is protected, and tool-call/result pairs are never split. **Prompt caching**
is a cross-session 1-hour prefix cache (always on).

---

## 6. External memory providers

Beyond the two built-in files, Hermes can plug in an **external memory backend** via `memory.provider` —
documented providers include **Honcho, OpenViking, Mem0, Hindsight, Holographic, RetainDB, ByteRover,
Supermemory, Memori** (`memory-providers.md`). Turning both built-in stores off (`memory_enabled: false`
**and** `user_profile_enabled: false`) drops the built-in tool but **leaves an external provider's own
tools working** — *"use this when you want a third-party memory backend instead of the built-in files."*

**Why this matters for a platform:** the built-in memory is small and local by design; a serious
cross-session *user model* — the "deepening model of who you are" — is where a provider plugs in. Honcho in
particular is described as dialectic user modelling with **per-profile AI peers sharing a user workspace**
(relevant to batch 02).

---

## 7. The capability table — the owner's two questions

`Verdict` empty (that is Batch 12's job).

### 7.1 Memory

| Capability | What it is (plain) | Q1 · user value | Q2 · vision value | Phase |
|---|---|---|---|---|
| **MEMORY.md + USER.md** | two small always-loaded fact files | the AI knows this user and this environment from turn one | a cheap, portable **core memory** every tenant owns | `now` |
| **Bounded + fails loudly** | full memory errors instead of silently dropping | the AI stays sharp, not cluttered | memory quality enforced by design | `now` |
| **Frozen snapshot** | memory loads once per session | consistent behaviour within a session | predictable prompt caching (cost) | `now` |
| **add / patch / remove (no replace)** | safe, targeted edits | the AI can't wipe facts by accident | data safety in the learning loop | `now` |
| **`write_approval` on memory** | gate every memory write | "show me what it remembers" | **governance** over what the AI believes | `now` |
| **Injection/exfiltration scanning** | memory is scanned before acceptance | protection from a poisoned memory | **security** of a prompt-write channel | `now` |
| **External memory providers** | plug in a richer cross-session memory | genuinely personalised over months | "the deepening model of who you are" | `soon` |

### 7.2 Recall and context

| Capability | What it is (plain) | Q1 · user value | Q2 · vision value | Phase |
|---|---|---|---|---|
| **`session_search` (FTS5, free)** | search every past conversation | "what did we decide last week?" answered from the source | **unlimited memory at zero token cost** | `now` |
| **`/journey` timeline + prune** | see and correct what it learned | the human can audit and fix the AI's knowledge | **visibility** into the learning loop | `soon` |
| **Context files (.hermes.md / AGENTS.md / …)** | project instructions auto-loaded | the AI follows *this team's* conventions | house conventions as data, not code | `now` |
| **`@`-references** | inject a file/folder/diff/URL inline | point the AI at exactly the right material | precise, per-message context control | `now` |
| **Compression + prompt caching** | keep long chats bounded and cheap | long sessions don't break or cost too much | long-lived workstreams | `soon` |
| **External recall with a safety ceiling** | provider recall capped and spillable | richer memory without overflow | a runaway provider can't break the window | `later` |

---

## 8. Divergence and boundary notes

- **No divergence on the memory limits**: `tools/memory_tool_store.py:186` matches the docs exactly
  (2,200 / 1,375). A second positive finding in a row.
- **Boundary the docs state (a real limit, not a defect):** the built-in memory is **tiny** (~1,300 tokens
  total) and **frozen per session** — so it is a *core*, not an archive. Anything large belongs in
  `session_search`, a skill, or an external provider.
- **The one-writer rule reappears here** (`memory.md:22–23`) — the same hazard as batch 02, because memory
  is written automatically and loaded into the prompt. It is the *same* constraint stated twice, which
  raises its standing.

---

## 9. Items carried forward

| # | Item | Goes to |
|---|---|---|
| C4-1 | The same `write_approval` switch gates memory and skills — one governance lever over all learning | batch 08 |
| C4-2 | Memory is a prompt-write channel; injection scanning is the defence — check the scanner's coverage | batch 08 |
| C4-3 | `session_search` is free (no LLM) — a cost lever for long-lived recall | synthesis |
| C4-4 | `/journey` is the audit window on learning — a candidate platform surface | batch 07 |
| C4-5 | External providers (Honcho per-profile peers) tie to the profile/tenant model | batch 09 / synthesis |
| C4-6 | Context files already speak Claude Code / Cursor formats — reuse for the company's own docs | synthesis |
| C4-7 | External recall safety ceiling (10x `hooks.output_spill.max_chars`) — a bound to respect | batch 08 |

---

## 10. The two value questions, answered at the batch level

**Q1 — USER VALUE.** High. The AI remembers *this user and this environment* from turn one (the two
files), can recall *anything ever discussed* on demand for free (`session_search`), follows the team's own
conventions automatically (context files), and can be shown exactly the right material with `@`. The
user-facing `/journey` lets a person **see and correct** what the AI has learned — trust through
visibility.

**Q2 — VISION VALUE.** This is the **facts half** of the owner's learning lens, and it is deliberately
**small and bounded** with an **unbounded, free archive** beside it — a reading of memory that fits a
platform: pay tokens only for the essentials, search the rest on demand. Three properties are
platform-grade: the **fails-loudly** limit (memory stays curated), the **same approval gate** as skills
(one lever governs all learning), and **injection scanning** on a prompt-write channel. External providers
are the documented route to a genuinely long-run user model.

**Learning lens (explicit).** Batch 03 = procedures; batch 04 = facts; both written by the agent, both
gated by one switch, both feeding the "deepening model of who you are." `/journey` is the seam where a
human sees the loop working.

---

*Batch 04 of 12 complete. Divergences found this batch: 0 (memory limits match the code exactly). Next:
`05-tools-mcp-and-the-gateway.md`.*
