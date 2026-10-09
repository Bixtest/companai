# Working rules — the owner's standing instructions, in one place

**What this file is.** The owner's rules that apply to **every session, every task**, gathered in one
page so they are not scattered across the prompt, the handover and the cookbook. It is a **list and a
pointer**: each rule says what it binds, and where the full reasoning lives. It does not duplicate the
technical cookbook — `workspace/COOKBOOK.md` remains the full text of the engineering rules.

**Who it is for.** The agent doing the work — so it can read the owner's expectations once, at the
start, instead of discovering them one at a time. **Written 2026-10-06.**

**How to read it.** Two groups. **§1 is the rules that outrank everything** (they are also in the
COOKBOOK, at the top of "The three rules that override everything"). **§2 is how to work with the
owner** — how to report, what not to close, and what to do with the front end. Both bind.

---

## 1. The rules that outrank everything

These are also written at the top of `workspace/COOKBOOK.md` ("The three rules that override
everything", now six). They are repeated here because a rule a newcomer has to find is a rule that
gets broken.

0. **THE ORDER OF DEVELOPMENT IS THE VISION'S ORDER — and no task may jump ahead of it**
   *(owner, 2026-10-09, after measuring the drift himself)*. **This rule governs *which task comes
   next*, so it is written first.**
   **The order is fixed by the primitive vision** — `library/ai/ai-first/06_Platform_Foundation_and_Security_Kernel_Specification.md`
   **Part LXXXII §222–232** — and it runs **bottom-up, substrate → flesh**:

   | Phase | What it builds | Category |
   |---|---|---|
   | **0** | Immutable primitives — IDs · TenantRef · EntityRef · ActorRef · Version · Provenance · Lifecycle | substrate |
   | **1** | Identity — Person · UserAccount · ServiceIdentity · AgentIdentity · sessions · lifecycle | substrate |
   | **2** | Multi-tenancy — Tenant · Organization · LegalEntity · Membership · RLS | substrate |
   | **3** | **Policy kernel** — Action · Resource · Permission · Role · Policy · Scope · Decision · Obligation | **"the first major kernel milestone"** |
   | **4** | Data classification / secrets | substrate |
   | **5** | Query / Command enforcement | substrate |
   | **6** | Audit / provenance | substrate |
   | **7** | Business Agent Gateway | substrate |
   | **8** | Hermes adapter — *"only after the security gateway exists"* | AI |
   | **9** | Functions / Widgets / Workspace — *"all clients of the policy kernel"* | AI |
   | **10** | **First complete business capability** — *"Only now build something such as Customer + Sales"* | **flesh** |

   **And the vision's §233, "What must not be built first", says it outright:** *"Do not start by
   building dozens of ERP screens … CRM screens, Accounting screens, HR screens, Inventory screens …
   while the security model remains informal. That creates an enormous future migration problem."*

   **The rule, three parts, all binding:**
   **(a) Work the phases in order, lowest open phase first.** No item from a lower-numbered phase may
   sit unbuilt while an item from a higher-numbered phase is worked. **Business capabilities (Phase
   10 — CRM, Sales, Accounting, HR, Inventory, WMS, and any `B`- or `P`-module work) are LAST.**
   **(b) The next task to pick is always the lowest open phase that is not yet whole.** Read the
   `★ ACTIVE TASK` box in `JOURNAL.md` and [`platform_points.md`](platform_points.md) **"THE LIST"**
   (sorted in this same order) — pick the first row that is not `☑`, and challenge it (rule 9b) before
   executing.
   **(c) Deviating requires the owner's explicit word, written down.** Only the owner may re-order the
   phases; if he does, **record the deviation, its reason and the date beside the row**, so the next
   session does not silently "correct" it back.
   **Why this rule exists:** on 2026-10-09 the owner measured that the skeleton (Phase 3, the policy
   kernel) sat at **0/36** while four Phase-10 business modules were ticked DONE and the next queued
   slice was a **`customers` CRM pipeline** — i.e. the work had begun to run *ahead* of its own Phase 3.
   His words: *"you flipped the development into reverse order."* The order document was not reversed,
   but the queue was drifting toward the flesh. **This rule is the antidote: build the skeleton first,
   and do not start a module until the platform under it is finished.**

1. **Nothing is deleted before it is analysed.** Every file or module headed for removal gets a
   read-only salvage analysis first, committed.
2. **Analysis is read-only; execution is a separate step.** The agent that decides never deletes; the
   agent that deletes acts on a written report and does not re-decide.
3. **The gate is green before the next batch starts.** Install, typecheck, lint, test, build — all
   pass, or the batch is not done.
4. **Two routes or it is not a finding** *(owner, 2026-10-06)*. Any number or conclusion the owner
   will act on is derived **twice, by methods that share no failure mode**, and the two must agree.
   Re-running your own check is not a second route. If they disagree, say so — never average, never
   quietly pick the nicer number.
5. **If it is ready to be switched on in the front end, switch it on** *(owner, 2026-10-06)* — see
   §2.4 below for the full statement.
6. **The Hermes service map is the starting thread — and every AI-touching item must link to it**
   *(owner, 2026-10-06)*. Before developing **anything**, read
   [`ARCHITECTURE-hermes-service-map.md`](ARCHITECTURE-hermes-service-map.md) for that item: it says
   whether a human's request has to be understood (**an agent run**) or an admin turns a knob
   (**wiring**), and how Hermes serves it or is served by it. **The link must run both ways:** every
   AI-touching item in [`BACKLOG.md`](BACKLOG.md) carries a `★ Hermes:` line naming the map section,
   and every item the map names is reachable from the backlog. **A missing link is a defect, not a
   style slip** — it is how a later agent quietly develops an item without its Hermes joint. **Told to
   the owner on 2026-10-06 after he measured the gap: the map named 43 items and the backlog named the
   map 0 times.** Re-measure with the commands in [`BACKLOG.md`](BACKLOG.md) **§A**.
   **The same rule covers the other two lessons documents:** [`CORE-MODULES-REGISTER.md`](CORE-MODULES-REGISTER.md)
   (the M/P items) and [`BLUEPRINT-GAP-ANALYSIS.md`](BLUEPRINT-GAP-ANALYSIS.md) (gaps A–D) — **each item
   they define must exist as a backlog item or be cross-referenced from one**, never left as a document
   nothing acts on.
7. **`LESSONS.md` binds both ways — read it, and add to it** *(the rule, made explicit 2026-10-06 after
   the owner asked whether the file was wired in or loose).* **Read [`../../LESSONS.md`](../../LESSONS.md)
   before you start** — every numbered entry is a mistake this project has already made, written in its
   general form so the next agent does not repeat it. **And write to it**: when a trap catches you —
   *a defect whose cause was invisible from the code* — append the next-numbered lesson (the symptom,
   the general form, how it was caught) **in the same change as the work**, because that file is how a
   future agent learns from yours. **A session that hit a new trap and added nothing to `LESSONS.md` is
   not finished** — the same standard as updating the docs (rule at §2.1) and capturing the know-how
   (COOKBOOK rule zero-five).

8. **A partial build is scheduled, not merely noted** *(owner, 2026-10-08)*. **When you stop short of
   100% on any item, you add its row to [`COMPLETION-CALLBACKS.md`](COMPLETION-CALLBACKS.md) in the same
   change** — with **the gap** (measured), **the prerequisite** it waits on, and **the callback** to run
   when that prerequisite lands — and you name it in the parent's own plan §10. **His words, verbatim:**
   *"always document and schedule gaps and prerequisites to develop and callbacks to complete developing
   what you partially did once prerequisites are completed."* **Why:** a partial item described only
   inside one plan is one session away from being forgotten — the next agent reads §7 ("what was built"),
   not §10 ("what was not"). **A session that leaves a partial item documented only inside a plan is not
   finished**, the same standard as updating the docs (§2.1) and the Hermes map (rule 6). Re-measure with
   the commands in that file.

9. **You own the code you touch — fully — and you challenge the task before you execute it**
   *(owner, 2026-10-08)*. **Two halves, both binding.**
   **(a) Ownership.** Once you start working on a piece of code you are **fully responsible for the
   entirety of it** — every issue, bug, incomplete piece and error, and every optimisation or enhancement
   it needs. **You either fix it directly, or you document it in the backlog with the trigger that brings
   it back** — you never leave a defect standing as "pre-existing, not mine". A thing you touched is
   yours; a thing you noticed is yours to *schedule*, at minimum. *(This is the same standard as the
   completion register — [`COMPLETION-CALLBACKS.md`](COMPLETION-CALLBACKS.md) — applied to **everything**
   you meet, not only to the slice you were asked for.)*
   **(b) Challenge, then execute.** **Before** working on any task it is your responsibility to
   **investigate whether it is the best thing to do for the project**, to **challenge it if it is not**,
   and to **execute it if it is**. Never run the roadmap blind.
   **The principle, in his words:** *"work with knowledge, vision, and awareness, not in a blind robotic
   way."* **His instruction, verbatim:** *"You are fully responsible of the entirety of the code once you
   start working on it. Fully. Any issue in the code, any bug, any incomplete work, any error, any
   optimization or enhancement required is your responsibility. And it is your responsibility to either
   fix directly or document in the backlog to fix when it is the right time to do so. Just like it is
   your responsibility before working on any task to investigate if this is the best to be done for the
   project, challenge if not, execute if it is."*
   **What it forbids:** flagging a defect as "not mine" and moving on; and executing a queued item without
   first asking whether it is still the right next thing for the project.

10. **Build every task as a PACKAGE — and prove its prerequisites are flawless before stacking on them**
    *(owner, 2026-10-08)*. This is how the **6-step work protocol** (`MEMORY.md`) is applied to a queued
    item. **Steps, in order, and none may be skipped:**
    **(a) Study the task's references.** Read what the `★ ACTIVE TASK` box and `BACKLOG.md` name for the
    item — its `★ Hermes:` map section, its plan, its parent documents — **before** designing anything.
    **(b) Pick its points from `platform_points.md`.** That file — `library/development/platform_points.md`
    — is the **master point list**; it is kept in step with `BACKLOG.md` and the other docs as we go.
    Take the points that define the task (and only those) and state them in the pack.
    **(c) Write the requirement** = the task's own definition **+** those points, **combined**, before
    touching code (`PLAN-*.md` §2/§3 is the shape).
    **(d) Identify the prerequisites and prove them flawless FIRST.** Every prerequisite the task stands
    on is **verified in the code** (not the docs) to be **done, functional, and bug-free** before the new
    work is built on it. **If a prerequisite is not flawless, you fix it first** — or you schedule it
    with the trigger that brings it back (`COMPLETION-CALLBACKS.md`, rule 8) — **you never stack on a
    broken or unproven base.** This is where CC-20/CC-21/CC-22-class defects are caught.
    **(e) Trace the impact and update the plans.** Before executing, identify **every other code piece
    the change can touch** (callers, consumers, guards, other modules, parked modules) and **update the
    development plans** (`PLAN-*.md`, `BUILD-ORDER.md`, `BACKLOG.md`, `platform_points.md`) so the blast
    radius is written down, not discovered.
    **(f) Then execute, and run the TOTAL quality protocol** — the standing verification set from §1:
    the **hostile-critic pass** as a SEPARATE agent (demand a command + output for every claim, rule 4),
    the **RED-then-GREEN mutation proof** for each new branch (restore md5-verified byte-identical), the
    **re-measure** (two routes, rule 4), the **gate is green** (install/typecheck/lint/test/build,
    rule 3), and only then the docs (rule at §2.1).
    **Why:** *"the best package for that task"* built on an unverified base silently re-breaks the same
    defect one layer down. His instruction, verbatim: *"whenever we pick the next task in backlog, we
    study its references, and pick its relevant points in `platform_points.md` and create the best
    package for that task from it. Identify required prerequisites that need to be flawless before
    building this new task on top of it (so you fix that), then identify what other code pieces can be
    impacted by your changes and update the development plans accordingly. Perform the total quality
    protocols — the critical reviews and so — to verify delivery."*

*(The COOKBOOK also carries the numbered engineering rules — zero-zero through zero-ten — that govern
**how** the work is done: the specifications dictionary is binding, "it exists" is not "it is built",
foundation before stack, the core boundary is not customisable, keep the project findable, measure
from the artefact, research-validate-write-then-build. Read them once, before touching code.)*

11. **A question the owner is holding is not the assistant's to close** *(owner, 2026-10-08)*.
    When a note says a decision is his — *"decide and record"*, an open policy, an approval — **do not
    resolve it yourself and write it down as settled.** Either **ask him**, or leave it **explicitly
    open** (a `NEEDS-YOU.md` row, an `OPEN — needs you` status). His words: *"a question I am holding is
    not yours to close."* Guessing a decision and recording it as done costs a full turn to undo and
    hides the fact that a decision is still outstanding.

12. **Never grep a rendered diff, and never compare bytes across the worktree/git boundary**
    *(paid for twice on 2026-10-08 — two separate false findings)*. (a) `git show <commit> -- <path>`
    renders a **diff**: a line beginning `+` may be an **added** line or merely **context** in a hunk,
    so grep cannot tell you when a line was added. Ask the **object store** for the file
    (`git show <rev>:<path>`) or the **path's history** (`git log -1 -- <path>`); `git diff --stat`
    answers only *"what differs from HEAD"* — a file it omits is **already committed**, not lost.
    (b) On this host `core.autocrlf=true` (measured: git `2.55.0.windows.3`), so the **worktree carries
    CRLF** and a git-rendered blob carries **LF** — a raw byte count across that boundary is meaningless.
    **Compare lines.** Full write-up: `analysis/git-diff-blob-vs-worktree-2026-10-08/FINDINGS.md`.

13. **When a measurement falsifies a premise, correct it everywhere it was copied — not only in the file
    you are editing** *(paid for 2026-10-08, CC-29)*. A premise (a claimed mechanism, a count, a
    behaviour) usually gets copied into a plan, several code comments, and one or more registers; the
    **code can be right while every one of those copies is a false statement in the tree**. Fixing only
    the file in hand leaves the falsehood standing elsewhere, and the next session reads *that* copy. A
    disproved claim left in a comment is a **defect**, the same standard as a broken test. *(CC-29: one
    measurement showed the guard store did not leak across test files; the claim "it outlives that suite
    into whichever file next shares the worker" had been copied into three comments across both repos —
    a tenth hostile-critic pass found all three, plus a wrong count and a self-contradiction.)*

14. **A blocker is stated REPEATEDLY until it is resolved — and a schema change during development is
    never "blocked by a rule"** *(owner, 2026-10-09 — paid for on CC-31(a); the owner had to say it
    twice before it was acted on)*. **Three parts, all binding.**
    **(a) State the blocker, loudly and repeatedly.** When something stands between the work and its
    completion, **you name it in every report until it is gone** — not once in a footnote, not only in a
    plan §10. His words, verbatim: *"ANYTHING that blocks the work you HAVE TO clearly state it
    repeatedly till it is resolved. That is your responsibility."* A blocker mentioned once and then
    quietly worked around is how work stalls invisibly.
    **(b) Nothing forbids customising the database during development.** His words, verbatim: *"No one set
    a rule that forbids you from customizing the database… So if there is a need to change the database
    schema, there is nothing preventing us during development from doing so as long as the changes are
    well thought and well executed."* **The false premise that held several items open — *"a migration is
    unprovable on this host"* — is FALSE and retracted (rule 13): a live Postgres 17 runs in
    `mercato-postgres-local`, and `Migration20261009090000` was written, applied, read back, rebuilt into
    the container, and proven through the restarted app.** Do not park schema work behind a ban that
    does not exist. Do, however, keep it **well thought and well executed**: a migration is written with
    an explicit `up()`/`down()`, applied to the live DB, and **measured back** (columns, defaults,
    backfills, indexes) — never assumed.
    **(c) Activate the original ERP's parked modules AS FUNCTIONS of the new platform.** His words,
    verbatim: *"while activating the 'modules' of the original ERP, we should be activating them as
    functions the way it works with the original concept of the new platform we are developing. Or else,
    why did we deactivate them in the first place."* A module switched back on is **not** switched on as
    the old module — it is re-expressed through the new platform's own concepts (the core boundary, the
    settings layer, the permission grammar, the function/widget model). Re-wiring an old module verbatim
    defeats the reason it was parked.

