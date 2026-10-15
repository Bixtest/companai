# Paperclip Study — Batch 07: the synthesis

**Status:** DONE — 2026-10-15 · **Pole tag:** all · **Closes the Paperclip study (7 of 7).**
**Method:** this document draws ONLY on batches 01–06 of this study. Every claim about Paperclip points back
to the batch that measured it. **It makes no comparison against our own platform's code** — that is the
**mapping step**, which the owner's plan schedules next (*"we start mapping each pole findings across the
platforms with what we have already in mercato"*). Where it names the mapping step, it is naming a **to-do**,
not doing it.

---

## §0 — Plain words: what this document is

Six batches measured Paperclip doc-by-doc and file-by-file, and tagged every finding with a pole. This
closing document does the one thing the batches were forbidden to do: **say what Paperclip teaches each pole,
ranked, so the mapping step has a clean shopping list.**

**One framing to hold:** Paperclip is our product's **ancestor**. We forked it. So this is not "a stranger's
design we might copy" — it is **the design we grew out of**, and the study is the first time we have read it
forensically.

---

## §1 — What the study measured, in one page

- **Pin:** 10,447 files; `package.json` md5 `e912c83c715dba5c7c55469d4de899cb`; extracted **2026-10-15 13:21**;
  **no `.git`**; **no version field**; newest in-tree dated artefact 2026-10-02 (batch 00).
- **Scale:** ~1M lines TypeScript / 7,416 files; `server/src/services/` **535,237 lines / 1,220 files**;
  `packages/paperclip-runner/` **221,706**; `ui/src/` **801 `.tsx` components**, **~303** counted
  components+pages; `server/src/__tests__/` **487,642 lines** (~half of `server/` is tests).
- **Docs:** **two roots** — `doc/` (375 files / 7.56 MB, engineering) + `docs/` (78 / 532 KB, public).
- **Divergences found: 10 across six batches** — but **not one was a false factual claim**. They are:
  3 "genre" caveats (the SPEC is a living DRAFT, batches 01/02); 2 in-progress-terminology (issue→task,
  batch 03); 1 reconciled count (batch 05); 1 concept-absence (no widget composer, batch 05); 2
  label/level (runner "Proposed" is built, batch 04); 1 direction (single-tenant wall is cracking, batch 06).
  **Paperclip's docs are unusually honest** — several divergences are the docs *themselves* stating the
  caveat.
- **The single best artefact:** `doc/architecture/durable-continuation-scheduler.md` — it documents a **real
  production bug (the DOT-2 loop) and its fix** with the full causal chain (batch 04 §5).

---

## §2 — The three poles, headlined

### P1 — The aissistant (batch 02)

**What Paperclip's agent IS:** four **separable layers** it refuses to let merge — **body** (adapter), **soul**
(persistent files: `AGENTS.md` + notes), **identity** (persistent Ed25519), **permissions** (defaults that
never include sandbox escape). The body contract is **three methods** (`invoke`/`status`/`cancel`); persona
**meaning is adapter-owned, not protocol-owned**; hiring is a **gated pipeline with a real liveness probe**
before `ready`; memory is a **binding + small contract** with the engine behind it.

### P2 — The workspace (batch 03)

