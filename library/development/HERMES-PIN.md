# The Hermes pin — Phase 0 of the Hermes track

**Status: Phase 0 is DONE (2026-10-12).** This document *is* the pin. It records
the source digest, the compatibility harness that checks it, the exact symbols
the platform will call, and the licence position — the four things Phase 0's exit
gate names. It is written for a reader who has never seen the Hermes source.

**Read it with:** [`ARCHITECTURE-hermes-integration.md`](ARCHITECTURE-hermes-integration.md)
§9 (the adoption order — this document is its Phase 0 row) and
[`ARCHITECTURE-hermes-service-map.md`](ARCHITECTURE-hermes-service-map.md) §7
(the same order, stated once).

---

## 1. Why a pin is needed at all — and what it pins

The Hermes runtime (Nous Research's `hermes-agent`, the Python agent engine the
platform will run **behind the door**) sits in this repository as *gitignored
study material*, not as tracked code. There is:

- **no `.git`** — it is an extract, not a clone;
- **no version string** — its `pyproject.toml` declares `version = "0.0.0"`.

So nothing on the disk says *which* Hermes a given copy is. The architecture
names this exactly (`ARCHITECTURE-hermes-integration.md` §9, Phase 0):
*"Create the pin that does not exist (a recorded source digest and a
compatibility harness)."* **This document is that pin.**

### 1.1 There are TWO Hermes copies, and they are not the same

Measured 2026-10-12. Both are gitignored (`.gitignore` lines 55–66 name both):

| Copy | Path | Files | `pyproject.toml` md5 | mtime |
|---|---|---:|---|---|
| **The pinned snapshot** | `library/ai/hermes-agent-main/` | 17,201 | `a4ce871d9d03fd3706516e15bff637bb` | 2026-10-03 |
| The root copy | `hermes-agent-main/` | 17,367 | `594dea190e4176caa117db2349071e6c` | 2026-10-05 |

They differ in content (different `pyproject.toml`, different `.env.example`:
26,448 vs 27,687 bytes) and in file count. **This is the "source-versus-image
divergence" the architecture's §10 risk table warns about**, found in our own
tree: two extracts of one product, at different revisions, with nothing saying
which is which.

**The pin names ONE of them — `library/ai/hermes-agent-main/` — as *the* Hermes
we read and will run.** The other copy is left where it is (deleting another
project's material is not this programme's call) but it is **not** the pinned
one. A new reader must not have to guess.

### 1.2 Where the source revision comes from — it *was* recoverable

The architecture says the source revision *"cannot be recovered; it must be
created."* **That is now sharper than it needs to be, and this pin corrects it
(rule 13).** The pinned snapshot is the extracted contents of
`library/ai/hermes-agent-main.zip`, and **that zip carries the upstream commit
in its own archive comment**:

```
eb044063235fbf7a4e68dd2970ade05dbe637ff3
```

Verified 2026-10-12: the zip's member hashes are byte-identical to the pinned
snapshot (`pyproject.toml` md5 `a4ce871d…` and `AGENTS.md` md5 `0ef02d94…`
match when read through `unzip -p`; file counts 17,201 = 17,201).

So the pin carries **both** the provenance (a real upstream revision) and the
proof (a content digest). What genuinely cannot be recovered is the *state of the
upstream repository around that commit* — the zip is a snapshot, not a clone —
but the revision **is** recorded, which is what "pin the source" needs.

### 1.3 The digest, and how to reproduce it by hand

One digest over the whole snapshot, defined so anyone can recompute it without
this repository's tooling:

1. For every file under `library/ai/hermes-agent-main/`, in sorted relative-path
   order, form the line `<md5 of the file>  <relative path with / separators>`.
2. Take the MD5 of `"\n".join(lines) + "\n"`.

**The pinned digest — this is the value the harness enforces:**

```
53b320bb83a155225ab4b36b3ad0dace
```

Recorded from a run of the harness on 2026-10-12 (17,201 files).

---

## 2. The compatibility harness — and what it does and does not do

The harness is [`library/.hermes_pin.py`](../.hermes_pin.py). It re-computes the
digest above and compares it to the recorded value, exiting non-zero on any
difference. Run it:

