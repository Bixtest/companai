# 02 — The Reference Systems (Batch B2)

**Batch:** B2 of the research plan (`00-RESEARCH-PLAN.md`).
**Status:** complete — three systems analysed from their own source, plus the shared chat, plus a
**verdict with alternatives**.
**Date:** 2026-10-11.
**Question this batch answers:** *which of Buzz / OpenRig / Paperclip fits our workspace layer best
— or what should we build instead?*

**Method.** Each system is described from **its own source** (README / ARCHITECTURE / VISION —
extracted from the zips, not from marketing), and the description names the **file** it came from.
Where a system has **already** been studied in this project, that study is **cited, not redone**
(rule: don't re-derive). Counts and quotes are from the extracted files.

**Sources extracted to `workspace/platforms/_extract/`** *(corrected — the first cut cited the
READMEs but had NOT extracted them, so no reader could check the quotes; all three READMEs are now
extracted and every quote below is verifiable from the extract)*:
`buzz-main/{README,VISION,VISION_AGENT,VISION_ACTIVITY,VISION_PROJECTS,VISION_MESH,CONTEXT,ARCHITECTURE}.md`;
`openrig-main/{README,ARCHITECTURE,ROADMAP}.md`; `paperclip-master/{README,DESIGN,ROADMAP,AGENTS}.md`.
**Licences verified from the actual `LICENSE` files inside the zips** — *corrected by the B8 critic
(finding A4): the first cut said this but had only read them via `unzip -p`, so a reader of the
artefact could not open them — the **same** "unverifiable by construction" defect §8 claims to have
fixed. All three `LICENSE` files are now **extracted into `_extract/`**: `_extract/buzz-main/LICENSE`
(Apache-2.0), `_extract/openrig-main/LICENSE` (Apache-2.0), `_extract/paperclip-master/LICENSE` (MIT).*
**Prior studies cited:** `library/paperclip-hermes-study/` (11 findings) and
`library/paperclip-value-study/findings/07-synthesis.md`.

---

## 0. What the three systems are, in one line each

| System | One line (quoted from its own `README.md`) | Licence (from its `LICENSE` file) | Category |
|---|---|---|---|
| **Buzz** (`block/buzz`) | *"A workspace where humans and agents build together, on a relay you own."* — a Nostr-event-sourced team communication + collaboration platform where agents are first-class colleagues. | **Apache-2.0** | **Human+AI collaboration workspace** |
| **OpenRig** (`mvschwarz/openrig`) | *"A harness wraps a model. A rig wraps your harnesses. Define your agent team in YAML, boot it with one command."* — a local daemon that runs a team of **coding** agents as one system (CLI + TUI + MCP). | **Apache-2.0** | **Agent-team orchestration** |
| **Paperclip** (`paperclipai/paperclip`) | *"The app people use to manage AI agents for work."* — an operational control plane: org charts, tasks, heartbeat runs, budgets, approvals, audit. | **MIT** | **Agent operations control plane** |

*Citation note (added after the hostile-critic pass): the Buzz line is `buzz-main/README.md`; the
OpenRig line is `openrig-main/README.md`; the Paperclip line is `paperclip-master/README.md` **line 3**
*(corrected by the B8 critic, finding A2: the tagline is the `alt` attribute of the banner `<img>`, not
line 1).*
The licences are the first lines of the three top-level `LICENSE` files — **not** inferred.*

**The first strategic observation.** None of the three is *our* product — ours is a **business
platform whose business model is compiled into working software** (`WHAT-WE-ARE-BUILDING.md`).
But the owner is right that they contain the **workspace/interaction layer** we must design. Ranked
by closeness to *our* workspace layer: **Buzz first, Paperclip second, OpenRig third.**

---

## 1. Buzz — the closest to the owner's vision

### 1a. What it is (from `VISION.md`, `ARCHITECTURE.md`)

A **self-hosted team communication platform** in Rust + TypeScript/React, built on the **Nostr
protocol** (NIP-01). Every action — a message, a reaction, a workflow step, a canvas update — is a
**cryptographically signed event** with a `kind` integer. **"The relay is the single source of
truth"** (`ARCHITECTURE.md:7`). A **community** is the tenant boundary, selected by the request
host (`ARCHITECTURE.md:9`).

**Surfaces** (`VISION.md:15–23`): Home (personalized feed), **Stream** (topic-based real-time
chat), **Forum** (async long-form threads), **DMs**, **Agents** (directory + job board),
**Workflows** (YAML-as-code automation), **Search** (Cmd+K). **"One event log. One search index.
Three lenses."**

**Identity** (`VISION.md:89–96`): *"Humans and agents get the same thing"* — a secp256k1 keypair,
a NIP-05 handle, Schnorr auth, and a bot role on channel membership. **The closing line
(`VISION.md:246`): "Buzz 🐝 — where humans and agents are just colleagues."**

### 1b. The ideas that matter to us

| # | Buzz's idea | Where | Why it matters to our workspace |
|---|---|---|---|
| **B-1** | **The agent activity feed — "verb, object, outcome"** (`VISION_ACTIVITY.md:19–25`): every item is a sentence — *"the agent did [verb] to [object] → [outcome]"* — with detail behind **progressive disclosure**. | `VISION_ACTIVITY.md` | **This is a direct answer to the owner's Q2** (*"show what is happening"*). It is the display model for a Business-IR nugget executing: a person reads the sentence, expands only when they want. |
| **B-2** | **Twelve render classes, and "never go dark"** (`VISION_ACTIVITY.md:27–37, 45–47`): every event lands in exactly one of 12 classes (message, relay op, file-edit, shell, tool status, thought, plan/todo, permission, error, generic, raw rail, suppressed). Silence/idle/timeout are **rendered states**, not an empty void. | same | Gives us a **closed taxonomy** for what a workspace shows — the same "closed union" discipline our `WidgetControl` already uses. |
| **B-3** | **"Resolve references, never ids"** (`VISION_ACTIVITY.md:51`): show `#design`, a name, a filename — never a raw event id or pubkey. | same | Our `@`/`#` resolver's display rule. |
| **B-4** | **Channels are workspaces, not chat rooms** (`VISION.md:141–149`): a channel has a **canvas** (shared document), media, threads, typing presence. | `VISION.md` | The workspace unit. |
| **B-5** | **Grouping is one explicit object** (`VISION_PROJECTS.md:47–73`): grouping cannot be expressed per-item; it takes **one signed, replaceable grouping event** with **one signer**, and **the signer gets no authority over members**. | `VISION_PROJECTS.md` | **This is the owner's Q4 grouping question** answered: a "menu category" is a *grouping object*, and being in a group confers **no** authority. |
| **B-6** | **Branches as channels** (`VISION_PROJECTS.md:77–94`): a unit of work *opens a conversation*, and on completion the **conversation archives into a permanent record**. | same | A **thread lifecycle**: open → live → archived-as-record. Directly our Q6. |
| **B-7** | **Approval gates as events; every step traced** (`VISION.md:123–127`): workflows are channel-scoped, and **"a run that hits a `request_approval` step is marked Failed"** (their bug **WF-08** — the executor does not yet persist the token or suspend execution). *(Corrected: the first cut said "held"; the source says "marked Failed" — hostile-critic finding 6.)* | `VISION.md` | Confirms **approval-as-a-first-class-step** — and names the exact trap (**persist the token or the run fails**) we already scored as `CC-14`/self-modification-gate territory. |
| **B-8** | **Agent personas & teams** (`VISION.md:169–171`): a persona = model + system prompt; a **team** = named group of personas. | same | How AI participants are grouped in a workspace — an input to our collaboration model. |
| **B-9** | **Multi-community isolation is proven, not asserted** (`VISION.md:54–55`): "`req.community = resolve_host(...)`, established before AUTH … Unknown hosts fail closed", and isolation is mechanised in TLA+ / Tamarin, mutation-tested. | `VISION.md`, `ARCHITECTURE.md:9–15` | The **shape** of our tenant-boundary discipline, and a standard to hold ourselves to. |

### 1c. What to reject, and why

- **The Nostr/protocol layer** (secp256k1 keys, `kind` integers, a relay as the single source of
  truth). Our platform already has **identity, tenancy, a ledger and events** live in the kit
  (batch 6 §capability map, `S-05…S-17`); adopting Nostr would be a second source of truth.
  **Take the ideas, not the protocol.**
- **A "relay owns everything" read/write path** — our reads go through the query engine with the
  tenant scope in `buildScopedWhere`, and our writes through the feature gate + guard registry.
  Buzz's single-relay model would bypass both.
- **The community-per-host tenant boundary** — ours is a nullable `tenant_id` row with app-layer
  isolation (decided 2026-10-08). Different mechanism, same goal.

---

## 2. OpenRig — the agent-team orchestrator (the weakest match)

### 2a. What it is (from `ARCHITECTURE.md`, `README.md`)

*"OpenRig runs a team of coding agents on your machine as one system."* A **local daemon**
(SQLite state) runs each agent inside **tmux**, drivable through the `rig` CLI, a **TUI**, and an
**MCP server**, all over local HTTP on port 7433 (`ARCHITECTURE.md:44–59`). It focuses entirely on
**coordinating coding agents**: launching/restoring them, delivering messages, a **durable work
queue**, and giving each agent the right skills and context. Its web UI is explicitly in
**maintenance mode** (`ARCHITECTURE.md:26`) — the CLI and TUI are the supported surfaces.

**Key counts** (self-reported, `ARCHITECTURE.md:118–128`): 94 migrations, 67 route files, 87 CLI
commands, **6 runtime adapters** (claude-code, codex, pi, omp, terminal, stub), **18 MCP tools**.

### 2b. The ideas that matter to us

| # | OpenRig's idea | Where | Why it matters |
|---|---|---|---|
| **O-1** | **The "attention surface"** — a file `attention-surface.ts` the daemon exposes as a shareable unit *(**gloss, not in the extract** — B8 critic C4: the cited line shows only the filename and that `*-surface.ts` is a shareable subpath; the reading "a named, first-class concept for what needs a human now" is **mine**)*. | `ARCHITECTURE.md:38` | The same problem as Buzz's activity feed and Paperclip's "does it need me" — three independent systems converge on **one** answer to Q2. ⚠️ **That "convergence" is a hypothesis, per §5a's correction.** Worth heeding. |
| **O-2** | **State in SQLite, one daemon, one HTTP surface, thin clients** — the CLI/TUI/MCP are all **thin clients of the same daemon**. | `ARCHITECTURE.md:44–59` | A clean pattern for our workspace: **one server-side workspace service**, many surfaces. |
| **O-3** | **Server-sent events for live updates** (`routes/events.ts` via `streamSSE`; the TUI subscribes to `/api/activity/events`). | `ARCHITECTURE.md:88–89` | The concrete transport for our live workspace/thread updates. |
| **O-4** | **A durable work queue with honest run-bounding** (the queue is a table; retries are bounded). | `ARCHITECTURE.md:15–17` | Confirms our `AH-3` direction (a wake is a database row) — the same finding the Paperclip study reached. |

### 2c. What to reject, and why

- **The whole product shape** — it orchestrates **coding** agents in **tmux** with a **CLI/TUI**
  first. Ours is a **business** platform with a **web** workspace. The category is different.
- **A TUI-first surface** — the owner's product is judged on the **web** experience.
- **tmux as the execution substrate** — irrelevant to us; our runtime is Hermes + the model server.

**Verdict on OpenRig: LEARN from two things (O-1 the attention surface, O-3 SSE), take the
"thin clients over one daemon" pattern (O-2), and reject the product shape.**

---

## 3. Paperclip — already forensically studied; what to take for the workspace

### 3a. What it is

*"An operational control plane: org charts, tasks, heartbeat runs, budgets, approvals, audit
logs"* (`paperclip-master/DESIGN.md:13`). Its design-language design doc states the product stance
in one sentence that is, again, our Q2:

> **"The user is an operator scanning state and making decisions. Every screen should answer, in
> order: what is happening, does it need me, what do I do about it."** (`DESIGN.md:13`)

### 3b. What we already know (do NOT re-derive)

`library/paperclip-value-study/findings/07-synthesis.md` is a **complete** forensic pass.
**Citation note (corrected after the hostile-critic pass — finding 5):** the synthesis explicitly
warns that its marker tally is *not* its structure — verbatim, `07-synthesis.md:40–41`: *"'six
things worth acting on' … is a judgement, not a count of markers in the findings files"*, and gives
the markers only *"for reference: **LEARN 20 · IDEA 8 · WARN 5 · CONFIRMATION 2 · NOT FOR US 1**."*
The first cut of this document reprinted that footnote as the study's verdict profile — it is not.
The synthesis's own decided structure is **six things to act on**, cited below. The parts most
relevant to the **workspace layer** are:

| Relevant finding | What it gives us | Synthesis ref |
|---|---|---|
| **The self-modification gate** — an agent may *propose* changes to its own instructions/skills, but must **show a diff**, get an **accepted interaction**, and apply **only in a separate follow-up run**; with an evidence floor (≥2 linked evidence tuples) and size caps. | The **process** for AI-proposed changes to the workspace — the piece we have the *prohibition* for but not the *route*. | §1.4 (`N-16`) |
| **Status is systematic** — running/paused/blocked/awaiting-approval/over-budget map to **one** semantic token set used identically everywhere. | The workspace's status vocabulary (aligns with Buzz's 12 render classes). | §2.1, `DESIGN.md:33` |
| **Consumed-once, run-bound consent** — an approval authorises exactly one action, once, bound to the run that asked, created in a **previous** run. | The approval model inside a workspace thread. | §2.1 |
| **The audit feed's responsible-user precedence chain** (run → issue → API key → company default). | Attribution for what a workspace shows. | §2.2 |
| **Agent files sync last-write-wins; an over-quota save is discarded whole.** | A trap: our collaborative-thread storage must **not** silently drop work. | §5 (trap list) |
| **Capability manifest validated at install AND on every call**; unknown ops rejected by default; each call bound to the invocation's scope. | The model for our third-party/AI extension route. | §2.4 (`N-18`) |

