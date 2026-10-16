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
│  L5  THE GUARD     exclusion ledger · one-truth check · ratchet ·       │  openrig + zulip
│      (PZ)          named escape hatches · LIMITS.md      (SR-41 … SR-44)│
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
| **Hermes** | L1 | The engine. Never forked, never edited. "Build UNDER." |
| **openrig** | L2 + L5 | Permission ladder, two-surface rule, exclusion ledger, two-reads rule, digital-twin |
| **zulip** | L3 + L5 + L7 | Ambient realm, per-realm identity, encoded audit, ratchet, one-truth check, named escape hatches — **and the widget model** |
| **Multica** | L3 + L4 + L6 | Machine ≠ teammate, one-statement claim, failure taxonomy, prohibition layering |
| **n8n** | L6 + L7 | Composition canvas, design system + ESLint plugin, CRDT, scopes |
| **buzz** | L5 + P3-warning | Proof surface (TLA+/Tamarin/prose/LIMITS), retirement ledger, kinds-over-endpoints — and the dead approval gate as the warning |
| **Gas Town** | L4 | Hook = durability, transport does not decide, watchdog chain of agents |
| **Paperclip** | L3 + L4 | The foundation shape (P2/P3 strength), seam-provider for P1 |
| **CrewAI** | L2 | A2UI protocol shape — mechanism donor, nothing more |

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
- **We do not build a widget model where none exists** — we build the one two platforms
  proved, and only that one.
- **We do not extract mattermost yet.** It joins later as a tenth column without rework:
  every pole file here has a slot waiting for it.
- **We do not write code in this pass.** Requirements only. Development waits for a written
  requirement — that rule is unchanged.

## 7. The shape of the SRS

46 requirements, `SR-01` … `SR-46`, across six poles. Each carries its source platforms,
its mercato status, and — where it applies — the existing register item it extends
(`CC-*`, `G-*`, `M*`). The register is in `08-THE-SRS.md`.

---

*Next: `08-THE-SRS.md`.*
