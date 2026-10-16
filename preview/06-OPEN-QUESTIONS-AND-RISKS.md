# Open questions, risks, and what I would flag

**Written:** 11 October 2026 · **Author:** an agent brought in to learn the project cold
**Why this file exists:** a report that only lists what is done is a sales document. These are the things
I would want to know if I were the one signing off on the next month of work. Every point carries a status,
in the project's own reporting standard.

**Status vocabulary:** **FIXED** · **WILL DO** · **OPEN — needs you** · **NOT AN ISSUE** (raised, then
measured false) · **WATCH** (real, but not actionable yet).

---

## 1. Decisions that are the owner's and nobody else's

These cannot be closed by an agent. Each is stated with what it changes for the user and my recommendation.

| # | The question, in plain words | Why it is his | My recommendation |
|---|---|---|---|
| **DP-09** | When people and AI work in the same thread, is the AI a **participant** sitting alongside you, or just "the agent this thread was opened with"? | It changes the mental model of the product — whether an AI worker looks like a colleague | Make the AI a **participant**. Today a thread can have one agent and many people, but the two live on different axes, so "humans and AI in one thread" is not yet true at the data level. Keep the existing setting as "the default agent this thread opens with" so nothing breaks |
| **DP-10** | Is a saved thread the same thing as a workspace, or several threads inside one workspace? | It decides whether the workspace is one container or a collection | **One.** A thread *is* a workspace. Two containers for the same idea is how a second model grows |
| **DP-11** | Do comments need to attach to specific data — a row, a cell, a field? | It decides how precise collaboration is | Yes, but **build the simple version first**: a typed attachment that names the object and the field, with the viewer's access checked every time. Full anchoring on chart points and paragraphs can wait |
| **DP-15** | Do you want "**The Studio**" opened as its own analysis — one hub where functions, widgets, pages and menu items are managed the same way, plus a database editor? | It is a whole new surface and the owner named it himself | **Yes, after the permissions engine.** The Studio is mostly *one view over three registries that already exist*, plus the permissions model, plus the one genuinely new and dangerous capability (the database editor). Its sequence should be permissions engine → Studio → the things that depend on it |
| **CC-51** | Do you want people restricted to their **team's** rows, not just their own? | He deferred it himself on 2026-10-11 | **Leave it deferred.** It needs a real "team" concept the platform has never had. The own-rows half is built; the team half is a bigger idea and should not be smuggled in |
| **CC-65** | What is the retention policy for the everyday audit journal? It has no trimming rule today | It is a compliance choice, not an engineering one | **Decide a number.** The ledger must never be trimmed — that would break the guarantee — but the journal grows forever and each row carries a snapshot, so it is not cheap. This is a one-line answer that unblocks a real risk |
| **CC-11** | Turn on real enforcement of the authority layer for a tenant? | It is an operator's decision and the design deliberately keeps it out of a casual toggle | **Read a shadow report first, then turn it on for one tenant.** The switch is a deliberate command-line action precisely so that evidence is in front of you when you use it |

---

## 2. What is genuinely not built, and what it blocks

Twelve items, in the order I would tackle them.

| # | What is missing | What it blocks | When it can start | My read |
|---|---|---|---|---|
| 1 | The **data axis** — "may this person read this **row**?" | the permissions check on saved Functions; the marker that says an answer was reduced before you saw it; several structural verbs | named foundation item, not yet started | **The most important gap in the whole plan.** Several honest caveats in the documentation exist *because* this is missing. It should go early |
| 2 | A **database record for a saved Function** | listing it by ID, deleting it, sharing it by link | when the reference layer gives it an address | Already specified. The chain works without it, so it is safe to defer — but it is the reason "save a Function" is not yet a finished user story |
| 3 | The **workspace screen** | the part a person actually looks at | the design is written | It is the owner's "actual product". Everything it needs underneath is either built or designed |
| 4 | **Bulk approval with the difference shown** | working a large queue safely | startable now | Small, and it closes a real usability gap. **The diff is the feature** — approving in bulk without seeing what differs is rubber-stamping |
| 5 | **User-authored widgets** and the **full AI-propose path** | the platform growing after it ships | the permissions engine first | Correctly fenced. Do not shortcut it — the safety comes from *what the object cannot express*, not from a check |
| 6 | The **single front door** to the AI engine | swapping the engine safely | in progress | The door's shape is written. Fitting the engine behind it and moving the chat onto it is the rest. **Rewire first, delete second** |
| 7 | **The AI as a thread participant** | true human-and-AI collaboration | an owner decision (DP-09) | One migration and a repository change. The human path keeps working untouched |
| 8 | **Backup and restore of the business itself** | the safety net | startable | It is the safety net for everything else and it is still open |
| 9 | **Finance and procurement** areas | a complete business vertical | after the foundation, by design | Correctly deferred. The owner's ruling put business work last |
| 10 | **Per-tenant model policy** | the long-term model default | decided in principle; three pieces follow | Three pieces of work became *required* the day the default was decided: the model registry, the agent-to-model mapping, and platform-managed local models |
| 11 | **Dependency tracking and change propagation** | knowing what breaks when the model changes | designed, startable | The freshness check lets a Function survive a change; the wider propagation graph is the next step |
| 12 | **Guard coverage in the parked modules** | nothing today — they are switched off | recorded, not forgotten | Correctly not migrated. **But the day any parked module is switched on, it is unguarded** unless the record is read first. That is the risk |

