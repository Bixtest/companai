# buzz Study — Batch 07: the synthesis

**Folder:** `library/architecture/buzz-forensics/` · **Batch 07 of 07** · **Written 2026-10-16**
**Source:** `library/architecture/platforms/_extracted/buzz-main/` — the extract of
`buzz-main.zip` (md5 `1219b15bef421e560e818fc000e7d72e`), **v0.5.28**.
**Rules in force:** 0b (count first) · 1 (docs are claims, code is authority) · 5 (no
comparison *to our own platform* inside a batch — this batch keeps the same discipline and
records cross-platform observations as **observations**, with the decisions left to the owner
at the mapping pass) · 6 (name every capability) · 9 (pole-tag everything) · 10 (the
retirement rule) · 13 (never let a number stand unverified).

**What this batch is.** Batches 01–06 read buzz. This batch does three things and nothing else:

1. **Ranks buzz's mechanisms** — the ones that are evidence-backed and worth carrying, in the
   order I would act on them, each with the finding ids that back it.
2. **States what buzz contributes to the cross-platform mapping** — the poles it is strong on,
   the poles it is absent on, and the *one structural answer* it gives that no earlier platform
   gave.
3. **Records the decided limits** — the mechanisms that are good *and that we will not adopt*,
   with the reason, so a later agent does not re-litigate them.

It is **not** the mapping pass. It does not decide what we build. It hands the owner a ranked,
sourced menu.

---

## 0. What the study measured (the counts, in one place)

Six batches, 6,000+ lines of findings, every load-bearing claim checked against the source.

| Batch | Pole | Written | Headline |
|---|---|---|---|
| 00 | pin + method | ✅ | the pin: `v0.5.28`, 5,807 files, 118-char max path, no `.git`; the **rename hazard** (buzz · sprout · sprig) named up front |
| 01 | overview | ✅ | the workspace **is** the event log; **136 registered event kinds**; the client is bigger than the server; 11 `VISION_*` docs |
| 02 | **P1** aissistant | ✅ | agent = keypair + membership; memory is a custom NIP; **6 tools**; default permission mode is **`bypass-permissions`** |
| 03 | **P2** workspace | ✅ | **57 tables, 41 fenced**; isolation is **non-interference**, proven; the shipped HA is **self-declared non-conforming** |
| 04 | **P3** automations | ✅ | event-native automation; **deterministic cron, not locked**; approval gate is **dead code**; 2 of 7 actions are stubs |
| 05 | **PX-W / PX-F** | ✅ | **no widget model** (5th platform with none); **the guard-as-document pattern**; desktop is ~93% of the frontend |
| 06 | **PZ** out-of-pole | ✅ | five safety artefacts across three languages; the **prose contract**; `LIMITS.md`; the versioned audit chain |

**Measurement spine (rule 0b):** 34 crates · 62 migrations · **135 `KIND_*` event-kind
declarations, 136 entries in `ALL_KINDS`** · 57 tables (41 with `community_id`) · 5 PZ artefacts
(~196 KB counting the prose contract, of which 4 formal models ~122 KB in `.tla`/`.spthy`) ·
7 surfaces · 11 vision docs · 5 frontend apps · `desktop/` 3,424 files vs `crates/` 645.

**A number reconciled during this synthesis (rule 13).** Batch 01 reported **135 / 136**; batch 05
reported **157**. Both were measuring real things in the same 1,177-line file, and the truth is
that **all three numbers exist**: **157** total `pub const` (kinds *and* non-kind limits),
**135** `KIND_*: u32` declarations, and **136** entries in `ALL_KINDS`. The array is 136 because
it holds the 135 declared kinds **minus three deliberately unregistered** ones
(`KIND_AUTH` 22242, `KIND_NOSTR_IDENTITY_BINDING` 24243, `KIND_PUSH_LEASE` 30350 — infrastructure,
not content) **plus four alias constants that are not `KIND_`-prefixed** (`RELAY_ADMIN_ADD_MEMBER`,
`RELAY_ADMIN_REMOVE_MEMBER`, `RELAY_ADMIN_CHANGE_ROLE`, `RELAY_ADMIN_SET_WORKSPACE_PROFILE`).
**The platform's registered content-kind vocabulary is 136.** Batch 05's "157 kinds" is corrected
to this; batch 01's `135/136` was right. Recorded as **F7-1**.

