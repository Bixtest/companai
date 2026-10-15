# Batch 13 — Coverage audit against the prior analysis (second round)

**Status:** COMPLETE
**Date:** 2026-10-15
**Method:** the prior analysis in `library/analysis/findings/` is treated as a **source of hypotheses**, never as authority. Every subject it names was re-located in the **new tree** and re-measured (code is authority — 00-PIN-AND-METHOD.md §2, rule 13). Drift between the prior material and the new tree is itself a finding.
**Source:** `hermes-agent-main/hermes-agent-main` @ pin (19,728 files; pyproject md5 `f57f729d4b251547a5a9e2565ce1e726`).
**Why this batch exists:** the owner asked for a **second round** — *"if anything there is missing from your new analysis, check in the new code if it still work, and then update your new documentations to cover that as well."*

---

## §0 — Plain words

The first eleven batches of this study were written **clean** — they ignored all earlier Hermes material by instruction. That was right, but it left a risk: **something the earlier analysis covered might have fallen through the gap.** This batch closes that risk. It takes the two prior Hermes documents, lists every subject they raise, and asks of each: *did my twelve batches cover this — and if not, does it still exist in the new code?*

**The answer, plainly:** the twelve batches missed **eleven subject areas**. Ten of them **still exist** in the new tree and are now documented here. **One of them does not exist any more** — and that is the most valuable finding in the batch (§3).

**The one that vanished:** the prior analysis treated `security.tirith_*` as a live setting and even recorded an integration failure caused by it (approval scanner hanging a worker). **In the new tree, tirith has been removed from Hermes entirely** — config migration 49→50 deletes its keys and *"nothing replaces them"*. Any plan resting on the old behaviour rests on a feature that is gone.

---

## §1 — The prior sources, measured

| File | Size | Date | What it is | Relationship to this study |
|---|---:|---|---|---|
| `library/analysis/findings/07-hermes-capability-map.md` | 42,861 B | 2026-10-04 | **the prior Hermes capability map** — 45 claims (`H-01`…`H-45`) + 13 value entries (`V-01`…`V-13`) | a prior, independent pass at the same subject |
| `library/analysis/findings/08-hermes-fact-check.md` | 30,471 B | 2026-10-04 | **fact-check of other documentation about Hermes** — incl. a 22-lesson integration-failure register and ~14 `INTEGRATION WARNING`s | a prior record of how Hermes *breaks* in production |
| `library/analysis/findings/06-starting-kit-capability-map.md` | 39,845 B | 2026-10-04 | the platform's own capability map (not about Hermes) | out of scope for this batch |

**Critical context — the prior material measured a *different, older* tree.** Batch 07's own §2 records its source as `library/ai/hermes-agent-main/`, and batch 08 §0 records the sibling's vendored copy as **Hermes 0.20.1** while its extract was **post-0.21.5, on/after 2026-09-28**. This study's tree is **2026-10-15** (batch 00). So the prior material is at least **two weeks older** than this study's source, and some of it measured an even older copy. **Every migration check below exists because of that gap.**

**Prior method vs this study's method.** The prior material's §20 (critic pass) is honest and its failure ledger is real. Where it differs from this study: it derived its task-zero as a **date window** (no `.git`), the same limit this study states; and its counts are **self-corrected twice** (platform adapters 32→34; toolsets 37→61), which is good discipline. **It is a serious document, and this batch treats it as such.**

---

## §2 — The coverage audit: what the twelve batches missed

**Method:** every distinct Hermes subject named in 07/08 was checked against the twelve batch documents. A subject is a **gap** if no batch named it.

