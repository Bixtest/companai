# Workspace

This is where the **Starting Kit** gets built.

| | |
|---|---|
| **What** | Open Mercato, stripped of ERP, repaired in six places, with eight pieces grafted in from Graph Portal Platform |
| **Why** | See [planning/08 — Host selection](../compai/planning/08-host-selection-and-migration-plan.md) and [planning/09 — The Starting Kit](../compai/planning/09-starting-kit.md) |
| **How** | [COOKBOOK.md](COOKBOOK.md) — read it before touching anything |
| **State** | Codebase in place (10,139 files). Environment being prepared. Phase P in progress. |

## Decision: hard fork — settled 2026-08-08

**Our platform has a life of its own. We will change it too much to ever take
their updates again.**

Option A from [08 §3](../compai/planning/08-host-selection-and-migration-plan.md),
confirmed by the owner. What follows from it:

- We change anything we like, including the identity and permission core.
- **We never merge from Open Mercato again.** No upstream, no rebase cost.
- **We do not receive their security fixes.** Nobody will tell us when they patch
  something. For roughly the first year, someone should check their releases
  periodically and port anything serious by hand; after that our version will
  have diverged too far for their patches to apply anyway.
- The MIT licence permits all of this. `packages/enterprise` is still excluded —
  its separate commercial licence is unaffected by our fork.

## Environment

Full setup and the command prefix to use: [references/environment.md](references/environment.md).

| | |
|---|---|
| Node | **v24.19.0 LTS**, project-local in `.toolchain/node24/` — matches the `engines: 24.x` the project declares. System Node (v22) untouched. |
| Yarn | 4.17.1 via `corepack yarn` — Corepack shims need admin for `C:\Program Files\nodejs`, so use `corepack yarn …`, never bare `yarn` |
| Docker | 29.6.1 — for PostgreSQL and Redis |
| Disk | ~39 GB free of 477 GB |

⚠ **Every command must export the Node 24 path first**, or the result is about
our environment rather than about the platform.

## Layout once work starts

```text
workspace/
├── README.md              this file — current state
├── COOKBOOK.md            the development cookbook (read first)
├── references/            the detail the cookbook points to
│   ├── working-rules.md   how we work — adopted from skills-main
│   ├── salvage-analysis.md  MANDATORY read-only protocol before any deletion
│   ├── strip-batches.md   S1–S8
│   ├── repair-batches.md  R1–R6
│   └── graft-batches.md   G1–G8
├── salvage/               one report per analysed module — the audit trail
├── attic/                 stripped modules, kept for reference, outside the build
└── starting-kit/          the actual codebase
```

## The rule that produced this folder

We already lost something once. `customer_accounts` was on the delete list as
"CRM"; it contains `domain_mappings` — per-company custom domains, which we want.
It was caught by a question, not by a method.

So: **[references/salvage-analysis.md](references/salvage-analysis.md) is
mandatory and blocking before any module is removed.** No exceptions, including
for modules that look obviously irrelevant. Especially those.
