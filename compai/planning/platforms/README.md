# Platform Assessments

One folder per assessed platform. Each folder is self-contained: everything we
know about that candidate lives inside it, and nothing about it lives outside it.

**Method:** [../method/platform-assessment-methodology.md](../method/platform-assessment-methodology.md)
**Rubric:** [../method/platform-evaluation-rubric.md](../method/platform-evaluation-rubric.md)

---

## Index

| # | Platform | Source | Assessed | Verdict |
|---|---|---|---|---|
| 01 | [Graph Portal Platform](01-graph-portal-platform/) (`@gpp`) | `companai/Platform` (internal) | 2026-08-08 | **EVOLVE** — rubric 1.86 · adopt as foundation, rebuild the kernel on top; 5 repairs |
| 02 | [Open Mercato](02-open-mercato/) | `companai/open-mercato-main` · [github](https://github.com/open-mercato/open-mercato) · [docs](https://docs.openmercato.com/) | 2026-08-08 | **FORK** — rubric 3.55 · host-fitness 4.25 · strongest host candidate; 6 repairs |

### Selection is not yet decided

Neither platform is a governance kernel; both would need ours built on top. The
question is **"cheaper to add a kernel to a working platform, or a platform to a
working kernel?"** — and it turns on an ownership decision about upstream
divergence that is commercial, not technical. A cross-platform selection document
follows once assessments are complete. See
[P2 verdict §9](02-open-mercato/02-verdict.md).

---

## Naming convention

### Folder

```
platforms/NN-<kebab-slug>/
```

- `NN` — assessment order, zero-padded, permanent once assigned.
- `<kebab-slug>` — the platform's own name, lowercased. Not our nickname for it,
  and not the directory it happens to sit in.

### Files inside a platform folder

Fixed set, fixed numbering, so the same document is in the same place for every
platform. Numbers match the deliverable order in the methodology.

| File | Template | Content |
|---|---|---|
| `README.md` | — | One-page summary card: identity, verdict, key findings, links |
| `00-reading-triage.md` | — | *Large targets only.* Keep/skip decision with per-entry justification, written **before** reading |
| `01-forensic-analysis.md` | T-1 | What it is, from source. Neutral and verifiable. |
| `02-verdict.md` | T-2 | Scored against the rubric, argued, decided |
| `03-identity-and-salvage-map.md` | T-3 | Stack, database, need→code salvage mapping |
| `04-docs-review-notes.md` | T-4 | Ideas harvested from its documentation, including declined ones |
| `05-*.md` … | — | Optional extras; number sequentially, name descriptively |

If a platform has no documentation worth reviewing, `04` is simply absent —
do not create an empty file to preserve symmetry.

### Cross-reference labels

Inside these documents, refer to other documents by a stable label so a reader
always knows which platform is meant:

| Target | Label |
|---|---|
| Our design docs | `[00]`–`[07]` |
| Method / rubric | `[Method]`, `[Rubric]` |
| This platform's siblings | `[forensic]`, `[verdict]`, `[map]`, `[notes]` |
| Another platform | `[P1 verdict]`, `[P2 map]`, … — always prefixed with `PNN` |

Never write a bare `[09]`-style number for a platform document. Those were the
old flat filenames and they stop meaning anything once there is more than one
candidate.

### Where things do **not** go

- Platform-specific findings never go in `00`–`07`. Those are our design; a
  finding only reaches them once it has been *adopted*, and then it is recorded
  in [../CHANGELOG.md](../CHANGELOG.md) with its origin named.
- Method improvements never go in a platform folder. They go in
  `method/platform-assessment-methodology.md` §9.
