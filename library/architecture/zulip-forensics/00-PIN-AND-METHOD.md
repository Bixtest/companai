# Zulip Study — Batch 00: the pin, the method, and what this study is

**Folder:** `library/architecture/zulip-forensics/` · **Status:** OPEN — begun 2026-10-16
**This is a clean forensic study**, run the same way as `hermes-forensics/`,
`paperclip-forensics/`, `crewai-forensics/`, `multica-forensics/`, `gastown-forensics/`,
`n8n-forensics/`, `buzz-forensics/` and `openrig-forensics/`. It reads ONE source tree,
measures it, and verifies every load-bearing claim against the source code. **Nothing from any
earlier study is reused, referenced, or assumed** — Zulip is read on its own terms.

**Why this platform is ninth.** The owner's ruling was *"one platform at a time"*. Eight are
closed: Hermes, Paperclip, CrewAI, Multica, Gas Town, n8n, buzz, openrig. The owner's own
`platforms/references.md` names the remaining two in order — **mattermost, zulip** — and the
owner chose **zulip** as the ninth.

Zulip is the first platform in this study that is a **mature, decade-old, production chat
product run by thousands of organisations** (the README claims "over 1,500 contributors").
Where buzz was a young reimplementation of team chat on Nostr, Zulip is the real thing —
19 years of design decisions, a hosted-service business behind it, and a documentation body
large enough to *measure* against the code. It is also the first platform whose tenancy model
is **a first-class, separately-documented subsystem** (`docs/subsystems/realms.md`), which
makes it the strongest P2 counterweight the study has yet seen to openrig's *no-tenancy*.

**The owner's directive carried into this study** (from the n8n, buzz and openrig briefs,
still in force): identify what fits the vision **and** what could be *taken further*. Per the
method, the batches stay comparison-free — the "take it further" notes are **observations** in
the synthesis, and the decisions stay the owner's at the mapping pass.

---

## 1. THE PIN — task zero, answered by measurement

**The source of this study is:** `library/architecture/platforms/_extracted/zulip-main/` —
extracted from `library/architecture/platforms/zulip-main.zip`, which came from
`https://github.com/zulip/zulip`.

| Fact | Value | How measured |
|---|---|---|
| Origin | `https://github.com/zulip/zulip` (`main`) | the owner's `platforms/references.md` |
| **Zip md5** | **`f9cea131769925ceb01e64ea78c4113e`** | `hashlib.md5` |
| Zip | `platforms/zulip-main.zip` — **63,499,938 B** (60.6 MB) | `os.path.getsize` |
| Zip entries | **9,847 = 831 directories + 9,016 files** | `zipfile.namelist()` |
| **Extraction** | `platforms/_extracted/zulip-main/` — **9,009 of 9,016 files (99.92%)** | a Python existence check per zip entry |
| **The 7 that did not extract** | all **binary Mattermost-import test fixtures** under `zerver/tests/fixtures/mattermost_*/` — 4 `.png`, 1 `.mp4`, 1 `.jpg`, 1 `.txt` | see §1.2 |
| **MAX_PATH hazard** | **max path = 233 characters**, but the *absolute* target path reaches **309** — 7 files exceed Windows' 260-char limit | `max(len(...))` over the zip namelist |
| **`.git` present?** | **NO** — this is an extract, not a clone | `ls -d .git` → absent |
| **Declared version** | **`12.0-dev+git`**; latest release **`12.3`**; `API_FEATURE_LEVEL = 513`; `PROVISION_VERSION = (392, 0)` | `version.py` |
| Product one-liner | *"an open-source organized team chat app with unique topic-based threading that combines the best of email and chat"* | `README.md:3` |
| Toolchain | **Python ≥3.10** + **Django 5.2** (backend) · **TypeScript/Node + pnpm** (web) · PostgreSQL · Redis · RabbitMQ | `pyproject.toml`, `package.json` |
| Licence | **Apache-2.0** | `LICENSE:2` |

### 1.1 The identity limit (stated, not glossed)

There is **no `.git`**, so the exact upstream commit cannot be read from the tree. What *is*
readable is `version.py`'s **`ZULIP_VERSION = "12.0-dev+git"`** — a `main`-branch development
string, not a tagged release — beside `LATEST_RELEASE_VERSION = "12.3"` and
`LATEST_MAJOR_VERSION = "12.0"`. `version.py` tries to read a `zulip-git-version` file that
**does not exist in the extract** (it is generated at build time), so the commit hash is
unavailable. **Any claim here about "the latest Zulip" is a claim about this extract, at
`12.0-dev+git` (the 12.x line, past the 12.3 release).**

