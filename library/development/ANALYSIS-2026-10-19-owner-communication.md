# ANALYSIS — how to make the owner-communication rule hold

**Written 2026-10-19.** Answers: *"recommend best actions for that which is part of the rule — how to
perfect each issue or scenario."* Scope: `WORKING-RULES.md`'s top note and §2 (how to work with the
owner). §2.4 (the front-end rule) is not a communication rule and is untouched.

**Status: recommendation. One consistency fix applied (§2.3's scope); the rest waits for the owner.**
The message shape in §4 is adopted immediately — it governs my own output, costs him nothing, and is
reversible by deleting one paragraph.

---

## The answer in one line

**The rule keeps failing because it is written as advice about *style*, and style cannot be checked.**
Replace it with a fixed *shape* for every message, a small translation table for our own vocabulary,
and a dated log of why the rule changed — and keep the one thing the rule already gets right: a
question must be answerable in one sentence.

**And the single most useful change: stop treating jargon as a style fault.** Jargon is a
**diagnostic**. When I wrote *"the invoker half splits into holding and gating"*, it was not because I
chose bad words — it was because I had not decided what that meant **for him**. The sentence is a
symptom of unfinished thinking, which is exactly what the existing note already says about diagrams.
So the rule should not say *"avoid jargon"*. It should say: **if the sentence that states the
consequence needs a mechanism word, stop — you have not finished thinking.**

---

## 1. What I looked at

### 1.1 The platforms we studied — eleven of them, and only one wrote this down

The donors are codebases; their documentation is written for **contributors**, not for an owner. Nine
of the eleven have nothing transferable on this subject. **Zulip does**, and it is unusually precise —
four artifacts:

| What Zulip does | Where | Why it transfers |
|---|---|---|
| **It lints the message's shape, in CI.** Title ≤72 characters, starts with a capital, ends with a full stop; body lines ≤76 | `.gitlint` + `tools/commit-message-lint` | It is the only donor that treats *how a message is written* as a **checked** rule rather than a wish. Note carefully what it checks: **shape, not tone.** It never tries to lint politeness |
| **"Each commit is a minimal coherent idea"**, and: *"If you find yourself writing a commit message that reads like a list of somewhat dissimilar things that you did, you probably should have just done multiple commits"* | `docs/contributing/commit-discipline.md` | This is the batching problem, stated as a **diagnostic**: a message that reads like a list *is the evidence* that it should have been several messages |
| **"When asking someone to do something, explain the reasoning behind your request"**; *"If you are not certain about a suggestion, frame it as a question"*; invite disagreement | `docs/contributing/how-we-communicate.md` | Reason-before-request is the same idea as *say what each answer would change* |
| **"Try, then ask."** Try to solve it yourself first; identify the precise point where you are stuck; then ask with context and a specific request | `docs/contributing/asking-great-questions.md` | This is the owner's *"if a sensible default exists, take it"* — arrived at independently, and phrased as a duty to try first |

**The transferable conclusion is not "copy Zulip's rules".** It is: **Zulip separates the part it can
check from the part it cannot.** Shape is checked by a machine. Tone is written as short, example-led
bullets and left to judgement. Our rule tries to do both with prose, and therefore does neither.

### 1.2 The standards — what "plain" actually means when it is defined

- **ISO 24495-1:2023** (plain language — governing principles) settles on four principles:
  **relevant, findable, understandable, usable.** The useful part is that "plain" is defined by the
  *reader's ability to act*, not by vocabulary level.
- **The US federal plain-language guidelines** (the Plain Writing Act of 2010, the writing guide at
  digital.gov) give the rules that are checkable by eye: **active voice**, **present tense**, **short
  sections**, **short words**, and **avoid hidden verbs** — do not write *"we conducted an analysis
  of"* when you mean *"we analysed"*. Hidden verbs are the same disease as our own vocabulary: a
  simple action dressed up as a thing.
- **Readability research is consistent**: shorter sentences and common words raise comprehension;
  the failure mode is the **curse of knowledge** — the writer cannot imagine not knowing.

### 1.3 The decision-writing tradition — the shape of a message that respects a reader

- **BLUF — bottom line up front.** The conclusion first, support after. The military and consulting
  world's standard, and the same instruction as the **Minto Pyramid Principle**: *"answer first, then
  group and support"*. It exists because a reader who must reach the end to learn the point pays for
  every sentence twice.
- **Amazon's narrative memo and PR/FAQ.** Amazon banned slide decks because they let a presenter hide
  an unclear idea behind a bullet. The **PR/FAQ** forces the writer to state the benefit *from the
  reader's side* before describing the mechanism — the same discipline as our "everyday example".
- **ADR — Architecture Decision Records** (Michael Nygard). Four fields: **status, context, decision,
  consequences**. Its value is that a decision is written as a **dated record**, so a later reader can
  see *why*, and so that a decision amended repeatedly becomes visible as a pattern.

---

## 2. Why the rule keeps failing — three structural causes, not three careless moments

### 2.1 It is advice, not a shape

Every clause in §2 is a sentence about how to write. *"No jargon." "One line of plain reasoning beats
a paragraph." "Every claim carries an observation."* None of them tells the writer **where** the plain
sentence goes, or what happens to a message that does not contain one. A rule with no slot and no
consequence is honoured by intention and broken by fatigue.

Zulip's answer is the one that survives contact: **make the shape mandatory and obvious.** A
72-character title is not a suggestion; it is a length you can see.

### 2.2 "No jargon" cannot be met, because nothing defines jargon

§2.3 names three examples — *"upstream", "the resolver", "the barrel file"*. On 2026-10-19 I used
**"descriptor", "invoker", "holding", "gating", "intersection"** — none of which is on the list. A
blocklist that grows one anecdote at a time will always be one failure behind. That is not a failure
of memory; it is a failure of the **kind** of rule.

### 2.3 Its scope was set by the first failure

The note at the top of `WORKING-RULES.md` was written after a **question** failed, so it says *"before
asking anything"*. Reports are sent far more often than questions and were never covered — which is
how a report full of mechanism words reached the owner two days later. **A rule written from one
failure tends to cover only that failure's shape.** (Recorded as `LESSONS.md` L183.)

### 2.4 The evidence that the rule itself is the defect: three amendments in two days

| Date | What failed | What was changed |
|---|---|---|
| 2026-10-18 | Four rulings asked in one message, in project vocabulary | One question; the 14-year-old test |
| 2026-10-19 | A report in mechanism words | The test extended to reports |

Two amendments to the same note in two days. The project's own Rule 13 says a re-measured number gets
its fix committed **by name** — and this rule has never had its failures written down. **A clause
amended a third time is not being disobeyed; it is wrong.** The log in §4.4 is what makes that
visible instead of forgettable.

---

## 3. The recommendations, one per issue

| # | Issue | Best action | Evidence |
|---|---|---|---|
| **R1** | Advice has no shape | **A fixed five-slot message skeleton** (§4.1) | Zulip lints shape; BLUF/Pyramid; ADR's fixed fields |
| **R2** | "No jargon" is undefinable | **A position rule, not a word rule**: identifiers are banned from slots 1–2 and allowed in slot 3 | ISO 24495-1 defines plain by the reader's ability to act; Zulip checks position and length, never vocabulary |
| **R3** | The vocabulary has no one home | **A translation table** (§4.3), maintained as data | The project's own "one home" doctrine (`CC-126`) |
| **R4** | Questions cause round-trips | **Every question carries its default** (§4.2) | Zulip: *"try, then ask"*; the owner's own complaint is about *vague* questions, not the count |
| **R5** | The rule has no memory | **A dated amendment log** (§4.4) | ADR: status · context · decision · consequences |
| **R6** | Nothing checks the rule | **Check the mechanical half only** (§5) | Zulip lints shape and does not attempt tone |
| **R7** | "Done" drifts | Keep §2.1's four statuses, and **put the verdict in the first line** | BLUF; §2.1 already says a statusless concern is not a finding |

### R1 — the shape does the work that the adjectives cannot

Five slots, in this order, always. **The order is the rule**: a reader who stops after slot 2 still
knows what changed and why it matters.

```
What changed     one sentence, no identifiers
Why it matters   one sentence — the consequence, not the mechanism
How I checked    the measurement and its number
Waiting on you   "Nothing." or one question, with its default
Next             one line
```

### R2 — the position rule, and why it beats a blocklist

- **Slots 1 and 2 are read by the owner. No identifiers there.** No backticks, no file paths, no
  function names, no gate labels.
- **Slot 3 is where the evidence lives**, and identifiers are *encouraged* there — because that is
  where they are the proof rather than the explanation.
- **The diagnostic that replaces "no jargon":** if slot 2 cannot be written without a mechanism word,
  **stop**. You have not finished thinking. This converts a style rule into a thinking rule, which is
  the only kind this project has ever managed to enforce.

### R3 — a translation table, because the same word must become the same phrase

Started below (§4.3). It is a **data file, not prose**, so it can be extended in one line and read by
the checker in R6. Without it, "tenant" becomes "customer", "workspace" and "account" on three
different days, and the reader has to learn the same word three times.

### R4 — every question carries its default

The owner's complaint was: *"You are only burning more time and tokens asking vague questions then we
have to go back and forth about it again."* **The cost he named is vagueness, not frequency.** So the
rationing is on *attention*, not on question marks:

- A question states **what I will do if he says nothing**, and **what changes** if he disagrees.
- A decision that does **not** block the work is taken, and recorded — never asked.
- A second question in the same turn is allowed **only if it also blocks**. Otherwise it is a
  default plus a note.

This keeps "one question" as the norm and stops it from turning into serial round-trips.

### R5 — the log, because a rule with no history cannot be corrected

Four fields per amendment: **date · what failed · what changed · what would have caught it.** The
last field is the one that matters: it is the difference between a rule that learns and a rule that
grows.

### R7 — the verdict goes first

§2.1's four statuses (FIXED · WILL DO X · OPEN — needs you · NOT AN ISSUE) are good and stay. What is
missing is a **report-level** verdict. BLUF supplies it: slot 1 is the verdict, and slot 4 is the only
place the owner is asked to do anything.

---

## 4. The proposed text, ready to paste

### 4.1 The message skeleton

> **Every message to the owner has five slots, in this order. The order is the rule.**
>
> 1. **What changed** — one sentence. No identifiers: no backticks, paths, function names or labels.
> 2. **Why it matters** — one sentence naming the consequence, not the mechanism. **If this sentence
>    needs a mechanism word, you have not finished thinking.** Say what it is, who needs it, what
>    breaks without it.
> 3. **How I checked** — the measurement, with its number. Identifiers belong here and are welcome.
> 4. **Waiting on you** — either *"Nothing."* or **one** question, answerable in one sentence, with
>    the default stated and what changes if he disagrees.
> 5. **Next** — one line.
>
> **An everyday example is required when the thing is new**, and it goes in slot 2. If it needs a
> diagram, it is unfinished thinking.

**Worked example — the same fact, written both ways.** This is the pair from 2026-10-19:

| Written as a log entry | Written to the rule |
|---|---|
| *"The invoker half splits into holding and gating; 36 of 157 have no descriptor."* | *"You can send someone to collect a parcel for you, and the rule is they cannot collect what you could not. Checking that needs two questions — are you allowed at all (a plain yes or no), and how careful must we be (which needs a risk label per parcel). Thirty-six of our parcels have no label. That blocks the second question, not the first — so the protection works for all 157 now, and the labels are a separate product decision."* |

### 4.2 The question template

> **A question is three lines:**
> 1. **The question**, ending in a question mark, answerable in one sentence by somebody who has never
>    seen the code.
> 2. **The default** — what I will do if he says nothing.
> 3. **What changes** if he chooses differently.
>
> If line 1 needs a mechanism word, it is not a question yet. **If line 2 is obvious and safe, do not
> ask at all — do it and say so in slot 1.**

### 4.3 The translation table (starter, to be maintained as data)

| We say | He reads |
|---|---|
| tenant | customer account |
| principal | who is acting |
| invoker / `onBehalfOfUserId` | the person the machine is acting for |
| descriptor | risk label |
| intersection | the lower of the two |
| resolver / authority check | the permission checker |
| binding | permission slip |
| delegation | a lent permission |
| denial | a withdrawn permission |
| gate `A0`–`A5` | how careful we have to be, from "not at all" to "a person must approve" |
| migration | database change |
| fail-open / fail-closed | says yes by mistake / says no by mistake |
| suite / test | checks |
| commit | save point |

### 4.4 The amendment log

| Date | What failed | What changed | What would have caught it |
|---|---|---|---|
| 2026-10-18 | Four rulings asked in one message, in project vocabulary | One question; the 14-year-old test | A question template with a mandatory default (§4.2) |
| 2026-10-19 | A report in mechanism words | The test extended to reports | Slots 1–2 with the identifier ban (§4.1) |
| 2026-10-19 | "No jargon" listed three words and missed five | A position rule instead of a blocklist | The diagnostic in slot 2 (R2) |

> **The standing instruction: a clause amended a third time is not being disobeyed — it is wrong.
> Rewrite the clause, do not restate it.**

---

## 5. What I would **not** do, and why

- **Do not lint tone.** Zulip checks length and punctuation because those are mechanical. A checker
  that guesses at clarity will produce noise and teach everyone to ignore it — the project's own
  `CC-101` lesson in reverse.
- **Do not ban long messages.** Length is not the defect; a message with no verdict is. The five slots
  can be long in slot 3 and still be readable, because slots 1, 2 and 4 are already answered.
- **Do not add more prose to `WORKING-RULES.md`.** §2.1 already says *"keep it short — a page the agent
  reads once at the start"*. The fix is a shorter rule with a shape, not a longer one with examples.
- **Do not remove the one-question rule.** It is the owner's own instruction and it is right. R4
  sharpens *what makes a question cheap*, it does not license batching.

**The one thing I would check mechanically** (R6): in the first two slots of a message, flag any
backtick, file path, or entry from the translation table's left column. That is objective, takes a
second, and catches exactly the failure of 2026-10-19 without pretending to judge writing.

---

## 6. How we would know it worked

- **The measure is behavioural, not stylistic:** the count of replies meaning *"I don't understand"*
  per ten reports. It should reach zero. Two such replies in three days is the current baseline.
- **The leading indicator:** any message where slot 2 contains a mechanism word is a **near miss** —
  it did not reach him as a consequence. Count those; they are the defect showing up before he does.
- **The structural test:** if any clause in this rule is amended a **third** time, the clause is wrong.
  Rewrite it; do not restate it.

---

## 7. What is applied, and what waits for you

**Applied now, because it is my own output and costs you nothing:**
the five-slot skeleton (§4.1), the question template (§4.2), and the translation table as a working
habit (§4.3). Reversible by deleting this paragraph.

**Also applied, because it was a contradiction I created:**
`WORKING-RULES.md` §2.3 still said *"a QUESTION gets the 14-year-old test"* while the note at the top
had been widened to reports. §2.3 now says the test covers **every explanation**, with a pointer here.

**Waiting for you — one decision, and it is genuinely yours:**

> **Should the five-slot shape become the required form in `WORKING-RULES.md`, with the amendment log
> beside it?**
> **Default if you say nothing:** yes — the rule file gets the shape and the log, and §2.1/§2.3 are
> shortened to point at them.
> **What changes if you say no:** I keep using the shape, but the rulebook keeps its prose and the
> next agent starts from the version that failed.

---

*Sources read for this document: `zulip-main` at `docs/contributing/{commit-discipline,how-we-communicate,
asking-great-questions,reporting-bugs,continuing-unfinished-work}.md` and `.gitlint` +
`tools/commit-message-lint`; ISO 24495-1:2023 (governing principles: relevant, findable, understandable,
usable); the US federal plain-language guidelines at digital.gov (active voice, present tense, short
sections, hidden verbs); BLUF / Minto Pyramid Principle; Amazon's narrative memo and PR/FAQ; Nygard's
ADR template. The nine other studied platforms — Hermes, Multica, Buzz, Paperclip, CrewAI, Gastown,
n8n, OpenRig, Activepieces, Mattermost — carry nothing transferable on this subject, and saying so is
part of the finding rather than an omission.*
