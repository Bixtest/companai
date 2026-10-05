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
