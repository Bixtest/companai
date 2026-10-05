# 08 — Bringing a new agent into a thread that already has messages

**Batch 08 of the Paperclip + Hermes study. Written 2026-10-05.**

This batch audits the sibling's proven rule against the code it runs on. The rule lives in
`library/ai/hermes-docs/reboot/24-HOW-A-ROOM-WORKS.md` and is restated as a decision in
`22-AGENT-SESSION-ROOM-MODEL.md` and `23-ROOM-MEMORY-ANALYSIS.md`. The code is the sibling's
vendored Hermes at `aissistant-package/hermes/` (the proof script targets exactly that tree — it
does `sys.path.insert(0, "/opt/hermes")` and imports `hermes_state`,
`aissistant-package/ops/verify-room-into-session.py:35-37`, and the dossier cites
`acp_adapter/session.py:544`, which is that tree's line). Where a document and the code disagree,
the code wins and the disagreement is named. Every factual claim below cites the file it came from.

Two Hermes trees exist in this project and they are **not the same code**. The sibling's vendored
runtime is `aissistant-package/hermes/` (version `0.20.1`, a single 11,605-line `hermes_state.py`).
The study's reference copy is `library/ai/hermes-agent-main/` (version `0.0.0`, the same layer
split across ~33 `hermes_state_*.py` modules). The two functions the rule depends on exist in both,
but the implementations differ (see §5).

---

## 1. Verification table

| Claim in `24-HOW-A-ROOM-WORKS.md` | Verdict | File and line that proves it |
| --- | --- | --- |
| Room messages can be written into an agent's session with `SessionDB.append_messages_batch(session_id, messages)` | **Confirmed** | `aissistant-package/hermes/hermes_state.py:8199-8205` (`def append_messages_batch(self, session_id, messages, compression_lock_holder=None, chunk_rows=None)`) |
| A single-message writer `append_message` also exists | **Confirmed** | `hermes_state.py:8061-8084` |
| `get_messages_as_conversation(session_id, repair_alternation=True)` is the restore-for-live-replay call | **Confirmed** | `hermes_state.py:9080-9087`; called at `acp_adapter/session.py:544-546` |
| The restore loads **every** active message with no limit or paging | **Confirmed** | `acp_adapter/session.py:544`; the read is an un-limited `SELECT ... WHERE session_id IN (...) AND active = 1 ORDER BY id` at `hermes_state.py:9106-9126` |
| Hermes merges consecutive same-role messages, so each message must carry its own speaker label | **Confirmed** | `agent/agent_runtime_helpers.py:730-759` (Pass 2 merges consecutive `user` rows with a `"\n\n"` join) |
| A room cannot be one shared Hermes session, because a stored message has a `role` and no author | **Confirmed** | messages schema `hermes_state_common.py:318-342` — `role TEXT NOT NULL` (321) and **no** author/speaker column |
| Seeding a newcomer uses `chunk_rows`, never a per-row loop | **Confirmed** | `hermes_state.py:8224-8244`; docstring measures "branch seeds can be thousands of rows; measured: 10k rows ≈ 2.4s inside one BEGIN IMMEDIATE" (8224-8231) |
| Being written to is not being asked — an agent runs only when addressed | **Confirmed** | `append_messages_batch` only writes rows (`hermes_state.py:8246-8270`); a turn runs only when the adapter calls `agent.run_conversation` (`acp_adapter/server.py:1919-1924`) |
| "Once a room message is appended into an agent's live session, it is in context on every turn" | **Confirmed, with a caveat the dossier flags** — true only after the session is (re)loaded; see §4.1 | `acp_adapter/server.py:1919-1924` (turn reads `state.history`); `acp_adapter/session.py:544` (history comes from the DB only on restore) |
| "What compression drops first is not yet known" | **Partly refuted** — the code says what it drops first | `agent/context_compressor.py:6433-6442` (phases), `2517` (`protect_first_n=3`), `2519` (`summary_target_ratio=0.20`), `5161-5184` (`_protect_head_size`) |
| The proof script is re-runnable as committed | **Partly refuted** — it calls a method that does not exist in either tree | `ops/verify-room-into-session.py:67` (`db.list_sessions(limit=1)`); `SessionDB` defines `list_sessions_rich` (`hermes_state.py:7520`), not `list_sessions` |
| A room's session key includes a fingerprint of model/container/tools/profile, so changing the model silently ends its conversations | **Confirmed** | `host/packages/adapter-utils/src/acpx-engine/execute.ts:1835-1878`, `1261-1273`, `3380-3381` |

