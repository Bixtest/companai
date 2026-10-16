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
delegation, the board) are taken *selectively and tiered* — not wholesale.

**One number to correct:** the sub-agent iteration cap is **250, not 50.** The "50" was written
in an earlier batch and the corpus corrected it itself under rule 13 — `06-scheduling-...`
records *"My **own** earlier batch note of 'subagent 50' was wrong; corrected here under rule
13. The docs' `250` is right"*, and `12-SYNTHESIS` carries *"the subagent iteration cap (`50` →
**250**, b06)"*. The parent cap is 500. **This contradiction is resolved; do not re-open it.**

### Paperclip — the seam, and a cleaner foundation than credited
Paperclip's aissistant is a *seam-provider*: the assistant is a pluggable provider behind a
stable interface, not the product. **Correction [C]:** the first version of this file called
P1 "weak". The batch says the opposite — *"P1's worker model is otherwise the cleanest of the
three poles' foundations"* (`02-the-aissistant §6`, Q2).

What Paperclip actually contributes: **four separable layers**, called *"the single most
transferable thing in this batch"* (§0); the three-method adapter contract (`invoke`, `status`,
`cancel` — C2-2, *"the exact versatility seam"*); a persistent **Ed25519 identity** that is
*"never silently replaced"* (C2-5); **permanent revocation** — *"a grant removed by an operator
stays removed"* (§1.4); and **gated hire with a real liveness probe** (C2-7).

### CrewAI — the donor (mechanism, not architecture)
CrewAI's P1 contribution is the **per-invocation tool filter with `run_context`** — a tool set
computed fresh for each call — plus the **typed tool-failure chain** (`retryable`/`code`,
tool→task→agent→crew→WARN precedence). CrewAI's own batch calls the tool filter *"the single
most actionable finding for our aissistant"* (`02-the-aissistant §8`, picking 2.6).

**Correction [C]:** the first version attributed A2UI to P1 and called it *"the study's only
piece of aissistant behaviour with real enforcement."* Both halves are wrong. **A2UI is a
widget protocol** — it lives in `05-widgets-and-frontend §5.3` and is filed here as **SR-32a**.
And "the only real enforcement" is a superlative later studies already contradict: n8n's own
ESLint plugin, zulip's `check-schemas`, and openrig's build-time boundary are enforcement too.

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

### buzz — a real but thin P1, and a safety default that matters more
buzz **does** have an aissistant, built on a striking premise: *"its premise is that **an agent
is a member, not a bot**"* (`02-the-aissistant §0`). Concretely: **agent = keypair + channel
membership**; memory is a custom NIP (NIP-AE, per-(agent,owner), NIP-44-encrypted and
owner-readable); **six tools**, not sixty; and a **six-mode permission ladder** including
`plan`.

**The finding that outranks everything else in this pole** (`02-the-aissistant §4.3`, D2-2,
F2-2): *"The CLI declares **`default_value = "bypass-permissions"`** for `permission_mode`"* —
test-confirmed at `config.rs:1578`, *"Skip the permission flow entirely."* And the documented
policy switch, `BUZZ_ACP_PERMISSION_POLICY`, **does not exist** as a variable. The batch's own
verdict is careful and worth copying exactly: *"the *mechanism* exists and is real (the
permission broker in `buzz-agent/src/permission.rs` is ~1,000 lines with documented
invariants); the *policy switch* is documented under a name that does not exist"* — and the
default is permissive.

**Correction [C]:** the first version said buzz's approval gate is *"dead code"*. That collapses
two true facts into one wrong word. The correct statement is the batch's own: a real mechanism,
a misnamed switch, and a permissive default. **Any statement about buzz's agent safety posture
must start with the default.**

