# The Architecture Workshop

**This folder is the workshop for the platform-engineering stage of the project.**

Its job: **study the platforms we might learn from or borrow from, one at a time, the same forensic way we
studied Hermes** — then (a later step) map each finding against what `mercato` already has, and produce the
final SRS.

> **Where we are.** Step 1 of the owner's plan — *"ironing out the full Hermes understanding"* — is **done**
> (the Hermes study, closed). **Nine platforms are studied and closed** (Hermes ✅ · Paperclip ✅ · CrewAI ✅ ·
> Multica ✅ · Gas Town ✅ · n8n ✅ · buzz ✅ · openrig ✅ · zulip ✅ — each with its own reader and verification
> report) and
> **the cross-platform MAPPING PASS IS DONE**: every pole mapped across all nine platforms against mercato →
> `mapping/findings/01`–`06` (the per-pole findings) → `07-SYNTHESIS.md` → **`08-THE-SRS.md` — the requirement
> register, 53 requirements (SR-01…SR-53)**. **Two platform studies remain: `mattermost` + `activepieces`**
> (the 10th and 11th platforms — activepieces added by the owner 2026-10-16); they join the mapping as new
> columns, no rework of what is done. The owner's three poles (the aissistant / the workspace / automations)
> plus widgets and frontend wiring are the frame for every platform study.

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
├── gastown-forensics/         ← the Gas Town study (DONE, 7 batches + pin) + reader/
├── n8n-forensics/             ← the n8n study (DONE, 7 batches + pin) + reader/
│   ├── 00-PIN-AND-METHOD.md
│   └── findings/01..07
├── buzz-forensics/            ← the buzz study (DONE, 7 batches + pin) + reader/
│   ├── 00-PIN-AND-METHOD.md
│   └── findings/01..07
├── openrig-forensics/         ← the OpenRig study (DONE, 7 batches + pin) + reader/
│   ├── 00-PIN-AND-METHOD.md
│   └── findings/01..07
├── zulip-forensics/           ← the Zulip study (DONE, 7 batches + pin) + reader/
│   ├── 00-PIN-AND-METHOD.md
│   └── findings/01..07
├── reader/                    ← the Hermes reader (HTML)
└── platforms/                 ← the raw platform archives + references
    ├── *.zip                  (gitignored)
    ├── references.md          ← repo link per platform
    └── _extracted/            (gitignored) working trees — n8n is at C:\n8n instead (MAX_PATH)
```

### The readers

Each study has its own **offline HTML reader** (per the owner's ruling: *one reader per platform*). To open
one: double-click its `index.html`, or `node serve.js` inside its `reader/` folder.

- **Hermes reader** → `reader/` (port 3000)
- **Paperclip reader** → `paperclip-forensics/reader/` (port 3100)
- **CrewAI reader** → `crewai-forensics/reader/` (port 3200)
- **Multica reader** → `multica-forensics/reader/` (port 3300)
- **Gas Town reader** → `gastown-forensics/reader/` (port 3400)
- **n8n reader** → `n8n-forensics/reader/` (port 3500)
- **buzz reader** → `buzz-forensics/reader/` (port 3600)
- **OpenRig reader** → `openrig-forensics/reader/` (port 3700)
- **Zulip reader** → `zulip-forensics/reader/` (port 3800)

**The markdown is the source of truth.** Readers are generated from it and never edited by hand.

---

## The platforms (from `platforms/references.md`)

| Platform | Repo | Status |
|---|---|---|
| **Hermes** | `NousResearch/hermes-agent` | **STUDIED — 13/13 (the main engine; never forked)** |
| **Paperclip** | `paperclipai/paperclip` | **STUDIED — 7 batches + pin (ancestor of our fork)** |
| **crewAI** | `crewaiinc/crewai` | **STUDIED — 7 batches + pin + reader** |
| **multica** | `multica-ai/multica` | **STUDIED — 7 batches + pin + reader (75 findings). The closest neighbour studied: all three poles are real.** |
| **gastown** | `gastownhall/gastown` | **STUDIED — 7 batches + pin + reader (68 findings). Mechanism source + boundary-setting reference.** |
| **n8n** | `n8n-io/n8n` | **STUDIED — 7 batches + pin (73 findings) + reader (port 3500). The first platform with a real composition surface.** |
| buzz | `block/buzz` | **STUDIED — 7 batches + pin (90 findings) + reader (`bfc3833`, port 3600).** Nostr-based team workspace; Apache-2.0; 34 Rust crates; formally verified tenancy. |
| **openrig** | `mvschwarz/openrig` | **STUDIED — 7 batches + pin (79 findings) + reader (port 3700).** Orchestration substrate for **unmodified** Claude Code + Codex in tmux; Apache-2.0; 0.6.10; TS monorepo (4 pkgs). **The first platform in the study with NO tenancy at all** (0 `tenant_id`); **the strongest P1 permission seam** (the two-surface rule); and **the study's most transferable PZ** (the gate culture). No widget model. |
| **zulip** | `zulip/zulip` | **STUDIED — 7 batches + pin (12 ranked mechanisms, 30 divergences) + reader (port 3800).** Mature Django+Tornado team chat; Apache-2.0; `12.0-dev+git`; 425,702 LOC Python. **The strongest P2 in the study** (the ambient realm — the tenant is derived from the request's Host header, and email is unique only within it); **the study's first real widget model** (a widget is an append-only `SubMessage` log, replayed); **the densest PZ** (`check-schemas` across three representations, the `API_FEATURE_LEVEL` ratchet, `mark_sanitized`, `AGENTS.md`). P1 is deliberately tiny — one LLM feature fenced five ways. |
| mattermost | `mattermost/mattermost` | to study |

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

*Begun 2026-10-15. Hermes, Paperclip, CrewAI, Multica and Gas Town closed; n8n closed (7 batches
+ reader 3500); buzz closed (7 batches + reader 3600); OpenRig closed (7 batches + reader 3700);
**Zulip closed (7 batches + reader 3800)**. One platform remains (**mattermost** — ask before
extracting; the 226 MB zip is already on disk).*