---

## 2. The mechanism, confirmed

The dossier's two calls are real and are the supported external-write path.

`append_message` writes one row in the same shape the runtime uses for its own turns
(`hermes_state.py:8061`), updating the session counters. `append_messages_batch` writes many rows in
one transaction and reuses the same row serialiser, so an externally-appended row is byte-for-byte
the shape of a normally-grown one:

```python
# aissistant-package/hermes/hermes_state.py:8199
def append_messages_batch(
    self,
    session_id: str,
    messages: List[Dict[str, Any]],
    compression_lock_holder: Optional[str] = None,
    chunk_rows: Optional[int] = None,
) -> int:
```

`chunk_rows` is real and is the newcomer-seed path the dossier names: when set, the batch commits in
chunks of at most that many rows "for LARGE copies (branch seeds can be thousands of rows …)"
(`hermes_state.py:8224-8244`). The dossier's warning that a per-row loop starves concurrent writers
is supported by the same comment: the FTS triggers run per row, so the write lock is held for the
whole seed.

`get_messages_as_conversation` is the read used for live replay:

```python
# aissistant-package/hermes/hermes_state.py:9080
def get_messages_as_conversation(
    self,
    session_id: str,
    include_ancestors: bool = False,
    include_inactive: bool = False,
    repair_alternation: bool = False,
    include_row_ids: bool = False,
) -> List[Dict[str, Any]]:
```

Its own docstring states the restore contract: "By default only active messages are returned …
`repair_alternation=True` runs `repair_message_sequence` over the loaded list before returning it.
Callers that restore a session for LIVE REPLAY should pass it" (`hermes_state.py:9088-9105`).

### The no-limit restore — confirmed

`acp_adapter/session.py:544` is exactly as the dossier quotes:

```python
history = db.get_messages_as_conversation(
    session_id, repair_alternation=True
)
```

There is no `limit`, no offset, no paging. The underlying read selects every active row for the
session ordered by `id` and returns them (`hermes_state.py:9110-9134`). The restored list is then
assigned to `SessionState.history` (`session.py:564-571`). So the dossier's correction is right:
once a message is an active row in a session that gets restored, it is in the working conversation,
and it costs context on every subsequent turn. It is **not** free until searched — that is only true
of `session_search` across *past* sessions.

### The speaker-label rule — confirmed

`repair_message_sequence` runs Pass 2 to merge consecutive `user` messages, and the merge is what
erases boundaries:

```python
# aissistant-package/hermes/agent/agent_runtime_helpers.py:730-752
# Pass 2: merge consecutive user messages. Preserves all user input
# so nothing the user typed is lost.
...
prev["content"] = (
    (prev_content + "\n\n" + new_content)
    if prev_content and new_content
    else (prev_content or new_content)
)
```

A durable `user;user` sequence is collapsed into one turn, so the only thing that survives is the
text inside each message. The label `[Room: Marketing] Tom: …` is therefore not a style choice; it is
the only remaining record of who spoke. (The same Pass 0 merges consecutive `assistant` messages,
`agent_runtime_helpers.py:597-673`.)

### One session per agent — confirmed

The `messages` table stores `role` and no author
(`hermes_state_common.py:318-342`). There is a `platform_message_id` column, but it is the external
platform's message id (Telegram update id, etc.), and `display_metadata` is explicitly
"presentation-only and never changes the model context role/content replayed"
(`hermes_state.py:8105-8106`). There is nowhere to record *which agent* spoke inside one session, so
a multi-agent room cannot be one Hermes session. The dossier's claim stands.

### Being written to is not being asked — confirmed

Appending rows does not start a turn. `append_messages_batch` ends in a write
(`hermes_state.py:8246-8270`). A turn begins only when the adapter calls
`agent.run_conversation(...)` for an addressed message (`acp_adapter/server.py:1919-1924`). The
architecture therefore holds: every message lands in every member's session; only an addressed
message produces a run.

---

## 3. The proof script — what it does, and one defect

