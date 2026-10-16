# 07 — SYNTHESIS: THE RE-ENGINEERED WHOLE

**One tenant ↔ one Hermes. Everything else serves that sentence.**

---

## 1. The one sentence

> **Every tenant gets its own engine home, its own identity, and its own audit line — and
> the platform's job is to make the wrong thing hard to do and stay honest when it can't.**

That sentence is assembled from three platforms:
- **one tenant ↔ one engine home** — Multica's `UNIQUE (workspace_id, daemon_id, provider)`
- **its own identity** — zulip's *a bot is a `UserProfile`*
- **make the wrong thing hard, stay honest when you can't** — zulip's verdict, delivered by
  openrig's exclusion ledger and buzz's `LIMITS.md`

---

## 2. The layer stack

```
┌─────────────────────────────────────────────────────────────────────────┐
│  L7  COMPOSITION   canvas · widget log · generic renderer · CRDT        │  n8n + zulip
│                     (SR-27 … SR-33)                                     │
├─────────────────────────────────────────────────────────────────────────┤
│  L6  FRONTEND      design system + ESLint plugin · prohibition layering │  n8n + Multica
│                     dashboard · perspective screens   (SR-33 … SR-36)   │
├─────────────────────────────────────────────────────────────────────────┤
│  L5  THE GUARD     exclusion ledger · one-truth check · ratchet · escape │  openrig + zulip
│      (PZ)          hatches · LIMITS.md (buzz's) · 3-layer sandbox       │  + buzz + Gas Town
│                    (SR-39 … SR-46)                                     │
├─────────────────────────────────────────────────────────────────────────┤
│  L4  AUTOMATIONS   durable wake queue · one-statement claim ·           │  zulip + Multica
│      (P3)          failure taxonomy · declared risk   (SR-19 … SR-26)   │
├─────────────────────────────────────────────────────────────────────────┤
│  L3  WORKSPACE     ambient realm · scope-once · per-tenant engine home  │  zulip + Multica
│      (P2)          per-realm identity · encoded audit (SR-10 … SR-18)   │
├─────────────────────────────────────────────────────────────────────────┤
│  L2  AISSISTANT    typed port · agent ≠ runtime · permission ladder ·   │  Hermes + openrig
│      (P1)          spawn ledger · skills as artifacts (SR-01 … SR-09)   │
├─────────────────────────────────────────────────────────────────────────┤
│  L1  THE ENGINE    Hermes, unmodified, behind the typed port            │  Hermes
│                     "Build UNDER"                                       │
└─────────────────────────────────────────────────────────────────────────┘
        ↑ everything above L1 is ours to build; L1 is taken, never forked
```

## 3. Where each platform lands

| Platform | Lands at | What it contributes |
|---|---|---|
| **Hermes** | L1 + L2 + L5 | The engine, never forked. Plus the one-writer rule, platform toolsets as least privilege per door, four approval modes all defaulting to `deny`, the `HARDLINE_PATTERNS` floor, per-profile credential scoping, and the iron-proxy egress guard |
| **openrig** | L2 + L5 | Permission ladder (5 rungs, `open` and `yolo` on separate surfaces), two-surface rule, exclusion ledger with mechanical expiry, digital-twin harness |
| **zulip** | L3 + L5 + L7 | Ambient realm, per-realm identity, encoded audit, ratchet, one-truth check, named escape hatches, deliberate non-features — **and the first real widget model** |
| **Multica** | **L2** + L3 + L4 + L6 | **Machine ≠ teammate** (`agent_runtime` vs `agent`, SR-02 — an L2 contribution the first version filed under L3), one-statement claim, failure taxonomy, prohibition layering |
| **n8n** | L5 + L6 + L7 | Composition canvas, design system + ESLint plugin, CRDT, scopes, and two ratchets that can only shrink |
| **buzz** | L5 + P3-warning | Proof surface (TLA+ **13** invariants / Tamarin **32** lemmas / prose contract / `LIMITS.md`), retirement ledger, kinds-over-endpoints, the 13-boundary egress guard — and the dead approval gate plus its **`bypass-permissions` default** as the warning |
| **Gas Town** | L4 + L5 | Hook = durability (F03-03), ZFC "Zero Framework Cognition", watchdog chain of agents, and a genuine 3-layer sandbox |
| **Paperclip** | L3 + L4 + L5 | Portable-markdown company package, finite runs + durable intent, MCP access governance, fail-awake idle sleep, seam-provider for P1 |
| **CrewAI** | **L7 (PX-W)** + L2 | **A2UI widget protocol** (3,669 lines, 18-component typed catalog, `allowed_components` enforced on the response) — filed at L7, **not** L2 as the first version had it. Its L2 contribution is the typed tool filter with `run_context` |