**F7-1 · "The kinds count" is three counts, and the right one for a capability claim is 136.**
`crates/buzz-core/src/kind.rs` (1,177 lines) holds **157** `pub const` (kinds *and* non-kind
limits), **135** `KIND_*: u32` declarations, and **136** entries in `ALL_KINDS`. The array is
documented as *"All registered kind constants — used for duplicate detection and iteration"* and
is `135 declared − 3 unregistered + 4 aliases`. The three declared-but-unregistered kinds
(`KIND_AUTH` 22242, `KIND_NOSTR_IDENTITY_BINDING` 24243, `KIND_PUSH_LEASE` 30350) are
**infrastructure events, not content**; the four additions are the `RELAY_ADMIN_*` aliases.
**Batch 01's `135/136` was correct; batch 05's "157 kinds" was the imprecise one** and is
corrected in place.

**F7-2 · The study's two headline answers, in one place.** (i) *An event log is not a widget
model* — proven by measurement in batch 05 (27 `widget` hits tree-wide, all accounted for; no
composer anywhere). (ii) *A platform can prove isolation and then check its running code against
the proof* — the TLA+ / Tamarin / prose-contract / conformance-gate stack of batches 03 and 06.
These are the two things a later agent should know buzz for.

---

## 1. The ranked mechanisms

Ranked by **what I would act on first**, not by how impressive they are. Each row names the
finding ids that carry the evidence, so every claim is traceable into the batch that measured it.
"Transfer cost" is against **our** stack, judged from the finding, not buzz's.

### Tier 1 — adopt; cheap, general, and each answers a defect class we have already recorded

| # | Mechanism | What it is, plainly | Evidence | Transfer cost |
|---|---|---|---|---|
| **1** | **`LIMITS.md` — the gate that documents what it cannot catch** | Every guard, ratchet and gate ships with a file naming its blind spots, the owner of each gap, and any half that is **not armed**. | F6-12, F6-26, §PZ | **Very low** — a markdown file and a discipline |
| **2** | **"Prove the tripwire fires" (the mutation test)** | For every check, a second test injects the violation and asserts the check catches it. A check without this test is a gesture. | F6-7, F6-12, F6-17 | **Low** — one extra test per guard |
| **3** | **The guard-as-document pattern** | A frontend/architecture rule as an executable check: a shared `-core` script, a per-app wrapper, a **reason-annotated** allowlist keyed per-rule, and a place in the default gate. | F5-3, F5-4, F5-7 | **Low** |
| **4** | **The three projection rules (for any evidence a check reads)** | Record claimed **and** resolved; use a `Vec` not a `Set`; never filter the evidence; close error alphabets. Each has a *stated wrong answer*. | F6-10 | **Low** — rules, not code |
| **5** | **Normalize at the enforcement point, not the call site** | The RFC-3339 sub-second fix: enforce the canonical form where the decision is made, so a future caller cannot forget. Pin the **preimage**, not only the digest. | F6-16 | **Low** |
| **6** | **The generation fence at async boundaries** | On every `await`, re-read a generation counter and refuse if it moved; pass an explicit scope assertion. | F5-9 | **Low**; already a written rule in buzz — same defect class as our stale-state rows |
| **7** | **The prose contract beside the formalism** | A Scope/Non-Goals section, **one axiom per assumption**, a conformance gate per axiom, and an Implementation-Correspondence section that names the obligations which **fail silently**. | F6-26, D6-1 | **Low** — it is a document; the discipline is stating the boundary |
| **8** | **`_Avoid_:` anti-vocabulary lists / `CONTEXT.md`** | A glossary that names the words *not* to use — the cheapest defence against the L168 vocabulary-drift hazard. | F5-17, D5-3 | **Very low** |

### Tier 2 — adopt when we build the tenancy layer (buzz is the study's best worked example)