`ops/verify-room-into-session.py` does the following, in order:

1. Copies a real agent home into a temp dir and refuses to touch the original
   (`verify-room-into-session.py:59-63`). This is why it is safe to re-run.
2. Opens `SessionDB` on the copy's `state.db` (`:65`).
3. Picks a session — `sessions = db.list_sessions(limit=1)` (`:67`).
4. Counts the messages before, appends five labelled room messages as `role:"user"` rows via
   `append_messages_batch`, and counts after (`:73-82`).
5. Reads the conversation back both ways — with `repair_alternation=True` (the live-replay shape)
   and with the default `False` (the raw shape) — and checks each of five probe substrings is present
   (`:86-98`).
6. Prints PASS/FAIL and exits non-zero on failure (`:100-104`).

It is a genuine cold-path proof: it writes to the database and reads back through the restore call.
That is exactly the path §4.1 shows is *not* the warm path.

**One defect.** Line 67 calls `db.list_sessions(limit=1)`. In both Hermes trees I have,
`SessionDB` defines `list_sessions_rich`, not `list_sessions` (`hermes_state.py:7520`;
`library/ai/hermes-agent-main/hermes_state_sessions.py` likewise exposes `list_sessions_rich`). The
only `list_sessions` methods in the tree belong to other classes (`SessionManager` at
`acp_adapter/session.py:272`, the gateway at `gateway/session.py:3426`). So, against the vendored
revision in this repository, the script as committed would raise `AttributeError` at line 67 before
it ever appends a row. Either it was run against a different Hermes revision that had
`SessionDB.list_sessions`, or the line needs changing to `list_sessions_rich`. I could not run it
(no agent home and no container here — see §7), so I report the discrepancy rather than resolve it.

---

## 4. The two unproven items — what I found

The dossier names two things the proof does **not** establish and says not to build on them without
testing. I found the code paths for both. The first is worse than the dossier says; the second is
partly answerable from the code.

### 4.1 Warm process — the write underneath a held session is not merely "may not" be seen; it will not be seen until reload

**The turn reads an in-memory list, not the database.** The adapter hands the agent the session's
in-memory history:

```python
# aissistant-package/hermes/acp_adapter/server.py:1919-1924
result = agent.run_conversation(
    user_message=user_content,
    conversation_history=state.history,
    task_id=session_id,
    persist_user_message=user_text or "[Image attachment]",
)
```

and afterwards overwrites that list with the turn's result:

```python
# aissistant-package/hermes/acp_adapter/server.py:1976-1979
if result.get("messages"):
    state.history = result["messages"]
    self.session_manager.save_session(session_id)
```

Downstream, the working conversation is built from the passed history and nothing else:
`messages = list(conversation_history) if conversation_history else []`
(`agent/turn_context.py:607`; the call chain is `run_agent.py:8017` → `agent/conversation_loop.py:1471`
→ `agent/turn_context.py:430`). No code path in a normal turn re-reads the session's rows from the
database.

**`state.history` is populated from the DB only on a cold restore.** `_restore` is the only place
that reads the session's messages (`acp_adapter/session.py:498-576`, the read at `:544`, assignment at
`:569`). `_restore` is reached only from `get_session` when the session is **not already in memory**:

```python
# aissistant-package/hermes/acp_adapter/session.py:220-231
def get_session(self, session_id: str) -> Optional[SessionState]:
    with self._lock:
        state = self._sessions.get(session_id)
    if state is not None:
        return state
    # Attempt to restore from database.
    return self._restore(session_id)
```

**`session/load` and `session/resume` reuse the warm state.** Both call
`self.session_manager.update_cwd(session_id, cwd)` (`server.py:1463`, `server.py:1511`), and
`update_cwd` calls `get_session` (`session.py:346-355`). So a load against a session the process
already holds returns the in-memory state and does **not** re-read the database. The history the
client is replayed is also the in-memory list (`server.py:1481`, `:1522`).

**Nothing evicts a warm session on a timer.** `_sessions` is cleared only by `remove_session`
(`session.py:233-240`) or `cleanup` (`session.py:357-361`). There is no TTL.