**The headline of the whole study:** a company is a **portable markdown package** (`agentcompanies/v1`:
`COMPANY.md`, `TEAM.md`, `AGENTS.md`, `PROJECT.md`, `TASK.md`, `SKILL.md`, `.paperclip.yaml`); **markdown is
canonical, git repos are containers, slugs are the portable identity, the DB is derived**. On top of that: a
**typed task state machine**, **two link types** (hierarchy = *why*, blockers = *what's in the way*),
**workspace-level skill policy**, and a **triage-shaped operator surface** ("what is happening / does it need
me / what do I do").

### P3 — Automations (batch 04)

The owner called Paperclip "a blueprint" for this pole, and the study agrees **most strongly here**. **Runs
are finite; continuity lives in the DB.** Around that: the **three-way invariant** (live path · durable wait ·
visible disposition); **five continuation kinds with idempotency keys**; a **stranded-issue reconciler** with
a long "reasons NOT to wake" list that **honours human cancellation**; the **DOT-2 lesson** (fix the contract,
never slow the poller); the opt-in **verification-shaped task watchdog**; the **runner seam** (PRP, Rust,
deterministic replay, *never a second control plane*); budgets with a hard ceiling; routines; and a
**fail-awake idle-sleep** protocol.

---

## §3 — The ranked transferable mechanisms (the shopping list for the mapping step)

Ranked by how much they teach us, **not** by how easy they are to copy. Each names its pole and its batch.

| # | Mechanism | Pole | Batch | Why it ranks here |
|---|---|---|---|---|
| **1** | **The company as a portable markdown package** | P2 | 03 | The single most reusable idea: companies/workspaces as verifiable, forkable, version-controlled artefacts. Tenant-agnostic — survives our multi-tenant rework. |
| **2** | **Finite runs + durable intent + idempotent continuations** | P3 | 04 | The only way to run agents as *reliable business processes*. Includes the five continuation kinds and idempotency keys. |
| **3** | **The DOT-2 lesson** (fix the completion contract; never slow the poller) | P3 | 04 | The most important engineering *warning* in the study. Every recovery engine loops; this is the named cure. |
| **4** | **The four separable agent layers** | P1 | 02 | The schema for a worker redeployable across workspaces/automations/studio — exactly the owner's "versatile, integratable" requirement. |
| **5** | **The task watchdog** (verification-shaped review of stopped work) | P3 | 04 | A genuinely novel mechanism: agents that audit *other agents'* "done". Rare and valuable. |
| **6** | **The runner seam with deterministic replay** | P3/P1 | 04 | Precisely the execution seam our Hermes integration needs; its **non-goals** are as useful as its goals. |
| **7** | **The design system discipline** (token gate + 510-image baseline + decision sheet) | PX-W | 05 | The strongest frontend contribution: makes a 300-component, agent-maintained surface coherent. |
| **8** | **Scoped rules + first-party dev skills** (the platform builds itself with agents) | PZ | 06 | The clearest proof their thesis is real; the most transferable *process* finding. |
| **9** | **MCP access governance** (risk levels, quarantine writes, audit-preserving disable) | PZ | 06 | A direct upgrade path for our Hermes tool bridge. |
| **10** | **Gated hire with a real liveness probe** | P1 | 02 | Don't "employ" a worker you have never seen run. |
| **11** | **The typed task model with two link types** | P2 | 03 | "Why" and "what's blocking" must be separate relations. |
| **12** | **Fail-awake idle sleep** | PZ | 04/06 | The right default for a system that must not drop work; matters for our hosting economics. |

---

## §4 — What Paperclip does NOT give us (stated, so the mapping step does not over-claim)

Honesty about boundaries is the point of this section:

1. **No multi-tenancy.** The model is **single-tenant self-host** (`SPEC.md:433`); cloud/tenancy exists only as
   a **fail-closed crack** at the edge (batch 06 §6). **The owner's known hard problem — tenant-per-agent — is
   not solved here.**
2. **No widget composer.** Paperclip teaches a component *system* (tokens + primitives + visual proof), **not a
   runtime widget/dashboard builder** (batch 05 §7). If our vision needs user-composed widgets/automations,
   that is a **build**, not an adopt.
3. **Persona/memory are intentionally thin.** Paperclip delegates both to the adapter/provider (batches
   02 §1.2/§3). If our aissistant needs **first-class** persona and memory, we supply the substance; Paperclip
   supplies the seam.
4. **Docs are partly intent.** `SPEC.md` is a **living DRAFT** (batches 01/02); treat it as a design intent,
   not a description. The **code and `doc/architecture/*` + `doc/*.md` are the authority.**
5. **This study read the docs + verified mechanisms; it did not read all ~1M lines.** Claims about *how*
   specific subsystems behave in edge cases are out of scope and would need a code pass.

---

## §5 — Cross-study notes (Paperclip vs the Hermes study)

Recorded as **observations for the mapping step**, never decisions. Four genuine forks in the road:

| Dimension | Hermes (Hermes study) | Paperclip (this study) |
|---|---|---|
| **Persona/identity** | **Owned centrally** (`SOUL.md`, `personality.py`, 14 built-ins — b13 §3.1) | **Adapter-owned**, Paperclip owns the folder (b02 §1.2) |
| **Memory** | **Built-in engine** (files, char caps — b04) | **Binding + small contract**, engine behind it (b02 §3) |
| **Runtime stance** | Hermes is an **ACP server**; others are clients (b10) | Every runtime is an **adapter Paperclip drives**, incl. Hermes (b01 §2.4) |
| **Tenancy** | single-operator profiles (isolation, not tenancy — b12) | single-tenant self-host (b03 §3, b06 §6) |

**The pattern:** on every one of these, **Paperclip draws the boundary *lower* (more delegated), Hermes draws
it *higher* (more owned)**. That is the central architectural difference between our two studied systems and
the crux the mapping step must resolve for each pole.

---

## §6 — What this study does NOT claim (the limits, stated)

1. **One tree, one date.** Every figure is about the extract pinned in batch 00 — 10,447 files, md5
   `e912c83c…`, extracted 2026-10-15. No `.git`, no version field ⇒ the exact commit is unknowable.
2. **It studies UPSTREAM, not our fork.** Per the owner's ruling ("Upstream standalone first"), this study
   reads `paperclipai/paperclip` on its own terms. **The bridge to our `aissistant-package` fork is a later
   pass** and is not attempted here.
3. **"Better" is not asserted.** §2–§3 rank *what Paperclip teaches*, not whether Paperclip beats anyone. Any
   comparison to our platform belongs to the mapping step.
4. **The code was sampled, not exhausted.** Mechanism existence and key numbers were verified in code; a full
   read of ~1M lines was not attempted and is not claimed.
5. **The SPEC is intent.** See §4.4.

---

## §7 — The single recommendation, in one paragraph

**Treat Paperclip as the foundation of P2 (the workspace) and P3 (automations), and as a *seam-provider* for
P1 — then write the requirements from ranked §3, not from the code.** Concretely: adopt the **portable
markdown company package**, the **finite-run + durable-continuation** model with the **DOT-2 discipline**, the
**four-layer agent schema**, and the **design-system discipline** as four written requirements — because each
is tenant-agnostic, each is proven by a shipped system, and together they cover the three poles. Do **not**
adopt the single-tenant model (we must outgrow it), the missing widget composer (we must build it), or the
thin persona/memory (we must supply it) — those are the three places our product must go *beyond* its
ancestor. The mapping step — Paperclip findings joined against `mercato` — is the next task, and this study is
its input.

**The one thing the owner must decide:** whether these **seven platform studies proceed one-at-a-time in this
same shape** (per-pole findings, then a synthesis each), and whether the **mapping step runs once after all
platforms** or **per-platform as we go** — because that choice changes the shape of the docs the reader will
hold. Recommendation: **study each platform the same way, and run the mapping once at the end** (it is a
per-pole join across nine studies, and doing it nine times would duplicate the same comparison).

---

## §8 — The study's own ledger

**Batches complete:** 00–07 (8 files).
**Divergences:** 10 across six batches, **none a false fact** (§1).
**Files written:** `00-PIN-AND-METHOD.md`, `findings/01-platform-overview.md`, `02-the-aissistant.md`,
`03-the-workspace.md`, `04-automations.md`, `05-widgets-and-frontend.md`, `06-out-of-pole-findings.md`,
`07-SYNTHESIS.md`.
**Commits (explicit paths):** batch 00–02 → `9ae258f`; batches 03–04 → `97b4dfc`; batch 05 → *(this
session)*; batches 06–07 → *(this session)*.
**All files byte-clean (0 CR, no BOM), each measured, each carrying its poles and its value answers.**

---

*Paperclip study closed, 7 of 7 (+ pin). Next (not this study): the reader, and the remaining platforms —
`crewAI`, `multica`, `gastown`, `n8n`, `buzz`, `openrig`, `mattermost`, `zulip` — then the mapping step.*