---

## 2. How to work with the owner

### 2.1 Report so nothing is left ambiguous

- **Every claim carries an observation, not an argument.** Measure from the artefact; never from a
  description of it. *(Rule zero-nine, and the reason the guard registry defect D0 was found.)*
- **Every point raised carries a status**, or it is not a report: **FIXED** (and how it was
  re-checked) · **WILL DO X** · **OPEN — needs you** · **NOT AN ISSUE** (raised, then measured false).
  A statusless concern is a source of confusion, not a finding.
- **State how, when and where** an issue was or will be solved — an open-ended concern with no
  method, no date and no home is worse than silence. *(Owner, 2026-10-06.)*
- **A "done" is a measured claim, not a tag.** A module is never COMPLETE because its file exists or
  its box is ticked; it is COMPLETE when re-measured by two routes. *(Rule zero-zero-two.)*

### 2.2 A question that is the owner's is not ours to close

- If a note says "decide and record", and the decision is his, **do not resolve it and write it down
  as settled.** Either ask, or **leave it explicitly open** and say so.
- **When asking, give the answer, then at most ONE question** — and only if you genuinely cannot
  proceed without it. Do not hand him a menu of options to adjudicate, and do not batch several
  decisions into one turn. **If a sensible default exists, take it, do the work, and tell him what
  changed and how to undo it.**
