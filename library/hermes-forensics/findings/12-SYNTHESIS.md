# Batch 12 — The synthesis

**Status:** COMPLETE — closes the study
**Date:** 2026-10-15
**Method:** this document draws ONLY on batches 01–11 of this study. Every claim it makes about Hermes points back to the batch and section that measured it. Every claim it makes about our own platform is marked as **judgement**, not measurement, because this study did not re-measure the platform.
**Source:** `hermes-agent-main/hermes-agent-main` @ pin (19,728 files; pyproject md5 `f57f729d4b251547a5a9e2565ce1e726`).

---

## §0 — Plain words: what this document is, and the three questions it answers

Eleven batches measured a large open-source agent product (Hermes Agent, by Nous Research) doc-by-doc and file-by-file. This closing document does the one thing the batches were forbidden to do: **put Hermes and our own platform side by side and say what goes where.**

The owner asked three questions, and they are the three sections of this document:

1. **What does our platform do *better* — things that should move *into* Hermes if we adopt it?** → §2
2. **What does Hermes do *better* — things that should move *into* our platform?** → §3
3. **What should we build *on*, *around*, or *under*?** → §4

And one framing the owner set at the start, which governs all of it:

> "Your first analysis of hermes, you should not compare it to mercato architecture — we are not hostages of that."

So §2–§4 are written as **judgement calls with stated reasoning and a recommendation**, not as "Hermes wins / we win" scoreboards. Where a Hermes mechanism is simply *better*, it is named as better. Where ours is, it is named as ours.

**One thing to hold onto while reading:** Hermes is a **product for one person (or one team) to run an agent**. Our platform is a **business and resources planner for a company, where AI is the first-class worker**. These are different shapes. Most of the synthesis is about which of Hermes's *parts* fit our shape — not about whether Hermes is "good".

---

## §1 — What this study measured, in one page

Nine batches carried verified findings. The honest headline numbers:

- **455 docs / 8.9 MB. 1,819 Python files / 698,487 lines** (batch 00 §2).
- **Divergences found: 4 across eleven batches**, and the docs were **right far more often than wrong**. Found: the API-mode count (docs say 3, code has 5 + plugins — b01); the `get_hermes_home()` file count (docs "119+", code 821 — b02); the dashboard config-field count (docs "150+", measured 99 sections / 816 keys — b07); the docker `--pids-limit` quote (docs "256", code 2048, with the code recording that 256 was hit in normal use — b08).
- **Three corrections to my own earlier notes** were made under rule 13 and are recorded where they belong: the subagent iteration cap (`50` → **250**, b06); `integrations/providers.md` structure (`~40 sections` → **7 sections / ~90 rows**, b09); the egress doc path (`egress/` → **`user-guide/egress/`**, b11).
- **One premise correction that matters most** (b10 §9): **"OpenCode" in Hermes is a model *provider*, not the OpenCode coding agent** — 1,008 code references, all in the provider sense; no spawn path exists.

The batches that carried the most transferable material, in order: **11** (the egress proxy), **08** (approvals, secrets, sandboxing), **10** (the plugin contract and governance), **06** (scheduling/delegation/the board), **04** (memory and context).

---

## §2 — Question 1: what OUR PLATFORM does better — candidates to move INTO Hermes

This section names the things the platform already does that Hermes does *not*, and that would have to be preserved or reintroduced if we sat on Hermes as a foundation.

### 2.1 Multi-tenancy with a real tenant key — **the clearest one**

**What the platform has (judgement, from the standing project memory, not re-measured here):** a tenant model with a per-tenant key door; every capability is scoped to a tenant by construction.

**What Hermes has (measured, b02/b11):** **profiles**, which are separate home directories that give you *isolation of files* — but the study was explicit: **profiles are not a sandbox**, and the bot/group-chat model (b02) is *per-installation*, with group rooms living in a local `shared-state.db`. Channel identity is solved rigorously (b11 §3) but at the **platform-user** level, not at a **commercial-tenant** level with billing and data-residency consequences.

**Why it matters:** Hermes isolates *one operator's own things from each other*. Our platform must isolate *one customer's data from another customer's*, and prove it. Those are different guarantees, and Hermes's model does not provide the second.

**Recommendation (ranked):**
1. **Keep our tenant door as the outermost boundary; treat Hermes profiles as an inner isolation mechanism, never as the tenant boundary.** *(recommended)*
2. Wrap every Hermes home in a per-tenant container and rely on the container for tenancy — heavier, and loses the one-process-many-homes economy Hermes is built around.
3. Adapt Hermes's profile system into a tenant system — starts by rewriting the layer Hermes is most opinionated about; highest risk.

