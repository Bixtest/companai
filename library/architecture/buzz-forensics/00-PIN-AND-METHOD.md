# buzz Study — Batch 00: the pin, the method, and what this study is

**Folder:** `library/architecture/buzz-forensics/` · **Status:** OPEN — begun 2026-10-16
**This is a clean forensic study**, run the same way as `hermes-forensics/`,
`paperclip-forensics/`, `crewai-forensics/`, `multica-forensics/`, `gastown-forensics/` and
`n8n-forensics/`. It reads ONE source tree, measures it, and verifies every load-bearing claim
against the source code. **Nothing from any earlier study is reused, referenced, or assumed** — buzz is
read on its own terms.

**Why this platform is seventh.** The owner's ruling was *"one platform at a time"*: Hermes, Paperclip,
CrewAI, Multica, Gas Town and n8n are closed. **buzz is seventh** — the owner named it with one word,
*"buzz"*, following the workshop's own order. It is the first platform in this study that is **not
primarily a workflow tool or an agent orchestrator, but a communication substrate**: a team workspace
built on a public protocol (Nostr), where a message, a reaction, a workflow step, a canvas edit, a code
review approval and a git event are **all the same kind of object** — a signed event in one log. Six
platforms have now been measured against the three poles; **buzz is the first whose stated premise is
that the workspace *is* the event log**, and the first whose tenant boundary is **proven with formal
methods** rather than asserted in prose.

**The owner's directive carried into this study** (from the n8n brief, still in force): identify what
fits the vision **and** what could be *taken further*. Per the method, the batches stay
comparison-free — the "take it further" notes are **observations** in the synthesis, and the decisions
stay the owner's at the mapping pass.

---

## 1. THE PIN — task zero, answered by measurement

**The source of this study is: `library/architecture/platforms/_extracted/buzz-main/`** — extracted from
`library/architecture/platforms/buzz-main.zip`, which came from `https://github.com/block/buzz`.

| Fact | Value | How measured |
|---|---|---|
| Origin | `https://github.com/block/buzz` (`main`) | the owner's `platforms/references.md` |
| **Zip md5** | **`1219b15bef421e560e818fc000e7d72e`** | `md5sum` |
| Zip | `platforms/buzz-main.zip` — **48,764,159 B** (46.5 MB) | `ls -la` |
| Zip entries | **6,492 = 685 directories + 5,807 files** | `zipfile.namelist()` |
| Uncompressed (on disk) | **100,444,402 B** (95.8 MB) | `du -sb` over the extract |
| **Extraction** | `platforms/_extracted/buzz-main/` — **verified exact: 5,807 of 5,807 files, 0 missing, 0 extra** | a Python set-diff of the zip's namelist against the disk |
| **MAX_PATH check** | **max path = 118 characters** — no limit hit | `find \| awk '{print length($0)}' \| sort \| tail -1` |
| **`.git` present?** | **NO** — this is an extract, not a clone | `ls -d .git` → absent |
| **Declared version** | **`v0.5.28`** (the top `##` heading of `CHANGELOG.md`) | root `CHANGELOG.md:3` |
| Product one-liner | *"A workspace where humans and agents build together, on a relay you own."* | `README.md:5` |
| Vision one-liner | *"The relay is the workspace"* | `VISION.md:1` |
| Toolchain | **Rust `1.95.0`** (`rust-toolchain.toml`) · crate edition 2021, `rust-version = 1.88.0` · **pnpm `11.4.0`** · Tauri 2 + React 19 (desktop) · Flutter (mobile) | `rust-toolchain.toml`, `Cargo.toml`, `package.json` |
| Key md5s | `README.md` `882234719c51f81fa3cc4ba317319e74` · `ARCHITECTURE.md` `fc969585e197f6fdafefd4e57de346a3` · `VISION.md` `73784cb454cd21ed5841adac193260ef` · `CHANGELOG.md` `24a7ee80382670303fc4fbe9c975130d` | `md5sum` |

### 1.1 The identity limit (stated, not glossed)

There is **no `.git`**, so the exact upstream commit cannot be read from the tree. What *is* readable is
the **latest changelog release heading — `v0.5.28`** — and, unusually, the changelog entries carry
**the upstream commit SHAs and PR numbers inline** (`… ([#8186](https://github.com/block/buzz/pull/8186))
([`8f66f705…`](https://github.com/block/buzz/commit/8f66f705…))`). **The tree is richer in provenance than
n8n's was**: 445,253 bytes of changelog with real commit hashes. **Any claim here about "the latest
buzz" is a claim about this extract, at `v0.5.28`.**

