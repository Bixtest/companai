# 01 — PLATFORM OVERVIEW

**Nine closed studies. One mapping. The frame: we are not limited by what mercato allows.**

---

## 1. The nine, at a glance

| # | Platform | Version | P1 | P2 | P3 | PX-W | PZ | The one mechanism we take |
|---|---|---|---|---|---|---|---|---|
| 1 | **Hermes** | *no single version* (see note) | ★ engine | profile isolation only | Cron preflight | — | egress guard + 4 approval modes, all `deny` by default | **Build UNDER** — the engine behind a typed port, never forked |
| 2 | **Paperclip** | *none declared* (see note) | seam + 4 separable layers | ★ portable-markdown package | ★ strength — "the deepest part" | ✗ | MCP access governance | The P2/P3 foundation shape |
| 3 | **CrewAI** | 1.15.28 | typed tool filter (`run_context`) | ✗ | ✗ | **protocol** (A2UI, 3,669 lines) | auth without authz | A2UI protocol — a widget *protocol*, never a "widget system" |
| 4 | **Multica** | 0.2.0 | ★ all three poles real | ★ 144 tables | ★ workflows | ✗ | write-path secret redaction | **Machine ≠ teammate** — the one-tenant-one-engine primitive |
| 5 | **Gas Town** | 1.2.1 | declarative agent model (watchdog chain is P3) | ✗ | Hook = durability (F03-03) | ✗ | **3-layer sandbox** | **Hook = durability primitive** + ZFC "Zero Framework Cognition" |
| 6 | **n8n** | 2.44.0 | `@n8n/agents` | ★ 10 roles / 206 scopes | ★ engine | ★ **first composition surface** | two ratchets that only shrink | **The composition canvas + design system + lint plugin** |
| 7 | **buzz** | 0.5.28 | **real but thin** — agent = keypair + membership | ★ community = tenant | no queue; at-most-once claim | ✗ | ★ **strongest** | **The proof surface** — TLA+ (13 invariants) / Tamarin (32 lemmas) / prose contract / LIMITS.md |
| 8 | **openrig** | 0.6.10 | 5 policies (5 rungs, separate surfaces) | ✗ **no tenancy** | **a queue of obligations** | ✗ | ★ **gate culture** | **The exclusion ledger with mechanical expiry** |
| 9 | **zulip** | 12.0-dev | tiny by design — one LLM feature, fenced five ways | ★ **STRONGEST — the ambient realm** | plumbing | ★ **first widget model** | ★ **densest** | **Ambient tenancy + the append-only widget log** |

**Version notes [C]:** **Paperclip declares no version** — `07-SYNTHESIS §1`: *"no version
field"*, §6.1: *"No `.git`, no version field ⇒ the exact commit is unknowable."* The "0.3.1"
in the first version was the **fork baseline** (upstream Paperclip 0.3.1, baseline commit
`4feef987`), not the studied tree. **Hermes has no single version** — `13-prior-coverage-audit
§1`: *"**Hermes 0.20.1** while its extract was **post-0.21.5** … This study's tree is
**2026-10-15**."* **zulip's is internally split** — `01-platform-overview §1.8` D1-1: *"`version.py`
says `12.0-dev+git` while `LATEST_RELEASE_VERSION = "12.3"`."*

**Correction [C] on the "only real enforcement" claim:** the first version credited CrewAI's
A2UI as *"the study's only real enforcement."* That superlative is **stale** — later studies
measure more: n8n's own ESLint plugin, zulip's `check-schemas` (*"a guard **diffs them**"*), and
openrig's build-time boundary (*"A boundary enforced by the build"*). CrewAI's own synthesis
states the claim as of its writing; it does not survive the later batches.

**Widget architecture exists in three of nine; a widget *model* in two.** n8n has the first
**composition surface**; zulip has the first **widget model** (an append-only log with derived
state); CrewAI has a real **widget *protocol*** — 3,669 lines, an 18-component typed catalog,
and `allowed_components` *"enforced on the response, not just advertised in the prompt"* —
but **no renderer ships in its tree**. The first version of this file said "exactly two of
nine" and then counted wrong; the honest statement is that **Hermes was never measured** (no
file in its corpus mentions widgets either way), so the count is two models + one protocol,
against seven measured negatives.

**Tenancy is absent in four of nine: openrig, Gas Town, CrewAI, Hermes.** **Correction [C]**
the first version said three, missing CrewAI — `crewai-forensics/07-SYNTHESIS §7.4`: *"Tenancy
of any kind"* absent, *"no tenant type/column/param anywhere."* Paperclip is **single-tenant**
(*"No multi-tenancy."*), which is a different thing again. And Hermes's isolation is *profile*
isolation — a personal boundary, not a commercial one, and its own markdown sometimes leans
the other way.

## 2. What each pole's target must be

Derived from the nine columns above, unrestricted by mercato's current state:

**P1 — the aissistant.** Not a chat box. A *capability surface*: an agent is a first-class
object with its own identity, its own permission policy, its own spawn ledger, and its skills
as versioned artifacts — running behind a typed port so the engine can be swapped. The two
hardest lessons: **an agent is not its runtime** (Multica), and **a bot is a user, not a new
object** (zulip).

**P2 — the workspace.** Not a permission check. An *ambient* boundary: the tenant is derived
from the request, the fence is one comparison, identity keys are unique *per realm*, and the
audit log's numbering encodes where an event happened. One tenant maps to one engine home.

**P3 — automations.** Not a scheduler. A *durable* execution layer: a claim that is one SQL
statement, retry counters that ride inside the payload so they survive a crash, a closed
failure taxonomy, and every command declaring its own risk and approval before it may run.

**PX-W — widgets.** Not screens. A *composition surface*: the widget as an append-only event
log whose state is derived by replay, described by a discriminated union, rendered by one
generic renderer, driven by a generic bridge so any backend can move it.

**PX-F — frontend.** Not pages. A *design system with lint rules* — a component set whose
composition is machine-checked — rendering perspectives over the workspace's data.

**PZ — the guard.** Not a wall. An *honesty machine*: exclusions that expire mechanically,
one truth checked across every representation, a ratchet that only a human can raise, escape
hatches that are named and greppable, and a document beside every gate that says what it
cannot see.

## 3. The frame, restated as a working rule

For every row in this pass:

> **HAVE IT** tells us what we start with. **BUILD IT** tells us what is already planned.
> **BORROW IT** tells us where the mechanism comes from. **RE-ENGINEER IT** tells us what the
> target is — and the target is set by the best evidence in the study, not by the current
> code.

The target may exceed mercato. It may require retiring something mercato has. It may require
building something no platform in the study has. All three are acceptable; a target that is
merely "what mercato already does, tidied" is not.

---

*Next: `02-the-aissistant.md`.*
