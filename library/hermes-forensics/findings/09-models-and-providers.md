# Batch 09 — Models and providers

**Status:** COMPLETE
**Date:** 2026-10-15
**Method:** docs read in full against code; every claim carries a `file:line`. Docs are claims, code is authority (00-PIN-AND-METHOD.md §2).
**Source:** `hermes-agent-main/hermes-agent-main` @ pin (19,728 files; pyproject md5 `f57f729d4b251547a5a9e2565ce1e726`).

---

## §0 — Plain words

A **model** is the "brain" Hermes thinks with. A **provider** is the company or local program that actually runs that brain and sends the words back. Hermes does not have its own brain — it borrows one. So this batch answers three practical questions:

1. **How does Hermes choose, connect to, and pay for a brain?** (§2, §3)
2. **What happens when the chosen brain is busy, rate-limited, or the key runs out of money?** (§4, §5, §6)
3. **How does Hermes keep the *background* work (summarising, titling, classifying a risky command) cheap, so it is not billed at the same rate as the main conversation?** (§7)

The short version: Hermes treats a model like a **utility with a failover grid**. It can hold **several keys for the same provider** and rotate between them; it can keep a **ranked list of backup providers**; and it splits **background chores onto a cheap "auxiliary" lane** so the expensive model is reserved for the actual conversation. Almost none of this is unique to Hermes — but the *degree of measured care* in the failover machinery is the interesting finding, and it maps onto platform value (§10).

---

## §1 — What was read and verified

**Docs read in full (paths under `website/docs/`):**

| Doc | Size | Role |
|---|---|---|
| `user-guide/configuring-models.md` | 28,853 B | the main "how to pick a model" guide |
| `user-guide/features/credential-pools.md` | 21,305 B | many keys per provider |
| `user-guide/features/fallback-providers.md` | 26,982 B | ranked backup providers |
| `user-guide/features/provider-routing.md` | 6,923 B | OpenRouter routing prefs |
| `user-guide/local-models.md` | 10,111 B | running a model on your own machine |
| `reference/model-catalog.md` | 6,659 B | the remote list of model names |
| `integrations/providers.md` | (large) | the provider table + two-command boundary |

**Code read and measured:**

| File | Finding | Verified at |
|---|---|---|
| `agent/credential_pool.py` | 4 rotation strategies; cooldown TTLs | `:121–129`, `:135–146` |
| `agent/secret_sources/registry.py` | 4-rule precedence ladder; provenance | `:384–414`, `:33–37` |
| `agent/secret_sources/{bitwarden,onepassword,command}.py` | 3 bundled secret backends | registry `:47–51` |
| `hermes_cli/models.py` | `PREFERRED_SILENT_DEFAULT_MODEL` use | `:37, 473, 481` |
| `hermes_cli/models_catalog_static.py` | the actual default model id | `:545` |
| `hermes_cli/model_catalog.py` | remote manifest URL + TTL + fallback URL | `:26, :30, :33` |
| `hermes_cli/config_defaults.py` | `model_catalog` block; `auxiliary` block | `:2040–2051`, `:738–791` |
| `hermes_cli/fallback_config.py` | effective chain + alias collapse | `:16–37`, `:52–78` |
| `agent/credential_pool.py` + `tools/delegate_tool.py` | children share the pool | `delegate_tool.py:321–326, :360` |
| `agent/chat_completion_helpers.py` | routing prefs merged per-model | `:471–485` |
| `agent/secret_scope.py` | profile-scoped secret read | (referenced) |

**Honesty note on my own earlier note:** in the pre-summary working notes I described `integrations/providers.md` as "~40 provider sections". Measured: it has **7 `##` sections** and a **~90-row** provider table (120 pipe-lines including header/separator). The *count of providers* is roughly right; the *structure* was mis-stated. Correction recorded under rule 13.

---

## §2 — The two commands boundary (setup vs switch)

The docs draw a clean line, and the code honours it:

