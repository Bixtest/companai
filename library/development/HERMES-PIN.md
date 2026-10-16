# The Hermes pin — Phase 0 of the Hermes track

**Status: Phase 0 is DONE (2026-10-12); the pin was RE-PINNED to the newest source
the same day, and RE-PINNED AGAIN 2026-10-16** when the owner supplied a
still-newer download. This document *is* the pin. It records the source digest,
the compatibility harness that checks it, the exact symbols the platform will
call, and the licence position — the four things Phase 0's exit gate names. It is
written for a reader who has never seen the Hermes source.

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

### 1.1 There are FOUR Hermes copies, and none is byte-identical to another

Measured 2026-10-12, re-measured 2026-10-16 after the second re-pin. All are
gitignored (`.gitignore` line 59 names `library/ai/hermes-agent-main/`; the root
copies carry their own lines — note a bare `hermes-agent-main/` is **not** a
prefix glob).

| Copy | Path | Files | `pyproject.toml` md5 | Revision | mtime | Is it the pin? |
|---|---|---:|---|---|---|---|
| **The pinned snapshot** | `hermes-agent-main/` (repo root) | 19,728 | `f57f729d4b251547a5a9e2565ce1e726` | `db44c462…` | 2026-10-15 | **YES** — newest; the 2026-10-15 download, flattened to the mount-root layout (§1.1.2) |
| The previous pin | `hermes-agent-main-newer/` (repo root) | 18,248 | `11d88a68bc3749f2de73195dd9204cf8` | `3569e846…` | 2026-10-12 | no — the 2026-10-12 pin, renamed aside by the owner on 2026-10-15 |
| The mid extract | `hermes-agent-main-older/` (repo root) | 17,367 | `594dea190e4176caa117db2349071e6c` | not recoverable | 2026-10-05 | no — kept for history |
| The pin before that | `library/ai/hermes-agent-main/` | 17,201 | `a4ce871d9d03fd3706516e15bff637bb` | `eb044063…` | 2026-10-03 | no — superseded 2026-10-12 |

They differ in content (four different `pyproject.toml` hashes) and in file
count. **This is the "source-versus-image divergence" the architecture's §10 risk
table warns about**, found in our own tree: four extracts of one product, at
different revisions, with nothing saying which is which.

**The pin names exactly ONE of them — the repository-root `hermes-agent-main/`,
the newest extract — as *the* Hermes we read and will run.** The others are left
where they are (deleting another project's material is not this programme's call)
but none is the pinned one. A new reader must not have to guess.

#### 1.1.1 RE-PINNED 2026-10-12 — and why (rule 13)

The pin **previously named `library/ai/hermes-agent-main/`** (revision `eb044063…`,
2026-10-03). The owner then supplied a newer download at the repository root and
asked that we use the most recent one if it was not too late. **Measured, it was
not a close call:**

- The old pin is **3,290 upstream commits behind** the new copy (`git compare`
  `eb044063…`→`3569e846…` on the upstream repo → `ahead_by: 3290`; dates
  2026-10-03 → 2026-10-12 — **nine days**).
- The difference is not cosmetic: **1,138 files added, 91 removed, 4,454 files
  changed** between the two extracts. The `agent/` core — the very runtime the
  port will drive — gained **29 new modules** (`compaction_events.py`,
  `reasoning_promotion.py`, `turn_recovery_codex.py`, `context_compressor_*`,
  `agent_runtime_helpers_*`, `session_source.py`, …), plus 9 gateway modules, 11
  tools and 6 `tui_gateway/` modules (checkpoints, session-branch, interrupt).
- **Nothing the pin already mapped broke.** Every §3 entry file still exists in
  the new copy, at near-identical size (`tui_gateway/server.py` 3,672→3,692 lines;
  `tui_gateway/ws.py` unchanged at 477; `gateway/platforms/api_server.py`
  4,646→4,619; `programmatic-integration.md` 226→227); `acp_adapter/` is intact.
  The licence position is unchanged (§4). So the re-pin **raises no
  compatibility debt** — it is a strictly newer, strictly larger snapshot of the
  same product shape.