### 2.2 A typed engine port (Row 28) — **the second clearest**

**What the platform has (judgement, and the project's own record):** Row 28 is COMPLETE — *"the agent runtime sits behind one typed door — no other code talks to it directly"*, with a typed port (`lib/ai-runtime-port.ts`), an adapter per engine, and the run closed at the door with honest status.

**What Hermes has (measured, b01/b09/b10):** engine coupling is expressed through **many small seams** — an ACP server (b10 §7), four middleware kinds (b10 §6), a plugin compat contract (b10 §4) — but there is **no single typed port** through which all engine calls pass. Provider modules live in `hermes_cli/` beside CLI concerns (b09 §4, C9-2).

**Why it matters:** our port is what makes an engine *replaceable by proof* rather than by hope. Hermes's seams make it *extensible*; they do not make the engine *swappable*.

**Recommendation (ranked):**
1. **Keep the port; if Hermes becomes an engine, it enters as one more adapter behind the same eight operations.** *(recommended)*
2. Expose Hermes's ACP server to the port as the adapter's transport — elegant, but ACP's surface is narrower than the port's eight operations (see §4.4).
3. Bypass the port for Hermes "to move faster" — rejected outright; it destroys the property Row 28 was built to give.

### 2.3 Definition-of-done as data (completion contracts)

**What the platform has (judgement):** the concept that *"done"* is a named, checkable thing — a completion contract with fields, not a feeling.

**What Hermes has (measured, b06):** `/goal` carries **completion contracts (5 fields)** and **quality gates (an exit-0 command, 3 retries / 5-min timeout, run *before* the judge)**; the Kanban has PR completion contracts. So Hermes has *a* version of this — but scoped to one agent's own goals, not to a company's deliverables.

**Why it matters:** for a planner, "this work is done" must be provable to a customer. Hermes's `/goal` gate proves it to the agent.

**Recommendation:** **adopt Hermes's gate mechanics (b06 §`/goal`) as the *execution* half, and keep ours as the *contract* half.** They compose; they do not compete.

### 2.4 The scoreboard discipline itself

**What the platform has (judgement):** a derived, never-typed scoreboard (`78/321 = 24%`), a rule that **only code is evidence**, and a RED-then-GREEN measurement discipline with restore-by-hash.

**What Hermes has:** excellent engineering hygiene (batch after batch found numbered issue references in code comments — `#85235`, `#98739`, `#4466`, `#72348`, `#44729`), but no equivalent *progress scoreboard* — because a product ships, it does not track a plan.

**Why it matters:** this is not a Hermes feature to adopt; it is the reason this study can be trusted. It is listed here so the reader sees that the method travelled both ways: **we measured Hermes with the same discipline we hold ourselves to.**

---

## §3 — Question 2: what HERMES does better — candidates to move INTO our platform

This is the larger section, because Hermes is a mature product and we are building. Items are ordered by transferability, not by size.

### 3.1 The egress credential-injection proxy — **the single strongest item** (b11 §7, C11-6)

**What it is:** a sandbox holds only **opaque proxy tokens**; a host-side daemon (`iron-proxy`) termininates TLS and swaps in the real credential. Default-deny allowlist; SSRF deny CIDRs checked **at connect time** (so DNS rebinding fails); never binds `0.0.0.0`; pidfile with `O_EXCL`/`O_NOFOLLOW` plus a **nonce written into `/proc/<pid>/environ`** so a recycled PID is never mistaken for the daemon; **fail-closed by default** (`enforce_on_docker: true` refuses to start a sandbox if the proxy is down); and — the part that makes it trustworthy — **a written list of what it does *not* protect** (host compromise, CA-key theft, raw-socket bypass, mounted credential files, allowlisted-host exfil, uncovered providers, its own in-memory secrets).

**Why it moves to us:** our platform will run model-written code near **customer** credentials. This is the exact threat model. The mechanism is provider-agnostic, licence-compatible (Apache-2.0 upstream), and already carries the operational detail (failure modes with exact refusal text).

**Recommendation (ranked):**
1. **Adopt the *model* — token-swap at a default-deny egress boundary, fail-closed — and adopt its documentation discipline (publish our own "does not protect" list).** *(recommended)*
2. Adopt `iron-proxy` itself as a dependency for the Docker lane.
3. Skip it and rely on container network policy — leaves `printenv` exfiltration inside the sandbox unsolved, which is the named threat.

### 3.2 The plugin compat contract + the shrinking-core governance policy (b10 §4, §5, C10-4, C10-5)

**What it is:** a **versionless, behavioural** compatibility promise (no `PLUGIN_API_VERSION`; "evolve additively"; hook payloads are keyword payloads; **manifest fields are ignored if unknown**), enforced by **frozen external-plugin fixtures** that assert real registration outcomes; a deprecation policy requiring a replacement + a once-per-process warning + **two minor releases** of dual support; and a *dated constitution* (`plugins/AGENTS.md`) under which **core deliberately shrinks on a schedule** (memory providers, Home Assistant, Spotify all migrated out) with an automatic one-time state conversion (`left_core_migration.py`).

**Why it moves to us:** any platform that expects an ecosystem must answer "how do we add capability without forking?" and "how do we *remove* it later without breaking customers?" Hermes has answered both in writing.

**Recommendation:** **adopt the *policy shape*** — behavioural compatibility, a two-release deprecation window, behaviour-based fixtures, and a documented migration-out path. Do **not** import the plugin manager itself; our extension surface is different.

### 3.3 The auxiliary task-class lane (b09 §7, C9-7)

**What it is:** every *background* AI chore (compression, titling, approval classification, vision, memory-query rewrite, TTS tags, voice) is routed to its **own** model, independent of the main conversation model, with `free_only` able to **forbid a paid lane for background traffic** and a one-time warning if a non-`:free` model is engaged. Main-agent routing explicitly does **not** propagate to aux calls "by design".

**Why it moves to us:** this is *literally* resource planning — routing a task class to the cheapest capable resource, with a spend cap expressed as policy. It is also already production-shaped, which lowers our risk.

**Recommendation (ranked):**
1. **Adopt the pattern: model-role policy per task class, with an explicit "background never uses the expensive lane" rule.** *(recommended)*
2. Adopt the exact task classes — useful, but ours will differ.
3. Ignore it and let everything run on one model — highest cost, no policy lever.

### 3.4 The secret-source precedence ladder (b09 §6, C9-5)

**What it is:** multiple credential origins (Bitwarden / 1Password / command, plus plugins), a **four-rule precedence ladder** (preserve-existing → pre-existing env unless `override_existing` → mapped → bulk), **"mapped outranks bulk regardless of list order"**, **first-claim-wins with a conflict warning — never a silent clobber**, and a **provenance record** on every applied variable.

**Why it moves to us:** a planner holding *customer-owned* credentials needs exactly this: multiple origins, ordered precedence, no silent clobber, and an audit trail. Compare-and-adopt.

### 3.5 Channel identity solved once (b11 §3, C11-2)

**What it is:** `dm_policy` ∈ {open, allowlist, disabled, **pairing**} and `group_policy` ∈ {open, allowlist, disabled}; pairing as a code-verified admission path; per-profile isolated allowlist reads; and **mid-turn authorization re-read against the *admitting* bot's allowlist** (closing a real hole where a mid-turn action was judged against a different bot's policy).