| Command | Where it runs | What it does | Code |
|---|---|---|---|
| `hermes model` | your terminal, **outside** a session | the full wizard — add a provider, run OAuth, paste keys, configure an endpoint, download a local model | `hermes_cli/main.py:1867` `def cmd_model(args)` |
| `/model` | **inside** a chat session | quick switch among providers/models that are **already configured** | `hermes_cli/cli_model_switch_mixin.py:874` |

**Why this matters:** the boundary is not cosmetic. Setup (network I/O, OAuth browser flows, schema writes) is deliberately kept out of the live session so that switching a model mid-conversation is a *local* operation. The corollary is a real limitation: **you cannot add a brand-new provider from inside a session** — a user who hits "my provider is down" mid-task must leave the session to add a backup.

**Q1 (user value):** a non-technical user gets a guided wizard once, then a one-word switch forever. Good.
**Q2 (vision value):** a business-resource planner wants model choice to be an *operational* decision (cost lane, capability lane). The setup/switch split is the right shape; what is missing is *policy* — "use the cheap model for this task class, the strong model for that one" is expressed in config, not as a first-class user-facing concept (§7 is the closest thing).

---

## §3 — The provider surface (what Hermes can actually talk to)

Measured from the provider table in `integrations/providers.md`: roughly **90 provider rows**, each naming the provider, the env var / command, and any aliases. Representative spread (not exhaustive):

- **Subscriptions via OAuth:** Nous Portal, OpenAI Codex (ChatGPT plan), GitHub Copilot (+ ACP), Anthropic (Claude Max), xAI Grok (SuperGrok), Qwen OAuth, MiniMax OAuth, Google Vertex AI (service account).
- **Key-in-env API providers:** OpenRouter, Fireworks, NovitaAI, z.ai/GLM, Kimi/Moonshot (+ China), Arcee, GMI Cloud, Nebius, MiniMax (+ China), xAI, Alibaba DashScope (+ Coding/Token plans, each with a mainland-China endpoint), Kilo Code, Xiaomi MiMo, Tencent TokenHub / TokenPlan, OpenCode Zen / OpenCode Go, DeepSeek, Hugging Face, Google Gemini, OpenAI direct, NVIDIA Build, StepFun, Ramp Router, AI Gateway, Actual Computer.
- **Self-hosted / local:** Ollama Cloud, Ollama, vLLM, SGLang, llama.cpp, LM Studio, LiteLLM, ClawRouter, Custom Endpoint.

**Note the China-region duality throughout:** several providers ship a *separate* provider id and env var for the mainland-China endpoint (`kimi-coding-cn`, `minimax-cn`, `alibaba-cn`, `alibaba-coding-plan-cn`, `alibaba-token-plan-cn`). This is a deliberate, measured accommodation, not an afterthought.

**Two API-shape facts that matter for integration:**

1. **API modes diverge from docs** — carried from Batch 01: docs describe 3 modes; `agent/agent_init.py:381–384` defines **5** (`chat_completions`, `codex_responses`, `anthropic_messages`, `bedrock_converse`, `codex_app_server`) plus plugin-registered transports. The `auxiliary.review` block re-states the 3 transport names (`chat_completions | anthropic_messages | codex_responses`) — so the aux path admits fewer transports than the main path. **This is a boundary, not a bug**, but it is worth knowing: a provider reachable on the main lane may not be reachable on the review lane.
2. **Credential resolution is profile-scoped.** `fallback_config.py:52–78` reads `key_env` through `agent.secret_scope.get_secret`, **not** raw `os.getenv`, with an explicit comment that a bare env read "ignores the active profile's scope and can return another profile's credential". This is the same isolation discipline Batch 02 found in `HERMES_HOME`.

**Q1:** a user can bring literally any brain they already pay for. Strong.
**Q2:** for a resource planner, the *value* here is not "we also support provider X" — it is that Hermes has already solved **the adapter problem** (many shapes, one internal contract). A platform that plans *and buys* resources needs exactly that contract.

---

## §4 — Credential pools (many keys for one provider)

Verified in `agent/credential_pool.py`:

```
STRATEGY_FILL_FIRST   = "fill_first"
STRATEGY_ROUND_ROBIN  = "round_robin"
STRATEGY_RANDOM       = "random"
STRATEGY_LEAST_USED   = "least_used"
SUPPORTED_POOL_STRATEGIES = { the four above }        # :121–129
```

