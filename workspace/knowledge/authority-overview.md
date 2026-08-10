# The governance layer, end to end

**In one sentence.** One place decides whether any actor — human or machine — may
take any action, and it can always say why.

**Why it matters.** This is the product. Everything else in this repository is a
working business platform we forked; *this* is the part that does not exist
anywhere else, and the part a customer would buy. If you read one document in
`knowledge/`, read this one.

---

## What happens when somebody tries to do something

Follow a single request all the way through. A user clicks **Save** on an
organization.

```text
1. HTTP route guard          "does this actor hold directory.organizations.manage?"
       │                      RbacService.userHasAllFeatures → true / false
       │
       ├─ false ────────────► 403. Done.
       │
2. The resolver              "how much autonomy do they have for this act?"
       │                      resolveDecision → a gate, A0…A5, with reasons
       │
       ├─ A0 ──────────────► 403, and the reason is logged
       │
3. The command bus           the act itself, if it is still going to happen
       │
       ├─ A1 / A2 ─────────► held in authority_acts. 202. Runs on approval
       │
       ├─ A4 ──────────────► runs now, then filed in authority_act_reviews
       │
       └─ A3 / A5 ─────────► runs now
                              │
4. Audit + ledger             every write recorded, and hash-chained
```

Steps 2 and 3 only apply to tenants that have switched enforcement on. By default
a tenant is in **shadow**: the resolver runs, records what it *would* have done,
and changes nothing.

## The six questions, and which piece answers each

| Question | Answered by | Read |
|---|---|---|
| **Who is acting?** — person, service, AI worker | `Principal`, attached at the auth boundary | [principals.md](principals.md) |
| **What kind of act is this?** — read, write, destructive, how reversible, what data it touches | The capability descriptor on every `acl.ts` feature | [capabilities.md](capabilities.md) |
| **How much does this work matter?** — the task grade, G0–G4 | Derived, and never below what the data classes justify | [authority-decisions.md](authority-decisions.md) |
| **Where does the actor sit?** — what the org structure permits | Typed edges between organizations, with ceilings | [org-authority-graph.md](org-authority-graph.md) |
| **So what is allowed?** — the gate, and every rule that produced it | `resolveDecision`, and enforcement when it is on | [authority-decisions.md](authority-decisions.md) |
| **What actually happened?** — and can we prove it | The audit trail and the hash-chained ledger | [audited-writes.md](audited-writes.md) · [ledger.md](ledger.md) |

## The one rule that shapes all of it

**Everything is a ceiling, and the answer is the minimum.**

There is deliberately no rule anywhere that *raises* a gate. If one existed, every
other rule would become advisory, and the question *"what is the most this could
ever be?"* would have no answer.

The corollary is worth stating too, because it is what makes the whole thing
safe to switch on: **enforcement can only narrow.** It runs after the ordinary
permission check has already said yes, so no arrangement of rules can grant
somebody something they did not already hold.

## The gates

| | Meaning | Enforced today? |
|---|---|---|
| **A0** | Blocked | **Yes** |
| **A1** | Propose; a person performs the act | **Yes** — held for approval |
| **A2** | Approve first | **Yes** — held for approval |
| **A3** | Hold, then commit unless vetoed | No — needs a scheduler |
| **A4** | Act now, review afterwards | **Yes** — the act runs and is filed for review |
| **A5** | Act and log | Nothing to enforce |

Where a gate is not enforced, the obligation is recorded and the act proceeds.
**Say that out loud whenever it comes up.** A control that is claimed and absent
is worse than one that is absent and known.

## What is deliberately not built yet

Not omissions — decisions, each with a backlog entry:

- **A trust model.** Planning describes tiers T0–T4 earned from evidence. Until
  it exists, every machine resolves as untrusted, which caps acts with an effect
  at approve-first. That is a placeholder pointing in the safe direction.
- **Delegations, charters, standing approvals.** The resolver reads them if
  supplied; nothing supplies them.
- **The approvals inbox.** There is an API and a deadline. The screen is
  scheduled — see `PROGRESS.md` → *The approvals page*.
- **Correlation across acts.** The ledger carries the fields; nothing threads
  them, so acts cannot yet be assembled into a trace.

## Where the code lives

| Path | What |
|---|---|
| `packages/shared/src/modules/capabilities.ts` | Effect classes, task grades, the autonomy matrix, data-class grade floors |
| `packages/shared/src/lib/authority/decision.ts` | The resolver. Start here |
| `packages/shared/src/lib/authority/graph.ts` | The org-graph rules, as pure functions |
| `packages/shared/src/lib/authority/shadow.ts` | Observation mode |
| `packages/core/src/modules/auth/services/authorityEnforcementService.ts` | Per-tenant mode; turns a decision into a refusal |
| `packages/core/src/modules/auth/services/pendingActService.ts` | Acts held for approval, and acts filed for review |
| `packages/core/src/modules/auth/commands/interceptors.ts` | The gate that holds an act |
| `packages/core/src/modules/directory/services/authorityGraphService.ts` | The graph, from the database |
| `packages/core/src/modules/audit_logs/services/ledgerService.ts` | The hash chain |

## Try it in two minutes

```bash
cd workspace/starting-kit/apps/mercato

# What would happen if an AI worker tried this?
corepack yarn mercato auth authority:explain \
  --capability integrations.credentials.manage --actor ai_worker

# Which mode is a tenant in?
corepack yarn mercato auth authority:mode --tenant <id>
```

`authority:explain` prints the gate, every rule consulted, which one was binding,
what obligations follow, and what would change the answer. It reads the real
descriptors, so what it prints is what the platform actually believes.

## Design source

`compai/planning/02-authority-and-autonomy.md` is the specification. When it
names the same input twice in different shapes — as it does for data
classification — **the worked examples in §8 are the ones that say which shape
was meant.** That distinction cost a backlog item's worth of hesitation once.