**Why it moves to us:** if our platform ever speaks through chat channels, this vocabulary and these traps are already mapped — including the traps (display-name matching bypasses an allowlist, `#44729`; an `npub` must be decoded before comparison, or the allowlist fails open).

### 3.6 The three-stage env scrub (b10 §2, C10-3)

**What it is:** before model-written code runs, the environment passes (1) a **secret-substring block** (`KEY`, `TOKEN`, `SECRET`, `AUTH`, `WEBHOOK`, …), (2) a **safe-prefix allowlist**, (3) a small named allowlist for runtime-location vars. `HERMES_` as a prefix is **deliberately unsafe**, because it "leaked config vars without a secret substring"; `PASS` is deliberately absent because it false-positives.

**Why it moves to us:** portable, tiny, and the reasoning is recorded. Any worker running model-written code near credentials should do this.

### 3.7 Cron's preflight and rate-limit path (b06)

**What it is:** a **preflight `blocked_config` check that makes no LLM call**, a `quota_hold_until` hold, a fire-claim TTL (`300 s`), exit codes that distinguish protocol violation (`0`) from rate-limited (`75`, requeued without counting a failure) from terminal provider (`78`, circuit breaker on first occurrence, sticky), and **secret redaction on every delivery lane even when `security.redact_secrets: false`**.

**Why it moves to us:** scheduled work is core to a planner, and the failure taxonomy (three distinct exit codes with three distinct policies) is exactly the nuance a naive scheduler omits.

### 3.8 Smaller mechanics worth taking

