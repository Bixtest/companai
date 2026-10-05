# LOG — the Paperclip + Hermes study

**One dated line per batch completed.** Newest at the bottom.

---

- **2026-10-05 — batch 00 (inventory and scope) done.** Pinned all four inputs with measured sizes.
  Found the study's shape: Hermes is already forensically analysed (4,254-line study, 60+
  sections) so it is *audited*, not repeated; **Paperclip has no analysis anywhere** and is the
  real gap; and Paperclip ships its **own Hermes gateway**, which means the integration question
  is partly answered by upstream itself. Programme set at 11 batches.

- **2026-10-05 — the session was interrupted by an application close, and batch 00 was corrected on
  resume.** Three sub-agents had been dispatched for batches 01, 02 and 03 and **produced nothing**
  — the interruption killed them before they wrote their files (verified: `findings/` contained only
  `00-inventory.md`). Nothing was half-written; there is no partial file to repair.
  **The resume also caught a real gap in batch 00 itself:** the first pass had missed
  **`library/ai/hermes-docs/reboot/` — a 23,842-line prior analysis programme** containing ADR-001,
  the Hermes capability matrix, the Projects/Rooms reconstruction and **`24-HOW-A-ROOM-WORKS.md`,
  which already answers the owner's "new agent into an existing thread" question with a proven
  mechanism.** Batch 00 was corrected (§2d, §3, §4f added or rewritten), and **batches 07, 08 and 09
  were re-scoped from "produce" to "audit"** so the programme does not redo work that exists.
  Batches 01–06 (upstream Paperclip) remain the core, and were re-dispatched.

- **2026-10-05 — batches 01, 02 and 03 done (upstream Paperclip).** Re-dispatched after the
  interruption and this time completed, each writing its own findings file: `01` (335 lines),
  `02` (566 lines), `03` (259 lines). The three headline findings: **Paperclip is a control plane,
  not a runtime** — adapters expose only `invoke/status/cancel`; **an agent is one flat
  company-scoped row** with no human/AI flag and no owner column, and "harness" is just marketing
  for "adapter"; and **assignment is manual while only the *wake* is automatic** — a DB-backed
  `agent_wakeup_requests` queue, with `heartbeat_runs` on a 30-second tick. **Two docs were caught
  contradicting the code** (`DOCKER.md` calling PostgreSQL "SQLite"; `built-in-agents.md` saying two
  built-in agents where the code defines four). Spot-checked by hand against the source — verified.
  Also learned: **every manifest reports version `0.3.1`**, so the "newest upstream" is the same
  major version as the sibling's fork.

- **2026-10-05 — batches 04–09 done.** Six batches, run in three pairs.

  **04 (collaboration, 380 lines) and 05 (triggers, 213 lines).** Paperclip has **no meeting, room or
  channel entity** — Agent Chat is an *issue*, and agents are called by assignment or comment, never
  by `@mention`. And **a wake is a database row**: every trigger funnels through one typed call, and
  recurrence is **cron → issue → wake**, so a schedule produces work items rather than invisible
  invocations. The DOT-2 self-healing loop is documented as a cautionary tale.

  **06 (the gateway, 279 lines).** Paperclip **ships** a Hermes gateway — a thin HTTP/SSE client over
  four endpoints, with the adapter never importing Hermes code. The generic seam is
  `execute(context) → result` with a single `AdapterExecutionResult` envelope. **MCP governance is
  the strongest part of the system.**

  **07 (Hermes capabilities — audit, 214 lines).** A 45-row verification table: **~40 verified, 1
  contradicted, 2 not checked.** The contradiction is the important one: **"session resume is broken"
  is our adapter's defect, not Hermes'.** Also found **Hermes ships hosted rooms** (128-member limit,
  replica takeover) — the most under-used asset in the study.

  **08 (a new agent into an existing thread — audit, 459 lines).** Mechanism confirmed in code. The
  two "unproven" items were attacked and both moved: **the warm-session hazard is stronger than the
  dossier's "may not be seen" — it will not be seen**, because history loads only on a cold restore
  and warm sessions are never evicted on a timer; and **"compression drops unknown messages" is
  refuted**. **A new defect was found:** the sibling's proof script calls `SessionDB.list_sessions`,
  which does not exist on either Hermes tree.

  **09 (the sibling's integration — audit, 447 lines).** **Four generations of Hermes wiring coexist
  in one tree.** The adopted-container incident is a naming collision; the knowledge side-car trusts
  a **claimed** actor — their own P0; and hire is a mandatory shell script, which is why hire/fire is
  unreachable from the product UI.

- **2026-10-05 — batch 10 done. The programme is complete (11 of 11).** `10-lessons-and-target-design.md`
  (408 lines) is the synthesis: every lesson with its evidence and its consequence, the owner's
  **twelve concerns each answered in four voices**, and a register of **23 TAKE / 14 REJECT /
  12 DO-DIFFERENTLY / 4 NOT-AN-ISSUE**. **Exactly one item is open for the owner** — whether an
  assistant agent is *identity* or *context*. The target design names our one structural advantage:
  **Hermes in-process means we can write through the runtime's own session path and close the
  warm-session gap a pure HTTP control plane cannot.**

- **2026-10-05 — the scattered source documents were consolidated, at the owner's request.**
  `library/ai/source-docs/` now holds the one set with no other home — **upstream Paperclip's
  documentation, 317 markdown files, 5.4 MB** — beside a **tracked register** (`README.md`) that lists
  where every other scattered set already lives and why it was not copied. The copies follow the
  project's standing rule (`gitignore`: the copies are ignored, the hand-written parts are versioned),
  so **exactly one file is tracked**; 75 images (14.9 MB) were dropped to keep the library markdown-only.