**The lesson, kept as rule 13's worked example:** *"we pinned the one that was in
the library"* was a good reason only while there was **one** candidate. Once a
second arrived, the question became *"which is newest?"* — and the answer moved.
A pin must re-measure its own premise when the premise's inputs change.

#### 1.1.2 RE-PINNED 2026-10-16 — the current pin, and the flattening (rule 13)

The owner supplied a still-newer download (zip dated 2026-10-15, revision
`db44c462…`) and, on 2026-10-15, **renamed the previous pin aside** (it is now
`hermes-agent-main-newer/`, byte-identical to what `hermes-agent-main/` held) and
**extracted the new one under the standard name** `hermes-agent-main/`. Measured
2026-10-16:

- **The extract carried one extra nesting level** —
  `hermes-agent-main/hermes-agent-main/…` — because the zip's own root entry is
  `hermes-agent-main/` and it was unpacked inside a directory of that same name.
  **That layout cannot run**: the worker's entrypoint sets
  `PYTHONPATH=/hermes-src` and `chdir`s there, so the package must sit *directly*
  at the mount root. Measured both ways in a one-off container: the double-nested
  tree → `ModuleNotFoundError: No module named 'tui_gateway'`; the single-nested
  tree → `IMPORT OK`. **The tree was FLATTENED to the mount-root layout before the
  digest was taken** (an in-place rename of the inner directory onto the outer
  name; no content changed — the flatten is proven by the zip check in §6).
- **A half-done re-pin had been crash-looping the worker.** With the tree replaced
  but the digest not updated, `mercato-hermes-gateway` failed its boot
  verification on every restart — **1,834 restarts**, the log repeating
  *"PIN BROKEN — the mounted tree is not the snapshot that was pinned"*. The pin
  now holds again (§2). *(`.hermes_pin.py`'s own contract names this exact
  failure: a deliberate change must update the digest in the same change, or
  restore the snapshot.)*
- **The digest and the count, after flattening:** **19,728 files**, digest
  **`07ee857bdab59a875317035d8aaad4d6`** — computed twice by methods that share no
  failure mode (`os.walk` in the harness; an independent `os.scandir` walk) and
  both agreeing.
- **The map still holds (§3), re-measured:** every entry symbol survives —
  `_event_frame` (`tui_gateway/server.py:717`, was `:701`), `register_method`
  (`:906`), `handle_ws` (`tui_gateway/ws.py:354`), `acp_adapter/` (19 files), and
  the stale-ceiling seam (`agent/chat_completion_helpers.py:634-646`,
  `HERMES_LOCAL_STREAM_STALE_TIMEOUT`, 900 s default) **unchanged**. `server.py`
  shrank 3,692→2,185 lines (an internal refactor), but no symbol the platform
  calls moved out of reach. **So this re-pin raises no compatibility debt**, the
  same conclusion the 2026-10-12 re-pin reached.
- **The zip is the snapshot:** `unzip -p` member hashes match the tree on disk for
  `pyproject.toml` (`f57f729d…`), `AGENTS.md` (`ab9c77f0…` — unchanged since the
  previous pin), `README.md` (`2ebde40d…` — unchanged), `model_tools.py` and
  `tools/tool_search.py`.

**What this re-pin costs, named:** the `P2-1`…`P2-9a` discharge proofs were made
against the **2026-10-12** revision (`3569e846…`); the worker now runs
`db44c462…`. The symbols are verified present and the worker boots healthy
(measured: `PIN HOLDS`, `MCP BRIDGE READY`, the ws door bound, `gateway.ready`
emitted), but the *live-turn* proofs should be re-run against the running revision
— **scheduled, not assumed** (`COMPLETION-CALLBACKS.md`, `CC-86`).

### 1.2 Where the source revision comes from — it *was* recoverable

The architecture says the source revision *"cannot be recovered; it must be
created."* **That is now sharper than it needs to be, and this pin corrects it
(rule 13).** The pinned snapshot is the extracted contents of the repository-root
`hermes-agent-main.zip`, and **that zip carries the upstream commit in its own
archive comment**:

```
db44c46208f1b421b4ecb7e56bf9d68b0423906f
```

