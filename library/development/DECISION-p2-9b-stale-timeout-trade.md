# The cold-turn trade: the ceiling is a symptom, and the worker already ships the cure

**Written:** 2026-10-16. **Author:** the agent (researching the owner's question). **Status:** ✅
**DECIDED 2026-10-16 — Option 1 is the owner's ruling ("Yes we follow the recommended alternative");
see §6. No code is proposed or changed by this document.**

**Parent:** `PLAN-HERMES-PHASE2-one-tenant-one-tool.md` §2.15 (the P2-9/P2-9a/P2-9b record);
`platform_points.md` row 28 (`CC-72`, the P2-9b trigger); `MASTER-CHECKLIST.md` §2 (the frontier)
and §4 (the open-work trigger). **Siblings:** `DECISION-agent-protection-tier.md` (the format this
follows).

---

## 0. What the owner asked, in his words

> *"The one decision that gates the build frontier — the P2-9b stale-timeout trade: with the default
> toolset the prompt measures ~16,757 tokens, and a cold first turn takes ~3000 s at the measured speed —
> longer than the worker's own 2400 s stale ceiling. Three options: (a) raise the ceiling to ~3600 s —
> works, but every cold turn then waits five minutes, which is a product defect, not a timeout;
> (b) shrink the default toolset — fixes the cause (prefill size) but changes what the AI can do by
> default, which is a product call; (c) both — ceiling raised modestly and the toolset trimmed."*

Then, refusing all three compromises:

> *"Can't we start by smaller on the cold while turning on the rest and expanding as it heats and runs?
> Do we need to decide the specific bunch of tools to kickstart or we can make that first limited bunch
> selected by need, then expand the rest. Your suggestions make since generically, but I am trying to be
> more innovative to get the best of alll worlds. You can research the cloud if there are other
> alternatives (or libraries or something) that optimize and solve this without compromizing either
> performance or quality the way our alternatives limit us to."*

**This document answers both halves:** the field research he asked for (§2), and the surprise that
follows from measuring our own pinned worker (§3–§4): **his proposal — a small first bunch, selected by
need, expanding as it heats — is not something we would have to build. The pinned worker already ships
it, it is on by default, and it was proven live in the P2-9a turn.** What remains is not a product
compromise but three ordinary engineering layers, one of which is measured in §4.4.

---

## 1. The words first (plain English)

- **Token** — a chunk of text the model reads, roughly three-quarters of an English word. Everything
  the model knows in one turn is measured in tokens.
- **Prefill** — the model reading the whole prompt before it may answer anything. Like reading a whole
  book before you are allowed to write your essay. On this box it is slow: ~5–10 tokens per second.
- **Tool definition** — the instruction card for one capability ("this tool exists, this is what it
  does, here is what you must hand it"). A default toolset carries dozens of these cards, and the model
  must read every card on every turn, before thinking.
- **Stale ceiling (the "2400 s")** — the worker's patience clock. It aborts a turn whose model has
  produced **no event at all** for that long. It exists because a local model can sit in prefill for
  minutes before its first sign of life. It is a **no-event grace, not a total-time cap**: once the
  model starts answering, the clock stops mattering.
- **BM25** — the standard formula search engines use to rank documents by word overlap. No AI, no
  magic: "find the tools whose words match what the user asked for."
- **MCP** — the open standard (`modelcontextprotocol.io`) by which outside systems plug tools into an
  AI. Our 21 platform tools arrive this way.
- **KV cache / prompt cache** — the model's short-term memory of what it has read so far, kept alive
  while it thinks. If the next turn re-reads the *same opening pages* (system prompt, tool cards, the
  conversation so far), a prompt cache lets it skip re-reading them and start where it left off.

**The shape of the problem in one sentence:** on every *cold* turn, the model re-reads the entire
opening — system prompt, every tool card, the whole conversation — before it may answer, and on this
hardware that reading costs between ~10 minutes (small toolset) and 30+ minutes (default toolset);
the 2,400-second patience clock can absorb the first and not the second, and §4.4 measures that
warm turns skip most of it.

---

## 2. What the field does — the mechanisms, measured by others

The owner asked for research beyond our own stack. Four mechanisms matter, in descending order of
relevance. (Citations are given as found; where the source is a practitioner blog rather than a primary
paper, it is labelled as such — and where our own probe can decide the question, the probe outranks
any citation.)

### 2.1 Progressive disclosure — pick the tools by need, not by a fixed list

**Anthropic, "Code execution with MCP: building more efficient agents" (2025-11-04, Adam Jones and
Conor Kelly).** The primary source, and it describes exactly the owner's instinct:

> *"loading all tool definitions upfront and passing intermediate results through the context window
> slows down agents and increases costs… presenting tools as code on a filesystem allows models to
> read tool definitions on-demand, rather than reading them all up-front."*

Their worked example: **150,000 tokens of tool definitions down to 2,000 — a 98.7% saving** (an
example reduction, not a benchmark). Their middle design (the one relevant to us,
because our worker keeps direct tool-calling rather than code execution) is a **`search_tools` tool**
with a **detail-level parameter**: the model asks for "salesforce" and gets back *name only*, *name
plus description*, or *the full definition with schemas* — it pays only for the detail it needs.
Cloudflare published the same idea independently, calling it **"Code Mode"** (cited within the
Anthropic article).

Their honest caveat, which applies to us too: the code-execution version needs a sandbox; the
`search_tools` version does not.

### 2.2 Retrieval over tool descriptions — the same idea, done with a search index

**RAG-MCP: "Mitigating Prompt Bloat in LLM Tool Selection via Retrieval-Augmented Generation"
(Gan and Sun, 2025).** Instead of sending every MCP server's tool schemas into the prompt, keep them
in a retrieval index and send only what the current request matches. This is the mechanism §2.1
reduces to when you don't need code execution — and it is **the same class of mechanism our pinned
worker's `tool_search` ships** (§3; RAG-MCP retrieves with vector similarity, ours with BM25 — same
idea, different matcher).

### 2.3 Prompt caching — pay the reading cost once per conversation, not once per turn

**llama.cpp's prompt cache** (the engine our model server runs). Two knobs: the server flag
`--cache-reuse` and the request field `cache_prompt`. When on, a repeated prompt prefix reuses the
model's KV memory instead of re-reading it. Practitioner write-ups report large first-token savings
for the common agent shape — *system prompt unchanged, only the user's new message varies*
(practitioner blogs, e.g. the llama.cpp tuning notes collected 2026; upstream llama.cpp now defaults
the field to on, while some forks defaulted it off — **which is why we measure the deployed server
rather than trust either default, see §4.4**).

### 2.4 Chunked prefill — liveness while a long prompt is being read

**vLLM's `--enable-chunked-prefill`** splits a long prefill into chunks that share the GPU with
decoding, cutting time-to-first-token by roughly 30% in practitioner tests. **This one does not apply
to us:** llama.cpp has no intra-request prefill/decode interleaving — it reads the whole prompt, then
answers, with nothing on the wire in between. It matters here only as the honest boundary: on
llama.cpp, *no mechanism makes the first token arrive during a long prefill*, so the no-event patience
clock must always out-wait the prefill itself. (It also explains why the 30%-class wins live in
faster hardware, not in flags.)

### 2.5 What the field does NOT offer

There is no mechanism — library, paper, or flag — that makes a cold 16,000-token prompt instant on
this hardware. The field's answer is not a magic bullet; it is **three independent layers**: choose
what must be read (§2.1–2.2), stop re-reading what was already read (§2.3), and accept that the first
read is physics (§2.4). The owner's "best of all worlds" is achievable — but it is these three
layers, not a single switch.

---

## 3. What our own pinned worker already ships (measured in the pin, this session)

The decisive finding. **The owner's proposed mechanism is the pinned worker's built-in default.**

`tools/tool_search.py` — progressive tool disclosure:

- The deferred tools are **replaced in the model-visible array by three bridge tools**:
  `tool_search` (find tools by keywords), `tool_describe` (pull a tool's full schema), `tool_call`
  (run it). The model sees a tiny fixed array instead of dozens of instruction cards.
- Retrieval is **BM25 over the live tool definitions** (`tools/tool_search_catalog.py`) — §2.2's
  mechanism, shipped.
- The listing is **budgeted**: `min(5% of context, 4,000 tokens)` — on our 65,536-token context that
  is ≈3,276 tokens of names-and-descriptions, and under budget it degrades tier by tier
  (full definitions → names only → a bare bridge plus per-server summaries).
- The catalog is **stateless — rebuilt from the live definitions at every assembly**, so it can never
  drift from what the tools actually are.
- `hermes_cli/config_defaults.py` ships `tool_search.enabled = "auto"` — **on whenever at least one
  deferrable tool exists, which is always true for us** — with `threshold_pct: 5`,
  `search_default_limit: 5`, `max_search_limit: 25`.
- The default `defer` list already holds **18 cold built-ins**; **MCP tools defer by rule**; **plugin
  tools defer by rule**; core tools (file, web, browser, …) stay eager.
- `model_tools.py` assembles the bridge **as the last step** of `_compute_tool_definitions()` —
  idempotent, and it strips any stale bridge tools first, so it can never break tool loading.

**What deferral does NOT do:** it does not remove any tool from the AI's reach. It changes only *when
the instruction card enters the conversation* — on demand, one schema at a time. That is the property
that makes this not-a-compromise: **every tool stays callable; only the reading order changes.**

**The live proof (already in the record, P2-9a):** the discharge turn — 859.1 s, 287 events — the
model called `tool_search` for `mcp__open_mercato__context_whoami`, then the MCP tool itself, and read
a real platform result (tenant id, user id, isSuperAdmin, 25 feature keys). The mechanism is not
theoretical; it ran.

---

## 4. The measured economics (this box, this model, this stack)

**The model:** Qwen2.5-7B-Instruct Q4_K_M on llama.cpp, 65,536-token context (YaRN 2× from its
32,768 training context), `-n 512`, threads tuned to `-t 4 -tb 8` — measured on a direct call:
**ingest 19.3 tok/s, generate 4.6 tok/s** (from `docker-compose.fullapp.yml`'s own tuning notes).

### 4.1 The prefill table (three measured turns, plus the plan's hazard figure)

The prefill and speed columns were read from the model's own `prompt eval time` line — not the
`progress =` fraction, which mis-states the total by up to 2.5× (LESSONS L153). The token column is the
recorded `input_tokens`; see the correction below.

| Prompt | Tokens (as recorded) | Prefill | Speed |
|---|---|---|---|
| Toolset pinned to `search` | 6,105 | 608 s | 10.1 tok/s |
| **DEFAULT toolsets** | 10,988 *(uncached)* | **1,583 s** | 6.94 tok/s |
| DEFAULT toolsets, production-shaped run | 10,646 *(uncached)* | ~1,905 s | ~5.6 tok/s |
| The plan's hazard figure | ~16,757 | ~3,000 s | ~5.5 tok/s |

**Correction 2026-10-16 (rule 13) — the token column above is the UNCACHED `input_tokens`, not the
prompt.** The worker's own state DB (`sessions` / `session_model_usage`) records both halves, and the
model server's own log records the whole: the production-shaped turn's `prompt eval time` reads
**`1778806.43 ms / 16725 tokens` (9.40 tok/s)**, and its DB row is `input_tokens 10,646 +
cache_read_tokens 6,079 = 16,725`. The "DEFAULT toolsets" row is `10,988 + 6,022 = 17,010`. **So the true
full prompt was ~16,725–17,010 tokens all along** — the figures above were the uncached slice, and the
plan's ~16,757 hazard was **right about the prompt** (see §4.3). *(The `search` row's cache split is not
in the DB; 6,105 stands as recorded.)* **On the current pin (2026-10-16) a real production turn measured
`usage.prompt = 16572` and `TURN DONE in 2280.4 s`** — a fourth row, in §4.3's table.

The 2,400 s ceiling was set against the third row: **495 s of headroom over the slowest prefill
actually measured** — and the measured prefill for that 16,725-token prompt is **1,778.8 s**, so the
headroom over the real figure is **~620 s**. The compose says so itself: *"a HARDWARE grace, not a correctness knob — a
deployment with a fast model never reaches it."*

### 4.2 The stale ceiling, exactly (read in code, this session)

`agent/chat_completion_helpers.py:634-648` — local-provider stale ceiling: 900 s default, overridable
by `agent.local_stream_stale_timeout` config or `HERMES_LOCAL_STREAM_STALE_TIMEOUT` (our compose sets
2,400). It is shared by the stream stale detector and the Responses first-event watchdog, so both
give a local server the same prefill grace. Two properties matter for this decision:

- **It is a no-event grace.** Once the model emits anything, the clock is satisfied. The hazard is
  purely "nothing at all for 2,400 s."
- **There is a cross-turn circuit breaker (#58962).** Every stale kill bumps a consecutive-stale
  streak; past the threshold, the *next* call is refused without even trying. So a ceiling that keeps
  tripping does not merely delay turns — it progressively wedges the agent. Raising the ceiling makes
  each failure slower, not safer.

Context-scaling (`_scale_stale_timeout_for_context`) only engages above 50k estimated tokens — at our
~11–17k scale the 2,400 s stands as-is.

### 4.3 The 16,757 figure, re-measured — and the compose's "10,988" was the UNCACHED slice, not the prompt (Rule 13)

The compose's own measurement of "the DEFAULT toolsets" is **10,988 tokens**; the plan's hazard
paragraph carries **~16,757**. The delta is ~5,769 tokens, and two hypotheses explained it. The
re-measurement **falsifies one and resolves the other** — but not the way this section first guessed.

**Correction one — the 10,988 was not the prompt.** The worker's own state DB
(`/var/lib/hermes/state.db`, read 2026-10-16) stores both halves of every turn's usage, and the model
server's own log stores the whole:

| Turn (session) | `input_tokens` | `cache_read_tokens` | **total** | model's own `prompt eval time` |
|---|---|---|---|---|
| 2026-10-13 "DEFAULT toolsets" (`…_8c7864`) | 10,988 | 6,022 | **17,010** | — |
| 2026-10-14 production-shaped (`…_a43f3d`) | 10,646 | 6,079 | **16,725** | **`1778806.43 ms / 16725 tokens` (9.40 tok/s)** |

So **the true full prompt was ~16,725 tokens all along**; the compose's three figures were the
**uncached** slice of it. The plan's ~16,757 hazard was **right about the prompt** — it was never a
pre-bridge artefact.

**Correction two — the bridge shrinks the full CATALOG, not the worker's default.** The assembly was run
in the worker's own process (`discover_mcp_tools()` → `get_tool_definitions()`), and the model's own
`/tokenize` priced each array:

| Array | Tools | JSON bytes | model's own tokens |
|---|---|---|---|
| Pre-bridge, `skip_tool_search_assembly=True` — **the full catalog** (incl. the 21 MCP) | 53 | 67,829 | **15,254** |
| **Assembled** (bridge ON — **the production shape**) | 20 | 42,140 | **9,502** |

The bridge defers 36 tools behind `tool_search`/`tool_describe`/`tool_call`
(`assembly_report`: `activated: true`, `deferred_count: 36`, `deferred_tokens: 7,777`). **But the
worker's DEFAULT selection is not that 53-tool catalog.** The DB's recorded tool payloads put the
default at **24 collapsed definitions (43,798 chars)** against the assembled **20 (42,619 chars)** — a
change of ~1,200 chars, **≈300 tokens**. So hypothesis (a) — *"16,757 predates the bridge and describes
a prompt the worker no longer builds"* — is **FALSIFIED**: the bridge's real-world effect is small,
because the default toolset was already narrow.

**What actually fills the 16,725.** The assembled tool array (9,502) + a **26,549-char system prompt**
(~6.7k tokens) + the conversation. **The system prompt — not the tool catalogue — is the second-biggest
block**, and no tool-side change can reach it.

**What this means for the ceiling — the honest reading, now confirmed on the current pin.** Two measured
production turns bracket it:

| Turn | Prompt | Prefill | Headroom under 2,400 s |
|---|---|---|---|
| 2026-10-14 production-shaped (`…_a43f3d`) | 16,725 | **1,778.8 s** (9.40 tok/s) | ~620 s |
| **2026-10-16, on the re-pinned worker** (`20261016_100451_37afd4`) | **16,572** | **2,280.4 s** (7.32 tok/s) | **~120 s** |

The second is a **real turn driven end-to-end through the ws door** — ticket minted, `session.create`,
`prompt.submit`, a real model answer (`"ready"`), and `usage.prompt = 16572` matching the model server's
own `prompt eval time = 2262809.92 ms / 16572 tokens`. **So the cold turn completes — but it used 95 % of
the 2,400 s clock.** The ceiling holds on this box and is **marginal**; the lever that would move it is
the **system prompt** (26.5k chars, ~6.7k tokens), not the tool set.

*(Route note, kept: the live RPCs do not expose the assembly — `tools.list` returns per-toolset name
lists only, and `tools.show` explicitly requests `get_tool_definitions(skip_tool_search_assembly=True)`,
i.e. the pre-assembly array (`tui_gateway/methods_tools.py:1325-1326`). The assembly must be run inside
the worker's own process. The earlier "host memory pressure — exit 137" note was **wrong**: the 137 was
the absent process of a crash-looping container, not an OOM (L169).)*

### 4.4 Warm turns are already cheap — measured, this session

The worker's transport (`agent/transports/chat_completions.py`) passes **no `cache_prompt` field** —
it builds provider-specific `extra_body`s but never that one — so the answer had to come from the
deployed server, not from a citation (the image is a floating `ghcr.io/ggml-org/llama.cpp:server`
tag). A behavioral probe ran against the live model server (native `/completion`, a 947-token
prompt, `n_predict: 1`, two identical calls, no field set):

| Call | Elapsed | What the server did |
|---|---|---|
| A — first, cold | **168.7 s** | full prefill, 947 tokens at 5.63 tok/s |
| B — identical, immediately after | **1.5 s** | **prefix reused** — `prompt_n: 1`, one token re-evaluated |

**Verdict: the deployed llama-server reuses the prompt KV cache on a repeated prefix by default.**
The worker sending no `cache_prompt` field is already correct — there is nothing to turn on. (The
timings dict in this build reports no `cached_n` field, but the contrast is unambiguous: re-reading
947 tokens costs ~168 s, not 1.5 s — a ~113× difference.)

**What this does and does not establish — the confounds, named:**

- **The first turn is not killed — but it is close, and §4.3 has now measured it twice.** The true prompt
  is **16,725–16,572 tokens** (§4.3, corrected 2026-10-16). The 2026-10-14 turn prefilled in **1,778.8 s**
  (9.40 tok/s, ~620 s of headroom); the **2026-10-16 turn on the re-pinned worker prefilled in 2,280.4 s**
  (7.32 tok/s, **~120 s of headroom — 95 % of the clock**). The earlier "~3,000 s" was an extrapolation at
  5.5 tok/s. **So the cold first turn completes, with very little room.** The probe measured two *completed*
  calls; whether an *aborted* first turn leaves its slot cache alive for the retry is **untested** — an
  open dependency, not a proven path.
- **An identical prefix is not a growing prefix.** Production turns extend the conversation each
  turn. "A warm turn pays only the delta" is the standard longest-prefix-match behavior
  **extrapolated** from the identical-prefix measurement, not directly measured.
- **Call A may have carried first-request overhead**, so 5.63 tok/s is an upper bound on the
  comparison, not a clean corroboration of §4.1's turn band (5.6–6.9 tok/s). The gap between the
  probe's 5.63 and the compose's 19.3 tok/s on the same box is **unexplained** — load and memory
  pressure are candidates — and both stand as their own measurements.

**The consequence that survives every caveat:** the 2,400 s hazard is a cold-start cost, not an
every-turn cost. A warm turn re-ingests only the delta — the new user message and the last reply —
and the probe shows that reuse is real on the deployed server. The cold turn itself is a one-time
cost per conversation whose size §4.3 has now established (**16,725 tokens**).

---

## 5. The options, ranked — with one recommendation

**Option 1 — RECOMMENDED: keep the 2,400 s ceiling; make P2-9b a measure-and-configure step on the
disclosure we already own.** Concretely, in order: (a) the §4.4 probe is done — prompt-cache reuse
is already on by default, warm turns cost only the delta, and nothing needs changing there; (b)
re-measure the assembled prompt (§4.3) so the hazard figure is true — this is now the *first*
action, and it is the only number in this document still unverified; (c) only if the measured cold
prefill still lacks headroom, tune `threshold_pct` / the listing budget / `HERMES_TUI_TOOLSETS` —
**configuration of the same mechanism, not a product change**: the AI keeps every tool, discovers
them by need, and pays for detail only when it asks. **No performance compromise on warm turns; no
quality compromise ever — the full catalog stays reachable.**

**Option 2 — raise the ceiling to ~3,600 s.** Rejected: it makes every cold turn wait longer (the
owner's own objection — a product defect, not a timeout), and each trip feeds the #58962 streak
breaker, so repeated cold aborts progressively wedge the agent. It out-waits the problem instead of
shrinking it.

**Option 3 — shrink the default toolset (pin `HERMES_TUI_TOOLSETS` to a small eager set).** Rejected
as unnecessary: this is the "hand-picked bunch" the owner asked whether we needed — **we don't,
because the worker computes the bunch per turn, by need, from the live catalog.** Hand-picking would
also be strictly worse than retrieval: a fixed list can't know what tomorrow's request needs.

**Option 4 — faster hardware or a smaller model.** Not a code decision; named for honesty. It is the
durable physics fix (the compose's own words: a deployment with a fast model never reaches the
ceiling), and it is where the field's §2.4 boundary ultimately points. Out of scope for P2-9b, in
scope for the deployment plan.

---

## 6. The single decision for the owner — and the ruling (2026-10-16)

**Whether P2-9b's scope is "measure and configure what already ships" (Option 1, recommended) — or
"change product defaults" (Options 2/3, the compromises).**

Option 1 asks nothing of the product and nothing of the AI's abilities: the default toolset stays
whole, the ceiling stays 2,400 s, and the work is one remaining measurement (§4.3) plus — only if it
demands — two or three configuration knobs that already exist in the pin. The honest costs, named:
the §4.3 re-measurement must happen before any number in this document is trusted, and retrieval —
like any search — can miss; the mitigation is the shipped tiered listing (full definitions first,
names only under budget) plus the P2-9a turn as the working precedent, and misses are a thing to
monitor, not a correctness hole.

**No code is proposed by this document.** It is the written record that, by the project's own rule,
must precede any code — and the code it would authorise is small: a configuration change and one
measurement (the §4.4 probe is done), both reversible.

---

## 6.1 The ruling, verbatim (2026-10-16)

> *"1) Yes we follow the recommended alternative. 2) Make this experience a lesson you document by
> adding rules to follow in the working rules. For any critical task, you need a critical analysis
> first and expanded cloud researching to first identify the best, most optimized, rich fetured,
> accurate and quality boosted way to do it. Not only you were planning to do it in a compromized
> way, but even in a way that is worse than what we had already. That's lack of awareness of what we
> have and lack of awareness of where the world is now."*

**Part (1) — Option 1 is the decided path.** Concretely, it settles:

- **The 2,400 s stale ceiling stays.** It is a hardware grace measured with 495 s of headroom over
  the slowest prefill actually observed (the DEFAULT-toolsets run); raising it would only make every
  cold turn wait longer and feed the #58962 streak breaker.
- **On-demand tool loading is the standard behavior** — not a mode, not a toggle. The pinned
  worker's progressive disclosure is already on by default and was proven live in the `P2-9a` turn.
- **`P2-9b` is re-scoped to measure-and-configure.** Its one outstanding action is the §4.3
  re-measurement of the assembled prompt (in-process — the live RPCs cannot expose it); the config
  knobs (`threshold_pct`, the listing budget, `HERMES_TUI_TOOLSETS`) are touched **only if the
  measured numbers demand it**. Then the switchover itself: the default-flip to Hermes + the OpenCode
  deletion (`R28-6`/`N-8`) + the `hermes-local` retirement (`CC-74`) — one change.

**Part (2) — the process failure is now a standing rule.** [`WORKING-RULES.md`](WORKING-RULES.md)
**rule 18** (written the same day): a critical task gets a critical analysis first and expanded cloud
research first; what we have and where the world is must be measured, not assumed; and a compromise
menu — or an option worse than the status quo — is never put to the owner. Its worked example is
this decision itself.

---

## 7. What changes in the build (nothing yet)

- **P2-9b is re-scoped from "pick a timeout" to "measure and configure the shipped disclosure."**
  Its deliverable becomes: the re-measured prompt size (§4.3 — the §4.4 probe verdict is already
  in), and — only if the numbers demand it — a tuned `tool_search` config or toolsets pin.
  **RULED 2026-10-16 (§6): this re-scope is the decided plan** — the ceiling stays at 2,400 s and the
  measurement is the first action.
- **`CC-72`'s stale-timeout leg (on `platform_points.md` row 28) is CLOSED by the ruling**; the
  row's remaining work is the §4.3 measurement, then the switchover.
- **The hazard paragraph in the phase-2 plan §2.15 carries a forward reference to this document**
  (added with this record); its 16,757 figure is marked "provenance open, re-measure before gating"
  until §4.3 lands.
