# Salvage Analysis — the mandatory protocol before any deletion

**Blocking. No module, package or file is removed until this has been run and its
report committed to `workspace/salvage/<name>.md`.**

Modelled on `om-root-cause` from `skills-main`: **read-only, bounded, and it
produces a specific written verdict that the next step executes verbatim.**

---

## Why this exists

`customer_accounts` was on the delete list, described as "customer-facing
identity, part of the CRM chain". It contains `domain_mappings` — unique
hostname per tenant with a database check constraint. **That is per-company
custom domains, which we want.**

It was caught because someone asked a question, not because the method found it.
A confident-sounding category label ("it's CRM") was doing the work that
inspection should have done. This protocol removes the ability to delete on a
category label.

**The assumption to distrust: "this module is obviously about X, so it contains
only X."** Every module in a mature platform accumulates infrastructure that
happened to be needed there.

---

## Rules

1. **Read-only.** No edits, no deletions, no moves. The analysing agent never
   removes anything.
2. **Bounded.** Stop when the seven questions below are answered. Do not read the
   whole module for completeness.
3. **Assume something is worth keeping** until the seven questions say otherwise.
   The null hypothesis is *keep*, not *delete*.
4. **`LOW_CONFIDENCE` is a valid outcome** and stops the deletion. It is not a
   failure; it is the protocol working.
5. **One report per module**, committed before the removal commit.

---

## The seven questions

Answer every one. "No" needs evidence, not an impression.

### Q1 — What tables does it own, and does any of them describe the *platform* rather than the *domain*?

```bash
grep -n "@Entity" <module>/data/entities.ts
```

For each table, ask: is this a business record, or is it configuration,
infrastructure, identity, routing, or policy? The second kind is almost always
worth keeping regardless of which module it landed in.

*This is the question that would have caught `domain_mappings`.*

### Q2 — Who imports from it?

```bash
grep -rl "modules/<name>" packages/*/src apps/*/src | grep -v "modules/<name>/"
```

Any importer that is **not** also being removed is a blocker. Record each one and
what it uses.

### Q3 — Does any kept module declare it in `requires`?

```bash
grep -rn "requires" packages/*/src/modules/*/index.ts | grep <name>
```

The generator enforces this, but knowing *before* the build fails is cheaper.

### Q4 — What does it contribute to shared surfaces?

Check each, because these do not show up as imports:

| Surface | Where |
|---|---|
| Capabilities | `<module>/acl.ts` — is any feature referenced elsewhere? |
| DI registrations | `<module>/di.ts` — does a kept module resolve any of these? |
| Event subscribers | `<module>/subscribers/` — does it react to kept modules' events? |
| Entity extensions / links | `<module>/data/extensions.ts` — `defineLink` to kept entities |
| Widget injections | does it inject panels into kept modules' pages? |
| CLI commands | `<module>/cli.ts` — is any used in setup or seeding? |
| Setup and seed data | `<module>/setup.ts` — does it seed data a kept module expects? |
| AI agents and tools | `<module>/ai-agents.ts`, `<module>/ai-tools/` |
| Encryption maps | `<module>/encryption.ts` |
| Translations | keys referenced from shared components |

### Q5 — Does it contain generic machinery wearing a domain name?

Read the file *names* under `lib/`, `services/` and `utils/`. Look for anything
that would be useful with the domain removed — hostname validation, tokenising,
diffing, scheduling, address parsing, currency-free number formatting, retry
logic, importers.

Naming is the trap here. `customerImportQueue` may be a general import queue.


### Q5b — Ask it from the other direction too

Q5 asks *"does this module contain generic machinery under a domain name?"* —
scanned by reading file names inside the module being removed. That works, but it
is slow and easy to skim past.

**The faster question: what do the modules we KEEP reach into this one for?**

```bash
grep -rn "modules/<name>" <each kept module> --include=*.ts | grep -vE "__tests__|\.test\."
```

Anything a kept module imports is, by definition, something we still need. It is
either a genuine domain dependency to sever, or **generic machinery living in the
wrong place** — and the second is exactly what Q5 is hunting.

**Found this way:** `sales/components/documents/customFieldHelpers.ts` — 31 lines
of platform-wide custom-field normalisation with no sales logic at all, imported
by the kept `resources` module. Scanning `sales`' 356 files by name would probably
have missed it.

### Q6 — Does anything reference it by string rather than by import?

```bash
grep -rn "'<name>\.\|\"<name>\." packages/*/src apps/*/src | grep -v "modules/<name>/"
```

Capability ids, event names, entity ids, translation keys, route paths and queue
names are strings. **Static analysis will not find these**, and the generator
will not always catch them either.

### Q7 — What breaks in the UI?

Does a kept module's page link to, embed, or navigate into this one? Soft UI
coupling is invisible to every check above.

---

## The report

Write to `workspace/salvage/<module-name>.md`. Under ~400 words. The removing
step reads this verbatim and does not re-decide.

```markdown
# Salvage analysis — <module>

**Verdict:** REMOVE ENTIRELY · REMOVE AFTER EXTRACTION · KEEP · LOW_CONFIDENCE
**Size:** <LOC> · **Analysed:** <date>

## What it is
<Two sentences. What the module actually does, not what its name suggests.>

## Keep list
<Everything that must survive. Empty is a valid answer — but state it explicitly
as "nothing" rather than omitting the section.>

- `<path>` — <what it is, why it survives, where it should move to>

## Answers
| Q | Finding |
|---|---|
| Q1 tables | <platform-ish tables named, or "all domain"> |
| Q2 importers | <kept importers named, or "none outside the removal set"> |
| Q3 requires | <declaring modules, or "none"> |
| Q4 shared surfaces | <contributions to kept surfaces, or "none"> |
| Q5 generic machinery | <candidates, or "none"> |
| Q6 string references | <found references, or "none"> |
| Q7 UI coupling | <links from kept pages, or "none"> |

## Extraction plan
<Only when the verdict is REMOVE AFTER EXTRACTION. Name the target module, the
files to move, and the migration needed to repoint the tables.>

## Risks
<What could still go wrong. What to watch after removal.>
```

---

## Worked example — what a correct analysis of `customer_accounts` looks like

```markdown
**Verdict:** REMOVE AFTER EXTRACTION

## Keep list
- `data/entities.ts:320-347` — `domain_mappings`: unique `hostname` per tenant
  with a lowercase/no-trailing-dot check constraint. This is **per-company custom
  domains**, platform infrastructure, not CRM. Move to `directory`.

## Answers
| Q1 tables | `domain_mappings` is routing infrastructure; the rest are customer identity |
| Q7 UI coupling | `portal` module depends on this — but `portal` is also being removed |
```

The verdict flipped on **Q1 alone**. Q1 is the highest-yield question; answer it
first and answer it properly.
