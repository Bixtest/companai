# Batch 00 — The pin, the method, and what this study is

**Folder:** `library/hermes-forensics/` · **Status:** OPEN — begun 2026-10-15
**This is a clean forensic study.** It reads ONE source tree, measures it, and verifies every
load-bearing claim against the source code. Nothing from any earlier Hermes analysis is reused,
referenced, or assumed. Where this study reaches a conclusion that contradicts older material, the
older material is ignored by instruction, not silently patched.

---

## 1. THE PIN — task zero, answered by measurement

**The source of this study is:**
`C:/Users/Ramzi/Downloads/companai/hermes-agent-main/hermes-agent-main`

| Fact | Value | How measured |
|---|---|---|
| Origin | `https://github.com/NousResearch/hermes-agent` (`main`) | the owner's instruction, 2026-10-15 |
| Extracted | 2026-10-15, 09:57 (all files share this mtime) | `ls -la` |
| `.git` present? | **NO** — this is an extract, not a clone | `ls -d .git` → absent |
| Total files | **19,728** | `find . -type f \| wc -l` |
| `pyproject.toml` md5 | **`f57f729d4b251547a5a9e2565ce1e726`** | `md5sum` |
| Declared version | `0.0.0` (the upstream default; carries no identity) | `pyproject.toml` |
| Product | **Hermes Agent** by Nous Research; licence **MIT** | `pyproject.toml`, `README.md` |
| Python support | `>=3.11,<3.15` | `pyproject.toml` |

### 1.1 Why the pin needed re-taking (rule 13 — a premise changed)

The repository's existing pin record (`library/development/HERMES-PIN.md`) names a **different** copy:
the repository-root `hermes-agent-main/`, 18,248 files, `pyproject.toml` md5 `11d88a68…`. **That copy
no longer exists as a copy** — the owner replaced it. Measured today:

| | Old pin's target | **This study's source** |
|---|---|---|
| Path | `hermes-agent-main/` (root) | `hermes-agent-main/hermes-agent-main/` |
| Files | 18,248 | **19,728** |
| `pyproject.toml` md5 | `11d88a68…` | **`f57f729d…`** |
| Status | **gone** (the root folder now contains only this nested copy) | present |

The two hashes differ and the new tree holds **1,480 more files**. So this is not the same snapshot under
a new name — it is a **newer extract of the same product**, and the pin must name it explicitly. This
document is that pin. **Any figure in this study is a figure about THIS tree and no other.**

#### 1.1.1 UPDATE (2026-10-16) — the path changed, and the old copy is NOT gone (rule 13)

Two facts in the table above were measured again on 2026-10-16 and corrected:

- **The path.** This study measured the tree at `hermes-agent-main/hermes-agent-main/` — the extract had
  landed one level too deep. The worker's `entrypoint.py` sets `PYTHONPATH=/hermes-src` and execs
  `python3 /opt/hermes/ws_entry.py`, which does `from tui_gateway import entry`; that import **fails** when
  the package sits one level down (measured both ways in a one-off container:
  `ModuleNotFoundError: No module named 'tui_gateway'` nested, `IMPORT OK` flattened). So the tree was
  **flattened in place** on 2026-10-16 and the same 19,728 files now sit at the repository-root
  `hermes-agent-main/`. **The content is unchanged; only the depth is.** The whole-tree digest taken after
  the flatten is `07ee857bdab59a875317035d8aaad4d6` (the nested form digested to `84fb84bf…`).
- **The old copy is NOT gone.** The table's "Status: **gone**" was under-scoped. The 2026-10-12 pin was
  **renamed aside, not deleted** — it survives as `hermes-agent-main-newer/` (18,248 files, `pyproject.toml`
  md5 `11d88a68…`, revision `3569e846…`). The repository therefore holds **four** Hermes extracts, not
  three, and the pinned one is `hermes-agent-main/`.

Everything else in this study is unaffected: it measured the 19,728-file tree and still does.

### 1.2 The honest limit on "which commit is this?"

There is **no `.git`**, so the exact upstream commit cannot be read from the tree, and `version = "0.0.0"`
carries no identity. **The md5 of `pyproject.toml` plus the file count plus the extraction date is the
whole identity we can assert.** A reader wanting to reproduce this study must match those three numbers.
This is stated, not glossed: **any claim here about "the latest Hermes" is a claim about this extract,
dated 2026-10-15.**

---

## 2. What the tree contains (measured)

### 2.1 Documentation

| Folder under `website/docs/` | Files | Bytes |
|---|---:|---:|
| `user-guide/` | 336 | 5,692,748 |
| `developer-guide/` | 61 | 1,290,691 |
| `guides/` | 36 | 390,910 |
| `reference/` | 15 | 525,371 |
| `getting-started/` | 8 | 163,353 |
| `integrations/` | 4 | 129,028 |
| **Total `.md`/`.mdx`** | **455** | **8.9 MB** |