**The synthesis's own limit, kept honest:** *"It did not run Paperclip. Every claim is a reading of
source and documentation."* Its Paperclip evidence is a **reading**, not a measurement — so where
we borrow, we borrow the **shape**, not a proven behaviour.

---

## 4. The shared chat

`https://share.google/aimode/lRhjjpf2wUBpo0vyr` — **measured:** the page renders the **question**
only: *"what do you call the UI elements/containers used in frontend to carry and show data pulled
from a database or forms that insert to the database. I know google has library for that called
material or something that sounds like that but there are many other permissive fully opensource
ones."* The **answer body did not load** (client-side rendered; two fetch attempts returned the
prompt alone).

**Recorded honestly as: question known, answer unreachable.** It is **not** quoted or guessed.

**What the question tells us, though, is useful and answerable from our own stack:** the owner is
asking about the **rendering substrate** for data-carrying UI. **Our answer is already in the
repo** (measured, at `workspace/starting-kit/apps/mercato/package.json` + `workspace/starting-kit/packages/ui/package.json`
— *corrected: the first cut cited these as `apps/…` without the repo prefix, so the path did not
resolve; hostile-critic finding 4*): **Radix UI primitives + shadcn-style local components +
Tailwind, TanStack Table (data grids) and Query, Recharts (charts), `@dnd-kit` (drag/drop), `cmdk`
(command palette)** — all **permissive** (MIT/Apache). Material UI is **not** in the stack and is
not needed: our `packages/ui` already *is* the permissive component library, with a **design-system
lint plugin** (`packages/eslint-plugin-ds`) enforcing it. So the owner's underlying question has a
**measured answer**: we already sit on the permissive option.