---

## 3. Risks I would flag

### 3.1 The documentation carries more risk than the code (WATCH)

The project is unusually honest about its own documentation, and it needs to be, because the record has
drifted repeatedly:

- **`where_we_left.md` is a stale snapshot by its own admission** (2026-08-13) and still reads like a status
  document.
- **`workspace/PROGRESS.md` has three overlapping checklists that disagree with each other** — a real defect
  the project itself names.
- **`companai.md` at the root is a sibling document that reads as a vision statement for this product.**
  It is the most misleading file in the folder.
- **Two products are called Companai.** If a document is about to be used and its path has not been
  checked, it may be about the other one.

**Status: partly FIXED.** There is now exactly one roadmap, one scoreboard and one handover, and the
stale documents are labelled as stale. **The residue is real but bounded.**

**What I would do:** when the workspace-architecture folder is integrated into the main index (the deferred
later stage), do a single sweep for the two traps above and label rather than delete.

### 3.2 The build count and the decrement are not always the same number (FIXED, but the class is live)

During the guard migration, the per-module count and the number retired from the chain disagreed because
one call had already been migrated earlier as the worked example. **A chain that subtracts each module's own
count gets the wrong answer.**

**Status: FIXED** — the rule now is that the before-count is re-derived on the stashed tree for every step.

**Why I flag it anyway:** the *class* of error (carrying a number forward instead of re-deriving it) has
appeared in several other places, including a document count that drifted with untracked files and a file
count that was wrong for three modules. **It will happen again.** The mitigation is the rule, not the
individual fix.

### 3.3 The scoreboard's single number can be misread (WATCH)

The headline reads **75 of 321 ≈ 23%**, and the honest caveat is printed right beside it: the work that is
done sits **high** in the stack, so the percentage overstates how close the *product* is. The one number is
derived from ticked boxes, never typed — which is right, and also means it moves only when a box moves.

**Status: NOT AN ISSUE as designed.** But a number quoted out of its context — *"we are 23% done"* — is the
kind of sentence that gets repeated. **I would keep the caveat literally adjacent to the number forever.**

### 3.4 Things that look broken and are not

A newcomer will hit these and lose time:

- **The admin dashboard is empty.** Deliberate. Its widgets read business areas that are switched off.
- **Fourteen modules are parked.** Not deleted; restorable by removing one comment.
- **The MCP logs an "invalid API key" error.** Root-caused — the service is missing a setting the other two
  services have. All tools still register and are callable; only semantic search over tools is degraded.
- **`corprorate.com` is spelled that way on purpose.** **Do not fix it.**
- **`compai` and `companai` are both real.**
- **A test suite fails under the full run but passes alone** — a known environmental issue with a test
  sandbox, not a code defect.
- **Eight container rows is not eight healthy containers.** Read the status column, not the count.

**Status: all NOT AN ISSUE.** They are all written down, which is why I am listing them as *solved* rather
than *open*.

### 3.5 The hosted platform's login is currently broken for every real account (OPEN — needs you)

Measured on 2026-10-09: signing in on the hosted platform returns an internal error for a **known-existing**
account, while an **unknown** account returns a friendly refusal immediately. The contrast puts the fault
after the account lookup — the database or decryption path — and not in the credentials.

**Status: OPEN — needs you.** Until it is fixed, no account can sign in, so handing over credentials would
be handing over something unusable. **What is running is also old** — the live image predates the whole
guard sweep and the work since, which means a redeploy ships a very large difference at once.

### 3.7 The AI engine is connected but not integrated (OPEN — the biggest gap in the plan)

Hermes is running as a workbench. It discovers all 21 of the platform's tools over MCP, the wire is
sound, and a direct authenticated tool call returns real data. But **nothing in the product's request path
reaches it** — the chat route is still wired to the previous engine, which is why replacing it is a
rewire-then-delete migration rather than a switch.