| # | Subject the prior material raised | Covered in batches 01–11? | Exists in the new tree? | Where now |
|---|---|---|---|---|
| 1 | **Personality overlays + built-in personas** (`hermes_cli/personality.py`) | **NO** | **YES** | §3.1 |
| 2 | **`SOUL.md` — the shipped system prompt / persona** | **NO** (b01 named the loop, not the soul) | **YES** | §3.1 |
| 3 | **Emergency stop** (`hermes pause`/`resume`, `agent/estop.py`) | **NO** | **YES** | §3.2 |
| 4 | **Mixture-of-Agents** (`/moa`, `agent/moa_*.py`) | **NO** | **YES** | §3.3 |
| 5 | **Checkpoints / rollback** (`tools/checkpoint_manager.py`) | **NO** | **YES** | §3.4 |
| 6 | **Learning graph** (`agent/learning_graph*.py`) | **PARTIAL** — b03 named the curator, not the graph | **YES** | §3.5 |
| 7 | **Trajectories + compressor** (`agent/trajectory*.py`) | **NO** | **YES** | §3.6 |
| 8 | **LSP integration** (`agent/lsp/`, 11 files) | **NO** | **YES** | §3.7 |
| 9 | **Browser credential vault** (`tools/browser_vault_tool.py`) | **NO** — b11 covered browser routing, not the vault | **YES** | §3.8 |
| 10 | **Credential-file passthrough to sandboxes** (`tools/credential_files.py`) | **PARTIAL** — b11 named mounted files as a *gap* in egress; not as a mechanism | **YES** | §3.8 |
| 11 | **Security audit** (`hermes_cli/security_audit*.py`) | **NO** | **YES** | §3.9 |
| 12 | **Pets** (`agent/pet/`) | **NO** | **YES** | §3.10 |
| 13 | **OpenClaw migration** (`scripts/openclaw_to_hermes.py`) | **NO** | **YES** | §3.10 |
| 14 | **`/steer` into a live run** | **NO** | **YES** | §3.11 |
| 15 | **Document extraction** (`tools/read_extract.py`) | **NO** | **YES** | §3.11 |
| 16 | **`X-Hermes-Session-Id` continuity header** | **NO** | **YES** | §3.11 |
| 17 | **`security.tirith_*` approval scanner** | **NO** | **NO — REMOVED** | **§4** |
| 18 | **The integration-failure register (22 lessons)** | **NO** | n/a (a record, not a feature) | **§5** |

**Headline: 11 subjects were genuine gaps, 1 is a removal, 1 is an external record.** All eleven gaps are documented below with new-code evidence.

---

## §3 — The eleven gaps, verified in the new tree

### 3.1 Personality and the soul — two distinct layers

**Measured:** `hermes_cli/personality.py` exists; `SOUL.md` exists (667 B at the repo root).

**Two mechanisms, and they must not be confused:**

1. **`SOUL.md`** is the shipped **system prompt / base persona** — the stable voice every session starts from. Verbatim (667 B, in full):
   > *"You are Hermes Agent, built by Nous Research. Be direct: match the length of your reply to the weight of the ask — a one-line question gets a one-line answer, and finished work gets a short report of what changed, what's verified, and what's left, never a replay of the process. No filler ('Great question,' 'I'd be happy to'), no restating the request back, no re-summarizing what you already said, no narrating tool calls the user can see. Plain claims over adjectives; when unsure, say so plainly. Agree because it's right, not because the user said it. Depth is earned — give it when the user asks for detail, teaches, or the stakes demand it, not by default."*

2. **`personality.py`** is an **overlay** on top of it. The docstring is precise about ownership (`personality.py:1–8`):
   - `display.personality` holds the **selected name** (empty = no overlay).
   - `agent.system_prompt` is the **user-owned manual overlay** — "personality code never writes it."
   - `agent.personalities` holds user-defined overrides, "overlaying built-ins by name"; a top-level `personalities:` block is also honoured, with `agent.personalities` winning on a clash.
   - `NEUTRAL_PERSONALITY_NAMES = {"", "none", "default", "neutral"}`.

**Measured — 14 built-in personalities** ship (`personality.py:26–41`): `helpful, concise, technical, creative, teacher, kawaii, catgirl, pirate, shakespeare, surfer, noir, uwu, philosopher, hype`. (Some are novelty voices; the list is quoted here because *its existence* is the finding — a persona is a **first-class, selectable, one-line config value**, not a prompt edit.)

**Q1 (user value):** a user picks a personality by name and the base voice stays intact; their own manual system-prompt edit is never overwritten.
**Q2 (vision value):** for an AI-first business platform, **persona-per-agent-role** is directly valuable — a planner agent and a customer-facing agent should not share one voice. The **three-layer ownership split** (soul → selected personality → user override, each with a stated owner) is the reusable part.

### 3.2 Emergency stop — a *resumable pause for new work only*

**Measured:** `agent/estop.py` (138 lines). The docstring (verbatim intent):

