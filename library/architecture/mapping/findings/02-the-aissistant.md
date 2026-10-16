# 02 — THE AISSISTANT (P1)

**The pole:** who thinks, how is it invoked, what may it do, how is it identified.

---

## 1. What the nine platforms do

### Hermes — the engine itself (★)
Hermes *is* the aissistant engine. It is the reason this pole exists. The verdict from its
forensics is the load-bearing instruction of the whole workshop:

> **"Build UNDER" — take Hermes as an engine behind the existing typed port, and take its
> mechanisms selectively, tiered.**

Concretely: Hermes is never forked and never edited. It sits behind a typed port. Its
mechanisms (skills, the learning loop, memory and context, tools/MCP/gateway, scheduling and
delegation, the board) are taken *selectively and tiered* — not wholesale. One standing
contradiction, reported not resolved: **the sub-agent cap is 50 in one place and 250 in
another**. It must be decided by measurement, not by picking a number.

### Paperclip — the seam (P1 = weak)
Paperclip's aissistant is a *seam-provider*: the assistant is a pluggable provider behind a
stable interface, not the product. The lesson is that P1 can be thin *if* the seam is real.

### CrewAI — the donor (mechanism, not architecture)
CrewAI gives us the study's only piece of aissistant behaviour with **real enforcement**: the
**A2UI protocol**. Everything else about CrewAI is a mechanism donor — executor yes, delivery
no, tenancy nowhere. Its value to P1 is a protocol shape, not an architecture.

### Multica — the identity primitive (★)
The single most transferable P1 mechanism in the study:

> **Machine ≠ teammate.** `agent_runtime` and `agent` are different objects.
> `UNIQUE (workspace_id, daemon_id, provider)` is the one-tenant-one-engine primitive.

This is the answer to "how do I know which engine instance is running for which tenant" —
encoded as a database constraint rather than a convention.

### n8n — agents as a package
`@n8n/agents`: agents carry a **`SKILL.md`**, can spawn **sub-agents**, and run under
**guardrails**. P1 as a versioned, declarative artifact rather than a bespoke service.

### Gas Town — the watchdog chain
The watchdog is *made of agents*. Not a cron job watching a queue — agents watching agents.
The chain is the durability mechanism.

### buzz — no P1 of its own
buzz is a communication substrate. Its automation approval gate is **dead code** (reported,
not resolved — it is in the honest ledger).

### openrig — the permission ladder and the two-surface rule
Five permission policies: `locked` / `standard` (default) / `open`+`yolo` / `auto`. And the
rule that governs how they may be set:

> **The two-surface rule:** launch-time flags may be deterministic *code*; config-file policy
> may NOT be. Two reads of the same flag can diverge; one cannot.

### zulip — deliberately tiny (★)
One LLM feature in the entire product (topic summarisation), **fenced five ways**. And the
identity lesson:

> **A bot IS a `UserProfile`.** No parallel "agent" object exists.

An agent in zulip is a participant with the same identity machinery as a human. That single
decision removes an entire class of privilege-escalation bugs.

---

## 2. What mercato has

| HAVE IT | Where | Notes |
|---|---|---|
| Triage core as a library | `triageRequest` (`triage.ts:82`), `canOfferSaveAsFunction` (`gate.ts:80`), `RequestOutcome` (`types.ts:51/57`) | Built as a library per `G-21` |
| **No production caller** | — | The triage core exists and nothing in the running product calls it |
| Binding-gated authoring | `authorBusinessQueryIr`, gated by `CC-57` | |
| `runFunction` is structurally LLM-free | | The boundary is already drawn in code |
| Hermes gateway live | `P2-1` … `P2-9a` | The typed port exists and works |
| Agent binding complete | `CC-27` / `CC-55` / `CC-56` / `CC-57` | |

## 3. The gap

Mercato has the *seam* (a working typed port to Hermes) and the *triage types* — and neither
is wired into the running product. What it does not have at all: agent identity as a
first-class object, a permission policy ladder, a sub-agent spawn ledger, skills as versioned
artifacts, or any rule governing how a policy may be set.

## 4. The target — RE-ENGINEER IT

**The aissistant as a capability surface, running behind a typed port.**

1. **A typed engine port.** Hermes runs under it. `runFunction`'s no-LLM boundary is the
   proof the port is real. Any engine swap happens here and nowhere else.
2. **Agent ≠ runtime.** An `agent` object with `UNIQUE (workspace_id, daemon_id, provider)`.
   The constraint is the primitive, not a convention.
3. **A bot is a participant.** An agent in a workspace is a `UserProfile`-class identity, not
   a new object type. This is not a nicety — it is the thing that makes per-tenant identity
   work at all.
4. **A permission policy ladder as data** — `locked` / `standard` / `open`+`yolo` / `auto` —
   selectable per agent, per workspace, and settable **only** where the two-surface rule
   allows.
5. **A sub-agent spawn ledger.** Every spawn recorded in the hash-chained ledger, against a
   hard cap decided by measurement (the 50-vs-250 contradiction resolved by evidence).
6. **Skills as versioned artifacts.** `SKILL.md` files, versioned, sandboxed, tiered — the
   Hermes "selectively, tiered" instruction applied to the artifact rather than the engine.
7. **The triage core gets a production caller.** It is built; it is unwired. That is the
   single cheapest requirement in this pole.

---

## 5. Requirements

| ID | Requirement | Source | HAVE / BUILD / BORROW / RE-ENGINEER |
|---|---|---|---|
| **SR-01** | Typed engine port: Hermes runs behind it; no other module imports Hermes directly | Hermes "Build UNDER" | **HAVE** (gateway live `P2-1…P2-9a`) — enforce the "no direct import" half |
| **SR-02** | `agent` ≠ `agent_runtime`; uniqueness key `(workspace_id, daemon_id, provider)` as a DB constraint | Multica | **BORROW** — new object, new migration |
| **SR-03** | Permission policy ladder (`locked`/`standard`/`open`+`yolo`/`auto`) as data, per agent per workspace | openrig | **BORROW** |
| **SR-04** | Two-surface rule: policy set by deterministic code only, never by a config file alone | openrig | **BORROW** — build-time fence |
| **SR-05** | Sub-agent spawn cap, measured not guessed; every spawn in the hash-chained ledger | Hermes (50↔250) + zulip audit log | **BUILD** — resolves the contradiction by measurement |
| **SR-06** | Skills as versioned `SKILL.md` artifacts, sandboxed and tiered | n8n `@n8n/agents` + Hermes skills loop | **BORROW** |
| **SR-07** | A bot is a participant (`UserProfile` class), not a parallel agent object | zulip | **BORROW** — identity-model change |
| **SR-08** | The triage core gets a production caller | mercato `G-21` / `CC-59` / `CC-60` | **BUILD** — wire what exists |
| **SR-09** | A2UI-style protocol contract for agent↔host messages, with enforcement | CrewAI | **BORROW** — protocol shape only |

**Prerequisites:** SR-02 and SR-07 land together (identity first, or the runtime constraint
has nothing to constrain). SR-04 is a build-time fence and can land independently.
**Triggers:** SR-08 has no trigger — it is wiring, not design, and it is the cheapest item
in the pole.

---

*Next: `03-the-workspace.md`.*
