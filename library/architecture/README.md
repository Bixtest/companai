# The Architecture Workshop

**This folder is the workshop for the platform-engineering stage of the project.**

Its job: **study the platforms we might learn from or borrow from, one at a time, the same forensic way we
studied Hermes** — then (a later step) map each finding against what `mercato` already has, and produce the
final SRS.

> **Where we are.** Step 1 of the owner's plan — *"ironing out the full Hermes understanding"* — is **done**
> (the Hermes study, closed). We are now at the **platform-study step** that precedes the mapping step. The
> owner's three poles (the aissistant / the workspace / automations) plus widgets and frontend wiring are the
> frame for every platform study.

---

## The frame: why these platforms, why this shape

**Hermes is the main AI engine** for the platform we are building. We do **not** change Hermes's codebase;
evolution happens **on our side**, then is mapped and integrated so it capitalises on Hermes while adding
value. Beyond Hermes there are **three poles** to engineer — each perfect alone and in combination with the
other two, then Hermes:

| Pole | What it is |
|---|---|
| **P1 — The aissistant** | the AI user: a versatile, integratable, rich-featured agent, deployable in many contexts (workspaces, automations, later the studio) |
| **P2 — The workspace** | the container a person operates in: versatile, integratable, compatible with a mix of current and future features |
| **P3 — Automations** | where agents work on and assign tasks; **Paperclip is the blueprint** for this |

Plus two cross-cutting concerns: **PX-W widgets** and **PX-F frontend wiring**.

**Every finding is tagged with its pole** so the later mapping step is a per-pole join, not a re-read of nine
studies.

---

## Layout

```
library/architecture/
├── README.md                  ← you are here
├── hermes-forensics/          ← the Hermes study (mirror of library/hermes-forensics/)
├── paperclip-forensics/       ← the Paperclip study (DONE, 7 batches + pin) + reader/
├── crewai-forensics/          ← the CrewAI study (DONE, 7 batches + pin) + reader/
├── multica-forensics/         ← the Multica study (DONE, 7 batches + pin) + reader/
├── gastown-forensics/         ← the Gas Town study (IN PROGRESS: 00 + findings/01..05)
│   ├── 00-PIN-AND-METHOD.md
│   └── findings/01..07
├── reader/                    ← the Hermes reader (HTML)
└── platforms/                 ← the raw platform archives + references
    ├── *.zip                  (gitignored)
    ├── references.md          ← repo link per platform
    └── _extracted/            (gitignored) working trees
```

### The readers

Each study has its own **offline HTML reader** (per the owner's ruling: *one reader per platform*). To open
one: double-click its `index.html`, or `node serve.js` inside its `reader/` folder.

- **Hermes reader** → `reader/` (port 3000)
- **Paperclip reader** → `paperclip-forensics/reader/` (port 3100)
- **CrewAI reader** → `crewai-forensics/reader/` (port 3200)
- **Multica reader** → `multica-forensics/reader/` (port 3300)

**The markdown is the source of truth.** Readers are generated from it and never edited by hand.

---

## The platforms (from `platforms/references.md`)

| Platform | Repo | Status |
|---|---|---|
| **Hermes** | `NousResearch/hermes-agent` | **STUDIED — 13/13 (the main engine; never forked)** |
| **Paperclip** | `paperclipai/paperclip` | **STUDIED — 7 batches + pin (ancestor of our fork)** |
| **crewAI** | `crewaiinc/crewai` | **STUDIED — 7 batches + pin + reader** |
| **multica** | `multica-ai/multica` | **STUDIED — 7 batches + pin + reader (75 findings). The closest neighbour studied: all three poles are real.** |
| **gastown** | `gastownhall/gastown` | **IN PROGRESS — b00–b05 done; 1 batch left (b06), then the synthesis** |
| n8n | `n8n-io/n8n` | to study |
| buzz | `block/buzz` | to study |
| openrig | `mvschwarz/openrig` | to study |
| mattermost | `mattermost/mattermost` | to study |
| zulip | `zulip/zulip` | to study |

---

## The method for each platform study

Inherited from the Hermes study and **binding**:

1. **Docs are claims; code is the authority.** Where they disagree, the code wins and the disagreement is
   recorded.
2. **Every number is measured** at the time of writing.
3. **Claims carry their evidence** (`file:line`).
4. **Two value questions per capability** — Q1 user value, Q2 vision value.
5. **No comparison to our own platform inside a batch** — that is the mapping step.
6. **Every capability is named**, including ones we will not use.
7. **Findings are additive**, never overwritten.
8. **Plain words** — a one-sentence gloss before any detail.
9. **Every finding is tagged with its pole** (P1/P2/P3/PX-W/PX-F/PZ).
10. **The retirement rule** — before reusing any setting from an older document, search that platform's
    migrations/config for a retirement entry (a silently-removed feature is the most valuable finding).

---

## What happens after the studies

Then, and only then: **map every pole's findings across the platforms against `mercato`** to decide what to
**replace, build, or upgrade** — choosing, in each case, what works best with Hermes (unless Hermes already
offers something better). The output is a **clean, optimised, rich-featured SRS** that takes the best of all
and adds on top. Development follows on a **one-tenant ↔ one-Hermes** basis; the per-tenant Hermes issue is
fixed later.

---

*Begun 2026-10-15. Hermes, Paperclip, CrewAI and Multica closed; Gas Town in progress (b05 of 07); five
platforms remain.*