- **PTC's governance of expansion** (b10 §2, C10-1): the in-sandbox tool set is the **session's own tool set ∩ a seven-tool allowlist** — "expand capability by composition, never beyond what the session already may do."
- **Recover-don't-rerun** (b10 §2, C10-2): oversized tool output is spilled to disk and the **path returned**, with byte counts riding alongside the text marker.
- **Silence as a delivery decision** (b11 §3, C11-3): a whole-response sentinel suppresses delivery while keeping the turn in the transcript; a *person's* message never silently vanishes; Chinese renderings handled.
- **The brokered action pattern** (b11 §8, C11-8): computer-use requests go through a broker that performs and records artifacts.
- **Data-boundary routing by destination** (b11 §5): public URLs → cloud browser, LAN/localhost → local.

---

## §4 — Question 3: build ON, AROUND, or UNDER?

This is the decision section. Each option is stated as what it would mean, what it costs, and the risk — then one recommendation.

### 4.1 The three relationships, in plain words

- **Build ON Hermes** — Hermes is the engine at the bottom; we are the product above it.
- **Build AROUND Hermes** — Hermes keeps running beside our platform; we call it and it calls us.
- **Build UNDER Hermes** — our platform is the substrate; Hermes runs as a component inside it (the shape our own Row 28 port already anticipates).

### 4.2 What "build ON" would require — and the honest cost

To build **on** Hermes as the engine, we would have to reproduce, *above* Hermes, everything Hermes does not have (§2): the **tenant key door**, the **typed port**, and our **contract semantics**. And we would inherit the *inverse* of Hermes's strengths: its ~35 channels, its plugin ecosystem and its memory model are built for a **single-operator product**, so we would be adapting a product-shaped surface into a platform-shaped one.

**Measured cost signals:** Hermes is **698k lines of Python**; the gateway alone is a subsystem of **307 files**; `gateway/` includes hosted-room machinery, a delivery ledger and drain control. Building on it means *depending on all of that*, or carefully amputating it — and amputation is exactly what its own governance policy forbids plugins doing (`plugins/AGENTS.md`: plugins must never modify core).

**Risk:** highest lock-in, highest surface to keep current, and the engine-swap freedom our port was built to give would be lost first.

### 4.3 What "build AROUND" would require

Hermes keeps its own life; we talk to it over a **protocol** it already ships. Measured: **Hermes *is* an ACP server** (b10 §7) — `hermes acp` speaks JSON-RPC over stdio, with `stopReason: cancelled`, real error mapping, and permissions/elicitation hooks. It also ships a **REST API + dashboard** (b07) and a **`hermes proxy` OAuth aggregator**.

**Risk:** the protocol surface is narrower than our port's eight operations (b10 §7), so the adapter would be lossy; and two lifecycles to run means two things to secure, patch and observe.

### 4.4 What "build UNDER" would require

Our platform stays the substrate. Hermes enters as **one more engine behind the port** — the shape **Row 28 already built and proved** (`lib/ai-runtime-port.ts` + a per-engine adapter, the run closed at the door with honest status). Its egress proxy, cron, kanban and plugin machinery would be used *where they help* and left alone where they do not.