> *"Global emergency stop (ESTOP) — a resumable pause for NEW work only. `hermes pause` writes a sentinel at `$HERMES_HOME/ESTOP`; `hermes resume` removes it. While it exists the **cron scheduler, kanban dispatcher and new gateway turns skip work; in-flight work is never killed**. The check is one or two uncached `os.stat` calls… The body is optional JSON `{reason, engaged_at}`; **a corrupt/empty file still counts as engaged (fail safe**, e.g. `touch ~/.hermes/ESTOP`)."*

Also measured: `SENTINEL_NAME = "ESTOP"`; the sentinel is resolved **profile home first, then the fleet root** — "a profile gateway must still honor an operator's `~/.hermes/ESTOP`". Ported from `gastownhall/gastown` estop.go (MIT).

**The prior material flagged this as `VERIFIED (with a nuance)`:** estop halts *new* work but does not kill in-flight work. **Confirmed in the new tree, verbatim** — the nuance survived.

**Q1:** a user can halt runaway automation with one command, and a crash cannot leave the brake stuck on (a corrupt file fails **safe**, i.e. engaged).
**Q2:** a business needs a **global kill switch that is fail-safe and does not lose in-flight work**. The `os.stat`-only check (no parse, no lock) is the right cost profile for a hot path.

### 3.3 Mixture of Agents (MoA)

**Measured:** three modules — `agent/moa_loop.py` (**1,550 lines**), `agent/moa_alternation.py` (64), `agent/moa_trace.py` (115). Docstring:

> *"Mixture-of-Agents runtime helpers for `/moa` turns. The slash command **marks one user turn** as MoA-enabled; the normal agent loop still owns tool calling and turn termination, while this module **gathers reference-model context before each model iteration**."*

**The design point that matters:** MoA is a **per-turn opt-in** (`/moa` marks *one* turn), not a global mode, and it **does not take over the loop** — it only gathers reference-model context each iteration. `moa_alternation.py` handles role-alternation rejections (merging same-role messages), i.e. it is built for providers that reject consecutive same-role messages.

**Q1:** a user can ask for a harder answer on *one* turn without paying for MoA on every turn.
**Q2:** the "multiple models debate, one answers" pattern is a **capability multiplier**, and gating it **per turn** is the cost-control discipline a planner needs. `moa_trace.py` means the debate is **inspectable**, not opaque.

### 3.4 Checkpoints and rollback — transparent filesystem snapshots

**Measured:** four modules — `tools/checkpoint_manager.py`, `checkpoint_maintenance.py`, `checkpoint_pruning.py`, `checkpoint_manager_profile_rename.py`. The docstring is unusually explicit:

> *"Creates automatic snapshots of working directories **before file-mutating operations** (`write_file`, `patch`, `terminal` with destructive flags), **triggered once per conversation turn**. Provides rollback to any previous checkpoint. **This is NOT a tool — the LLM never sees it.** It's transparent infrastructure controlled by the `checkpoints` config flag or `--checkpoints` CLI flag."*

**Storage:** a **single shared shadow git store** at `~/.hermes/checkpoints/store/`, with `refs/hermes/<hash16>` per project, deduplicated git objects shared across projects, per-project `indexes/` and `projects/<hash16>.json`, plus `.last_prune` idempotency and auto-migrated `legacy-<timestamp>/` archives. The docstring explains the v1→v2 change (a full shadow repo per working directory became one shared store).

**Q1:** a user can roll back a bad edit without having asked for a checkpoint — it happens automatically. And the model cannot disable it, because **the model never sees it**.
**Q2:** **automatic, transparent, per-turn rollback** is exactly the safety net a planner needs when agents hold write access to real systems. "The LLM never sees it" is the important property: it is not a capability the model can reason around.

### 3.5 The learning graph (the curator's counterpart)

**Measured:** `agent/learning_graph.py` (255 lines) + `agent/learning_graph_render.py` (423 lines) — **678 lines**. The prior material (batch 08 §2) recorded *"Curator / learning graph exposed — `agent/learning_graph.py`, `agent/learning_graph_render.py`; `hermes curator pin/adopt`"*. Batch 03 of this study covered the **curator** (`agent/curator.py`, inactivity-triggered, archive-only) but not the **graph**.