## 4. The integration surface — what makes it *integrable*

The owner asked for the most **versatile and integratable** version. Integrability is not a
feature; it is a consequence of four decisions, each borrowed:

1. **The typed port (L1↔L2).** The engine is swappable because nothing above the port
   imports it. Already partly true in mercato (`runFunction` is structurally LLM-free).
2. **The generic bridge (L7).** Any backend drives any widget through one path — the thing
   that lets *others* compose on our surface without us writing their integration.
3. **The event-kind registry (L4).** Extending the platform is adding a kind, not adding an
   endpoint — with a conformance test that proves the kind behaves.
4. **The plugin lifecycle (out-of-pole).** Register → version → enable → disable → retire,
   with retirement chained and reasoned.

Together: **a new capability enters as a kind + a widget + a plugin, and leaves as a chained
retirement.** Both directions are recorded.

## 5. What we retire

Re-engineering is not only building. Under this frame, three things mercato has are on the
retirement list:

1. **The double scope entry** — collapses to one derived value (SR-11). Two writes of the
   same value can diverge; one cannot.
2. **The shared `HERMES_HOME`** — replaced by per-tenant engine homes (SR-12 = `CC-84`).
3. **OpenCode as the default engine** — retired by `P2-9b`'s switchover, once SR-12 lands.

Each retirement goes in the ledger with its reason (SR-44).

## 6. What we do NOT do

- **We do not fork or edit Hermes.** L1 is taken as-is, behind the port.
- **We do not build a widget model where none exists** — we build the one zulip proved, take
  the composition surface n8n proved, and keep CrewAI's protocol distinct from both.
- **We do not extract mattermost yet.** It joins later as a tenth column without rework:
  every pole file here has a slot waiting for it.
- **We do not write code in this pass.** Requirements only. Development waits for a written
  requirement — that rule is unchanged.

## 7. The shape of the SRS

**52 requirements**, `SR-01` … `SR-46` plus the sub-lettered additions made during the
2026-10-16 correction pass (`SR-19a`, `SR-19b`, `SR-21a`, `SR-22a`, `SR-32a`, `SR-33a`,
`SR-35a`). Each carries its source platforms, its mercato status, and — where it applies — the
existing register item it extends (`CC-*`, `G-*`, `M*`). The register is in `08-THE-SRS.md`.

**Status counts, corrected:** HAVE 3 (`SR-01`, `SR-18`, `SR-35`) · BUILD 10 · BORROW 31 ·
RE-ENGINEER 2 (`SR-10`, `SR-27`). The first version's counts (4/8/31/3) were arithmetic
against a table that did not contain them.

---

## 8. What the correction pass changed in this file [C]

This synthesis was written before the mapping was verified against the markdown. Four
structural errors, all fixed above:

1. **CrewAI landed at L2 with "A2UI protocol shape."** A2UI is **PX-W** — CrewAI's own
   synthesis files F5-3…F5-8 under the widget pole. CrewAI's real L2 contribution is the typed
   tool filter with `run_context`. It now lands at L7.
2. **The L5 header credited `LIMITS.md` to the openrig+zulip line.** `LIMITS.md` is **buzz's**
   — its synthesis ranks it Tier 1 #1: *"the gate that documents what it cannot catch."*
3. **Multica's contribution was filed only at L3+L4+L6**, yet SR-02 (agent ≠ agent_runtime) is
   sourced from Multica. Multica now lands at **L2** as well.
4. **The L5 SR range read "SR-41 … SR-44"**, silently dropping the one-truth check (SR-39) and
   the ratchet (SR-40) that the same file's lands-table credits to zulip. The range is now
   **SR-39 … SR-46**, and SR-33's appearance in both L6 and L7 and SR-35's placement inside
   L6's range are noted as known imprecision rather than fixed by renumbering.

One thing that did **not** change: the assembled sentence in §1 — *"Every tenant gets its own
engine home, its own identity, and its own audit line — and the platform's job is to make the
wrong thing hard to do and stay honest when it can't."* All three of its sources verified
word for word: Multica's `UNIQUE (workspace_id, daemon_id, provider)`, zulip's *"a bot is a
`UserProfile`"*, and zulip's verdict. The layer stack, the integration surface, and the
retirement list all survived verification.

---

*Next: `08-THE-SRS.md`.*