**What the evidence supports.** While a session is warm, a room append made underneath it via
`append_messages_batch` is invisible to the model. The dossier's "may not be seen until it reloads"
is the safe phrasing; the code supports the stronger claim that it **will not** be seen until the
session is evicted from memory (`remove_session`/`cleanup`) or the process restarts and `_restore`
runs. The sibling's proof wrote and read through `_restore` — the cold path — so it never exercised
this. The single most important test the dossier names is therefore still open, and the risk is not
theoretical: it is the normal state of a long-lived warm session.

**Two additional hazards found in the same area.**

1. A concurrent compression holds a lock that rejects the append. `append_messages_batch` runs
   `_check_transcript_write_guards` inside the transaction, which raises
   `SessionCompressionInProgressError` if a live `compression_locks` row exists for the session and
   the caller is not the holder (`hermes_state.py:7983-8004`). So an append issued while Hermes is
   compressing that session fails outright; it does not queue.
2. In the non-agent-owned-persistence path, a save can delete the append. `save_session` → `_persist`
   ends in `db.replace_messages(state.session_id, state.history, active_only=True)`
   (`session.py:476-494`) when the agent does not own persistence (`session.py:469-476`).
   `replace_messages` is destructive by default and, with `active_only=True`, deletes the live rows
   and reinserts `state.history` (`hermes_state.py:8607-8647`). A room row sitting in the DB but not
   in `state.history` would be deleted. In the live ACP case the agent **does** own persistence
   (`agent._session_db is db and agent._session_db_created`, `session.py:470-475`), so this branch is
   skipped and the append survives on disk — but it still does not enter `state.history`. The hazard
   is real for any path where the agent does not own persistence (a fresh create/fork, a test
   factory, or a model switch that mints a fresh agent — `session.py:478-482`).

### 4.2 Long rooms and compression — what is dropped first, and whether an appended block is special

**The algorithm.** `compress()` states its own order
(`agent/context_compressor.py:6431-6442`):

1. Prune old tool results (cheap pre-pass, no LLM call).
2. Protect head messages (system prompt + first exchange).
3. Find the tail boundary by token budget.
4. Summarize the middle turns with a structured LLM prompt.

The constants: `protect_first_n=3` (`context_compressor.py:2517`) protects the system prompt plus the
first three non-system messages on the first compaction, and the protection decays after the first
compression so early turns do not fossilise (`_effective_protect_first_n`, `:5126-5159`;
`_protect_head_size`, `:5161-5184`). The tail budget is derived, not fixed:
`tail_token_budget = int(threshold_tokens * summary_target_ratio)` with `summary_target_ratio`
defaulting to `0.20` (`:1828-1831`, `:2519`). Everything between the protected head and the protected
tail is the middle that gets summarized.

**So the order is: old tool results first, then the middle turns oldest-first; the head and the
recent tail are kept verbatim.** The dossier's "what compression drops first is not yet known" can
therefore be answered at the level of mechanism: it is not the recent room messages that go first,
it is the older tool output and then the older turns in the middle.

**An appended block is not treated differently.** The verify script appends `role:"user"` rows with
no `tool_calls` (`verify-room-into-session.py:74-77`). `_insert_message_rows` writes exactly the same
21 columns for an imported row as for a native one (`hermes_state.py:8567-8596`); there is no
`imported`, `seed`, `room` or provenance flag on a message row (the schema is
`hermes_state_common.py:318-342`). So an appended block is summarised or kept purely by its position
in the transcript, like any user turn. Two consequences follow:

- Because consecutive `user` rows are merged into one turn on restore
  (`agent_runtime_helpers.py:730-759`), a room block becomes a **single** turn. If it lands in the
  middle it is summarised as one unit; if it lands in the tail it is kept whole. There is no
  partial-keep for an appended block.
- On compaction, `archive_and_compact` soft-archives **all** active rows (`active=0, compacted=1`)
  and inserts the compacted set as fresh active rows (`hermes_state.py:8750-8763`). The live reload
  (`active=1` only) then excludes the summarised-away room rows; they remain on disk and stay
  searchable (search includes `compacted=1` rows, `hermes_state.py:8723-8730`). This is exactly the
  dossier's "self-limiting but not free": the room costs context every turn until compression, after
  which the older room content leaves the live context but is still recoverable by `session_search`.