| # | Mechanism | What it is, plainly | Evidence |
|---|---|---|---|
| **9** | **The schema lint for the tenant fence** | Every scoped table `NOT NULL <tenant>`; every scoped key **led by** `<tenant>`; with an **exemption table carrying a `reason` column** so the exceptions are auditable. Runs over all 62 migrations. | F3-1, F6-4 |
| **10** | **The type fence *with its own limit stated*** | A newtype for the tenant key, no `Deserialize`/`From`, plus a lint for construction, plus the sentence that says which part is a lint and which is a compiler guarantee. | F3-1, F6-2 |
| **11** | **Isolation as non-interference, not as a WHERE clause** | State the property as *"A's actions do not change B's observations"*, enumerate the shared logical channels, and either close each in-model or by a named axiom. | F3-2, F3-3, F6-26 |
| **12** | **The schema as desired-state, one file per table, each naming its conformance clause** | A column can be traced to the property it exists for; the fence exceptions live in one reviewable diff. | F3-6 |
| **13** | **The runtime conformance gate over the running code** | A crate that checks *executions* against the model, with the checker **deliberately re-implementing** the spec so production helpers cannot hide a bug from both sides. | F3-3, F6-12 |
| **14** | **Hash-versioning discipline** | Version the encoding, retain the old one, **label its known ambiguity**, and pin both digests — with a test that proves the ambiguity. | F6-14, F6-15 |
| **15** | **Deletion as a lifecycle, not a `DELETE`** | A staged, idempotent teardown state machine; consent asserted with three distinct pubkeys (requester, attestor, executor). | F3-7 |

### Tier 3 — observe; excellent, and a solution to a problem we do not yet have

| # | Mechanism | Evidence | Why it waits |
|---|---|---|---|
| 16 | The **egoist/authority gate at every door** (one function, four call sites, before the claim) | F4-x, §P3 | we do not yet have four doors |
| 17 | **Deterministic at-most-once cron** (instant-in-key + PK conflict ⇒ no lock, no coordinator) | §P3 | needs the tenancy/scheduling layer first |
| 18 | The **internal/OSS build split verified by building both and scanning emitted output** | F5-13 | a problem for when we ship two variants |
| 19 | **Fail-open vs fail-closed feature flags**, with the answer written next to each gate | F5-12 | adopt the *discipline* now, the machinery later |
| 20 | The **egress guard with a self-proving source inventory** (paired counts, self-immune needles) | F6-17 | strong; needs a real egress surface to guard |
| 21 | **Two independent dials through one virtual rem** (typography), with the `lineHeight` scale rem-relative | F5-6 | frontend-only; adopt with the design system |
| 22 | **The rename hazard on the retirement checklist** (grep the *metadata*, not just the code) | F6-22, D6-3 | adopt now as a checklist line |

---

## 2. How buzz maps across the poles

The workshop's method asks, for each pole, what the platform has. Measured, buzz's shape is
**sharp and unusual**: it is the first platform in the study that is strong on **two adjacent
poles and a proof surface**, and *structurally absent* on the pole the study keeps expecting.

| Pole | buzz's answer | Strength |
|---|---|---|
| **P1 · aissistant** | **Real but thin, and deliberately so.** Agent = keypair + channel membership; identity is a person's identity; memory is a custom NIP (NIP-AE); **6 tools**, not 60; two binaries (`buzz-agent`, `buzz-dev-mcp`); the harness (`buzz-acp`) swaps either half. **The default permission mode is `bypass-permissions`** (F2-2). | **Medium** — a genuine, minimal, standards-native P1; the safety default is the finding |
| **P2 · workspace** | **Strong.** The workspace **is** the event log; one table, three lenses (Stream/Forum/Workflow differ by kind, not storage); 57 tables with a **lintable** tenant fence; membership-as-access with five role names. | **Strong** |
| **P3 · automations** | **Real and event-native, ahead on security, behind on completeness.** YAML definitions stored as canonical JSON; five triggers, seven actions (**two are stubs**); the approval gate is **dead code**; the cron is deterministic rather than locked. | **Medium** |
| **PX-W · widgets/composition** | **Absent as a model — the fifth platform in the study with none.** The composition unit is the **event kind** (136 registered in `ALL_KINDS`). The one composition-shaped surface (Channel Canvas, `kind:40100`) is a document with optimistic concurrency, not a widget tree. | **Absent** |
| **PX-F · frontend** | **Desktop-first and polyglot.** Desktop ~93% of the frontend; a 194k-line Rust bridge with 385 commands; mobile is a **zero-Rust** Dart re-implementation; web/admin ~1.1% combined. | **Strong** |
| **PZ · out-of-pole** | **The strongest in the study, and the reason this platform was worth studying.** Five safety artefacts across **three languages** — prose, TLA+, Tamarin. | **Very strong** |

