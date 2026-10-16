# 01 — PLATFORM OVERVIEW

**Nine closed studies. One mapping. The frame: we are not limited by what mercato allows.**

---

## 1. The nine, at a glance

| # | Platform | Version | P1 | P2 | P3 | PX-W | PZ | The one mechanism we take |
|---|---|---|---|---|---|---|---|---|
| 1 | **Hermes** | forensics | ★ engine | profile isolation only | — | — | egress guard | **Build UNDER** — the engine behind a typed port, never forked |
| 2 | **Paperclip** | 0.3.1 | seam-provider | ★ strength | ★ strength | — | — | The P2/P3 foundation shape |
| 3 | **CrewAI** | 1.15.28 | donor | ✗ | ✗ | — | — | A2UI protocol — the study's only *real* enforcement |
| 4 | **Multica** | 0.2.0 | ★ all three poles real | ★ 144 tables | ★ workflows | ✗ | authority layer | **Machine ≠ teammate** — the one-tenant-one-engine primitive |
| 5 | **Gas Town** | 1.2.1 | watchdog chain | ✗ | Hook | ✗ | 3-layer sandbox | **Hook = durability primitive** |
| 6 | **n8n** | 2.44.0 | `@n8n/agents` | ★ 10 roles / 206 scopes | ★ engine | ★ **first composition surface** | — | **The composition canvas + design system + lint plugin** |
| 7 | **buzz** | 0.5.28 | — | ★ community = tenant | approval gate (dead) | ✗ | ★ **strongest** | **The proof surface** — TLA+ / Tamarin / prose contract / LIMITS.md |
| 8 | **openrig** | 0.6.10 | 5 policies | ✗ **no tenancy** | Context Packs | ✗ | ★ **gate culture** | **The exclusion ledger with mechanical expiry** |
| 9 | **zulip** | 12.0-dev | tiny by design | ★ **STRONGEST — the ambient realm** | plumbing | ★ **first widget model** | ★ **densest** | **Ambient tenancy + the append-only widget log** |

**Widget model exists in exactly two of nine platforms: n8n and zulip.** That is the single
largest concentration of opportunity in the whole study — five poles, nine platforms, and the
one pole that makes a platform *composable* appears twice.

**Tenancy is absent in three of nine: openrig, Gas Town, Hermes** (Hermes has profile
isolation, which is not commercial tenancy).

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