**A rotation detail.** Compression can rotate the internal session id into a child session; the ACP
adapter detects the rotation after a turn and emits a provenance update while keeping the ACP
`session_id` stable (`server.py:1981-2003`). So "the room session" from the client's point of view
stays one id even when Hermes internally rotates — useful for the design item below.

---

## 5. The open design item — the room session key

The dossier says a room needs a session key per agent that survives an agent edit, because today the
key folds in a fingerprint of the model, container, tools and profile version. **Confirmed.**

The compatibility predicate compares the saved fingerprint and key:

```ts
// host/packages/adapter-utils/src/acpx-engine/execute.ts:1261-1273
function isCompatibleSession(params, runtime): boolean {
  if (asString(params.configFingerprint, "") !== runtime.fingerprint) return false;
  if (asString(params.sessionKey, "") !== runtime.sessionKey) return false;
  ...
}
```

The fingerprint is a hash of exactly the things the dossier names — the model, the workspace cwd, the
tools, the profile version, and more:

```ts
// host/packages/adapter-utils/src/acpx-engine/execute.ts:1835-1876
const fingerprint = shortHash({
  acpxAgent,
  agentCommand: agentCommand ?? acpxAgent,
  cwd: path.resolve(sessionCwd),          // container/workspace
  mode,
  permissionMode,
  nonInteractivePermissions,
  requestedModel,                         // model
  requestedThinkingEffort,
  fastMode,
  remoteExecutionIdentity,
  additionalSourcesIdentity,
  skillsIdentity,                         // tools/skills
  skillPromptInstructions,
  paperclipClaudeSettings: ...,
  mcpServers: mcpIdentity,                // tools (MCP)
  secretManifestHash: shortHash(secretManifest),
  adapterEnvHash: shortHash(resolvedAdapterEnv),
  profileVersion: asString(config.profileVersion, ""),   // profile version
});
const taskKey = asString(input.ctx.runtime.taskKey, "") || wakeTaskId || workspaceId || "default";
const sessionKey = `paperclip:${agent.companyId}:${agent.id}:${taskKey}:${fingerprint}`;
```

And the resume gate is exactly the line the dossier quotes:

```ts
// host/packages/adapter-utils/src/acpx-engine/execute.ts:3380-3381
const canResume = isCompatibleSession(previousParams, prepared);
const resumeSessionId = canResume ? asString(previousParams.acpSessionId, "") || undefined : undefined;
```

So changing an agent's model changes `requestedModel` → changes `fingerprint` → changes `sessionKey`
→ `isCompatibleSession` returns false → `resumeSessionId` is `undefined` and the run starts a fresh
session. The dossier's "changing an agent's model silently ends its room conversations" is correct,
and the cause is precisely the fingerprint being folded into the key. Note also that the key is
built on `taskKey`, not on a room: a room must map to a stable `taskKey`, and the key must stop
carrying a config fingerprint, for a room conversation to survive an agent edit.

---

## 6. How our platform should do it

Our base is different: we are not Paperclip, and we are not bound to `taskKey`/`fingerprint`
semantics. The following are consequences of what the code above shows, not restatements of the
dossier.

**1. Own the room and the speaker identity; let Hermes own the transcript.** The code confirms
Hermes cannot record *who* spoke (no author column, §2). So our canonical room log must carry
`(speaker, room, sequence, body)` and we must write each message into each member agent's session
labelled `[Room: X] Speaker: body`. This is the one thing neither system does for us.

**2. Key the room session on `(agent, room)` and never on configuration.** Do not repeat Paperclip's
mistake of folding the model/tools/profile version into the room key (§5). A room session must
survive a model change, a skill change, or a profile bump. If the model changes, change the model the
turn runs on — do not silently start a new session. If a migration is ever needed, do it explicitly
and copy the transcript forward, the way Hermes' own rotation keeps the client id stable
(`server.py:1981-2003`).

**3. Do not write underneath a warm session and expect it to be read — close the warm gap.** §4.1
shows the turn reads `state.history`, which is loaded from the DB only on a cold restore, and that
warm sessions are not evicted on a timer. Three options, in order of preference:

- **(a) Write through the runtime's own session path.** Route the room append into the same
   in-memory `SessionState` the turn will use, so `state.history` and the DB stay in step. This is
   the durable answer: it makes "written" and "in context" the same event.