- **Reserve his judgment for what is genuinely his** — a name, a domain, a cost, a preference. Not a
  technical choice that has an obvious safe default.

### 2.3 Speak plainly, and in English

- **Always reply in English.** Plain, everyday words — he is not a developer. **No jargon** (words
  like "upstream", "the resolver", "the barrel file" explain nothing). Name the thing: what it is,
  who needs it, and what breaks without it.
- **One line of plain reasoning beats a paragraph of framing.**

### 2.4 The front-end rule — build it reachable as soon as it works as a piece

**The owner's instruction, 2026-10-06, verbatim:** *"whatever is ready to be interfaced in the front
end, we should do — once it can be fully functional as a piece (even if you lock or switch off parts
that still need work). Updating the front end helps me testing the micros as you work."*

**What it binds, in practice:**

- When a piece can be **fully functional on its own**, wire it into the running interface **in the
  same batch as the work** — do not wait for the whole feature to be finished before it can be seen.
- **Unfinished parts are locked, hidden or switched off behind a toggle** — that is the correct
  treatment, and it is not a compromise. A **locked panel** is fine; a **visible button that
  half-works** is not.
- The rule applies **only once the piece is fully functional as a piece.** It is not permission to
  ship a half-wired screen.
- **Why:** he tests the platform **as it is built**. A capability nobody can reach is a capability
  nobody can check, and a defect he finds on the real screen is found far cheaper than one found
  later.