**⚠️ The one version trap in this tree.** `version.py` also carries **three compatibility
constants that are NOT the version of this tree**: `DESKTOP_MINIMUM_VERSION = "5.4.3"` and
`DESKTOP_WARNING_VERSION = "5.9.3"` are the *desktop-app* gates (a different product line,
`zulip-desktop`, versioned independently), and `API_FEATURE_LEVEL = 513` is a *monotonic API
counter*, not a release number. A later reader must not read `5.4.3` or `513` as the study's
pin. **The pin is `12.0-dev+git`; the others are contract constants.**

### 1.2 The seven missing files — measured, named, and dismissed as inert (a pin finding)

The extraction **did not silently truncate**: every file was attempted and the failures
enumerated. **7 of 9,016 files (0.08%)** could not be written because their absolute paths
exceed 260 characters on Windows. All 7 are **test fixtures for the Mattermost data-importer**
— binary assets used to exercise an *import* tool, not any part of Zulip's own architecture:

| File | Type |
|---|---|
| `.../mattermost_fixtures/.../harry-ron.jpg` | image |
| `.../mattermost_fixtures/.../this is a file` | binary blob |
| `.../mattermost_v11.1.0_fixtures/.../Recording 2026-01-19 203522.mp4` | video |
| `.../mattermost_v11.1.0_fixtures/.../Screenshot 2025-12-19 210913.png` | image |
| `.../mattermost_v11.1.0_fixtures/.../text file.txt` | text |
| `.../mattermost_v11.6.0_fixtures/.../Screenshot 2026-03-10 210730.png` | image (×2) |

**Why this does not weaken the study.** (1) They are *fixtures*, not source — no `.py`, `.ts`,
`.md` or config file is missing. (2) They belong to `data_import/`, which the pin does not
study. (3) The fixture *directory tree* extracted intact, so the parent structure (which reveals
how the importer works) is present. **Rule 1 is satisfied: the absence is stated, not hidden;
13 of the 14 long paths are directories or these fixtures, and the study does not depend on
any of them.** The one honest consequence: any future claim of the form *"the Mattermost
importer accepts file X"* cannot cite this extract for byte-exact fixture content.

### 1.3 Where the extract lives

```
library/architecture/platforms/_extracted/zulip-main/    ← the source under study (gitignored)
library/architecture/platforms/zulip-main.zip            ← the archive (md5 recorded above)
library/architecture/zulip-forensics/                    ← this study
  ├── 00-PIN-AND-METHOD.md
  ├── findings/01-platform-overview.md … 07-synthesis.md
  └── reader/                                            ← built at the END (port 3800)
```

---

## 2. What the tree contains (measured)

### 2.1 This tree is a hybrid — a mature Python backend with a large TypeScript client

Measured with a Python `os.walk` (not `wc -l | tail -1`, which **lies** when the argument list
is split across `xargs` batches — see §2.3):

| Substrate | Files | Lines |
|---|---|---|
| **Python (all)** | **2,037** | **425,702** |
| — Python excluding migrations | 1,079 | 385,211 |
| — Python migrations | 958 | 40,491 |
| — Python tests | 172 | **182,992** (43% of all Python) |
| **TypeScript (`.ts`/`.tsx`, all)** | **471** | **153,253** |
| Markdown (all) | 422 | 63,466 |
| Django templates (`.hbs`) | 473 | — |
| Locale files (`.po`) | 50 | — |

**The shape of it.** A Python/Django monolith (`zerver/`, `corporate/`, `analytics/`) with a
substantial hand-written TypeScript client (`web/src/`, `web/`) — **not** a React SPA. The web
client is server-rendered HTML + hbs templates hydrated by ~463 `.ts` modules under `web/src/`,
organised by *feature* (`compose_*.ts` ×20, `message_*.ts` ×30, `settings_*.ts` ×20). The
1,763 `.json` files are overwhelmingly test fixtures and API-schema data, not configuration.

### 2.2 The measured distribution

| Area | Files | Notes |
|---|---|---|
| `corporate/` | 1,735 | Billing + support (the hosted-service side) — **99 Python files / 32,090 LOC** |
| `web/` | 1,491 | The TypeScript client |
| `zerver/` | 1,186 | The core Django app |
| `static/` | 625 | Third-party + generated assets |
| `starlight_help/` | 512 | The help-centre site (Astro) |
| `templates/` | 369 | Server-rendered HTML |
| `puppet/` | 272 | Deployment manifests |
| `docs/` | 224 | **The contributor documentation — 249,760 words** |
| `locale/` | 143 | Translations |
| `tools/` | 201 | Dev tooling + linters |
| `analytics/` | 43 | The analytics subsystem (separate Django app) |