### openrig — the permission ladder and the two-surface rule
Five built-ins: `BUILTIN_POLICY_NAMES = ["locked","standard","open","yolo","auto"]`
(`02-the-aissistant §6.4`). **Correction [C]:** the first version merged `open`+`yolo` into one
rung. The markdown separates them **by surface** — *"**yolo** | flag | `full_bypass`"* versus
*"**open** | config | `default_posture: allow`"* — and merging them erases the very distinction
the two-surface rule rests on. Also, `standard` is *"the **recommended** default"*, not the
default: `nodes.permission_policy` is *"`NULL` = floor"* (§6.4/§6.8).

> **The two-surface rule** (`02-the-aissistant section 6.1`): launch-time flags may be
> deterministic *code*; config-file policy may NOT be - because *"a config-file policy (a
> rules file whose schema a vendor may change) is **not** [deterministic] - it must go through
> a **skill** that reads the installed version and adapts."*

**Correction [C]:** the quote *"two reads of the same flag can diverge; one cannot"* is **not
in the markdown**. It was my paraphrase of the principle. The reason the markdown gives is the
skill-translation requirement above - quote that instead.

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
4. **A permission policy ladder as data** — five rungs, `locked` / `standard` / `open` /
   `yolo` / `auto`, with `open` and `yolo` living on **different surfaces** (config vs launch
   flag) — selectable per agent, per workspace, and governed by the two-surface rule.
5. **A sub-agent spawn ledger.** Every spawn recorded in the hash-chained ledger, against a
   hard cap decided by measurement. The Hermes number is settled at **250** (parent 500); the
   max-children precedent to copy is n8n's.
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
| **SR-03** | Permission policy ladder — five rungs, `open` and `yolo` on different surfaces — as data, per agent per workspace | openrig (`02-the-aissistant §6.4`) | **BORROW** |
| **SR-04** | Two-surface rule: config-file policy must be skill-translated, never trusted as deterministic | openrig (`02-the-aissistant §6.1`, §6.3, §6.4) | **BORROW** — build-time fence |
| **SR-05** | Sub-agent spawn cap, measured not guessed; every spawn in the hash-chained ledger | n8n (max-children cap, `07-SYNTHESIS §7.2` F02-04); Hermes (iteration cap **250**, parent 500) | **BUILD** |
| **SR-06** | Skills as versioned `SKILL.md` artifacts, sandboxed and tiered | n8n `@n8n/agents` + Hermes skills loop | **BORROW** |
| **SR-07** | A bot is a participant (`UserProfile` class), not a parallel agent object | zulip | **BORROW** — identity-model change |
| **SR-08** | The triage core gets a production caller | mercato `G-21` / `CC-59` / `CC-60` | **BUILD** — wire what exists |
| **SR-09** | Typed tool filter with `run_context`; typed tool-failure chain | CrewAI (`02-the-aissistant §5.2`, §8) | **BORROW** — CrewAI's own pick for us |
| **SR-32a** | **Widget protocol (moved here from PX-W):** declarative UI vocabulary + 18-component typed catalog, `allowed_components` enforced on the response | CrewAI (`05-widgets-and-frontend §5.3`) | **BORROW** — protocol, never "widget system" |

**Corrections [C] applied 2026-10-16 against the markdown:** the Hermes cap (250, not 50 — the
corpus resolved this itself); Paperclip is not "weak" (its P1 is *"the cleanest of the three
poles' foundations"*); buzz has a real P1 and a **permissive default** (`bypass-permissions`,
with a documented switch that does not exist); `open` and `yolo` are separate rungs on separate
surfaces; the two-surface rule is *skill-translation*, not a ban on config policy; the
"hash-chained ledger" is mercato's own, and zulip has cost metering instead; and A2UI belongs
in PX-W, not here.

**Prerequisites:** SR-02 and SR-07 land together (identity first, or the runtime constraint
has nothing to constrain). SR-04 is a build-time fence and can land independently.
**Triggers:** SR-08 has no trigger — it is wiring, not design, and it is the cheapest item
in the pole.

---

*Next: `03-the-workspace.md`.*
