# Batch 01 — The agent loop and the conversation model

**Status:** DONE — 2026-10-15 · **Source:** the pinned tree (`00-PIN-AND-METHOD.md` §1)
**Method:** every doc claim below was checked against the Python source. Code wins; divergences recorded.

---

## 0. What this batch is (plain words)

This is the **base layer**: what an agent *is* inside Hermes, and what happens step by step when a person
types a message. Everything above it — bots, skills, memory, tools, scheduling — runs on this loop. Two
halves: **the loop** (message → thinking → tool use → answer) and **the conversation model** (how the
exchange is stored, ordered and remembered).

---

## 1. What was read, and how big it is (measured)

| Doc (pinned, under `website/docs/`) | Bytes |
|---|---:|
| `user-guide/features/overview.md` | 7,374 |
| `user-guide/features/tools.md` | 15,180 |
| `reference/toolsets-reference.md` | 14,877 |
| `reference/tools-reference.md` | 45,775 |
| `developer-guide/agent-loop.md` | 11,537 |
| **Docs total** | **94,743** |

| Code verified against | Lines |
|---|---:|
| `agent/conversation_loop.py` | 94,997 bytes |
| `agent/tool_executor.py` | 97,533 bytes |
| `agent/agent_init.py` | (read at lines 378–423) |
| `agent/iteration_budget.py` | 59 lines |
| `agent/agent_runtime_helpers.py` | (read at lines 387–771) |
| `agent/context_compressor.py` | 335,782 bytes |

---

## 2. The loop, in plain words

One turn, as the docs describe it: append the user message → build the system prompt → compress if the
conversation is past half the context window → convert to the provider's shape → make an **interruptible**
API call → if the reply contains **tool calls**, run them, append their results, and loop; if it is plain
text, save the session and finish.

So the shape is **think → (act → observe → think) × N → answer** — an *agent*, not a chatbot.

### 2.1 VERIFIED IN CODE — the loop really is where the docs say

`agent/conversation_loop.py` exists (94,997 bytes) and its module docstring names exactly the phases the
docs claim: *"retries, fallbacks, compression, post-turn hooks"* (line 4). The pre-API compression guard
is real: `run_preflight_gate` is imported at line 56 and the mid-turn pre-API guard is described at line
86 (*"the pruned… token figure the mid-turn pre-API compression guard compares"*). **Doc claim: TRUE.**

### 2.2 VERIFIED IN CODE — concurrency, and the sequential exception

The docs say multiple tool calls run concurrently except interactive ones. Code:
`agent/tool_executor.py:1498–1501` computes `_max_workers_for_tool_batch(...)` and runs a
`DaemonThreadPoolExecutor(max_workers=max_workers)`; and line 1863 documents the other path —
*"Execute tool calls sequentially (single calls or interactive tools)"*. **Doc claim: TRUE**, with a code
detail the docs skip: the pool is a **daemon** pool, and the worker count is capped (`_MAX_TOOL_WORKERS`,
further limited by an image-generation parallel limit at line 248).

### 2.3 VERIFIED IN CODE — the iteration budget, and a rule the docs omit

`agent/iteration_budget.py` confirms the doc's numbers: parent cap **500** (`max_iterations`), subagent cap
**50** (`delegation.max_iterations`), each agent its own counter. **But the code adds something the docs do
not say:** `IterationBudget.refund()` exists specifically so that **`execute_code` (programmatic tool
calling) iterations are given back and do not eat the budget** (class docstring, lines 27–28). That is a
material behavioural difference — a run that uses `execute_code` can effectively do more work than its
budget number suggests.

### 2.4 VERIFIED IN CODE — message alternation is REPAIRED, not just required

The docs say Hermes *enforces* strict message alternation (never two assistants, never two users in a
row). The code goes further: `agent/agent_runtime_helpers.py:766–771` is a **repair pass** whose own
docstring says *"Collapse malformed role-alternation left in the live history; … Providers require strict
alternation after the system message (violations: silent empty …)"*. The pass merges consecutive
assistants (`_merge_consecutive_assistants`, line 549), merges consecutive users (`_merge_consecutive_users`,
line 662), drops stray tool results and prunes unanswered tool calls.