Verified 2026-10-16 (the current pin): the 2026-10-15 zip lists 20,966 *entries*
of which 1,238 are directory entries, leaving **19,728 files** — the count the
flattened tree on disk has. Member hashes match through `unzip -p`
(`pyproject.toml` `f57f729d…`, `AGENTS.md` `ab9c77f0…`, `README.md` `2ebde40d…`,
`model_tools.py`, `tools/tool_search.py`).

The **2026-10-12** pin used the same mechanism: its zip's comment carried
`3569e846…`, and its 19,484 entries minus 1,236 directory entries left 18,248
files.

The same technique recovered the **previous** pin's revision (`eb044063…`, from
`library/ai/hermes-agent-main.zip`) and the revision of the owner's new download
when it arrived — a snapshot carries its own provenance (L135). What genuinely
cannot be recovered from any of them is the *state of the upstream repository
around that commit* — a zip is a snapshot, not a clone — but the revision **is**
recorded, which is what "pin the source" needs.

**Checking it against upstream (2026-10-12).** Both revisions are real commits in
`NousResearch/hermes-agent`, retrievable from the public API:
`3569e846…` → *"fix(plugins): left-core startup installs back off exponentially
instead of hourly forever"*, committed **2026-10-12T08:15:04Z**; `eb044063…` →
*"fmt(js): \`npm run fix\` on merge (#132458)"*, **2026-10-03T20:52:38Z**. The
gap between them is **3,290 commits** — the measure that decided the re-pin.

### 1.3 The digest, and how to reproduce it by hand

One digest over the whole snapshot, defined so anyone can recompute it without
this repository's tooling:

1. For every file under `hermes-agent-main/`, in sorted relative-path order, form
   the line `<md5 of the file>  <relative path with / separators>`.
2. Take the MD5 of `"\n".join(lines) + "\n"`.

**The pinned digest — this is the value the harness enforces:**

```
07ee857bdab59a875317035d8aaad4d6
```

Recorded from a run of the harness on 2026-10-16 (**19,728 files**, the flattened
2026-10-15 snapshot). **This replaced the 2026-10-12 pin's digest
`ca760e97ff1ef1f0e2ed3deb0dfc2923` (18,248 files) in the same change as the
re-pin (§1.1.2).** For reference, the other copies digest to `ca760e97…`
(18,248 files — the 2026-10-12 pin, now `hermes-agent-main-newer/`),
`3e3b81f2ac67a13b76c08f5140d9efe6` (17,367 files, `hermes-agent-main-older/`) and
`53b320bb83a155225ab4b36b3ad0dace` (17,201 files, `library/ai/hermes-agent-main/`)
— all distinct, which is exactly why the pin must name one.

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
  revision : db44c46208f1b421b4ecb7e56bf9d68b0423906f
  files    : 19728
  digest   : 07ee857bdab59a875317035d8aaad4d6