**Risk:** we own the integration layer, and the port must be genuinely engine-neutral (which Row 28's exit gate already demonstrated once). But this is the only option that keeps **engine replaceability as a tested property** rather than an aspiration.

### 4.5 Recommendation

**Build UNDER — take Hermes as an engine behind the existing typed port, and take its *mechanisms* (§3) selectively, tiered.**

Reasoning, plainly:

1. **It preserves the one property we have already proven and Hermes does not have** — a typed door with an engine behind it, round-tripped through a real run (Row 28).
2. **It matches the shapes.** Hermes is a product; we are a platform. Products go *inside* platforms, not the other way round.
3. **It lets us take the best parts without taking the whole.** The §3 list is mostly *patterns*, not code. Adopting patterns costs us reasoning; adopting a 698k-line product as our base costs us our architecture.
4. **It keeps the door open in both directions.** If Hermes later proves the better base, the port means the move is an adapter change, not a rewrite.

**Tiered adoption within that decision** — what to take first, and what to leave:

| Tier | Take | Why | Leave |
|---|---|---|---|
| **1 — now** | The **egress model** (§3.1), the **env scrub** (§3.6), the **aux task-class lane** (§3.3) | Highest safety/cost value; smallest and most portable; no architecture change | The `iron-proxy` daemon as a hard dependency until the port has an egress seam |
| **2 — soon** | The **plugin compat *policy*** (§3.2), the **secret precedence ladder** (§3.4), **cron's failure taxonomy** (§3.7) | Shapes our extension surface before it hardens | The plugin manager itself; the cron scheduler itself |
| **3 — when a channel need appears** | The **channel identity vocabulary** (§3.5) | Already-mapped traps, e.g. display-name matching bypassing an allowlist | Hermes's ~35 platform plugins wholesale |
| **4 — do not take** | Hosted rooms, the desktop app, the ~35 channels as-is, the single-operator profile model | Product-shaped; conflicts with our tenant model (§2.1) | — |

---

## §5 — What this study does NOT claim (the limits, stated)

Written here so no reader over-reads the study:

1. **One tree, one date.** Every figure is about the extract pinned in batch 00 — 19,728 files, `pyproject.toml` md5 `f57f729d…`, extracted 2026-10-15. There is **no `.git`**, so the exact upstream commit is unknowable from the tree.
2. **The platform side is judgement, not measurement.** §2 and §4 describe our platform from the project's own records and the standing memory; **this study did not re-measure the platform**. Any §2 claim should be re-checked before it is acted on.
3. **"Better" means "better for our shape."** Hermes's single-operator model is not a defect; it is a different product. Where §2 says we do something "better", read it as *better for a multi-tenant planner*.
4. **Patterns are cheap, products are expensive.** §3 mostly recommends *patterns*. That distinction is deliberate and load-bearing.
5. **Divergences were found in both directions.** The docs were right far more often than wrong (4 divergences in 11 batches). This is evidence of a well-maintained product, and it is reported because reporting only the misses would be dishonest.

---

## §6 — The study's own ledger

**Batches complete:** 00–12 (12 of 12).

| Batch | File | Divergences | Corrections |
|---|---|---|---|
| 00 | `00-PIN-AND-METHOD.md` | — | pin re-taken (new tree) |
| 01 | `01-agent-loop-and-conversation.md` | 2 | — |
| 02 | `02-bots-profiles-and-group-chats.md` | 1 | — |
| 03 | `03-skills-and-the-learning-loop.md` | 0 | — |
| 04 | `04-memory-and-context.md` | 0 | — |
| 05 | `05-tools-mcp-and-the-gateway.md` | 0 | — |
| 06 | `06-scheduling-delegation-and-the-board.md` | 0 | subagent cap 50 → **250** |
| 07 | `07-sessions-dashboard-and-settings.md` | 1 | — |
| 08 | `08-security-approvals-secrets-and-sandboxing.md` | 2 | — |
| 09 | `09-models-and-providers.md` | 0 | providers doc structure |
| 10 | `10-code-execution-plugins-and-extensibility.md` | 0 | **"OpenCode" = a provider** |
| 11 | `11-channels-voice-and-media.md` | 0 | egress doc path |
| **12** | **this file** | — | — |

**Totals:** 4 doc-vs-code divergences; 4 corrections to my own earlier notes; 1 premise correction of consequence (OpenCode).

**Commits:** `edee95d` (00–01), `66ae2be` (02–03), `0a51aff` (04), `0b9c793` (05), `6575635` (06), `20d2636` (07), `139c5b2` (08), `599c4f9` (09), `ed7f0d7` (10), `6e10374` (11), plus 12.

---

## §7 — The single recommendation, in one paragraph

**Adopt Hermes as an engine *behind* the port we already built (build UNDER), and take from it three mechanisms now — the egress credential-injection model, the three-stage environment scrub, and the auxiliary task-class lane — then three more as our surfaces harden (the versionless plugin compat policy, the secret-source precedence ladder, and cron's failure taxonomy).** Keep our tenant key door as the outermost boundary because Hermes's profiles are isolation, not tenancy, and keep completion contracts as *our* semantics because Hermes scopes "done" to one agent's goal rather than a customer's deliverable. Do **not** adopt hosted rooms, the desktop app, the single-operator profile model, or the ~35 channels as-is — they are shaped for a product, and we are building a platform. The port is what makes this reversible: if the judgement is wrong, the correction is one adapter, not a rewrite.

**The one thing the owner must decide:** whether the first tier (egress model + env scrub + aux task-class lane) is authorised to become a **written requirement** — because per the standing protocol, requirement precedes code, and none of this study's findings may turn into code until it does.

---

*Batch 12 of 12 complete. The study is closed. All twelve batch documents sit in `library/hermes-forensics/findings/`, each committed as it was written, each byte-clean (0 CR), each carrying its own measurement, its divergences, and its value answers.*