**So the platform cannot break a conversation by injecting content in the wrong place — Hermes repairs it
before sending.** That is a stronger, more useful fact than the doc's rule statement, and it is a direct
design input for how our own context enters a conversation.

### 2.5 API modes — the docs undercount, the code wins

The docs list **three** API modes (`chat_completions`, `codex_responses`, `anthropic_messages`). The code
(`agent/agent_init.py:381–384`) defines **five** explicit modes plus open registration:

```
_EXPLICIT_API_MODES = {
    "chat_completions", "codex_responses", "anthropic_messages", "bedrock_converse",
    "codex_app_server",
}
```

and `_resolve_api_mode` (lines 387–423) resolves them through an ordered ladder that also accepts **any
mode a provider plugin registered** via `register_transport(api_mode, cls)` (line 394–396), and maps
`bedrock` / `bedrock-runtime.*` endpoints to `bedrock_converse` (lines 412–415).

**DIVERGENCE RECORDED:** docs say 3 modes; code has 5 built-in + plugin-registered. Consequence for the
reader: *"Hermes supports three provider dialects"* is **understated** — the real claim is *"Hermes supports
its built-in dialects plus any a plugin adds."* That widens the "bring any model supplier" picture
(batch 09).

### 2.6 The main/auxiliary model split — confirmed as a config surface

`hermes_cli/config.py` carries the auxiliary config (referenced at lines 775, 967, 2304 — e.g. an
unexpanded literal `auxiliary.<task>.api_key` pinned for the process lifetime). So the split is not a doc
idea: it is a **real config surface** with per-task keys. **Doc claim: TRUE.**

### 2.7 Compression — real thresholds, and dynamic tail sizing the docs omit

`agent/context_compressor.py` confirms compression is real and threshold-driven, and adds constants the
docs do not name: `LEAN_TAIL_FLOOR_TOKENS = 10_000` and `LEAN_TAIL_CAP_TOKENS = 25_000` (lines 925–926) —
the "lean tail" the compressor keeps is **sized dynamically between 10k and 25k tokens**, with a floor
referenced at line 2239 (`max(LEAN_TAIL_FLOOR_TOKENS, min(LEAN_TAIL_CAP_TOKENS, int(self.context_length * 0.025)))`).
The compressor also depends on **sqlite3** (line 10) and has its own timeout-recovery path returning a
terminal message that tells the user to start a fresh session (lines 199–205).

**DIVERGENCE RECORDED (minor):** the docs describe the protected tail as a *count* (`protect_last_n`,
default 20). The code carries **both** a count (`protect_last_n`, line 2837) **and** a token-budget lean
tail (10k–25k). The count is the simpler story; the token budget is what actually bounds size.

---

## 3. The capability table — the owner's two questions