**⚠️ A naming hazard a later reader must be told, because it will confuse them.** The product is called
**buzz**, but the code speaks three other names:

- the Cargo workspace `repository` field points at **`https://github.com/block/sprout`** (a former name);
- the root `package.json` names the JS workspace **`buzz-workspace`**, and one crate is **`sprig`**
  (there is a whole `Dockerfile.sprig` and a `[profile.sprig]` release profile);
- the zip is **`buzz-main.zip`** and every crate is prefixed **`buzz-`**.

So **buzz · sprout · sprig all appear in the same tree and mean the same product at different times.**
This is the study's first measured rename; it is recorded here so no batch mistakes "sprout" or "sprig"
for a second product or a dependency.

### 1.2 Where the extract lives, and why it is where n8n is not

Unlike n8n (which had to be extracted to `C:\n8n` because its longest paths exceeded Windows' 260-char
`MAX_PATH`), **buzz extracted cleanly into the conventional location** `platforms/_extracted/buzz-main`.
The measured reason: **buzz's longest path is 118 characters** — far under the limit. **The
conventional location is correct for this study; nothing special is required to reproduce it.**

---

## 2. What the tree contains (measured)

### 2.1 This tree is CODE — a polyglot monorepo

Measured by extension over the whole tree (files / bytes):

| Extension | Files | Bytes | What it is |
|---|---:|---:|---|
| **`.rs`** | **1,043** | **27,620,949** | **the server — the product's centre of gravity** |
| `.ts` | **1,251** | 9,345,266 | TS clients + tooling; **the most files** |
| `.tsx` | 756 | 6,241,124 | the **React** desktop/web surface |
| `.dart` | **695** | 7,265,890 | the **Flutter** mobile app |
| `.mjs` | 773 | 5,454,301 | scripts |
| `.sql` | **221** | 413,869 | migrations + schema |
| `.md` | 175 | 2,363,321 | docs (see §2.4) |
| `.png` | 137 | **22,227,625** | **screenshots and assets — the single largest byte block after `.rs`** |
| `.swift` | 73 | 848,801 | iOS glue |

**Two facts stand out immediately, and both are hazards of the same kind as earlier studies:**

- **Rust is the product.** `.rs` is 27.6 MB against `.ts`+`.tsx` at 15.6 MB — **the server was chosen
  deliberately and is the majority language by bytes.** A reader who assumes "another TS monorepo"
  (as n8n was) will misread this study.
- **`.png` is 22.2 MB — nearly as much as all the Rust.** The screenshots in `docs/assets/screenshots/`
  are a large fraction of the repo by bytes. **A "repo size" reading here is ~22 % pictures**, and a
  byte-share table that ignores this will overstate the code's share of the download.

### 2.2 The measured shape (per area)

| Area | Files | Bytes | What it is |
|---|---:|---:|---|
| **`desktop/`** | **3,424** | **47,007,177** | **the Tauri + React desktop app — the largest area by both counts** |
| **`crates/`** | 645 | **21,720,897** | **the Rust server — 34 crates** |
| `mobile/` | 904 | 15,272,755 | the Flutter app |
| `docs/` | 82 | **11,596,274** | docs **including the screenshots** (the `.png` weight above) |
| `benchmarks/` | 116 | 1,344,876 | benchmarks |
| `migrations/` | 62 | 263,055 | **62 migrations** |
| `schema/` | 147 | 112,370 | the desired-state schema, **one file per table** |
| `web/`, `admin-web/`, `deploy/`, `scripts/` | … | … | the web client, the admin console, deployment, tooling |

**The shape is the opposite of what "a Nostr relay" suggests.** The Rust server is **34 crates /
645 files**, but the **desktop app is 5× its file count and 2× its bytes**. **The client is bigger than
the server here** — the first platform in this study where that is true by a wide margin.

### 2.3 The test ratio — measured before any finding was written, and corrected

**This is the study's most important measurement, because the first reading of it was wrong.**

- **By filename** the count says **45 of 537 `.rs` files in `crates/` are tests — an 8.4 % share by
  file, or 0.3 % if you only count files literally named `*_test.rs`.** That is what a naive pass finds.
- **By lines** — counting `tests/`, `benches/` and `examples/` directories as test, and splitting each
  inline `#[cfg(test)]` module out of its file — the truth is:

  **`crates/` = 502,880 Rust lines = 194,631 product + 308,249 test → a 61.3 % test share.**