```
"C:\Users\Ramzi\.workbuddy-ai\binaries\python\versions\3.13.12\python.exe" ^
  "C:\Users\Ramzi\Downloads\companai\library\.hermes_pin.py" --check
```

Flags: `--check` (verify, the default), `--print` (compute and show, compare
nothing), `--quiet` (print only the digest). A clean run prints:

```
PIN HOLDS
  revision : eb044063235fbf7a4e68dd2970ade05dbe637ff3
  files    : 17201
  digest   : 53b320bb83a155225ab4b36b3ad0dace
```

**Proven (2026-10-12).** Determinism: two consecutive runs print the same digest.
Sensitivity (RED-then-GREEN on the harness itself): the file
`library/ai/hermes-agent-main/.python-version` originally has md5
`9e0dac68cad89737967a561061812505`; appending the single byte `x` (i.e.
`printf 'x' >> …/.python-version`, no newline) changed the digest to
`31964c1390fa43a7b4e6525c8babf450`; restoring the file to its original md5
(`9e0dac68…`, recreated with `printf '3.14\n' > …/.python-version`) returned it
to `53b320bb…` and `--check` printed PIN HOLDS again. So the digest tracks
content exactly, and a changed snapshot cannot pass silently. (The exact number
depends on *which* byte is appended — `X` yields a different digest than `x` —
so the byte is stated here; the point is only that any change moves the digest
and restoring returns it.)

### 2.1 What this harness is *not*

**It is not the version-compatibility harness.** The architecture defers that one
to `N-11`, trigger *"the Hermes adapter is built"* (`ARCHITECTURE-hermes-integration.md`
§11.2; `SPEC-business-model-kernel.md` §8 row 38) — *"a harness for a boundary
that does not exist yet is still a guess."* That harness tests that **our
adapter** speaks Hermes' protocol across a version change; it has nothing to test
yet, because no adapter exists. This Phase 0 harness tests a different thing:
that **the source on disk is the source we pinned**. The two are named
separately on purpose so neither is mistaken for the other.

---

## 3. The map — the exact symbols the platform will call

Phase 0's third deliverable: *"map the exact symbols to be called."* The
architecture decided the shape (`§11.1`): ours is a **Node** host, so the
**in-process Python import is not on the menu** (`import run_agent.AIAgent`
requires the host to be Python). Hermes ships three protocols for external
programs to drive it; each is named below, with the file that defines it,
verified present in the pinned snapshot.

| Protocol | Transport | Entry file (pinned snapshot) | Symbols |
|---|---|---|---|
| **TUI gateway JSON-RPC** | JSON-RPC over stdio, or WebSocket | `tui_gateway/server.py` (3,672 lines) · `tui_gateway/ws.py` (477 lines) | `prompt.submit` · `session.create/list/activate/close/interrupt/history/branch/steer/resume/compress/status/usage` · `command.dispatch/resolve` · `client.capabilities` · `gateway.capabilities` · `reload.mcp/env` · `process.stop` · `subagent.interrupt/steer` — **and the events** `message.delta`, `message.complete`, `tool.start/generating/complete`, `gateway.ready`, `request.cancel` |
| **API server (OpenAI-compatible)** | HTTP + Server-Sent Events | `gateway/platforms/api_server.py` (4,646 lines) | `POST /v1/chat/completions` · `POST /v1/responses` · `POST /v1/runs` → `run_id` (202) · `GET /v1/runs/{id}` · `GET /v1/runs/{id}/events` (SSE) · `POST /v1/runs/{id}/approval` · `POST /v1/runs/{id}/steer` · `POST /v1/runs/{id}/stop` · `GET /v1/capabilities` · `GET /v1/models` |
| **ACP** | JSON-RPC over stdio | `acp_adapter/` | Agent Client Protocol — session creation, prompt submission, streaming chunks, tool-call events, permission requests, fork, cancel (IDE clients) |

The map is read from Hermes' own `website/docs/developer-guide/programmatic-integration.md`
in the pinned snapshot, not from a report about it.

### 3.1 Which one the platform will use — and why it is not decided here