```

**Proven (2026-10-12, re-proved against the re-pinned snapshot the same day).**
Determinism: two consecutive runs print the same digest. Sensitivity (RED-then-GREEN
on the harness itself): the file `hermes-agent-main/.python-version` originally has
md5 `9e0dac68cad89737967a561061812505`; appending the single byte `x` (i.e.
`printf 'x' >> …/.python-version`, no newline) moved the digest from
`ca760e97ff1ef1f0e2ed3deb0dfc2923` to `70a8507c13aca25c4e1681ae0d82ceb4`;
restoring the file to its original md5 (`9e0dac68…`, recreated with
`printf '3.14\n' > …/.python-version`) returned it to `ca760e97…` and `--check`
printed PIN HOLDS again. So the digest tracks content exactly, and a changed
snapshot cannot pass silently. (The byte `x` is stated because the number depends
on *which* byte is appended — `X` yields a different digest than `x`.)

**Re-proved 2026-10-16 (the current pin).** The harness computed `07ee857b…` /
19,728 files, and an **independent `os.scandir` walk** (written separately from
the harness's `os.walk`) produced the identical digest — two implementations
sharing no traversal code, agreeing (rule 4). The worker's own boot verifier
(`verify_pin.py`, the harness's algorithm, running in the image) printed
`PIN HOLDS` on the flattened tree at 19,728 files / `07ee857b…` — a third,
independent execution of the same algorithm, in a different runtime.

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
| **TUI gateway JSON-RPC** | JSON-RPC over stdio, or WebSocket | `tui_gateway/server.py` (2,185 lines) · `tui_gateway/ws.py` (539 lines) | `prompt.submit` · `session.create/list/activate/close/interrupt/history/branch/steer/resume/compress/status/usage` · `command.dispatch/resolve` · `client.capabilities` · `gateway.capabilities` · `reload.mcp/env` · `process.stop` · `subagent.interrupt/steer` — **and the events** `message.delta`, `message.complete`, `tool.start/generating/complete`, `gateway.ready`, `request.cancel` |
| **API server (OpenAI-compatible)** | HTTP + Server-Sent Events | `gateway/platforms/api_server.py` (4,612 lines) | `POST /v1/chat/completions` · `POST /v1/responses` · `POST /v1/runs` → `run_id` (202) · `GET /v1/runs/{id}` · `GET /v1/runs/{id}/events` (SSE) · `POST /v1/runs/{id}/approval` · `POST /v1/runs/{id}/steer` · `POST /v1/runs/{id}/stop` · `GET /v1/capabilities` · `GET /v1/models` |
| **ACP** | JSON-RPC over stdio | `acp_adapter/` | Agent Client Protocol — session creation, prompt submission, streaming chunks, tool-call events, permission requests, fork, cancel (IDE clients) |

Line counts are from the **current** snapshot (`hermes-agent-main/`, the
2026-10-16 pin); every entry file was re-verified present after each re-pin. The
counts across the three pins, for the record: `tui_gateway/server.py`
3,672→3,692→**2,185** · `tui_gateway/ws.py` 477→477→**539** ·
`gateway/platforms/api_server.py` 4,646→4,619→**4,612** ·
`programmatic-integration.md` 226→227→**249**. (`server.py`'s 2026-10-16 drop is
an internal refactor; its entry symbols are unchanged — §1.1.2.) The map is read
from Hermes' own `website/docs/developer-guide/programmatic-integration.md` in the
pinned snapshot, not from a report about it.

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
optional components."* Measured 2026-10-12 from the **re-pinned** snapshot. The
re-pin did not change the position: the runtime is still MIT, every bundled
component found is still MIT or Apache-2.0, and the one `LICENSE` file the new
copy adds (`optional-skills/creative/anatomy/LICENSE.txt`) is itself **MIT**
(*"Copyright (c) 2026 Ryan"*). The count rose from 18 to 19; the
no-copyleft-bundled finding is unchanged.

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

19 `LICENSE` files sit inside the re-pinned snapshot (18 in the previous pin; the
addition is `optional-skills/creative/anatomy/LICENSE.txt`, MIT). The runtime's
own skill and plugin bundles carry their own terms — this is the "optional
components" the gate names, and it is where the real reading is:

| Location | Licence |
|---|---|
| `skills/productivity/{docx,pdf,powerpoint,xlsx}` | MIT (Nous Research) |
| `plugins/hermes-achievements` | MIT |
| `plugins/security-guidance` | **Apache-2.0** (permissive; also fine) |
| `skills/creative/humanizer` | MIT (third party) |
| `optional-skills/creative/{ai-presenter-video,dream-loop,mono-color,system-atlas}` | MIT (third parties) |
| `optional-skills/creative/anatomy` | MIT (third party; added in the re-pin) |
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
- **Delete the two superseded copies** — `hermes-agent-main-older/` and
  `library/ai/hermes-agent-main/` are left in place (another project's material;
  removing it is not this programme's call). They are **not** the pin. If a
  future clean-up drops them it must not touch the root `hermes-agent-main/`;
  that is the pinned snapshot.

**What moves in the scoreboard:** the two `Phase 0` boxes in
`platform_points.md` §D — *"Pin the Hermes source digest + a compatibility
harness"* and *"State the licence position, including optional components"* —
both became tickable on 2026-10-12, because both halves are measured and
recorded. **The re-pin does not change the scoreboard** — it changes *which
snapshot the ticked boxes point at*. The two boxes were already ticked by the
first edition; the re-pin moved the pin's subject to the newest source, and the
harness and this document were updated in the same change so the tick still
means what it says.

---

## 6. How this was verified (rule 0)

Every claim above is from a command and its output — run 2026-10-12 against the
then-pinned snapshot, and **re-run 2026-10-16** against the current one (§1.1.2)
— not from a report about it.

- **Three copies exist and differ:** `md5sum` of `pyproject.toml` in all three
  trees (`11d88a68…` / `594dea19…` / `a4ce871d…`); `find … | wc -l` → 18,248 /
  17,367 / 17,201; `stat -c %y` mtimes; whole-tree digests (`ca760e97…` /
  `3e3b81f2…` / `53b320bb…`) all distinct.
- **The pinned snapshot is the zip:** `unzip -p … | md5sum` matched the on-disk
  file for `pyproject.toml`, `AGENTS.md` and `README.md`; file counts 18,248 =
  18,248 (the zip's 19,484 entries minus 1,236 directory entries).
- **The revision:** `unzip -z hermes-agent-main.zip` → the comment
  `3569e8461ea721623fa16e6f01fb636157989fe6`; confirmed a real upstream commit via
  the GitHub API (`committer.date` 2026-10-12T08:15:04Z). The previous pin's
  revision `eb044063…` is likewise a real commit (2026-10-03T20:52:38Z); the
  compare endpoint reports **3,290 commits** between them.
- **The difference:** file-set diff between the two extracts → 1,138 added, 91
  removed; 4,454 of 17,110 common files changed; grouped by area (29 `agent/`
  additions, 9 `gateway/`, 11 `tools/`, 6 `tui_gateway/`).
- **The map still holds:** every §3 entry file re-measured present after the
  re-pin, with line counts (`wc -l`), and `acp_adapter/` present in both.
- **The digest and the harness:** `.hermes_pin.py --print` /
  `--check`; two-run determinism; the append-a-byte RED (`ca760e97…` →
  `70a8507c…` for the byte `x`) and the md5-verified restore GREEN (`9e0dac68…`,
  `--check` → PIN HOLDS).
- **The symbols:** each entry file's presence and line count in the pinned
  snapshot; the method/endpoint catalog read from Hermes' own
  `programmatic-integration.md`; the port's eight operations read from
  `ai-runtime-port.ts`.
- **The licence position:** every `LICENSE*` file in the tree read; the
  `pyproject.toml` and `package.json` licence fields; the AGPL/GPL references
  read in their own files, in context.

**2026-10-16 (the current pin — the second re-pin).**

- **The layout, measured both ways:** a one-off container from
  `hermes-gateway:p2-9a` with each tree mounted at `/hermes-src` and
  `PYTHONPATH=/hermes-src` → double-nested =
  `ModuleNotFoundError: No module named 'tui_gateway'`; single-nested =
  `IMPORT OK`. The flatten is what the worker's boot requires.
- **The digest, two routes:** `.hermes_pin.py --print` → `07ee857b…` / 19,728
  files; an independent `os.scandir` implementation → the identical value.
- **The tree is the zip:** `unzip -p` member md5s vs the disk files (5 sampled:
  `pyproject.toml`, `AGENTS.md`, `README.md`, `model_tools.py`,
  `tools/tool_search.py`) all MATCH.
- **The symbols:** `_event_frame` at `tui_gateway/server.py:717`,
  `register_method` at `:906`, `handle_ws` at `tui_gateway/ws.py:354`,
  `acp_adapter/` 19 files, and `agent/chat_completion_helpers.py:634-646`
  (`local_stream_stale_timeout`) — all present, by `grep -n` / `wc -l`.
- **The worker boots on it:** `docker compose … up -d --force-recreate` →
  `PIN HOLDS` (19,728 / `07ee857b…`), `MCP BRIDGE READY` (`open-mercato`,
  `http://mcp:3001/mcp`), the ws door bound on `:8091`, and a real
  `gateway.ready` frame — no restart loop (it had run 1,834 restarts on the
  half-done re-pin).
- **The zip revision:** `zipfile.ZipFile(...).comment` →
  `db44c46208f1b421b4ecb7e56bf9d68b0423906f`; the archive's internal mtimes are
  all 2026-10-15 00:57:52 (a single stamp — the download date), which is what
  dates it newer than the 2026-10-12 pin.
