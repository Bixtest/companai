# Preview — my own documentation of this project

**Written:** 11 October 2026 · **Author:** an agent brought in to learn the project cold
**Rule I was given:** change nothing in the codebase or its existing documentation. Only create files here.

These documents are **my own understanding**, written after reading the vision, the development
management set, the workspace-architecture design track, the project memory, and the code itself. They
are not replacements for the project's own documents — they are the proof that I understood them, and a
second voice explaining the same thing in different words.

---

## The documents

| # | File | What it is |
|---|---|---|
| 1 | [`01-WHAT-THE-PLATFORM-IS.md`](01-WHAT-THE-PLATFORM-IS.md) | **What we are building, in my own words** — the product idea, the loop that makes it work, the five pieces, what it is *not*, and where it honestly stands. |
| 2 | [`02-SRS-SYSTEM-MANUAL.md`](02-SRS-SYSTEM-MANUAL.md) | **The system manual.** A requirements specification written in the language a *user* would use — what you can do, what you see, what the rules are, and what is not there yet. No technical jargon; where a term is unavoidable it is explained in place. |
| 3 | [`03-GLOSSARY.md`](03-GLOSSARY.md) | **Plain-English glossary** — every term the project uses constantly, defined without assuming you are a developer. |
| 4 | [`04-HOW-IT-IS-BUILT.md`](04-HOW-IT-IS-BUILT.md) | **My read of the engineering shape** — the two repositories, the packages, the libraries that carry the product ideas, and the path a request takes through the running system. |
| 5 | [`05-STORY-SO-FAR.md`](05-STORY-SO-FAR.md) | **The story, told forward** — how the project got here, what was decided and why, and what changed most recently. |
| 6 | [`06-OPEN-QUESTIONS-AND-RISKS.md`](06-OPEN-QUESTIONS-AND-RISKS.md) | **What is not done, what is blocked, and what I would flag** — including the decisions that belong to the owner and the traps I would warn the next person about. |
| 7 | [`07-THE-AI-ENGINE-HERMES-AND-LLAMA.md`](07-THE-AI-ENGINE-HERMES-AND-LLAMA.md) | **The AI engine in full** — Hermes as the reasoning runtime, the typed door that is the only way in, the model server and llama.cpp, what is actually running versus what is designed, the measured performance, and the two live defects. |
| 8 | [`08-FORENSIC-AUDIT.md`](08-FORENSIC-AUDIT.md) | **The forensic audit** — every defect I could verify, with severity, file and line, a failing scenario, and what I tried and failed to break. Also the test-quality holes. |
| 9 | [`09-OPTIMIZATIONS-AND-ENHANCEMENTS.md`](09-OPTIMIZATIONS-AND-ENHANCEMENTS.md) | **Performance, richer functionality and engineering hygiene** — ranked, with the one structural finding that would prevent a whole class of defect. |
| 10 | [`10-SECURITY-UX-AND-RESPONSIVENESS.md`](10-SECURITY-UX-AND-RESPONSIVENESS.md) | **Security, UX/UI and responsiveness** — what is genuinely strong, the one blind spot in the security model, ranked security improvements, and the ten UX problems in the order a user hits them. *(Written from documentation — superseded on the front end by 11.)* |
| 11 | [`11-FRONTEND-UI-RESPONSIVENESS-AUDIT.md`](11-FRONTEND-UI-RESPONSIVENESS-AUDIT.md) | **The code-level front-end audit** — the batch I had previously admitted I did not do. The design-system lint is broken (and the whole `@typescript-eslint` install with it), accessibility linting is installed and never enabled, RTL is half-built with a false claim in its own source, and `/backend` crashes if one module is switched off. Plus what is genuinely excellent. |
| 12 | [`12-HINDSIGHT-MEMORY-PROPOSAL-ASSESSMENT.md`](12-HINDSIGHT-MEMORY-PROPOSAL-ASSESSMENT.md) | **Assessment of an external memory-architecture proposal** (Hindsight + PostgreSQL/pgvector + Hermes, written for another project). What it genuinely adds, what we already decided, and what would hurt us. Verdict: use it as an input to two existing backlog items, not as an architecture decision. |

---

## Where the truth lives (their documents, not mine)

| If you want… | Read |
|---|---|
| The project's own canonical statement of the idea | `library/WHAT-WE-ARE-BUILDING.md` |
| Where the project stands, one number, one list | `library/development/platform_points.md` |
| What is left, in order | `library/development/BACKLOG.md` |
| The order the work must be done in | `library/development/BUILD-ORDER.md` |
| The front door for a newcomer | `library/development/HANDOVER.md` |
| The design of the workspace layer ("the actual product") | `library/workspace-architecture/` (start with `README.md`) |
| The governance layer end to end | `workspace/knowledge/authority-overview.md` |
| What happened, dated | `JOURNAL.md` (newest first) |
| Mistakes already made | `LESSONS.md` |
