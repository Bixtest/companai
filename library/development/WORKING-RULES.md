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

*(The COOKBOOK also carries the numbered engineering rules — zero-zero through zero-ten — that govern
**how** the work is done: the specifications dictionary is binding, "it exists" is not "it is built",
foundation before stack, the core boundary is not customisable, keep the project findable, measure
from the artefact, research-validate-write-then-build. Read them once, before touching code.)*

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

*Last updated: 2026-10-06 — created, carrying the owner's two additions to the override list (two
routes; the front-end rule) and the pointer to the Active-task box.*