The architecture's §11.1 already reasoned this out: for *"a custom web host that
wants every feature"*, Hermes' own guide names the **TUI gateway JSON-RPC**. The
**API server** is the OpenAI-compatible surface; the **ACP** protocol is for IDEs.
The choice must land **when the adapter is built** (N-8 / Phase 2), against the
eight operations our port already declares — the adapter must implement
`describeCapabilities`, `startRun`, `streamRun`, `cancelRun`, `steerRun`,
`resumeConversation`, `resolveToolCall`, `completeRun`
(`workspace/starting-kit/…/lib/ai-runtime-port.ts`). **Naming the symbols is
Phase 0's job; choosing the wire protocol is not** — it is decided against a real
adapter, not in the abstract. Two facts are already known and are recorded here
so they are not re-discovered:

- The **API server's** `/v1/runs/{id}/steer` and `/v1/runs/{id}/approval` map
  cleanly onto our port's `steerRun` and to an approval step — matching the
  architecture's note that the *one extra request on the interactive path is an
  approval*, not a per-token round trip (§11.2).
- The **TUI gateway's** method catalog names `session.steer`, `session.interrupt`,
  `session.resume`, `session.history`, `subagent.steer` — a near one-to-one match
  with the port, including `steerRun`, which **both engines behind the door
  today openly lack** (`ARCHITECTURE-hermes-integration.md`; `port` box notes in
  `platform_points.md`). That is the first time a candidate engine would make the
  full eight real — recorded here as a fact for the adapter phase, not as a
  choice.

---

## 4. The licence position — including optional components

Phase 0's fourth exit-gate item: *"the licence position is stated, including
optional components."* Measured 2026-10-12 from the pinned snapshot.

### 4.1 The runtime itself

| Component | Licence | Evidence (pinned snapshot) |
|---|---|---|
| **Hermes `hermes-agent`** (the whole runtime) | **MIT** | `LICENSE` — *"Copyright (c) 2025 Nous Research"*; `pyproject.toml` line 17 `license = "MIT"` |
| The Node side (`package.json`) | **MIT** | `package.json` `"license": "MIT"`; deps are only `js-yaml` and `semver` |

**MIT is permissive.** It permits use, modification, sublicensing and
distribution, inside a commercial product, with one obligation: keep the
copyright notice and the licence text. There is **no copyleft** on the runtime
itself, so it does not reach our code.

### 4.2 Bundled components that carry their own licence

18 `LICENSE` files sit inside the pinned snapshot. The runtime's own skill and
plugin bundles carry their own terms — this is the "optional components" the gate
names, and it is where the real reading is:

| Location | Licence |
|---|---|
| `skills/productivity/{docx,pdf,powerpoint,xlsx}` | MIT (Nous Research) |
| `plugins/hermes-achievements` | MIT |
| `plugins/security-guidance` | **Apache-2.0** (permissive; also fine) |
| `skills/creative/humanizer` | MIT (third party) |
| `optional-skills/creative/{ai-presenter-video,dream-loop,mono-color,system-atlas}` | MIT (third parties) |
| `optional-skills/software-development/{ast-grep,pr-lens}` | MIT (third parties) |
| `optional-skills/web-development/scrollcraft` | MIT (third party) |
| `optional-skills/creative/{auteur,ip-as-logo}` | MIT, **ported from upstream and reproduced verbatim** with the upstream commit recorded |
| `apps/desktop/src/plugins/hermes-bots` | MIT |

**Every bundled component found is MIT or Apache-2.0 — both permissive, no
copyleft.** No GPL/AGPL code is *bundled* in the runtime.

### 4.3 Where copyleft appears — and why it does not infect us

Copyleft licences appear **only as references to separate upstream tools that
Hermes *invokes*, never as bundled code** — and Hermes' own documentation is
explicit that this is deliberate:

- `optional-skills/mlops/obliteratus/SKILL.md`: *"**License warning:** OBLITERATUS
  is AGPL-3.0. **NEVER import it as a Python library.** Always invoke via CLI
  (`obliteratus` command) or subprocess. **This keeps Hermes Agent's MIT license
  clean.**"*
- `optional-skills/research/darwinian-evolver/SKILL.md`: *"the upstream tool is
  AGPL-3.0. The skill ONLY ever invokes it … Never `from darwinian_evolver import
  …` inside Hermes core."*
- `optional-skills/security/godmode`, `web-pentest`, `health/neuroskill-bci`,
  `health/fitness-nutrition`: same pattern — the GPL/AGPL dependency is invoked
  as a **separate program**, never linked into the runtime.