**An honest limit (hostile-critic finding 7).** The claim that the shared page's answer "did not
load" is a **self-report of a tool limitation**, not a reproducible measurement — there is no
command or artefact that shows it. Recorded as such. If the owner can paste the answer text, the
question closes by evidence rather than by report.

---

## 5. The verdict — what fits best, and the alternatives

### 5a. The recommendation

**Take Buzz as the primary inspiration for the *experience model*, Paperclip as the primary
inspiration for the *governance model*, and OpenRig for two mechanisms (the attention surface, SSE
live updates). Build the workspace layer on our own stack; adopt none of their protocols.**

Stated as a table so the owner can see the division:

| Layer of our workspace | Inspired by | Why |
|---|---|---|
| **What the user sees while the AI works** (Q2) | **Buzz's activity feed** (verb-object-outcome; 12 render classes; never go dark) | It is the most complete *display* answer of the three, and it is a **closed taxonomy** — buildable. |
| **Grouping / menus** (Q4) | **Buzz's one-signer grouping object** (B-5) | Answers the question *"how do we group functions"* with a proven shape, and its "no authority from membership" rule is a security win. |
| **Threads** (Q6) | **Buzz's branch-as-channel lifecycle** (B-6) | Gives threads a **lifecycle** (open → live → archived-as-record), which our platform needs for auditability. |
| **Collaboration** (Q7) | **Buzz's humans-and-agents-are-the-same-kind identity** (1a) + Paperclip's approval/consent shapes | Combines the experience with the governance. |
| **Status vocabulary** | **Paperclip's "status is systematic"** | One token set everywhere; matches Buzz's render classes. |
| **AI-proposed changes** | **Paperclip's self-modification gate** | The process for AI patches to the workspace. |
| **Live updates transport** | **OpenRig's SSE over one daemon** | The simple, proven transport. |
| **Who needs me now** | **All three point at this** — Buzz (feed), Paperclip ("does it need me"), OpenRig (a file named `attention-surface.ts`) | ⚠️ **This row is MY SYNTHESIS, not a measurement** *(corrected — hostile-critic findings 3 and 9; no extract contains the word "converge," and OpenRig's `attention-surface.ts` is cited only as a **filename**, with no description of its content in the extract)*. It is offered as a **hypothesis to test in B3**, not a fact. |

### 5b. The alternatives the owner invited

The owner said *"or suggest different alternatives as you should know the project best."* Three,
each with the reason it is **not** the primary recommendation:

1. **Build the workspace layer from scratch, borrowing nothing.** *Rejected as a default:* three
   products in the same neighbourhood have each arrived at a **similar interface concept** — an
   activity feed, a status vocabulary, a "what needs a human" surface (⚠️ **this overlap is my
   reading, per the correction in §5a — a hypothesis, not a measured convergence**). Ignoring it
   would mean re-deriving it worse. **But** our *stack* is from scratch regardless — the borrow is
   ideas, not code.
2. **Adopt a mature open-source workspace runtime wholesale** (e.g. run Buzz's relay as our
   workspace backend). *Rejected:* it introduces a **second source of truth** (a Nostr event log
   beside our Postgres model), a second identity system (secp256k1 beside our `api_keys`), and a
   second tenant boundary — all of which would have to be kept consistent with the kernel. The cost
   is permanent and structural.
3. **Lean on a generic component/composition framework** (a "widget framework" library) for the
   widgetized structure. *Rejected:* the vision's requirement is that a Widget is a **typed,
   versioned, registry business object with a dependency graph** — a business-layer concern no UI
   framework provides. Frameworks solve *rendering*; we already have a rendering layer (batch 4
   §15b).

### 5c. What none of the three gives us (so it is ours to build)

Stated plainly, because these are the parts of the owner's request **no reference system answers**:

- **The prompt → Business IR → saved tenant Function chain.** Buzz has workflows (YAML-as-code,
  authored by hand); Paperclip has tasks and runs; OpenRig has a queue. **None** has *"a user's
  prompt becomes a saved, named, reusable, deterministic function with no AI at run time."* That is
  **our differentiator** (the vision's §160) — and, as batch B1 measured, we have **half of it in
  code** (`placement.ts`, `runFunction`).
- **The Business-IR ↔ user display bridge.** Their activity feeds show *agent* activity; ours must
  show *a compiled business query's* progress and result **in business terms**. The display
  *principles* are borrowable (B-1/B-2); the *content* is ours.

---

## 6. What was read, and what was skipped

**Read (extracted and read):** Buzz `README` (head), `VISION` (full), `VISION_AGENT` (full),
`VISION_ACTIVITY` (full), `VISION_PROJECTS` (first 120 lines), `ARCHITECTURE` (first 180 lines);
OpenRig `README` (head), `ARCHITECTURE` (first 170 lines); Paperclip `README` (head), `DESIGN`
(full). The three `LICENSE` files (first lines). The shared chat (two fetch attempts).

**Read from prior studies:** `paperclip-value-study/findings/07-synthesis.md` (full); the two
studies' existence and structure.

*(Corrected after the hostile-critic pass — findings 1 and 8: the first cut listed the READMEs as
read while they had **not** been extracted into `_extract/`, so the quotes could not be checked.
All three READMEs and LICENSE files are now extracted and every quote in §0 is verifiable.)*

**Skipped, with the reason:**
- The three zips' **full source trees** — this batch needed each project's **self-description** to
  fix its identity and ideas; page-by-page source reading is the job of the *existing* Paperclip
  studies (which did it) and is not needed to answer *"which fits us best"*.
- Paperclip's **11 + 7 findings files** — the **synthesis** is the decided view; re-reading the
  evidence would duplicate it (cited instead).
- Buzz's `VISION_MESH`, `VISION_MODERATION`, `VISION_MOBILE`, `VISION_SOVEREIGN` — peripheral to
  our workspace layer (mesh compute, moderation, mobile); named here so the skip is deliberate.
- OpenRig's `docs/reference/*` — its user guide, not its architecture.

---

## 7. Open items carried forward

| # | Item | Goes to |
|---|---|---|
| 1 | **The activity feed is the Q2 answer to build on** — but the SRS must define *what a Business-IR nugget shows*, which none of the three models. | B3 |
| 2 | **The "one-signer grouping object with no authority from membership" (B-5)** is a strong candidate for our menu/grouping model; verify it against our registry (`registry.ts`) before adopting. | B5 |
| 3 | **The self-modification gate (`N-16`)** and the **capability model (`N-18`)** are already backlog items — the SRS must connect the workspace's extension routes to them, not invent parallel rules. | B7 |
| 4 | **Three systems converge on "what needs me now"** — treat this as a *requirement* of the workspace, not a feature. | B3, B9 |
| 5 | The **shared chat's answer is unreachable**; if the owner can paste its text, the UI-library question closes by measurement rather than inference. | owner |

*End of batch B2.*

---

## 8. Corrected in this file (rule 13 — corrected where it was copied)

A **separate hostile-critic agent** verified every quote and citation with a command per claim. It
confirmed the substantive evidence (B-1/B-2 including the 12-class count, B-5, B-9, the whole
OpenRig §2a, the Paperclip `DESIGN.md:13` line). It returned **seven real findings — all sourcing
defects in this document, none in the sources** — each corrected in place above:

| # | Was | Now | Finding |
|---|---|---|---|
| 1 | §0 quotes the three README taglines, but **the READMEs were never extracted** — unverifiable | all three READMEs **extracted**; every §0 quote verifiable | critic 1 |
| 2 | §0 licences: OpenRig "Apache-2.0", Paperclip "MIT" — **inferred from a filename / the badge** | read from the actual `LICENSE` files: Buzz **Apache-2.0**, OpenRig **Apache-2.0**, Paperclip **MIT** — now **sourced** | critic 2 |
| 3 | §5a "three independent systems **converge** … strongest signal" stated as fact | **labelled MY synthesis** — a hypothesis for B3, not a measurement | critic 3, 9 |
| 4 | §4 measured the UI stack at `apps/…` / `packages/ui/…` — **path does not resolve** | full paths `workspace/starting-kit/apps/mercato/package.json` + `…/packages/ui/package.json` | critic 4 |
| 5 | §3b reprinted the study's **marker tally** as its structure | the synthesis's own **disclaimer** quoted; its decided structure is **six things to act on** | critic 5 |
| 6 | §1b B-7 said an approval run is **"held"** | source says **"marked Failed"** (`VISION.md:127`) | critic 6 |
| 7 | §4's "answer did not load" presented as measured | **labelled a tool-limitation self-report**, not a measurement | critic 7 |

**The lesson, banked:** *a quote is only checkable if the file it came from is in the artefact the
reader can open.* Every quote in the first cut of §0 was **true** — it came from a README the author
had read via `unzip -p` — but the reader could not reach that file, so the citations were
**unverifiable by construction**. That is a defect even when the words are right.

### 8b. Re-corrected in B8 (rule 13 — the recurrence the lesson above predicted)

A **second** separate hostile-critic agent (B8) re-attacked every citation in this file **and** in the
new `03-MAPPING.md`, with a command and its output per claim. It found **four defects in this file** —
and, tellingly, **three of them are the very class §8 above named**: citations whose *values* were
right but whose *location* a reader could not check. Fixed in place:

| # | Was | Now | Finding |
|---|---|---|---|
| 8 | §0/§8 claimed the `LICENSE` files were "read from the actual `LICENSE` files … now **sourced**" — but **no `LICENSE` file was ever extracted into `_extract/`** (`find _extract -iname 'LICENSE*'` → empty). The **recurrence** of §8's own banked lesson. | all three `LICENSE` files **extracted**: `_extract/{buzz-main,openrig-main,paperclip-master}/LICENSE` — every licence now verifiable from the artefact | B8 critic A4 |
| 9 | §0 said the Paperclip tagline is `README.md` **line 1** | it is **line 3** (the `alt` attribute of the banner `<img>`) | B8 critic A2 |
| 10 | §3b quoted the synthesis at `07-synthesis.md:42–48` | the quoted sentence is at **`:40–41`**; the cited range began one bullet *past* it, on different text | B8 critic A3 |
| 11 | §9e said the choice "rests on **four** measured rows" while naming **five**, and "the **eight** borrow rows" for sets of **8** (§9b) and **7** (§9d) | corrected to **five** measured rows, and the two set sizes named exactly | B8 critic C1/D2 |

*(Findings in the new `03-MAPPING.md` — 9 of them — are recorded in that file's own correction table,
because that is where they were copied.)*

---

## 9. Batch B8 — the DECISION, reconciled to the development plan (final)

**Batch:** B8 of the research plan. **Date:** 2026-10-11. **Status:** the **final** verdict — this
section **supersedes §5a as the answer** (it does not contradict it; it *sharpens* it from *"take Buzz
first"* to *"each system informs one layer, and here is the plan item each layer touches"*).
**Exit gate this section must meet** (`00-RESEARCH-PLAN.md:194`): *the recommendation is **one choice
+ reasons + alternatives**, never a menu; and it names, per choice, the **development-plan items it
accelerates or delays**.*

### 9a. The one choice, in one paragraph

**Build our own workspace layer on our own stack; borrow from the three systems *ideas for one layer
each*; adopt none of their protocols, runtimes, or storage.** Concretely: **Buzz supplies the
experience model** (what a user sees while the AI works — the activity feed, the grouping object, the
thread lifecycle, "humans and agents are the same kind of colleague"); **Paperclip supplies the
governance model** (the propose→diff→approve→apply path for an AI change, the systematic status
vocabulary, consumed-once consent); **OpenRig supplies two mechanisms only** (server-sent events as
the live-update transport; the "thin clients over one daemon" shape). **Nothing of theirs becomes a
second source of truth.**

### 9b. Why this is the choice — the reasons, ranked

1. **Our product is not their product.** Ours is *a business platform whose business model is compiled
   into working software*; theirs are a collaboration relay (Buzz), a coding-agent harness (OpenRig),
   and an agent-operations console (Paperclip). B2 §0 measured this. A wholesale adoption would import
   a **second source of truth** (Buzz's Nostr relay beside our Postgres model), a **second identity
   system** (secp256k1 beside our `api_keys`), and a **second tenant boundary** — a permanent,
   structural cost (B2 §5b alternative 2).
2. **The three systems do not compete — they live at different layers.** This is B7's refinement, and
   it is the reason the answer is a *blend* and not a *winner*. Measured across B2/B7:
   | Layer of our workspace | Which system informs it | Evidence |
   |---|---|---|
   | **What the user sees while the AI works** (Q2) | **Buzz** — the activity feed (verb·object·outcome), 12 render classes, "never go dark" | B2 §1b B-1/B-2 |
   | **Who may extend the workspace, and how** (Q8/Q9) | **Buzz** — "humans and agents are the same kind of colleague"; grouping confers no authority | B2 §1b B-5, §5a |
   | **Threads and their lifecycle** (Q6) | **Buzz** — branch-as-channel: open → live → archived-as-record | B2 §1b B-6 |
   | **The AI-proposed change path** (B7 route 3) | **Paperclip** — the self-modification gate (propose → diff → accepted interaction → apply in a *separate* run) | B2 §3b `N-16` |
   | **Status vocabulary everywhere** | **Paperclip** — "status is systematic" | B2 §3b, §5a |
   | **The consent / approval shape** | **Paperclip** — consumed-once, run-bound consent | B2 §3b |
   | **Live-update transport** | **OpenRig** — SSE over one daemon | B2 §2b O-3 |
   | **One server-side workspace service, many surfaces** | **OpenRig** — thin clients over one daemon | B2 §2b O-2 |
3. **The one law that makes borrowing safe.** A borrowed *idea* costs nothing; a borrowed *mechanism
   from a foreign stack* costs a permanent reconciliation. So the borrow is **ideas for the
   experience and governance layers**, and **two well-understood transports** from OpenRig — never a
   runtime, a protocol, or a datastore.
4. **What none of the three gives us — so it is ours.** Stated in B2 §5c and **re-confirmed by B3–B7**:
   the **prompt → Business-IR → saved tenant Function** chain (B3, B4) and the **Business-IR ↔ user
   display bridge** (B3). No reference system has *"a user's prompt becomes a saved, named, reusable,
   deterministic function with no AI at run time."* That is our differentiator (the vision's §160),
   and B1/B4 measured that **half of it is already in code** (`placement.ts`, `runFunction`).

### 9c. The alternatives, and why each is not the choice

The owner invited alternatives (B2 §5b). B8 re-states them **with the plan cost of each**, which B2
did not:

| Alternative | Why it is not the choice | The plan items it would *delay*, and why |
|---|---|---|
| **Build the layer from scratch, borrow nothing** | Rejected as a **default** — three products in the same neighbourhood each arrived at a similar interface concept (a feed, a status vocabulary, a "what needs me" surface). Re-deriving it worse is the cost. **But** our *stack* is from scratch regardless — the borrow is ideas, not code. | **Delays nothing directly** — but it **adds design risk** to `G-07`/`G-03` (the Widget contract and User Functions would be designed without a proven display/vocabulary model to check against). |
| **Adopt a mature OSS workspace runtime wholesale** (e.g. run Buzz's relay as our backend) | Rejected — a **second source of truth**, a second identity system, a second tenant boundary, all permanently reconciled with the kernel. | **Delays the *whole spine***: `G-01` kernel · `G-08` relationship fabric · `G-02` IR — because the relay's event model would have to be mapped into, and kept consistent with, our canonical model. **Structural, not incremental.** |
| **Lean on a generic component/composition framework** for the widgetized structure | Rejected — the vision's Widget is a **typed, versioned, registry business object with a dependency graph**, a business-layer concern no UI framework provides. We already have the rendering layer. | **Delays `G-07`** (the Widget contract): the framework solves rendering, not the *contract*, so `G-07` still has to be built — the framework would be an extra dependency under it, not a substitute for it. |

### 9d. What the choice **accelerates** and **delays** — per layer, against the plan's own items

The exit gate requires naming, per choice, the plan items a choice touches. The plan's live vocabulary
is the **supplementary core queue** (`PLAN-SUPPLEMENTARY-CORE-QUEUE.md` — `CC-*`) and the **vision
phases** (`12-development-plan.md` — `G-*`). Both are named.

| Our choice (borrowed layer) | The plan item it **accelerates** | The plan item it is a **prerequisite to** (does not delay, does unblock) | Its **cost** (what it delays) |
|---|---|---|---|
| **Buzz → the experience model** (the feed, the 12 render classes, never-go-dark) | **`CC-58` Stage B** (the person-facing Business-IR screen) — the feed *is* the display model for a nugget executing (B3 §display) | — | **None to the core queue.** The display model is design, not build; it *informs* `CC-58` Stage B when business work resumes. |
| **Buzz → grouping confers no authority** (B-5) | **The menu join** (SRS-03 §5: `UserFunction.placement` → `InjectionMenuItem`) — a group is a grouping object, not a grant | B-perms (WS-1) — reinforces "membership ≠ permission" | None. It is a **constraint on the design**, and it **reduces** security risk. *(Corrected in B8 — see §8b: the first draft called this "`G-09`-era menu wiring", but SRS-03 §5.3 measures that the **projector is pure and needs no `G-09`**; only the `placement` **field** rides the Function row's persistence, `CC-32`/`G-09`.)* |
| **Buzz → thread lifecycle** (open → live → archived) | **B6's three gaps** (AI-as-participant; widgets-in-a-thread; anchoring/presence) — the lifecycle is the *frame* the gaps fill | — | None. B6 measured the kit **already persists threads** (`AiChatConversation`, 36+2 tests pass); the lifecycle is additive. |
| **Paperclip → the self-modification gate** (propose → diff → approve → apply-later) | **B7 route 3** (AI-proposed extension) — the gate *is* route 3's process. Aligns with the existing `FunctionCandidate` (propose-half built) + `canOfferSaveAsFunction` (`gate.ts:80`) | **`CC-59`** (the Business-IR caller) — a live caller is what makes route 3 exercisable | **None to the core.** It reuses `request-outcome/triage.ts` + `gate.ts`, which are **already built**. |
| **Paperclip → systematic status; consumed-once consent** | **`CC-15` / `CC-38`** (the escalation/approval cluster — the first live `202` + a `pending_acts` row) — the consent shape is *the* approval model | — | **None.** `CC-38` is already staged in §S4 with its own trigger; this **clarifies** its shape, it does not move it. |
| **OpenRig → SSE transport** | **B6's live-update gap** (no CRDT/WebSocket/Yjs in production) — SSE is the simplest proven transport | — | None. It is a transport choice for a build that is **not yet started**. |
| **OpenRig → thin clients over one daemon** | **B7 route 1/2/3** (the extension routes all go through one server-side registry) — matches the kit's build-time generator + runtime loader shape | — | None. B7 measured the kit **already has** the one-loader shape (`injection-loader.ts`). |

### 9e. The honest limits of this verdict

- **Two of the eight rows in §9b rest on a hypothesis, not a measurement** — the "what needs me
  now" convergence (B2 §5a, labelled) and OpenRig's `attention-surface.ts` (cited as a **filename**
  only; its content was not in the extract). They are **not** load-bearing for the choice: the choice
  rests on the five *measured* rows (Buzz's feed, grouping, and thread-lifecycle; Paperclip's gate and
  status). (§9b holds **8** rows; §9d holds **7** — the two sets are different, not both "eight".)
- **The borrows are design influences, so this verdict *delays no core item*.** Every row in §9d names
  an item the choice **informs or unblocks**; none names an item it pushes later. That is the honest
  reading: the choice is **additive**, because we are not adopting a runtime.
- **The one place the choice *could* cost:** if the owner ever wanted Buzz's relay as the *actual*
  backend. That is §9c alternative 2, and its cost (`G-01`/`G-08`/`G-02` delayed structurally) is the
  reason it is rejected.

### 9f. Hand-off to B9

B9 (the widget architecture, end to end) takes from this section: **Buzz's activity feed is the Q2
display model** (to be specified for our Business-IR nugget in B3's terms); **Paperclip's gate is
route 3's process**; **OpenRig's SSE is the live-update transport**; and **the widgetized structure
itself is ours to build** — it is the subject of `02-SRS-06-widget-architecture.md`, which maps each
part to *have it (here) / build it (item) / borrow it (kit, Hermes)*.

*End of batch B8 §9. The first draft of `03-MAPPING.md` follows this section in its own file.*
