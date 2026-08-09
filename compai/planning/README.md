# Planning

Working design documents for the AI Company Operating Platform.

**Status: provisional.** Nothing here is committed. These documents turn the
brainstorming material into concrete, arguable architecture so we can disagree
with something specific instead of something vague. Every proposal states its
rationale and the alternatives it beat, so any of them can be reversed cheaply.

## Where this came from

| Source | Role |
|---|---|
| `../brainstorming/chat_thread.md` | Conceptual origin — QM vs. Buzz; agents as identified members inside isolated durable working environments |
| `../brainstorming/deep-research-report.md` | Build/buy landscape under a permissive-licence constraint |
| `../brainstorming/Software Requirements Specification.md` | Greenfield functional baseline — what the product does if we coded all of it |
| Session of 2026-08-08 | Four new concepts: task grades, worker CV, knowledge hashtags, @mentions |

## Layout

```text
planning/
├── 00–07                  our design — the north star. Platform-agnostic.
├── CHANGELOG.md           what changed in the design, and which source it came from
├── method/                how we assess candidates (rubric + methodology)
└── platforms/             one self-contained folder per assessed candidate
    └── NN-<slug>/         README · forensic · verdict · salvage map · docs notes
```

**The rule that keeps this clean:** a platform finding never enters `00`–`07`
until it has been *adopted*, and then it is recorded in `CHANGELOG.md` with its
origin named. Everything else about that platform stays in its own folder.

## The design documents

Read in order the first time. `00` and `01` are the frame; `02`–`05` are the four
new concepts designed out; `06` settles a question the SRS left open; `07` lists
what is still undecided.

| # | Document | What it settles |
|---|---|---|
| [00](00-product-thesis.md) | Product thesis | What we are building and the invariants everything else must respect |
| [01](01-core-architecture.md) | Core architecture | The five kernel services, the narrow waist, and the scope-control strategy |
| [02](02-authority-and-autonomy.md) | Authority & autonomy | **Idea 1** — task grades, capability risk classes, the autonomy ladder, trust tiers, approval-fatigue controls |
| [03](03-worker-charter.md) | Worker Charter ("CV") | **Idea 2** — the full schema, composition rules, and how it compiles into runtime grants |
| [04](04-context-graph-and-tags.md) | Context graph & tags | **Idea 3** — hashtags as the user-facing syntax of a canonical entity graph |
| [05](05-addressing-and-mentions.md) | Addressing & mentions | **Idea 4** — @mentions as universal addressing and work invocation |
| [06](06-attribution-and-audit.md) | Attribution & audit | How we prove who did what, without signing everything |
| [07](07-open-questions.md) | Open questions | Decisions we are deliberately not making yet |
| [08](08-host-selection-and-migration-plan.md) | **Host selection & migration plan** | **Host = Open Mercato · Donor = Platform 1.** Strip, repair, graft, build — and the one decision that is yours |
| [09](09-starting-kit.md) | **The Starting Kit** | Plain-language inventory of what we start with, what we remove, and what we still have to build |
| [CHANGELOG](CHANGELOG.md) | Changelog | What changed in these documents, and where each idea came from |

## Method

| Document | Purpose |
|---|---|
| [Assessment methodology](method/platform-assessment-methodology.md) | Seven batches, sixteen probes, scoring rules, named traps, document templates. **Read before starting any assessment.** |
| [Evaluation rubric](method/platform-evaluation-rubric.md) | Fatal-flaw screen and weighted scorecard |

## Platform assessments

Index, naming convention and folder rules: [platforms/README.md](platforms/README.md)

| # | Platform | Verdict |
|---|---|---|
| [01](platforms/01-graph-portal-platform/) | Graph Portal Platform (`companai/Platform`) | **EVOLVE** |
| [02](platforms/02-open-mercato/) | Open Mercato (`companai/open-mercato-main`) | in progress |

## The four new concepts, in one line each

1. **Task grades** — work carries a sensitivity grade; capabilities carry a risk
   class; together with trust and budget they resolve to *one* autonomy decision
   per action, computed in one place, always explainable.
2. **Worker Charter (CV)** — not a document about a worker but the versioned
   source from which that worker's runtime permissions, tools, knowledge scopes
   and budgets are compiled. Humans get one too.
3. **Knowledge hashtags** — the human-typeable syntax for a machine-readable
   context graph. Entity tags resolve to canonical entities, so a tag is a link,
   not a string. Saved tag expressions become grantable knowledge scopes.
4. **@mentions** — one addressing space over people, AI workers, roles, teams,
   departments and duty rotations. Mentioning an AI worker *is* invoking work,
   so a mention carries the mentioner's authority but can never amplify it.

## Naming

Working names, all replaceable:

| Concept | Working name | Alternatives considered |
|---|---|---|
| Non-human worker | **AI Worker** | Digital Employee, Agent Employee, Operator, Synthetic Staff |
| The "CV" | **Worker Charter** (machine) / **Service Record** (human-readable view) | Employment File, Dossier, Mandate, Commission |
| Work methodology | **Mindflow** | Operating Doctrine, Method, Playbook — *Mindflow is good; recommend keeping it* |
| Saved tag expression | **Lens** | Context, Collection, Scope, View |
| Autonomy decision point | **Autonomy Resolver** | Policy Decision Point (the generic term) |

## Where we are

Both general platforms assessed. **Host selected: Open Mercato** (host-fitness
4.25 vs 2.25). Platform 1 becomes a donor for six concentrated items.
Plan: [08](08-host-selection-and-migration-plan.md).

## Next step

1. **You decide upstream ownership** — hard fork, track, or fork-and-cherry-pick
   ([08 §3](08-host-selection-and-migration-plan.md)). Recommendation: hard fork.
2. **Strip batch S7 greens the build** — the one open technical risk, checked first.
3. **Targeted donors** for the named gaps ([08 §9](08-host-selection-and-migration-plan.md)):
   knowledge/RAG · entity resolution · tags & semantic layer · addressing ·
   trust & evaluation · tamper-evident attribution · company modelling.
   These are half-day assessments against one gap, not six-batch programmes.