**The filename count and the line count differ by a factor of ~7 by file and ~200× on the "0.3 %"
reading — and the real answer is the HIGHEST test share in the entire study** (Gas Town 46 %, Multica
48 %, n8n 32.8 %). **The reason is structural:** buzz writes its tests **inline in the same file**, after
a `#[cfg(test)]` marker, so the *file* is a product file and the *majority of its lines* are test. **Any
"lines of Rust" figure in this study is 61.3 % test code unless it says otherwise — and this pin says so
once, here, so every later batch can cite it.**

*(The correction is recorded rather than quietly fixed, because it is rule 1 in action: the first number
was a filename artifact, the code was the authority, and the disagreement is now on the record.)*

### 2.4 The module map (measured — the object of batches 01–06)

**34 Rust crates** (`crates/`, the YAML workspace member list names 34 + `examples/countdown-bot`):

| Group | Crates |
|---|---|
| **Protocol / core** | `buzz-core` (event, kind, filter, tenant, channel, thread_window, pairing) · `ifc-core` |
| **Server** | **`buzz-relay`** · `buzz-pubsub` · `buzz-db` · `buzz-auth` · `buzz-search` · `buzz-audit` · `buzz-deletion` · `buzz-media` · `buzz-workflow` · `buzz-push-gateway` · `buzz-backend-kubernetes` · `buzz-datastore-tracing` |
| **Agents** | **`buzz-acp`** · **`buzz-agent`** · **`buzz-dev-mcp`** · `buzz-persona` · `buzz-voice` · `buzz-audio-client` |
| **Clients / SDK** | `buzz-sdk` · `buzz-cli` · `buzz-ws-client` · `buzz-test-client` · `buzz-admin` · `buzz-pairing-cli` |
| **Mesh / federation** | `buzz-relay-mesh` (uses **iroh**) · `buzz-pair-relay` · `buzz-mesh-smoke` |
| **Git** | `git-credential-nostr` · `git-sign-nostr` |
| **Platform** | `buzz-feature-flags` · `buzz-conformance` · **`sprig`** (the deploy-anywhere installer) |

**The names are the domain, and they already answer the three poles** (verify each; do not assume):
**P1** = `buzz-agent` + `buzz-acp` + `buzz-dev-mcp`; **P2** = `buzz-relay` + `buzz-auth` + `buzz-db` +
`buzz-core::tenant`; **P3** = `buzz-workflow`.

### 2.5 The doc set — 22 root markdown files, 11 of them VISION

- **11 `VISION_*.md` docs** — `VISION.md` plus `_SOVEREIGN`, `_PROJECTS`, `_AGENT`, `_MESH`,
  `_MOBILE`, `_MODERATION`, `_REMOTE_AGENTS`, `_ACTIVITY`, and one `CONTEXT.md`.
- **`ARCHITECTURE.md` 956 lines / 57,799 B** — the relay model and the community/host authority rule.
- **`NOSTR.md` 398 lines** — the protocol primer.
- **`AGENTS.md` 794 lines / 41,038 B** — the repo's own agent-instruction file (as n8n had).
- **`docs/multi-tenant-relay.md` 1,110 lines** — the tenant-boundary spec.
- **`docs/formal/` + `docs/spec/`** — see §2.6.
- **20 custom NIPs** (`docs/nips/NIP-*.md`, 22 files counting the two `NIP-MP` fixture JSONs):
  `AA AE AM AO AP AR CL CW DV ER FA FI GS IA MP OA PL PMA RS WP` — i.e. buzz defines its own
  protocol extension set beyond standard Nostr.