`Verdict` deliberately empty (that is Batch 12's job).

### 3.1 The loop

| Capability | What it is (plain) | Q1 · user value | Q2 · vision value | Phase |
|---|---|---|---|---|
| Think→act→observe loop | the agent works until the job is done, not just until it has spoken | a staff member gets a *finished* artefact (a pulled figure, a drafted report), not a suggestion | the difference between a chat box and an **AI-first worker** — the platform's core promise | `now` |
| Interruptible calls | the user can cut in and history stays clean | a wrong turn is caught in seconds | makes the agent safe to leave running in a business | `now` |
| Iteration budget + refund | a hard stop (500 / 50), **but `execute_code` turns are refunded** | no runaway cost, and heavy programmatic work is not punished | an exposed, tunable cost control per tenant | `now` |
| Fallback across providers | another model takes over on failure | outages become invisible | resilience we do not have to build | `soon` |
| Main + auxiliary model split | one strong model for talking, small cheap ones for chores | faster, cheaper answers | a direct per-tenant **cost lever**, configurable per task | `soon` |
| Compression w/ dynamic lean tail | long chats are summarised; the recent tail is kept at 10k–25k tokens | a long session does not lose the thread | long-lived workstreams without unbounded cost | `soon` |

### 3.2 Provider dialects and conversation shape

| Capability | What it is (plain) | Q1 · user value | Q2 · vision value | Phase |
|---|---|---|---|---|
| Built-in dialects **+ plugin transports** | five built-in wires and any a plugin adds | — (invisible) | a tenant can bring **any** supplier; the list is open, not fixed | `now` |
| One internal message shape | every exchange stored uniformly | — | portable transcripts if a tenant switches models | `now` |
| Reasoning kept apart, optionally shown | the model's inner voice is stored separately | a user can ask *why* | **explainability** — show how, not just what | `soon` |
| **Alternation is auto-repaired** | Hermes fixes malformed turn order before sending | conversations never break from bad injection | a platform can inject its own context **safely** — a strong design input | `now` |
| SQLite session store + resume | chats are saved and resumable | continue yesterday's work | substrate for "workspaces as threads" | `now` |
| Session lineage on compression | a compressed chat keeps a link to its origin | history stays traceable | audit + continuity for a long-lived tenant | `later` |

### 3.3 Tools named here, analysed in their own batch

Each is named (nothing silently dropped) and carried forward — not analysed twice.

| Tool / toolset | Plain meaning | Batch |
|---|---|---|
| `todo` | the agent's own in-session checklist | 06 |
| `memory` | facts that survive sessions | 04 |
| `session_search` | search past conversations (local DB, no LLM) | 04 |
| `clarify` | the agent asks the user, with choices, 1–5 at a time | 07 |
| `delegate_task` | spawn isolated subagents | 06 |
| `execute_code` | run a Python script that calls Hermes tools (budget-refunded) | 10 |
| `skill_manage` / `skill_view` / `skills_list` | create / load / list "skills" | 03 |
| `cronjob_manage` | scheduled recurring tasks | 06 |
| `kanban_*` (14 tools) | a shared multi-agent board | 06 |
| `manage_connections` | connect apps / MCP servers via an approval card | 08 |
| `web_search` / `web_extract` | search and read the web | 05 |
| `terminal` / `process_manage` | shell + background jobs | 05/10 |
| `browser_*` (18 tools) | drive a real browser, with vision | 11 |
| `vision_analyze`, `image_generate`, `text_to_speech`, `video_*` | media in and out | 11 |
| `computer_use` | drive the desktop without stealing the cursor | 11 |

---

## 4. Items carried forward

| # | Item | Goes to |
|---|---|---|
| C1-1 | Plugin-registered API transports (`register_transport`) widen the supplier list — measure the mechanism | batch 09 |
| C1-2 | `execute_code` refunds budget — measure how much work a refunded turn can do | batch 10 |
| C1-3 | The **repair pass** is the safe injection point for our platform's own context — measure its rules | batch 02 / 07 |
| C1-4 | `clarify` (1–5 questions, single/multi/open) is a form mechanism already present | batch 07 |
| C1-5 | Lean-tail token budget (10k–25k) vs count (`protect_last_n`) — which governs long workspaces | batch 04 |
| C1-6 | `_MAX_TOOL_WORKERS` and the image-gen parallel limit — the real concurrency ceiling | batch 05 |
| C1-7 | `context_compressor.py` is 335 KB — the single largest agent module; deserves its own read | batch 04 |

---

## 5. The two value questions, answered at the batch level

**Q1 — USER VALUE.** Yes, structurally. The loop turns "ask the computer" into "give the computer a job",
and a staff member's day is finished artefacts. Interruption, budgets, fallbacks and compression are
exactly what make that safe and affordable over a working day rather than a per-message novelty. Two
code-verified details sharpen it: **`execute_code` turns are budget-refunded** (heavy automated work is
not punished) and **malformed turn order is auto-repaired** (a user's session cannot be broken by a bad
injection).

**Q2 — VISION VALUE.** Yes, and load-bearing. The platform's "AI-first" claim rests on an agent that
finishes work unattended, recovers when a provider fails, and can be pointed at any supplier. All three are
present here — and the supplier list is **open** (plugin transports), not fixed at three dialects as the
docs claim. Versatility and integratability, the owner's own words, exist at the base layer already.

**Learning lens.** The loop does not itself learn; it is the **container learning happens in** — `memory`
(batch 04) and `skill_manage` (batch 03) are the two tools it calls that accumulate knowledge, and every
turn is a chance for either to fire. That is why the loop is read first.

---

*Batch 01 of 12 complete. Divergences found this batch: 2 (API-mode count; lean tail). Next:
`02-bots-profiles-and-group-chats.md`.*