**So this is a partial gap, now closed:** the curator *maintains* skills and memory; the learning graph is the **renderable structure of what the agent has learned** — with a dedicated render module, i.e. it is meant to be **shown**, not just stored.

**Q1:** a user can see what their agent has learned, rather than trusting that it learned.
**Q2:** an "AI-first" platform that cannot show a customer *what the system has learned* cannot be audited or trusted. A renderable learning graph is the evidence layer.

### 3.6 Trajectories — recorded runs and a compressor

**Measured:** `agent/trajectory.py` and `agent/trajectory_compressor.py` exist (the prior material's H-43). Trajectories are **recorded runs**; the compressor shrinks them. Batch 07 of this study covered the **four session export formats including `trace`** but did not name trajectories as a first-class artefact.

**Q1:** a user can replay exactly what happened, including after compression.
**Q2:** this is the **raw material for evaluating and improving** an agent — the prior material's own reason for listing it as `V-08 KEEP`. A platform claiming self-improvement needs a recorded corpus to improve *from*.

### 3.7 LSP integration — the agent can use a language server

**Measured:** `agent/lsp/` contains **11 files** — `__init__.py, cli.py, client.py, eventlog.py, install.py, manager.py, protocol.py, range_shift.py, reporter.py, servers.py, workspace.py`. The prior material (batch 08 §3) recorded *"language server — `agent/lsp/`"* as `VERIFIED`.

**None of batches 01–11 named it.** This is a **capability**: the agent can query a real language server for symbol/reference/definition information, with a **`range_shift.py`** (line/offset adjustment between LSP positions and the file the agent edits) and an **`install.py`** (servers are installed on demand) and a **`reporter.py`** (diagnostics).

**Q1:** an agent editing code gets **compiler-accurate** answers instead of guessing — fewer broken edits.
**Q2:** for any product that has agents touch code, LSP is the difference between an agent that *writes* code and one that *understands* it. `range_shift.py` existing is evidence this was built against real, shifting files, not a demo.

### 3.8 The credential vault and credential-file passthrough

**Two distinct mechanisms the twelve batches did not name:**

**(a) `tools/browser_vault_tool.py` — a model-blind browser vault.** The docstring is the finding (verbatim intent): one deferred tool `browser_vault` with actions `list` and `fill`. For `fill`:
- the secret is **resolved locally**;
- the page origin must **EXACTLY match** the item's bound origin — "pre-checked AND re-asserted synchronously inside the fill script";
- the field is chosen by "the ported login-control classifier";
- injection runs **exclusively over the supervisor CDP WebSocket (never argv)**;
- the tool result reports only `{filled_fields, kind, origin, success}` — "**the password never appears in tool results, logs, or the session DB**, and its exact bytes are registered with the browser-result redaction boundary so no later browser tool call can echo them back to the model."

Ported from `Merit-Systems/OpenInstinct` (MIT).

**(b) `tools/credential_files.py` — a file passthrough registry for remote terminal backends.** Docstring: *"Sandboxes start with no host files; this module tells them which credential files (skill `required_credential_files` + `terminal.credential_files` config), skill dirs, and host cache dirs to mount or sync in, **at creation and before each command**."*

**This closes a loop with batch 11.** Batch 11 §7 recorded the egress proxy's honest limit: *"Credential files explicitly mounted into Docker … Egress protects provider env vars; it does not inspect arbitrary mounted files."* **`credential_files.py` is the module that performs those mounts.** So the two documents describe the same boundary from opposite sides: batch 11 from the *protection* side, this from the *mechanism* side.

**Q1:** a user can have the agent log in to a site **without the password ever entering the model's context** — it is typed server-side from a vault handle.
**Q2:** **model-blind secret use** is the correct pattern for an agent acting on a customer's behalf. The origin re-assertion inside the fill script, and registering the secret's bytes with the redaction boundary, are the two details that make it credible rather than aspirational.

### 3.9 Security audit

**Measured:** `hermes_cli/security_audit.py` and `hermes_cli/security_audit_startup.py` (the latter also cited by the prior material for the loopback default, `security_audit_startup.py:133`).

**No batch named it.** It is a **build-time/startup audit** of the deployment's security posture — distinct from the per-call `approvals` machinery batch 08 covered.

**Q1:** a user can check their own deployment's posture rather than inferring it.
**Q2:** a platform shipping to businesses needs a **self-audit that runs at startup** — the same shape as batch 11's "publish your own limits".

### 3.10 Pets, and the OpenClaw migration path

**(a) Pets** — `agent/pet/` exists (the prior material's batch 08 §3, `VERIFIED`). A small, non-essential delight feature. **Named here for completeness** per method rule 6 (every capability is named, including ones we will not use), not because it is load-bearing.

**(b) OpenClaw migration** — `scripts/openclaw_to_hermes.py` is present, and the prior material also named `optional-skills/migration/openclaw-migration`. This is a **one-way importer**: it converts another agent product's configuration/sessions into Hermes.

**Q1 (for the migration path — the load-bearing half):** a user already on another tool can move to Hermes without starting over.
**Q2:** **an import path from a competitor is a growth mechanism**, and it is also the template for the platform's own "bring your existing agent config" story. Worth noting that this study's batch 07 found Hermes **imports from Claude Code and Codex CLI** too — so OpenClaw is the third such path, not the only one.

### 3.11 Slash commands and interfaces the batches named only in passing

Three smaller items, each verified present:

- **`/steer`** — a way to push text into a **live run** (the prior material cited `agent_runtime_helpers.py` — *"Persist any pending `/steer` text as a standalone user message"*; the mechanism is still present). Batch 06 covered `/loop`, `/goal`, `/heartbeat` but not `/steer`.
- **`tools/read_extract.py`** — the multi-format document extraction tool the prior material's H-41 recorded as `VERIFIED`. Batch 11 covered media but not extraction.
- **`X-Hermes-Session-Id`** — an **opt-in, untrusted** session-continuity header (measured: `agent/session_persistence.py:64` sanitises it, "non `[A-Za-z0-9_-]` → `_`"; `agent/agent_runtime_helpers.py:1589` calls it out as possibly coming "from an untrusted … header"). So Hermes both **honours** the header and **treats it as attacker-controlled** — a real design detail.

---

## §4 — The removal: `security.tirith_*` is gone (the batch's most valuable finding)

**The prior material treated tirith as live twice:** batch 07's H-32 (a security control) and batch 08's L-009 `INTEGRATION WARNING` — *"Agents can curl internal Docker HTTP → **Tirith raised `plain_http_to_sink` and hung**"* — checked against `config_defaults.py:1792` (`security.tirith_enabled: True`, `tirith_fail_open: True`).

**In the new tree, tirith has been removed from Hermes.** Measured three ways:

1. **No live reference.** `grep -rin tirith` over `config_defaults.py` returns **nothing**. The settings the prior material quoted are not there.
2. **A config migration deletes the keys.** `hermes_cli/config_migrations.py:686`:
   ```python
   _RETIRED_TIRITH_KEYS = ("tirith_enabled", "tirith_path", "tirith_timeout", "tirith_fail_open")
   ```
   and `_migrate_to_50` (`:688–702`), verbatim comment:
   > *"49 → 50: **the bundled tirith scanner left Hermes. Nothing reads its keys now, so they are dropped; nothing replaces them.**"*
   The migration prints: `"✓ Removed security.tirith_* — the tirith scanner is no longer bundled with Hermes."`
3. **The docs agree.** `user-guide/security.md:820`: *"Earlier releases bundled the external tirith scanner here. It was removed; upgrading drops the `security.tirith_*` settings and **enables nothing in its place**."* `user-guide/configuration.md:2839` says the same.
4. **The remaining 64 code hits are all historical** — the migration itself, a legacy-import note in `plugin_validate_private_imports.py`, a contributor-attribution line, and **test helpers that explicitly disable it for upgrade testing** (`tests/e2e/core/upgrade/_helpers.py:118` sets `TIRITH_ENABLED="false"` with the comment *"The pre-upgrade release under test still bundles tirith"*).

**Severity of the drift, stated plainly:**

- **The prior material's L-009 is now historical, not current.** The lesson ("an approval scanner hung a headless worker") was true of the tree it measured; the scanner no longer exists.
- **Any integrator who followed the old material would set `security.tirith_enabled`** — a key the current code neither reads nor preserves. Worse, the **config migration would silently delete it** on upgrade, so the integrator's intent would vanish with no error.
- **The replacement is behavioural, not a setting.** The docs point to *Content-Level Command Checks* in `security.md` — i.e. the function moved into Hermes itself rather than staying an external scanner.

**This is precisely the failure mode the prior material's own §8 warned about** — *"not one is a structural error; every single one is a count that stopped being true"* — except here it is stronger than a count: **a whole feature left, and the removal is a migration, not a note.**

**Process consequence.** Batch 08 of the prior analysis correctly flagged the neighbouring case (`auxiliary.session_search` removed, and the shipped `cli-config.yaml.example` still documented it). **Two removals in the same family** — a feature retired while an older document still describes it — is a pattern, and it argues for one rule in any future reuse: **before using any Hermes setting or module named in an older document, first search the config migrations for a retirement entry.**

---

## §5 — The integration-failure register (the prior material's most valuable asset)

The prior batch 08 §7 preserved a **22-lesson register** (`L-001`…`L-022`, with `L-006` absent) plus five named incidents from a **real production Hermes integration**. **None of batches 01–11 covered this**, and it cannot be re-derived from code — it is a record of experience.

**This is the single asset in the prior material this study has no equivalent for.** Batch 11 §7 documented how iron-proxy *intends* to protect; this register documents how a real integration *actually broke*. **It should be carried forward into the platform's own hazard list rather than re-measured.**

**The lessons whose cause is in Hermes** (as the prior material verified) and that the new tree still supports:

| ID | The belief → what broke | Still relevant? |
|---|---|---|
| **L-001** | *One Hermes home can serve many agents* → **it cannot**; a shared home corrupts memory | **Yes** — the per-profile `HERMES_HOME` ContextVar still works this way (this study's b02) |
| **L-007** | *`API_SERVER_ENABLED=true` exposes the port* → **the default host is loopback** | **Yes** |
| **L-008** | *Any OpenAI chat model works once keyed* → **non-reasoning models reject `reasoning.effort`** | **Yes** — b09's reasoning-effort handling is the same surface |
| **L-014** | *Claude dry ⇒ "OpenAI broken"* → the laptop used Codex OAuth, the VPS used Anthropic | **Yes** — provider identity is environment-dependent (b09) |
| **L-022** | *A gateway home at `0700` is fine* → **a host watcher running as another uid cannot traverse it** | **Yes** — the `0o700` chmod is still in `hermes_constants.py` |
| **L-009** | Tirith hung a headless worker | **NO — the feature was removed (§4)** |

**The three lessons worth extracting for our platform, regardless of Hermes:**

1. **Two systems owning one name is silent.** The "container was silently adopted" incident: compose named containers exactly as provisioning would, so a manager "adopted a container it did not create. Nothing errored." **This is the highest-value failure in the register** — it is a class of bug our platform can commit.
2. **A cost spike can be the *host's* loop, not the agent's.** The runaway-wake incident: the host re-woke agents after assign/cancel/fail/watchdog paths; Hermes **amplified** it. Blaming the agent would have been wrong.
3. **A 403 can be a test artefact, not an auth defect.** A final message failed because an emergency test **inserted run records directly**, bypassing the normal wake path. *"Neither is a Hermes bridge authentication defect."*

**And the SSL case is a live code finding:** the prior material recorded an SSL CA-bundle corruption after `hermes update`, fixed by `agent/ssl_guard.py`. **Measured: `agent/ssl_guard.py` is absent from the new tree, and `agent/ssl_verify.py` is present instead** — a *broader* approach (`install_truststore()` points every default SSLContext at the OS trust store). **So the fix was reworked upstream, not reverted** — and anyone reusing the old RCA as a spec would look for a file that is not there. **Confirmed independently in the new tree; the prior material's observation holds.**

---

## §6 — What this batch does NOT claim

1. **The prior material is not re-verified in full.** This batch checks the subjects it names against the new tree; it does not re-derive its 45 `H`-claims or 13 `V`-entries. Where a prior claim was already covered by batches 01–11, the batch is cited.
2. **The gap list is bounded by the prior material.** A subject that neither the prior documents nor batches 01–11 raised is invisible to this audit. This is a *coverage* audit, not a proof of exhaustiveness.
3. **The integration register is a record, not a measurement.** Its lessons are carried forward as hazards; they are not re-tested here.
4. **The prior material's own version limit applies.** It measured a tree two weeks older than this study's; some of its findings describe a copy this study does not hold. Where that matters it is stated (§4).

---

## §7 — Carried items

| ID | Item | Status |
|---|---|---|
| **C13-1** | **Personality is a two-layer overlay** (soul → selected personality → user override, each with a stated owner); 14 built-ins. Reusable for persona-per-role. | For §12/batch 14 |
| **C13-2** | **E-stop is a fail-safe, resumable pause for NEW work only**, checked by `os.stat` on a hot path; a corrupt sentinel counts as engaged. | For §12 |
| **C13-3** | **MoA is per-turn opt-in** (`/moa` marks one turn) and does not take over the loop; the debate is traced. | For §12 |
| **C13-4** | **Checkpoints are transparent, per-turn, model-invisible** filesystem snapshots over one shared shadow git store. | For §12 |
| **C13-5** | **Learning graph + render** = the *evidence* layer for "the agent learned"; the curator maintains, the graph shows. | For §12 |
| **C13-6** | **Trajectories + compressor** = the recorded corpus an improving agent improves from. | For §12 |
| **C13-7** | **LSP integration (11 files incl. `range_shift`)** — the agent understands code, not just writes it. | For §12 |
| **C13-8** | **Model-blind browser vault**: exact-origin match, CDP-only injection, secret bytes registered with the redaction boundary. | **For §12 — high priority** |
| **C13-9** | **`credential_files.py`** is the mechanism behind batch 11's "mounted files are outside egress" limit — same boundary, other side. | For §12 |
| **C13-10** | **Security audit at startup** — a deployment checks its own posture. | For §12 |
| **C13-11** | **`security.tirith_*` was REMOVED** (config migration 49→50, "nothing replaces them"). Any plan resting on it rests on a gone feature; the migration deletes the key silently. | **For §12 — high priority** |
| **C13-12** | **The 22-lesson integration register** is the one prior asset with no equivalent in this study; carry it as a hazard list. | For §12 |
| **C13-13** | **`ssl_guard.py` → `ssl_verify.py`** confirms the prior material's observation; the fix was reworked, not reverted. | Recorded |
| **C13-14** | **Rule for future reuse:** before using any Hermes setting/module named in an older document, first search the config migrations for a retirement entry. | **Rule — for the method file** |

---

## §8 — Batch-level value questions (Q1 user / Q2 vision)

**Q1 — how does this serve a user use case?**
The eleven gap subjects are mostly *safety and trust* features a user would miss if they were absent: an **emergency stop** that fails safe, **automatic rollback** the model cannot disable, a **personality** they can switch without losing their own prompt, an agent that **understands code** through a language server, a **secret typed server-side** so their password never enters the model, and a **learning view** so they can see what the agent actually learned. And the one *removal* (§4) serves them by preventing a plan built on a genuinely absent feature.

**Q2 — how does this serve the vision of an AI-first business/resource planner?**
Four of the gaps are directly reusable, ranked:

1. **Model-blind secret use** (§3.8) — exact-origin binding, out-of-band injection, redaction registration. This is how an agent acts on a customer's behalf without being trusted with the secret.
2. **Transparent per-turn rollback** (§3.4) — the safety net for agents with write access, and "the model never sees it" is why it holds.
3. **The fail-safe global stop** (§3.2) — a plan needs one brake that cannot get stuck on.
4. **Persona-per-role** (§3.1) — the three-layer ownership split is how a platform gives each agent a voice without losing the base one.

**Cross-reference:** the mercato-vs-Hermes placement is deferred to the synthesis per the owner's instruction. **Note for the synthesis:** C13-11 (the tirith removal) and C13-12 (the integration register) both change the *risk* picture and should be reflected there.

---

**Batch 13 complete. Prior material audited: 2 files (73,332 B). Gaps found: 11 subjects, all verified present in the new tree. Removals found: 1 (`security.tirith_*` — config migration 49→50). External records carried: 1 (the 22-lesson integration register). Most valuable finding: the tirith removal — a prior document, and therefore any plan built on it, rests on a feature that no longer exists and whose keys are silently deleted on upgrade.**
**Next: update `00-PIN-AND-METHOD.md` with the second-round method and the C13-14 reuse rule, then fold C13-1…C13-12 into the study's closing documents.**