`user-guide/` holds five subfolders: `features/`, `messaging/`, `skills/`, `secrets/`, `egress/`.

### 2.2 Source code (Python)

| Directory | Files | Lines |
|---|---:|---:|
| `hermes_cli/` | 731 | 285,370 |
| `agent/` | 362 | 139,601 |
| `tools/` | 353 | 125,785 |
| `gateway/` | 307 | 121,603 |
| `plugins/` | 225 | 75,879 |
| `tui_gateway/` | 116 | 45,456 |
| `cron/` | 45 | 19,128 |
| `skills/` | 50 | 11,590 |
| `acp_adapter/` | 19 | 5,846 |
| `hermes_platform/` | 15 | 2,049 |
| `providers/` | 2 | 1,154 |
| **Total (these dirs)** | **1,819** | **698,487** |

Non-Python top-level trees also present: `web/`, `website/`, `apps/` (desktop), `native/`, `ui-tui/`,
`tests/`, `tests-js/`, `evals/`, `optional-skills/`, `optional-mcps/`, `plugin-catalog/`, `docker/`,
`nix/`, `scripts/`, `pm/` (its package manager), `locales/`, `contributors/`, `assets/`.

---

## 3. The method (how every batch is produced)

**This is forensics, so the discipline is fixed and stated up front:**

1. **Docs are claims; code is the authority.** Every load-bearing statement a doc makes is checked against
   the Python source. Where they disagree, **the code wins and the disagreement is recorded** as a finding.
2. **Every number is measured at the time of writing**, never carried from memory or from an older
   document. File counts, line counts and hashes are produced by a command and quoted with their result.
3. **Claims carry their evidence**: a batch line that rests on code cites the file and line it was read at.
4. **Two value questions per capability**, per the owner's instruction:
   - **Q1 · USER VALUE** — *how does this serve a real use case for a person using the platform?*
   - **Q2 · VISION VALUE** — *how does this serve the vision of an AI-first business & resources planner,
     now and long-run, including versatility and integratability?*
5. **No comparison to our own platform inside the batches.** Understanding first; comparison is the
   synthesis's (Batch 12) job alone.
6. **Every capability is named, including ones we will not use.** Nothing is silently dropped.
7. **Findings are additive and never overwrite history**: a later batch that changes an earlier batch's
   line says so explicitly rather than editing it away.
8. **Plain words** — every capability gets a one-sentence plain gloss before any detail.

### 3.1 THE SECOND ROUND — added 2026-10-15, at the owner's instruction

The owner asked for a **second pass of the same task**: go back through the **prior** Hermes analysis in
`library/analysis/findings/`, find anything this study missed, check whether it still works **in the new
tree**, and fold what survives into these documents. That pass is **Batch 13**, and it changes the method
in exactly two ways:

**Rule 9 — the second-round rule (prior analysis is a source of hypotheses, code is the authority).**
An older document is never evidence that a thing is true **now**. It is evidence that someone once believed
it and had a reason to. So the second round processes an older claim in four steps, and stops at the first
honest answer:

1. **Read the claim** and say plainly what it asserts.
2. **Search the new tree for the mechanism it names** — the module, the key, the command, the file.
3. **Verify the mechanism still does what the claim says**, at a cited `file:line` (rule 3).
4. If the mechanism is **absent**, do not conclude "the claim is stale and move on". Run rule 10, below.

A prior claim may be recorded as one of four outcomes only: **STILL TRUE** (mechanism present and behaving) ·
**CHANGED** (mechanism present, behaviour differs — record the difference) · **REMOVED** (mechanism gone;
record how it went and what replaced it, if anything) · **NEVER TRUE HERE** (the claim was about a different
tree, e.g. the earlier 18,248-file extract, and does not apply to this pin).

**Rule 10 — the retirement rule (C13-14).** Before reusing **any** setting, key, flag or feature named in
an older document, **search the configuration migrations for a retirement entry.** Hermes carries its
config forward through numbered migrations (`hermes_cli/config_migrations.py`), and a retired feature is
often not merely unread — its keys are **actively dropped on upgrade**, so a plan built on it fails
silently rather than loudly. This rule exists because the second round found exactly that: `security.tirith_*`
was treated as live — and even blamed for a production incident — in the older material, while the new tree
retires those keys in migration 49→50 and nothing reads them. **A removal is a finding; a silent removal is
the most valuable kind of finding, because nothing points at it.**

**Rule 11 — additive across rounds, like rule 7 within a round.** Batch 13 does not rewrite Batches 01–12.
It records what the second round added, changed or removed, and **names the batch each correction touches**,
so a reader can trace both directions.