- One memory provider (`website/docs/user-guide/features/memory-providers.md`)
  is described as AGPL-3.0 — it is a **separate self-hosted service**, not
  bundled code.

**The position, stated plainly:** Hermes is MIT. Its bundled optional components
are MIT or Apache-2.0. The AGPL/GPL tools it *can* drive are invoked as separate
processes, which — per Hermes' own stated rule and the standard reading — does
not make the runtime a derivative work. **Two obligations follow, and neither is
a blocker:**

1. **Keep the notices.** Distributing Hermes means shipping its `LICENSE` and the
   per-component `LICENSE` files. That is a packaging step, recorded here so it
   is not missed.
2. **Keep the boundary if we ever touch those skills.** If we enable an
   AGPL-invoking optional skill, it must keep invoking the tool as a separate
   process — never import it. Hermes already enforces this by its own
   documentation; we simply must not undo it.

**Risks — named, with the control for each:**

| Risk | Control |
|---|---|
| A future Hermes bump bundles an AGPL component as code | The pin's digest changes on any bump (this document + the harness fail), forcing a re-read of the licence position before the change lands |
| One of our own tools links an AGPL library into the runtime | The platform's tools run in **our** process, behind the door, not inside Hermes' Python — the boundary is already structural (`§4.2` of the architecture) |
| The licence files are dropped when packaging | Recorded above as obligation 1; the per-component files are inside the pinned snapshot and travel with it |

**`V-09` (licensing) is the deferred item this closes.** It is one of the 7
`V`-HOLDs (`BACKLOG.md`; `ARCHITECTURE-hermes-service-map.md` §4.4(e)), deferred
with the trigger *"the licence position is Phase 0's exit gate."* **The gate is
now passed**: the position is stated, including optional components.

---

## 5. What Phase 0 leaves open — deliberately

Phase 0's exit gate is met: a digest is recorded, the harness runs, the licence
position is stated, and the symbols are mapped. What it does **not** do, and why:

- **Choose the wire protocol** — decided when the adapter is built (Phase 2 /
  `N-8`), against the eight port operations (§3.1).
- **Write the version-compatibility harness** — deferred to `N-11`, trigger
  *"the adapter exists"*; named separately in §2.1 so it is not confused with
  this pin.
- **Delete OpenCode** — `R28-6`; trigger *"Hermes is wired behind the door"*
  (registered `CC-72`). Phase 0 does not change that.
- **Benchmark anything** — no performance claim was measured, here or before
  (`ARCHITECTURE-hermes-integration.md` §11.2). Phase 3's exit gate is the first
  place a number is owed.

**What moves in the scoreboard:** the two `Phase 0` boxes in
`platform_points.md` §D — *"Pin the Hermes source digest + a compatibility
harness"* and *"State the licence position, including optional components"* —
both become tickable, because both halves are now measured and recorded.

---

## 6. How this was verified (rule 0)

Every claim above is from a command and its output, run 2026-10-12, against the
pinned snapshot — not from a report about it.

- **Two copies exist and differ:** `md5sum` of `pyproject.toml` and
  `.env.example` in both trees; `wc -c` on both; `find … | wc -l` → 17,201 vs
  17,367; `stat -c %y` mtimes.
- **The pinned snapshot is the zip:** `unzip -p … | md5sum` matched the on-disk
  file for `pyproject.toml` and `AGENTS.md`; file counts 17,201 = 17,201.
- **The revision:** `unzip -z library/ai/hermes-agent-main.zip` → the comment
  `eb044063235fbf7a4e68dd2970ade05dbe637ff3`.
- **The digest and the harness:** `.hermes_pin.py --print` /
  `--check`; two-run determinism; the append-a-byte RED and the md5-verified
  restore GREEN.
- **The symbols:** each entry file's presence and line count in the pinned
  snapshot; the method/endpoint catalog read from Hermes' own
  `programmatic-integration.md`; the port's eight operations read from
  `ai-runtime-port.ts`.
- **The licence position:** every `LICENSE*` file in the tree read; the
  `pyproject.toml` and `package.json` licence fields; the AGPL/GPL references
  read in their own files, in context.