- **Storage:** pool entries persist to `auth.json` (read/write via `read_credential_pool` / `write_credential_pool`, imported at `:51–52`). The docs' "Storage" section matches.
- **Cooldowns** (measured, not in the docs' headline): `EXHAUSTED_TTL_401_SECONDS = 5 * 60`, `EXHAUSTED_TTL_429_SECONDS = 60 * 60`, `EXHAUSTED_TTL_DEFAULT_SECONDS = 60 * 60`, and — the careful one — `EXHAUSTED_TTL_SOLE_CREDENTIAL_SECONDS = 60`. The comment explains it: if the benched key is your *only* key, an hour-long bench means an hour of hard failures, so a sole credential cools down for **60 seconds** instead. (`:135–146`)
- **Delegation shares the pool.** `tools/delegate_tool.py:321–326` resolves a **child** credential pool and assigns it to the child agent, with the comment *"Shared pool lets children rotate credentials on rate limits."* Line `:360` leases a specific credential to the child. So a fleet of subagents does not stampede a single key.
- **Providers are registered through `hermes_cli/`, not `providers/`.** Measured: `providers/` contains only `README.md`, `__init__.py`, `base.py` (a contract), while the ~70 model/provider modules live under `hermes_cli/` (`model_switch.py` 97 KB, `models.py` 143 KB, `runtime_provider.py` 74 KB, etc.). This is an architectural smell worth recording: the *base class* lives in `providers/` but the *implementations* live in `hermes_cli/`, which mixes CLI concerns with provider logic.

**Q1:** a user with two OpenRouter keys gets automatic failover with zero code. Real.
**Q2:** for a planner that *reserves and spends* resources, "hold N credentials, rotate on exhaustion, and let shared workers lease from the same pool" is precisely the resource-management primitive such a platform needs — see §10.

---

## §5 — Fallback providers (the ranked backup grid)

`hermes_cli/fallback_config.py` implements the "effective fallback chain". Two details are worth the ink:

1. **Alias collapse before dedup.** `_normalize_provider_id` (`:16–37`) collapses aliases to a canonical id, with an explicit comment: *"Without normalization, two fallback entries naming the same backend under different ids are kept as separate slots, shifting the chain and letting an alias slip past the same-backend skip (#85235)."* This is a **measured, previously-bitten bug** (issue #85235) encoded as a fix.
2. **Identity preservation.** `effective_runtime_provider` (`:52–78`) fixes the case where a resolved fallback is reported as the bare billing class `"custom"` instead of the configured provider name — with the comment that fallback resolvers *"therefore label sessions/billing rows `custom` instead of the configured provider name — while the manual `/model` switch path correctly persists the named id (#98739)."*

The docs' `fallback-providers.md` (26,982 B) enumerates six fallback surfaces: **Primary Model Fallback, Auxiliary Task Fallback, Auxiliary Capacity-Error Fallback, Context Compression Fallback, Delegation Provider Override, Cron Job Providers.** So fallback is not one mechanism — it is a *policy applied per traffic class*. Cron jobs can be pinned to a provider that nobody is using interactively; delegation can be pinned differently from the parent.

**Q1:** a turn survives a provider outage without the user retyping anything. Strong.
**Q2:** this is the skeleton of **provider-level service continuity**, which a resource planner that brokers capacity would need. But note: the chain is *configured*, not *learned*. Nobody decides at runtime "provider A is degraded, shift 20% of load to B by measured latency". That is the gap to watch.

---

## §6 — Credential *sources* (where secrets come from) — distinct from pools

Do not confuse two mechanisms:

- **Credential pool** (§4) = many keys *for the same provider*, rotated for rate limits.
- **Secret sources** (§6) = the *origin* of any secret, fetched by a backend, with a strict precedence ladder.

Verified in `agent/secret_sources/registry.py`:

- **Three bundled backends** (`_BUILTIN_SOURCES`, `:47–51`): **Bitwarden**, **1Password**, **command** (run a shell command, take its stdout). Plugins register more via `PluginContext.register_secret_source()`.
- **The precedence ladder is four rules** (docstring `:384–393`, enforced `:408–414`), most-specific intent first:
  1. `secrets.preserve_existing` names always keep a pre-existing value — **even against** `override_existing: true`.
  2. A pre-existing `.env`/shell value, **unless** the winning source has `override_existing: true`.
  3. **mapped** sources in configured order.
  4. **bulk** sources in configured order.
- **"Mapped outranks bulk regardless of list order"** (`:413–414`) — a hard rule, not a sort.
- **First claim wins:** a later source carrying the same variable gets `skipped_claimed` plus a **conflict warning** — "never a silent clobber, and `override_existing` never applies across sources" (`:390–392`).
- **Provenance is first-class:** every applied variable produces an `AppliedVar` record naming source, shape, whether it overrode the environment, and whether it is `authoritative` (`:47–59`).
- **Profile aliasing:** under a named profile, an applied `FOO_<PROFILE>` (credential-shaped suffixes only) also hydrates canonical `FOO` — disabled with `secrets.profile_alias: false` (`:395–398`).

**Q1:** a user can keep keys in their password manager, never on disk. Real, and the precedence ladder means it never silently clobbers what they set by hand.
**Q2:** **this is the most transferable mechanism in the batch.** A resource planner that must hold *customer-owned* credentials needs exactly: multiple origins, a documented precedence ladder, conflict-never-clobber, and a provenance record. Hermes has shipped all four.

---

## §7 — The auxiliary lane (cheap models for background chores)

Measured in `hermes_cli/config_defaults.py:738–791`. The `auxiliary` block routes every *background* AI chore to its own model, independent of the main conversation model. Per-task blocks share one shape (`_aux(timeout, ...)`):

| Aux task | Default timeout | Notes (from code comments) |
|---|---|---|
| `vision` | 120 s (+30 s image download) | image understanding |
| `compression` | 120 s | context summarising; `no_progress_timeout` separate from overall timeout |
| `skills_hub` | 30 s | |
| `approval` | 30 s | the risk classifier — "a fast/cheap model is recommended" |
| `review` | — | full subagent on the delegation rail; credentials resolved like delegation pins |
| `mcp` | 30 s | |
| `title_generation` | 30 s | `model_upgrade_enabled` — can skip the model entirely |
| `memory_query_rewrite` | 8 s | `reasoning_effort=False` |
| `tts_audio_tags` | 30 s | |
| `voice_chat` | 120 s | `reasoning_effort: "none"` |

Three guard-rails stand out:

1. **`free_only: False` + a one-time warning.** "When true, the auto-chain's OpenRouter step is skipped unless the fallback model ends in `:free` — a **PAID lane is never used for background aux traffic even with `OPENROUTER_API_KEY` set**." And: *"A one-time WARNING is logged whenever a non-`:free` model is engaged."* So background traffic can be forced onto a free tier and proactively announced if it is not.
2. **Main-agent routing does NOT propagate.** Comment at `:736–737`: *"Each task is independent — main-agent `provider_routing` and `openrouter.min_coding_score` do NOT propagate to aux calls by design."* The expensive model's tuning cannot leak cost into background chores.
3. **`web_extract` and `session_search` no longer use an aux LLM** (`:760–761`; and `#27590`) — leftover config blocks are ignored. So the aux lane has been *deliberately shrunk* over time to cut hidden spend.

Default aux chain fallback: `openrouter:google/gemini-3-flash-preview` when the configured provider is unavailable (`:727–728`).

**Q1:** the user's main bill is not spent on titling or summarising. Real, and measurable.
**Q2:** **this is the clearest "AI-first resource planning" pattern in the whole study so far.** It is, literally, *routing a task class to the cheapest capable resource* — which is what a resource planner does for compute, storage and people. The `free_only` / "never use a paid lane for background" rule is a *policy* a business would want to set for itself.

---

## §8 — The model catalog (the remote list of model names)

Measured in `hermes_cli/model_catalog.py` and `config_defaults.py:2040–2051`:

- **Remote manifest:** `https://hermes-agent.nousresearch.com/docs/api/model-catalog.json` (`model_catalog.py:26`) — "so picker lists update without a release".
- **Fallback URL:** `https://raw.githubusercontent.com/NousResearch/hermes-agent/main/website/static/api/model-catalog.json` (`:30–32`), with the reason recorded in a comment: *"The Docusaurus site sits behind Vercel, which occasionally 403s non-browser clients (bot challenge); the raw GitHub copy is the same manifest and is not bot-gated."* A measured, previously-bitten workaround.
- **TTL:** `ttl_minutes: 20` (`:33`; config `:2046`). Legacy `ttl_hours` honoured only if the user set it and `ttl_minutes` is still default (`:60–69`).
- **Cache per profile:** `<home>/cache/model_catalog.json` — the in-process cache is keyed by "path + mtime and TTL", with the comment that under a multiplexed gateway "each profile has its own … and mtime alone cannot tell two profiles' files apart" (`:40–46`).
- **Per-provider override URLs:** `model_catalog.providers` lets a self-hoster point at their own curation list with the same schema (config `:2049–2050`).
- **Default model id (measured):** `PREFERRED_SILENT_DEFAULT_MODEL = "z-ai/glm-5.2"` (`models_catalog_static.py:545`), used as the silent fallback when no model is configured and no network is available (`models.py:473–481`).

**Q1:** the model list stays current without the user updating the app. Good.
**Q2:** for a planner, a **remotely-curated, per-tenant-overridable capability catalog** is a reusable pattern — it is the same shape as a "resource catalogue" where the vendor curates defaults and the tenant overlays their own.

---

## §9 — Local models (running the brain on your own machine)

From `local-models.md` (Desktop availability, llama-server, requirements/limits) — the model runs under **llama-server** (llama.cpp) downloaded and managed by the Desktop app:

- **Backend selection:** `backend: auto` prefers CUDA for NVIDIA, Vulkan for AMD/Intel, then CPU (`## Requirements and limits`).
- **Sizing:** "A GPU with 8 GB+ of memory runs the small catalog models comfortably; 16 GB+ runs the 27–35B models at high quality."
- **Integrity:** "Engine archives are SHA-256 verified before use"; "Model completeness is checked against the server's response, not catalog size estimates"; interrupted transfers keep partials for resume.
- **Cleanup:** "Deleting a model removes every file it staged, including vision adapters and speculative-decoding companions."
- **Bring your own server:** `## Using your own llama-server` — you can point Hermes at a server you run.

**Q1:** a user with a decent GPU runs free and offline. Real, and the integrity checks mean a half-downloaded model cannot silently produce garbage.
**Q2:** for a business planner, local inference is the **own-vs-rent** decision on compute — precisely a resource-planning trade-off. Hermes gives the *mechanism* (download, verify, size, serve) but not the *policy* (when is local cheaper than rented, given this workload?). That is platform-side territory.

---

## §10 — Divergences, boundaries and corrections

**Divergences found this batch: 0** (docs matched code on every checked claim — credential-pool strategies, catalog TTL/URL, secret-source backends and ladder, aux task list). Listed honestly alongside the confirmed-match items:

| Claim | Verdict | Evidence |
|---|---|---|
| `provider_routing` is OpenRouter-only | **TRUE** | `batch_runner.py:913` "(OpenRouter only)"; `plugins/model-providers/nous/__init__.py:34` "routing is decided centrally per model"; docs state it is ignored on Nous Portal |
| 4 credential-pool strategies | **TRUE** | `credential_pool.py:121–129` |
| Catalog TTL 20 min, remote URL + fallback | **TRUE** | `model_catalog.py:26,30,33`; `config_defaults.py:2046` |
| 3 secret backends (Bitwarden/1Password/command) | **TRUE** | `registry.py:47–51` |
| Memory limits / sessions defaults / MCP safe-env / SSRF list (earlier batches) | **TRUE** | reported in b04/b05/b07/b08 |

**Correction under rule 13 (my own earlier note):** "`integrations/providers.md`: ~40 provider sections" → measured **7 sections**, **~90-row provider table**. The structure was mis-stated; the provider *count* was in the right order of magnitude. Corrected here and in §1.

**New boundary surfaced (not a divergence):** the **aux transport list is narrower than the main transport list**. `auxiliary.review.api_mode` admits `chat_completions | anthropic_messages | codex_responses` (`config_defaults.py:770–771`), while the main agent admits 5 modes (`agent_init.py:381–384`). A provider reachable on the main lane may be unreachable on an aux lane.

**Architectural smell recorded:** provider implementations live in `hermes_cli/` (~70 modules, some >90 KB) while the base contract lives in `providers/base.py`. CLI concerns and provider logic are mixed.

---

## §11 — Carried items

| ID | Item | Status |
|---|---|---|
| **C9-1** | Aux transport list (3) narrower than main transport list (5 + plugins) — a provider reachable on one may not be on the other. | Watch for Batch 10/12 |
| **C9-2** | Provider implementations live in `hermes_cli/` not `providers/`; base contract is separate from implementations. | For §12 synthesis |
| **C9-3** | Fallback chain is **static/config-driven**, never learned from measured provider health. | For §12 synthesis |
| **C9-4** | `/model` cannot add a new provider mid-session; setup requires leaving the session. | For §12 synthesis |
| **C9-5** | Secret-source precedence ladder (4 rules + provenance + never-clobber) is the most transferable single mechanism; verify against platform's secret handling in §12. | For §12 synthesis |
| **C9-6** | China-region dual endpoints are first-class (separate ids + env vars for kimi/minimax/alibaba). Relevant to a platform serving mainland users. | For §12 synthesis |
| **C9-7** | The `auxiliary` block is a working model of "task class → resource class" policy; `free_only` is a spend cap. | For §12 synthesis |
| **C9-8** | `PREFERRED_SILENT_DEFAULT_MODEL = "z-ai/glm-5.2"` — the shipped default; a platform pinning a model should note the default is remote-catalog-influenced, not fixed. | Note |

---

## §12 — Batch-level value questions (Q1 user / Q2 vision)

**Q1 — how does this serve a user use case?**
A user can bring any brain they already pay for (subscription via OAuth, or a key), keep several keys so a rate limit does not stop their work, keep ranked backups so a provider outage does not stop their work, keep keys in a password manager rather than on disk, and run entirely locally on their own GPU if they prefer. Background chores never spend the same money as the main conversation. **The user-visible promise: "your work does not stop because a provider hiccupped, and your bill is not spent on bookkeeping."**

**Q2 — how does this serve the vision of an AI-first business/resource planner?**
Three mechanisms look directly reusable, in order of clarity:

1. **The auxiliary lane** (§7) — routing a *task class* to the *cheapest capable resource*, with an explicit "never use a paid lane for background" policy switch. This is resource planning in miniature, and it is already production-shaped.
2. **Credential pools + fallback chain** (§4, §5) — hold N credentials, rotate on exhaustion, lease to shared workers, fail over along a ranked chain. This is the primitive for **availability across a fleet**.
3. **Secret sources + precedence ladder** (§6) — multiple origins, ordered precedence, never-silent-clobber, provenance on every applied secret. This is the primitive for **holding customer-owned credentials safely**.

What Hermes does **not** do, and therefore what the platform would own: decide *where a task should go* from measured cost/latency/capability at runtime (the chain is configured, not learned — C9-3), and let a user **add** a provider mid-task without leaving the session (C9-4).

**Cross-reference:** the mercato-vs-Hermes placement debate (what to adopt, build on, or build around) is deliberately deferred to `12-SYNTHESIS.md`. Per the owner's instruction, batches do not compare architectures.

---

**Batch 09 of 12 complete. Divergences found this batch: 0** (docs matched code on every checked claim — credential-pool strategies, catalog TTL/URL, secret-source backends and ladder, aux task list). **One correction to my own earlier note** (rule 13): `integrations/providers.md` has **7 sections / ~90 provider rows**, not "~40 sections". **One new boundary:** the aux transport list (3) is narrower than the main transport list (5 + plugins). **Most transferable mechanism:** the secret-source precedence ladder (§6) and the auxiliary task-class lane (§7).
**Next: `10-code-execution-plugins-and-extensibility.md`** — including the OpenCode question.