- **This is a standing rule for every item, not a one-off.** When a batch finishes, ask: *is any part
  of this now ready to be reached from the interface?* If yes, wire it before calling the batch done.

*(Full text, with the safety boundary, is COOKBOOK "The three rules that override everything", rule 5.)*

---

## 3. Where the task lives — and where it does not

**The one place that says what is being worked on now is the `★ ACTIVE TASK` box at the top of
[`../../JOURNAL.md`](../../JOURNAL.md)** *(owner's instruction, 2026-10-06)*.

- **Handover documents carry no task** — not `HANDOVER.md`, not `START-PROMPT.md`, not `README.md`,
  not `BOOKMARKS.md`. A task changes every session, so a stale one is worse than none.
- **The convention**, written into the box: at the start of a session, read it; while working, keep it
  current; when the task is done, **tick it and move it down, then post the next one**.
- **`BACKLOG.md` is what is left as a whole; `BUILD-ORDER.md` is the order it must be done in.** The
  Active-task box always names which of them is in hand, and why.

---

## 4. Maintaining this file

- **A new standing rule from the owner goes here first**, with the date and his words, and a pointer
  to wherever the full text lives. If it is an engineering rule, it also goes into the COOKBOOK.
- **If a rule stops being true**, delete it — do not leave it to be obeyed after it is wrong.
- **Keep it short.** This is a page the agent reads once at the start; a long page defeats its purpose.

*Last updated: 2026-10-08 — added rule 10 (build every task as a PACKAGE: study references → pick the
`platform_points.md` points → write the requirement → **prove the prerequisites flawless first** → trace
the impact and update the plans → execute and run the total quality protocol), on the owner's
instruction. Previously 2026-10-08 — added rule 9 (you own the code you touch, fully; and challenge the
task before executing it — *"work with knowledge, vision and awareness, not in a blind robotic way"*),
on the owner's instruction. Previously 2026-10-08 — rule 8 (a partial build is scheduled in
[`COMPLETION-CALLBACKS.md`](COMPLETION-CALLBACKS.md), not merely noted). 2026-10-06 — created, carrying the
owner's two additions to the override list (two routes; the front-end rule) and the pointer to the
Active-task box.*