- **`Justfile` 1,354 lines** — the task runner (the repo's real command surface).

### 2.6 The measured oddity: formal-method proofs live IN the tree

This is the first platform studied to ship **machine-checkable models of its own guarantees**:

| File | Size | What it models |
|---|---|---|
| **`docs/spec/MultiTenantRelay.tla`** | **61,202 B** | **the multi-tenant relay — isolation** (TLA+) |
| **`docs/spec/MultiTenantAuth.spthy`** | **31,956 B** | **authorization** (Tamarin prover) |
| `docs/spec/GitOnObjectStore.tla` | 13,872 B | git-on-object-storage correctness |
| `crates/buzz-core/src/pairing/NIP-AB.spthy` | — | the pairing protocol |

**The vision doc claims *"Isolation is the boundary, not a filter… proven, not asserted"* — and the
prover inputs are present to be checked.** Under rule 1 this is not a claim to accept on the doc's word;
it is a **model to be read in batch 02/03**, but its *existence* is a measured fact about the tree.

### 2.7 The licence — Apache-2.0, and it is NOT a gate

`LICENSE` is the **Apache License, Version 2.0** in full; `Cargo.toml` declares
`license = "Apache-2.0"`. **There is no `.ee`-style carve-out, no "Sustainable Use" clause, no
enterprise directory.** This is the study's **first genuinely open-source platform** — and it is a sharp
contrast with n8n (§2.5 of that pin: fair-code, `.ee` unlicensed, `ai-workflow-builder.ee` gated).
**Recorded because it changes one thing materially:** unlike n8n, where the licence constrains every
"can we take this?" question, here the licence does not. **The constraint is architectural, not legal** —
which is exactly why the study still reads the code rather than assuming "open source means usable".

---

## 3. The method (how every batch is produced)

The method is **inherited verbatim** from the six closed studies (rules 1–10), with the pole frame
(§3.1) and the additive-across-studies rule (§3.2) as before.

1. **Docs are claims; code is the authority.** Every load-bearing statement is checked against the
   source. Where they disagree, **the code wins and the disagreement is recorded.**
2. **Every number is measured at the time of writing**, never carried from memory or an older document.
3. **Claims carry their evidence**: a line resting on code cites the file and line it was read at.
4. **Two value questions per capability**: **Q1 · USER VALUE** (how it serves a person using the platform)
   and **Q2 · VISION VALUE** (how it serves the AI-first business & resources planner vision, incl.
   versatility and integratability).
5. **No comparison to our own platform inside the batches.** The cross-platform mapping is a separate
   later pass.
6. **Every capability is named, including ones we will not use.** Nothing is silently dropped.
7. **Findings are additive and never overwrite history.**
8. **Plain words** — every capability gets a one-sentence plain gloss before any detail.
9. **THE POLE FRAME.** Every finding is tagged **P1 / P2 / P3 / PX-W / PX-F / PZ**.
10. **The retirement rule.** Before reusing any setting/key/module named in an older document or another
    platform's doc, **search this platform's config/CHANGELOG for a retirement entry.** buzz has a
    **445 KB changelog with inline commit hashes**, and it **renames its own product** (§1.1) — so the
    retirement surface here is unusually active.

### 3.1 The pole frame — the three poles, defined once

| Tag | Pole | The owner's words (abridged) |
|---|---|---|
| **P1** | **The aissistant** (the AI user / agent) | *versatile, integratable, rich featured architecture in itself, deployable in different contexts (workspaces, automations, later the studio)* |
| **P2** | **The workspace** | *highly functional, versatile, integratable, rich featured, adaptable to the mix of current and future features, use-cases and needs* |
| **P3** | **Automations** | *where agents work on assigned tasks, assign tasks, etc. Paperclip is a blueprint* |
| **PX-W** | **Widgets architecture** | cross-cutting: the composable UI surface |
| **PX-F** | **Frontend wiring & construction** | cross-cutting: how the surface is built and wired |

**Plus one escape hatch (PZ):** *"any other findings you identify there that can fit our vision, project,
architecture, or a potential use case or added value for the end user."* Tagged **PZ** with a one-line
reason for keeping them.

### 3.2 Additive across studies, like rule 7 within a study

This study does not rewrite the six closed studies. Where a buzz finding **confirms, contradicts or
extends** an earlier finding, it is recorded as a cross-study note naming the earlier batch — so a
reader can trace both directions. Cross-study notes are **observations**, never decisions.

---

## 4. The batch plan (each documented as it is completed)

Findings are organised **per pole**, one file per pole, plus an overview and a synthesis. buzz's pole
weighting is expected to differ from all six earlier studies — **P2 (the workspace/tenancy boundary) and
P1 (agents-as-members) are expected to be the strongest, P3 possibly the thinnest** — but the structure
is identical so the later mapping is a per-pole join.

| # | Batch / File | Pole | What it answers |
|---|---|---|---|
| **00** | **This file** — pin and method | — | task zero + method + pole frame |
| **01** | `findings/01-platform-overview.md` | — | What is buzz? the protocol (Nostr/NIP-01), the crate map, the relay, the surfaces, the community model |
| **02** | `findings/02-the-aissistant.md` | **P1** | the agent surface: `buzz-agent`, `buzz-acp`, `buzz-dev-mcp`, agent identity/keys, the ACP harness, `buzz-persona`, remote agents |
| **03** | `findings/03-the-workspace.md` | **P2** | the workspace: the event log, channels/DMs/forum, `buzz-auth`, `buzz-core::tenant`, the community boundary, **the TLA+/Tamarin isolation model**, `buzz-db` + migrations |
| **04** | `findings/04-automations.md` | **P3** | `buzz-workflow`: YAML-as-code, triggers (message/reaction/schedule/webhook), approval gates, traces, huddles |
| **05** | `findings/05-widgets-and-frontend.md` | **PX-W / PX-F** | **the composition surface**: the Tauri/React desktop app, canvases, the Flutter mobile app, the web/admin clients, the design system |
| **06** | `findings/06-out-of-pole.md` | **PZ** | everything else: search, audit, media, git hosting, relay mesh/federation, voice, feature flags, `sprig`, deployment, moderation, security |
| **07** | `findings/07-SYNTHESIS.md` | all | what buzz teaches each pole; the ranked mechanisms; **and the "what fits / what could be taken further" notes** |

**Each batch document carries:** (a) what was read and its measured size; (b) a **capability table tagged
by pole** with **Q1 · Q2**; (c) the code verification with `file:line` evidence and any **doc-vs-code
divergence**; (d) findings carried forward.

---

## 5. The owner's directive for this study

Carried forward from the n8n brief, unchanged:

1. **What fits the vision** — answered per capability in the batches and ranked in batch 07.
2. **What could be taken further** — recorded as **observations** in batch 07 §7, never as decisions.

**The method's discipline still holds inside the batches:** rule 5 (no comparison to our own platform)
applies to batches 01–06. The synthesis (§7) may name a mechanism as *extensible* — e.g. "this pattern
would allow X" — but it must stop at the observation. **The mapping pass and the owner decide.**

**And — unlike n8n — there is no licence gate to carry.** Apache-2.0 (§2.7). The discipline that
replaces it is the study's own: **read every claim against the code, because open source means readable,
not correct.**

---

## 6. Ground rules restated as a checklist the reader can hold this study to

- Is the claim measured, or remembered? → must be measured.
- Does the line rest on a doc, or on code? → **code, always.**
- If doc and code disagree, is the disagreement recorded? → must be.
- Is every capability named, including the ones we will not use? → must be.
- Is every finding **tagged with its pole** (P1/P2/P3/PX-W/PX-F/PZ)? → must be.
- Are the two value questions answered in the owner's words? → yes, per capability.
- Is there any comparison to our own platform in a batch? → must be none; that is the later mapping pass.
- Before reusing an older-doc setting, was the retirement rule run (rule 10)? → must be — **and note
  that this platform renames itself (buzz/sprout/sprig, §1.1), so names are a retirement surface.**
- **Does the line count say whether it includes tests?** → with **61.3 % of `crates/` Rust lines being
  tests**, every count in this study states its basis.
- **Is a formal-methods file being read as a guarantee?** → no: it is a **model** to verify against the
  code (rule 1).

---

## 7. How this study relates to the workshop folder

```
library/architecture/
├── hermes-forensics/          # the Hermes study (mirror; gitignored copy)
├── paperclip-forensics/       # the Paperclip study (CLOSED 7/7) + reader/
├── crewai-forensics/          # the CrewAI study (CLOSED 7/7) + reader/
├── multica-forensics/         # the Multica study (CLOSED 7/7) + reader/
├── gastown-forensics/         # the Gas Town study (CLOSED 7/7) + reader/
├── n8n-forensics/             # the n8n study (CLOSED 7/7) + reader/ (port 3500)
├── buzz-forensics/            # THIS study
│   ├── 00-PIN-AND-METHOD.md
│   └── findings/              # 01..07
├── reader/                    # the Hermes reader (user-facing HTML)
└── platforms/
    ├── *.zip                  # the raw platform archives (gitignored)
    ├── references.md          # repo link per platform
    └── _extracted/            # working trees (gitignored) — buzz is here, cleanly (§1.2)
```

**Per-platform reader:** a reader for buzz is built at the **end** of this study, from its markdown,
using the platform-agnostic generator proven for Paperclip, CrewAI, Multica, Gas Town and n8n
(`generate-reader.js` + a `DOCS_CONFIG` block + a `diagrams.js`). **The markdown is the source of truth;
the reader renders it and never edits it.** Ports used so far: 3000 Hermes · 3100 Paperclip · 3200
CrewAI · 3300 Multica · 3400 Gas Town · **3500 n8n** → **buzz will be port 3600.**

*(Three cautions carried in from earlier readers: the engine is not fully platform-agnostic — lesson
L168, where a copied `assets/reader.js` still defined `window.GasTownReader` while the pages called
`window.N8nReader`; a copy-then-swap is exactly where another platform's vocabulary leaks in, so the new
tree must be grepped for the old platform's vocabulary before building; and a whitespace/encoding check
must count **characters**, not bytes — the HOW-TO's earlier "byte count" stability check was wrong.)*

---

*Batch 00 of 07. Begun 2026-10-16. Next: `findings/01-platform-overview.md`.*