---

## 4. The batch plan (each documented as it is completed)

| # | Batch | Primary docs | Code to verify against |
|---|---|---|---|
| **00** | **This file** — pin and method | — | — |
| **01** | The agent loop + conversation model | `developer-guide/agent-loop.md`, `user-guide/features/tools.md`, `reference/toolsets-reference.md`, `reference/tools-reference.md`, `user-guide/features/overview.md` | `agent/conversation_loop.py`, `agent/tool_executor.py`, `agent/agent_init.py`, `agent/iteration_budget.py`, `agent/agent_runtime_helpers.py`, `agent/context_compressor.py` |
| **02** | Bots, profiles and group chats | `user-guide/bot-mode.md`, `profiles.md`, `multi-profile-gateways.md`, `profile-distributions.md` | `agent/`, `gateway/` profile code |
| **03** | Skills — the learning loop | `features/skills.md`, `developer-guide/creating-skills.md`, `reference/skills-catalog.md`, `user-guide/skills/*` | `tools/` skill tools, `skills/` |
| **04** | Memory and context | `features/memory.md`, `memory-providers.md`, `context-files.md`, `context-references.md`, `developer-guide/context-compression-and-caching.md` | `agent/context_compressor.py`, memory modules |
| **05** | Tools, MCP and the gateway | `features/mcp.md`, `tool-gateway.md`, `tool-search.md`, `developer-guide/adding-tools.md`, `reference/mcp-config-reference.md` | `tools/`, `gateway/` |
| **06** | Scheduling, delegation and the board | `features/cron.md`, `delegation.md`, `kanban*.md`, `loops.md`, `goals.md`, `heartbeat.md` | `cron/`, delegation + kanban tool code |
| **07** | Sessions, dashboard and settings surface | `user-guide/sessions.md`, `features/web-dashboard.md`, `desktop.md`, `reference/cli-commands.md`, `slash-commands.md` | `web/`, dashboard backend |
| **08** | Security, approvals, secrets, sandboxing | `user-guide/security.md`, `secrets/*`, `egress/*`, `developer-guide/gateway-internals.md` | approval/secrets/sandbox code |
| **09** | Models and providers | `user-guide/configuring-models.md`, `local-models.md`, `integrations/providers.md`, `features/provider-routing.md`, `fallback-providers.md`, `credential-pools.md` | `providers/`, `agent/agent_init.py`, `auxiliary_client` |
| **10** | Code execution, plugins and extensibility | `features/code-execution.md`, `plugins.md`, `extending-the-dashboard.md` | `tools/` code-exec, `plugins/` |
| **11** | Channels, voice and media | `user-guide/messaging/*`, `features/voice-mode.md`, `tts.md`, `vision.md`, `image-generation.md`, `browser.md` | `gateway/platforms/`, media tool code |
| **12** | **The synthesis** | all of the above | — |
| **13** | **Prior-coverage audit (the second round)** | `library/analysis/findings/07-hermes-capability-map.md`, `08-hermes-fact-check.md` | the whole new tree — re-verified, never assumed |

**Each batch document carries:** (a) what was read and its measured size; (b) the capability table with
**Q1 · Q2 · Phase**; (c) the code verification, with file:line evidence, and any **doc-vs-code
divergence** found; (d) items carried forward.

**Batch 13 differs by design** — it is an **audit**, not a fresh survey. It carries: (a) the prior sources
and their measured sizes, plus the version gap between them and this pin; (b) an **N-row coverage table**
(gap subject → which prior file raised it → verified in the new tree, `file:line` → outcome per rule 9);
(c) any **REMOVED** items, proved four ways (no live reference; the migration that retires it; the docs'
own removal notes; the remaining hits being historical); (d) any **external records** the study cannot
re-derive, carried explicitly as hazards; (e) the C13-n consolidated findings; (f) Q1/Q2 for the audit
itself.

---

## 5. Ground rules restated as a checklist the reader can hold this study to

- Is the claim measured, or remembered? → must be measured.
- Does the line rest on a doc, or on code? → code where it matters.
- If doc and code disagree, is the disagreement recorded? → must be.
- Is every capability named, including the ones we will not use? → must be.
- Are the two value questions answered in the owner's words? → yes, per capability.
- Is there any comparison to our own platform in a batch (`01`–`11`)? → must be none; that is Batch 12.
- *(second round)* Is a prior claim re-verified in the **new** tree, or only quoted? → must be re-verified.
- *(second round)* Before reusing an older setting, was the config migrations file searched for a
  retirement entry (rule 10)? → must be.

---

*Batch 00 of 13. Begun 2026-10-15. §3.1 (the second round) added 2026-10-15. Next: `01-agent-loop-and-conversation.md`.*
