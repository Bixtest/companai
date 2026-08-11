# Projects, as an authority scope

**In one sentence.** A matter — a case, an engagement, an acquisition — can carry
its own rules about who may do what to the records inside it, and how
consequential that work is.

**Why it matters.** The platform scopes by tenant and organisation, which
describes *structure*. Work is not organised that way: a legal case pulls people
from several departments, and without this, scoping stops at the department
(SRS FR-550, FR-560).

---

## The three tables

| Table | What it holds |
|---|---|
| `authority_projects` | The matter: a name, an optional **grade**, an optional close date |
| `authority_project_memberships` | Who works in it, and their **permission overlay** |
| `authority_project_records` | Which records belong to it — **one project per record** |

**The third table is what makes the whole thing work.** An overlay only means
something if the resolver can tell that *this act* is inside *that project*, and
nothing in the platform said so. A project holds records; an act names a record
through `payload.id`, which the command gate already reads for record locks. So
mapping a record into a project reuses an identifier the gate has, and no command
had to declare anything — the same reasoning that shaped [record locks](record-locks.md).

## What a project supplies

**Two inputs to the resolver, not one.**

1. **A ceiling**, from the acting member's overlay. Typed rules — match a
   capability or an effect class, then either cap it at a gate or `deny` it.
2. **A task grade.** A grade describes the *work*, and until a matter existed to
   read one from, every act resolved at the `G1` baseline.

```json
{
  "rules": [
    { "capabilityId": "customers.people.manage", "effect": "deny", "reason": "sealed pending settlement" },
    { "effectClass": "E4", "effect": "A2" }
  ]
}
```

## Four rules worth knowing

**A deny is terminal, and needs no special case.** Platform 1 implements terminal
deny by ending evaluation early. Here a deny is `A0`, and because every rule takes
a minimum and **nothing anywhere raises a ceiling**, `A0` cannot be lifted by a
later source. The property comes from the invariant rather than from an
evaluation-order rule — so it holds whichever order the rules are written in.

**An overlay only narrows.** It cannot grant a member something they do not
already hold. That is what makes it an overlay rather than a second permission
system.

**Only a member's overlay applies.** A non-member acting on a project's record is
still governed by the graph, tenant policy and the record's own lock — but not by
rules written for people working inside the matter.

**An ungraded project says nothing**, rather than `G0`. A *lower* grade buys
**more** autonomy, so a project nobody graded must not declare its work
negligible. An unreadable grade is treated the same way.

## What goes wrong

| Symptom | Cause | Fix |
|---|---|---|
| The overlay has no effect | The act names no record — a create names nothing | Overlays bind on acts against a record |
| The overlay has no effect, and there is a record | The actor is not a member of that project | Add the membership |
| The grade did not apply | The project has no grade, or an unreadable one | Set one of `G0`–`G4` |
| A record seems to be in the wrong project | One project per record; assigning again **moves** it | Check `authority_project_records` |

## What this is not

The **authority half** of a project. FR-550's wider "Project Brain" — goals,
participants, decisions, tasks, documents, knowledge — is product surface and
Phase K work. This is enough for a matter to govern the work inside it.

## Where the code lives

| Path | What |
|---|---|
| `packages/shared/src/modules/project-overlays.ts` | The overlay rules, as pure functions |
| `packages/core/src/modules/auth/services/projectService.ts` | Projects, members, record assignment |
| `packages/core/src/modules/auth/services/authorityEnforcementService.ts` | `projectContextFor` — where both inputs reach the resolver |