### 2.3 The rule-1 caution — a count that lied, caught in the pin

The first pass at "how much Python is there" produced **13,952** lines via
`find … | xargs wc -l | tail -1`. That number is **wrong by 30×**. `xargs` split the 2,037
filenames into multiple `wc` invocations, and `tail -1` showed only the **last batch's** total.
The honest measurement is a walk that sums per-file: **425,702**. **This is the same failure
mode that memory already records for `grep -c $'\r'`** — a shell pipeline quietly reporting a
*subset*. The corrected number is used everywhere in this study.

### 2.4 The three "architecture docs" that matter (rule 1 — a claim is a claim)

Zulip ships **249,760 words** of contributor documentation across 182 markdown files, of which
the `docs/subsystems/` directory holds **35 named subsystem documents** — `realms.md`
(the tenancy model), `queuing.md`, `events-system.md`, `sending-messages.md`,
`database-concurrency.md`, `caching.md`, `widgets.md`, `schema-migrations.md` and more. This is
the **richest first-party documentation body in the study** (n8n shipped 45 pages × 5 languages;
Zulip ships a whole contributor manual). **Per rule 1, none of it is accepted as truth** — every
claim is traced to code — but its existence, and the *fact that it names subsystems*, is itself
a finding about how this project thinks about its own architecture.

---

## 3. The three poles — the frame for every batch (carried from the workshop)

1. **P1 — the aissistant.** How does a conversation with a machine happen? Agents, bots,
   tool-calls, the seam between the platform and the model.
2. **P2 — the workspace.** How is a *tenant* represented? What is the container, the membership
   model, the permission surface? **This is Zulip's strongest documented pole** (`realm`).
3. **P3 — automations.** How does something run *without a human*? Schedulers, queues,
   webhooks, outgoing bots, the delivery guarantee.

Plus the cross-cutting lenses: **PX-W** (the widget/composition surface) and **PX-F** (the
frontend architecture), and **PZ** (the out-of-pole escape hatch — security, tooling, the
verification culture).

## 4. The method (inherited, binding — from `library/development/WORKING-RULES.md`)

- **Rule 1 — docs are claims, code is the authority.** Count FIRST (rule 0b).
- **Rule 5 — no comparison to our own platform inside a batch.** Comparisons are the synthesis'
  job, and even there they are *observations*, not decisions.
- **Rule 6 — name every capability.** A mechanism without a name cannot be discussed.
- **Rule 9 — pole-tag everything** (P1/P2/P3/PX-W/PX-F/PZ).
- **Rule 10 — the retirement rule.** What was built, then removed, is the most honest evidence.
- **Rule 13 — never let a number stand unverified.** Re-measure before citing.
- **Never `git add -A`.** Plain-English reporting; never end on "your call".

## 5. The batch plan (7 batches + this pin)

| # | Batch | Pole | The question it answers |
|---|---|---|---|
| 00 | **the pin, the method, and the pack** *(this)* | — | What exactly is under study, and how big is it? |
| 01 | the platform overview | — | What is Zulip, as one measured picture? |
| 02 | the aissistant | **P1** | How does a machine participate in a conversation? |
| 03 | the workspace | **P2** | How is a realm (tenant) built and fenced? |
| 04 | automations | **P3** | How does something run without a human? |
| 05 | widgets & frontend | **PX-W / PX-F** | What composes, and how is the client built? |
| 06 | out-of-pole | **PZ** | Security, tooling, and the verification culture. |
| 07 | the synthesis | — | Where Zulip sits, what we take, what we don't. |

**Batch 05 will answer the study's sharpest open question first:** whether Zulip is the **first
platform in this study with a genuine widget model** — the pin's early probe already found
`widget_schema.ts` (a zod discriminated union), `widgetize.ts`, `poll_widget.ts`,
`todo_widget.ts` and `docs/subsystems/widgets.md`, which points to **yes**. Six platforms
(Paperclip, Multica, Gas Town, buzz, openrig, and CrewAI) had none.

---

*Zulip study · Batch 00 · the pin is `12.0-dev+git` · the extract is 99.92% complete · the
weaker shell readings in this batch are the point of the method, not an accident.*