- **(b) Evict and reload after writing.** If we can only write to the DB, force the session out of
   memory (`remove_session`) so the next `get_session` re-runs `_restore` and picks the block up.
   Correct but blunt — it discards the warm agent.
- **(c) Compensate at the prompt.** Include the recent room messages in the addressed turn's prompt
   for warm sessions. This works but duplicates content the session already holds, and it must be
   bounded so it does not grow every turn.

Option (a) is what the platform should aim for; (b) is the fallback until (a) exists. Whichever we
choose, our acceptance test must write while the runtime holds the session and prove the *next turn*
sees it — the sibling's proof only covered the cold path.

**4. Label every message; expect the merge.** The merge in
`agent/agent_runtime_helpers.py:730-759` is not optional and not a bug. Our writer must put the
speaker in the text of every message, because that is the only thing that survives.

**5. Seed a newcomer with `chunk_rows`, in bounded transactions.** Use the documented path
(`hermes_state.py:8224-8244`) rather than a per-row loop, so the write lock is not held across a long
seed and concurrent agents are not starved. Offer "all of it or from a date" as the dossier proposes;
the cost is bounded per chunk, not per history.

**6. Decide the live-vs-searchable split deliberately.** §4.2 shows the live session will be
compressed once it passes the threshold, and the oldest turns (after old tool output) are what leave
the live context first, while remaining searchable. So design the live room session to hold a recent
window and treat the full room log as our canonical store plus Hermes' searchable archive. Do not
assume the whole history stays in context — it does not.

**7. Keep memory out of it.** The dossier is right that room transcripts do not belong in Hermes
memory; that is a 2,200-character container that rejects overflow (stated in
`23-ROOM-MEMORY-ANALYSIS.md:42-57`). The room lives in sessions, not memory.

**8. Make the cold-path numbers a regression test, and add a warm-path test.** Keep
`ops/verify-room-into-session.py` (fixing the `list_sessions` call, §3) as the cold-path regression,
and add a second test that appends to a session the runtime is actively holding and asserts the next
turn's `conversation_history` contains the block. That second test is the one the sibling never
wrote.

---

## 7. What I could not verify

- **I could not run the proof.** There is no agent home and no Hermes container in this environment,
  so I verified the mechanism in the source and could not reproduce the printed figures (messages
  1 → 6; the "18,694 chars" / "6 turns" comparison). The code supports the shape of those results;
  the exact numbers are unconfirmed.
- **`SessionDB.list_sessions`.** I could not find `list_sessions` defined on `SessionDB` in either
  tree; only `list_sessions_rich` exists (`hermes_state.py:7520`). I could not locate a revision in
  this repository where `ops/verify-room-into-session.py:67` would run as committed, so I cannot
  confirm the script executes end-to-end here. This is reported, not resolved.
- **Whether the warm hazard is actually hit in the sibling's deployment.** I read the code that
  creates the hazard and the code that keeps handles warm across runs
  (`host/packages/adapter-utils/src/acpx-engine/execute.ts:3382`, `warmHandles.get(prepared.sessionKey)`),
  but I did not observe a running system, so I cannot say how often a room append lands on a warm
  session in practice.
- **The exact compression trigger percentage.** I confirmed the tail budget is derived as
  `threshold_tokens * summary_target_ratio` with `summary_target_ratio` defaulting to `0.20`
  (`context_compressor.py:1828-1831`, `2519`) and that `threshold_tokens` is computed from the model's
  context length (`:1806-1821`), but I did not pin the default `threshold_percent` constant, so I
  state the *shape* of the trigger, not an exact number.
- **The vendored-vs-library difference is not resolved.** The sibling's `aissistant-package/hermes/`
  (`0.20.1`, monolithic `hermes_state.py`) and the study's `library/ai/hermes-agent-main/` (`0.0.0`,
  modularised) are different revisions; the two functions differ in detail (the library copy adds
  `turn_lease_holder`, `include_compacted`, and summary-marker preservation —
  `library/ai/hermes-agent-main/hermes_state_messages.py:449-483`, `1512-1528`). The restore path is
  the same in behaviour (no limit, `repair_alternation=True`,
  `library/ai/hermes-agent-main/acp_adapter/session.py:474`), but I did not diff the two trees in
  full, so I cannot say every claim here holds identically on the library revision.