**The shape in one sentence.** buzz is a **communication substrate with a proof surface**: it
invests heavily in *isolation, safety and the correctness of one shared log*, and lightly in
*the things that sit on top of it* — which is the exact inverse of a workflow tool.

---

## 3. buzz's one structural answer

Every platform in this study has posed the same question in a different way: *what is the unit
you compose?* The answers so far have mostly been **UI or task units** — a widget, a node, a
bead, a step. **buzz's answer is different, and it is the most checkable one:**

> **The unit you compose is the event kind.**

One `kind: u32` registry (136 registered kinds), one append-only log, and every surface — a message, a
reaction, a workflow step, a canvas edit, a code-review approval, a git event, an agent job —
is **the same object with a different integer**. Extension means *"add a kind"*, and the
protocol (`NIP-01`) is **public and shared**, not bespoke (F1-1, F1-7, F5-2).

**Why this is worth recording, whether or not we adopt it.** It gives the study a clean
**counter-position** to a composition model, and buzz states the trade honestly: an event log
buys **extensibility of data and behaviour** (new kinds, new handlers, realtime fan-out,
scoping, auth — for free); a widget model buys **extensibility of layout and interface**
(someone who is not a programmer assembling a surface out of parts). buzz has the first in full
and the second **not at all**, and it is *coherent* about it (F5 §7). **The batch-05 question —
"is an event log the same thing as a widget model?" — has a proven answer: No, and buzz is the
clean demonstration of why.**

**The second structural answer, from PZ.** buzz does not *assert* its isolation; it **proves it
and then checks the running code against the proof** — a TLA+ model for isolation, a Tamarin
model for authorization, a prose contract binding both to the deployment and to named code
seams, and a runtime conformance crate that replays real executions against the model. **No
earlier platform in the study separates "the model" from "the running code" and then closes the
gap with a gate.** That separation is the transferable idea; the TLA+ toolchain is not required
to copy it (F3-3, F6-12, F6-26).

---

## 4. Decided limits — good mechanisms we will not adopt, with the reason

Recording these so a later agent does not re-open them. Each is *strong in buzz* and *wrong for
us now* — not weak.