**Status: OPEN, and it is the single biggest scheduling fact in the project.** The typed door that would
fix it has its *shape* written and nothing using it. The design's own adoption order puts this at Phase 1
of seven, before broad tools are granted, before memory and skills, and before autonomous work.

**What I would do:** finish the door and move the chat onto it **before** exposing any Hermes capability
to a user. A runtime can be added behind a door that already works; it cannot be added behind a route
still hard-wired to a departing engine.

**Two live defects sit on that path** and both are cheap: the model server has no `--jinja` flag (one
`curl` settles whether tool calling is silently degraded), and the MCP service was never given the model
server's address — which is why the recorded error text is *OpenAI's own* code and proves the request never
reached the local machine at all.

### 3.6 The environment has hard dependencies on the owner (WATCH)

- **Only the owner can start Docker Desktop.** The machine's security policy blocks an agent from launching
  it, and that block is not to be worked around. It recurs on every restart.
- **The admin password is his, and he types it.** It is never written to a file and never typed into a form
  by an agent. Anything needing a click-through of the running platform needs him at the keyboard.
- **The hosting VM is reachable only from the laptop.** Deploying happens from the laptop; visiting happens
  through a tunnel. Keeping those two paths visibly separate is a deliberate safety property.

**Status: NOT AN ISSUE** — these are constraints, not defects. But they mean the pace of any work that
needs a live click-through is bounded by his availability, and that should be planned for rather than
discovered.

---

## 4. Contradictions I found between the project's own documents

I am reporting these as an outsider's observation, because the project's own rule is *"where a document and
the code disagree, the disagreement is the defect — fix it, do not pick a side."* All of these are **already
flagged by the project itself**; none is a new finding. I list them because a newcomer needs to know they
exist rather than assume they have been missed.

| # | The disagreement | Where it is flagged |
|---|---|---|
| 1 | Two status documents disagree on the test count (12,924 vs 12,898) | `INDEX.md` and `where_we_left.md`, both dated 2026-08-13. The project's instruction is to re-run and read the number yourself |
| 2 | A claim that only a seed line imports the request-outcome library | Measured false — three production files import it. Corrected in the workspace design workstream |
| 3 | "Two of the shell's injection points are the sidebar" vs five | Corrected in the extensibility design batch |
| 4 | A line-number citation for the Function runner's execute step is copied into five documents | The correct region vs the exact line is spelled out in the mapping document |
| 5 | A "0 unguarded" figure that could be misread as "fully guarded" | The project is explicit: "0 remaining" means "no deprecated resolver left", never "the module is guarded" |
| 6 | An appendix row reading "0/2 — never verified" that actually meant "nobody looked" | Corrected in the audit re-measurement; two boxes moved as a result |

**My read:** every one of these was caught by the project's own discipline, and each was corrected in the
same change that found it. That is the system working. **The risk is not that they exist; it is that a
newcomer reads one of them and builds on it.**

---

## 5. What I would do first if I were picking the next task

Ranked, with the reason. (The order itself is the owner's to set — this is my recommendation.)

1. **The data axis.** It is the single gap that other honest caveats are written around. Until it exists,
   "every read is permission-filtered" is a claim about *kinds* of data rather than *rows*, and saved
   Functions carry a visible "permissions not checked" note.
2. **Bulk approval with the difference shown.** Small, bounded, closes a real usability gap in the screen
   the project calls its flagship.
3. **The single front door to the AI engine.** It is the prerequisite for ever swapping the engine safely,
   and the design work for it is already done. Finishing it makes the "borrowed runtime" decision real
   rather than aspirational.
4. **A decision on journal retention.** One line from the owner closes a real, unbounded cost.
5. **Then the workspace screen**, on the design that is already written.

---

## 6. What I would not do

- **Do not shortcut the permissions engine** to get user-authored widgets shipped sooner. The safety of that
  route comes from *what the object cannot express*, not from a check someone could reason their way past.
- **Do not un-park a business module** without reading its record first. The day a parked module is switched
  on, its guard coverage is whatever the record says — and it is currently un-migrated.
- **Do not delete a module** to tidy up. Park it. The project once nearly lost a feature because a module
  was labelled "CRM".
- **Do not close a decision that is the owner's**, and do not resolve an ambiguity silently by picking the
  reading that is easier to build.
- **Do not read the imported material "for context".** It is roughly twenty times the size of the project's
  own writing, and reading it for context is documented as the way the direction got buried before.

---

*Every point above is drawn from the project's own documents and my reading of the code. Where I have made
a judgement rather than reported a fact, I have said so.*