| # | Mechanism | Why it is a decided limit |
|---|---|---|
| **L-1** | **The event-log-as-everything architecture** | It is buzz's whole identity, and adopting it would replace our data model, our tenancy model and our UI model at once. **Study the trade (extensibility of behaviour vs of layout); do not copy the substrate.** |
| **L-2** | **TLA+ / Tamarin as a toolchain** | The practice is transferable at one small scale (see #11); the **toolchain is not**. We do not have the invariants pinned well enough to mechanize, and adopting the tools before the invariants would invert the order rule 0 sets. |
| **L-3** | **Nostr as the wire protocol** | Interesting as a *proof that a public protocol can be the whole API*; it is a re-platforming, not a mechanism to lift. The transferable part is **"the wire format is the contract"**, recorded as an observation. |
| **L-4** | **The polyglot frontend (Rust bridge + React + Dart + Flutter)** | buzz pays for it deliberately and can afford it; it multiplies our maintenance surface. The transferable parts are the **guards** and the **token model**, not the stack. |
| **L-5** | **The 34-crate workspace** | The crate count is a consequence of the substrate choice, not a goal. **Take the fences (lint, type, conformance); leave the topology.** |
| **L-6** | **`bypass-permissions` as a default** | It is a documented choice in buzz and it is **the exact opposite of our default-deny posture** (F2-2). Record it as a *contrast*, not a candidate. |
| **L-7** | **The four formal models shipping in a product repo** | The *practice* (models as artefacts) is tier-2; shipping `.tla`/`.spthy` files is a decided limit for us until the invariants exist. |

---

## 5. The honest ledger — what buzz does *not* have

A synthesis that lists only strengths is marketing. Every item below is **stated by buzz in-tree**
or **measured in this study**, and each is carried into the mapping pass as a *known-open*, not a
surprise.

**Structural absences (measured):**
- **No widget/composer model** — the fifth platform in the study with none (F5-1, F5-2).
- **No Postgres RLS** — zero `CREATE POLICY` across 62 migrations; tenancy is application + lint
  enforced (F6-§5.3).
- **No peer-to-peer event path** — the mesh transport (`buzz-relay-mesh`, iroh) is a *separate*
  question from the event path (F1-4).

**Feature incompleteness (buzz's own, or measured in code):**
- **Approval gates do not work** — the whole grant/deny/resume path is **dead code by
  measurement**; the data model is finished, the *mint* is missing (§P3).
- **2 of 7 automation actions are stubs** (`send_dm`, `set_channel_topic`) — a definition using
  them saves and fails at run time (§P3).
- **The `bypass-permissions` default** and a documented policy switch that does not exist (F2-2).
- **Cross-pod leaks are explicitly out of the conformance gate's scope**, and **the read-seam
  half of the gate is not armed** (§PZ, `LIMITS.md`).

**Aged artefacts (drift, not gaps):**
- **PZ's own prose contract has aged behind the code** on its P3/HA status — the shipped Redis
  replay guard and the chart's template-fail have closed the gap the doc still describes as open
  (**D6-1**). The code is *stricter* than the doc claims.
- **The rename hazard is a live metadata inconsistency** — complete in code, incomplete in
  `Cargo.toml`'s `repository` and `AGENTS.md`'s topology table (F6-22, D6-3).

---

## 6. Rule 10 — the retirement surface

buzz has **the richest retirement surface in the study**, and it is a real teaching case for the
retirement rule.

- **23 of 62 migrations carry a drop/remove/retire flavour.**
- **The sharpest single retirement** is the whole Phase-A NIP-FI authority ledger — migration
  `0044` drops **14 tables with `CASCADE`**, with the reason recorded in the file itself (F1-9).
- **A product rename executed as scoped PRs** (`sprout → buzz`; #958, #1012, #1043, #1333) with
  **residue that never got renamed** — the `sprout` repo URL, `squareup/sprout-oss` in
  `AGENTS.md`, and a crate directory still named `sprig` (F6-22). **This is the second-order
  hazard**: a rename done in code and left in metadata.
- **A hash encoding retired correctly** — v1 retained, its ambiguity labelled and *proven by a
  test*, v2 shipped without invalidating history (F6-14, F6-15). **This is rule 10 done right.**

**The lesson worth carrying:** a rename is not finished when the code compiles; it is finished
when the *metadata* — manifests, topology docs, CI names — has been grepped too, and when any
residue is either renamed or **documented as deliberate**.

---

## 7. What this study did NOT do (limits of the evidence)

Stated because a reader must know what is **not** behind these claims.

- **No `.git`** — the extract has no history, so "the latest buzz" means *this extract, at
  `v0.5.28`*. The provenance is unusually rich (commit SHAs in the changelog) but the working
  tree is a snapshot (batch 00).
- **No execution** — nothing here is a claim about runtime behaviour under load. Every claim is
  read from source (rule 1).
- **Unread surfaces, recorded as unread:** the two crate-local denial modules
  (`nip_fi/deny_map.rs`, `denial.rs`) were not read (F6-§5.2); the Kubernetes provider's
  end-to-end state is unresolved (F2-7); the Flutter mobile tree was measured but not fully read
  (F5-§3.4).
- **The mobile client's parity is not verified** — it is a zero-Rust re-implementation, and
  whether it agrees with the desktop on every kind is a **contract with no lockstep check**
  (D5-3).
- **No comparison to our own platform inside any batch** (rule 5). Cross-platform observations
  live in this batch only, as **observations**; the decisions are the owner's at the mapping pass.

---

## 8. Where buzz sits in the study's ranked order

Across the seven platforms studied, ranking is by **how much transferable mechanism per unit of
study effort**, not by product quality.

| Rank | Platform | Why it sits here | Status |
|---|---|---|---|
| 1 | **buzz** | **The proof surface** — the only platform that proves isolation *and* checks the running code, plus a rich retirement surface and a proven answer to the widget question. Highest transferable-mechanism density in PZ. | ✅ closed |
| 2 | **Multica** | The closest *architectural* neighbour on all three poles; the machine/teammate split and the one-statement claim. No proof surface. | ✅ closed |
| 3 | **n8n** | The first real composition surface (a canvas of 7 element types) plus the best security surface before buzz; a doc-driven scaffold whose ADRs are accurate. | ✅ closed |
| 4 | **Gas Town** | The watchdog chain made of agents; the Hook as the durability primitive; a three-layer sandbox. Decided limits in the top mechanisms. | ✅ closed |
| 5 | **Hermes** | The main AI engine; **never fork it**. Not a platform to copy — a service to drive. | ✅ closed |
| 6 | **Paperclip** | P2/P3 strength, P1 as a seam-provider; no multi-tenancy, no composer. | ✅ closed |
| 7 | **CrewAI** | A **mechanism donor, not an architecture template** — executor yes, delivery no, tenancy nowhere. | ✅ closed |

**Note on this table.** The ranking is *this study's own*, formed by comparing the six closed
platforms' recorded findings against buzz's, which is why it can be written here and not inside a
batch (rule 5). It is an observation for the mapping pass, not a decision.

---

## 9. Ranked actions for the mapping pass

The five actions I would put in front of the owner first, each sourced, each small, none
requiring buzz's stack.

| # | Action | Sourced from | Cost |
|---|---|---|---|
| **1** | **Adopt `LIMITS.md` for every gate, ratchet and guard we ship** — name the blind spots, the owners, and any unarmed half. | F6-12, F6-26 | a file + a discipline |
| **2** | **Adopt "prove the tripwire fires"** — one mutation-style test per check, asserting the check catches the injected violation. | F6-7, F6-12, F6-17 | low |
| **3** | **Adopt the guard-as-document pattern** for our two or three most-broken frontend/architecture rules: a `-core` script, a per-app wrapper, a reason-annotated allowlist, a place in the default gate. | F5-3, F5-4 | low |
| **4** | **Write the prose contract beside any formalism we produce** — non-goals, one axiom per assumption, a gate per axiom, and the obligations that fail silently named *by name*. | F6-26, D6-1 | low |
| **5** | **Put the rename hazard on the retirement checklist** — grep the *metadata* (manifests, topology docs, CI names), not only the code, and document any deliberate residue. | F6-22, D6-3 | a checklist line |

**Recommendation.** Take **all five**. They are the cheapest, most general mechanisms in the
entire seven-platform study; four of the five are *documents or tests*, not systems; and each one
has a **stated wrong answer** in the buzz source that tells us exactly what we would get wrong if
we improvised it. The tenancy-tier mechanisms (Tier 2) are held for when the tenancy layer itself
is built, where buzz is the study's best worked example — that is a *mapping-pass* decision, not
a synthesis decision.

---

## 10. The verdict, in plain English

**Named.** The buzz study is complete: seven batches, six findings documents plus the pin, every
load-bearing claim checked against `v0.5.28`.

**Plain meaning.** buzz is a **team workspace built on a public protocol**, where every action —
a message, a reaction, a workflow step, a code review, a git event — is a **signed event with an
integer type** in one append-only log, and where the workspace's tenant isolation is not asserted
but **proven with formal methods and then re-checked against the running code**. It invests
heavily in *isolation and correctness* and lightly in the things above them.

**Why it was worth the seventh slot.** Because it closed the widget question with evidence
(**an event log is not a widget model, and buzz is the clean proof**), because it is the only
platform with a **proof surface**, and because it produced two mechanism families the study did
not previously have: the **guard-as-document** pattern, and the **gate-that-documents-its-own-
blind-spots** (`LIMITS.md`).

**Risk.** The study's claims are bounded by a **snapshot with no git history** and **no
execution**; and buzz's own prose contract has **aged behind its code** on one safety status —
which is itself the most instructive finding in the batch, because it is the second-order version
of the rename hazard: *a safety status left behind*.

**Ranked actions.** Five, all cheap, all sourced, all in §9. **Recommendation: take all five.**

**And the one thing to do before anything else:** the **buzz reader on port 3600**, built from
this markdown, using the shared engine (`generate-reader.js` + `DOCS_CONFIG` + `diagrams.js`)
copied and rebranded — **copy, never rewrite** — then fidelity-verified the two ways the n8n
reader taught us.

---

**Batch 07 of 07 — the buzz study is written.** Next: the **buzz reader (port 3600)**, built
from the markdown. **Then, and only then, the ask**: which platform is studied eighth —
`openrig`, `mattermost`, or `zulip` (order not fixed; the owner decides).
