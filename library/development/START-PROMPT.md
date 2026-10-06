# Start prompt — paste this to the agent that takes over

**What this file is.** The ready-to-paste first message for the agent that inherits this project and
continues the development. It is short on purpose: it tells the agent what to read, how to set up,
the rules it may not break, and the first task — and nothing else, because the detail lives in
[`HANDOVER.md`](HANDOVER.md) and the agent is told to read that first.

**How to use it.** Copy everything between the two `═══` rules below and send it as the first
message of the new session. Nothing else is needed. If the project has moved, change the two paths
at the top first.

**Why it is written this way.** A handover that is read *after* the agent has already formed a
picture is a handover half-wasted. So the prompt's job is to make reading the handover the **first
action**, and to name the one thing to build afterwards — not to summarise the project itself.

---

═══════════════════════════════════════════════════════════════════════════════════════════

You are taking over an existing project and will continue its development. Everything is at

    C:\Users\Ramzi\Downloads\companai

You know nothing about it yet, and that is expected — it is written down for you.

**1. Before you do anything else, read `library/WHAT-WE-ARE-BUILDING.md` — it is short, and it is the
product in plain English.** It tells you what we are building (the AI builds a capability once, then
it runs with no AI), the loop that makes it work, what the platform is *not*, and — most importantly
— **which documents in the library are ours and which are only imported study material.** Then read
`library/development/HANDOVER.md` top to bottom. It is written for exactly you: a newcomer who knows
nothing. It tells you what exists, where it is, the traps nobody can discover by reading the code,
the two git repositories, the rules that bind, and what is proven versus what is only claimed. Then
read the eight files it lists in §2. Do not start any work before you have done this — the first
hour is reading, and it is the cheapest hour you will spend. **In a hurry,
`library/development/BOOKMARKS.md` is the one-page short list** — the documents that matter, the
end-game and vision documents, and which folders are in git and which are not.

**2. Then set up your shell. This is mandatory in every terminal, every session:**

    export PATH="/c/Users/Ramzi/Downloads/companai/workspace/.toolchain/node24:$PATH"

The system Node is 22 and the platform refuses to run on it. Without this export you will get
failures that describe the laptop, not the project.

**3. Confirm the state before you trust it.** Run these and read the output:

    cd /c/Users/Ramzi/Downloads/companai && git status --short          # thinking + docs
    cd workspace/starting-kit && git status --short                      # the code
    docker ps                                                            # is the stack up?

There are **two** git repositories, and both should be clean. If a tree is dirty, find out whose
changes they are before you touch anything.

**THE RULES THAT BIND.** Full text is in `workspace/COOKBOOK.md`. These are the ones that have
already cost this project time:

- **Every claim comes with an observation attached, not an argument.** Measure from the artefact,
  never from a description of it. If you are about to say "the cause is X" and you have not watched
  X happen, you are guessing.
- **Reach every important answer by two genuinely different routes**, and make them agree.
  Re-running your own check is not a second route.
- **Bounce every conclusion off a critic whose only job is to prove it wrong.** A review that says
  "looks good" without naming what it tried to break has not done its job.
- **Never `git add -A`.** Stage by explicit path. A wildcard once swept 10,448 unrelated files into
  a commit. Every batch ends with a commit **in both repositories**.
- **Never write the admin password to a file, and never type it into a login form.** It is the
  owner's, and he types it.
- **Take a checkpoint before anything you could not undo:** `./workspace/scripts/checkpoint.sh <label>`
- **Update the documentation in the same change as the work.** A batch that leaves the docs stale is
  not finished.
- **A decision that is the owner's is not yours to close.** Ask, or leave it explicitly open.

**HOW TO TALK TO THE OWNER.** Reply in **English**, always. Plain, everyday words — he is not a
developer, so no jargon. One specific thing at a time, answerable in a word or a sentence. **Do not
ask him to adjudicate technical decisions:** when a problem has an obvious safe default, take it, do
the work, and tell him what changed and how to undo it. Reserve his judgment for what is genuinely
his — a name, a domain, a cost, a preference.

**4. Your first task.** Read `library/development/BACKLOG.md` §"The list". **The four-item critical
path is complete:** `spec ✅ → G-01 ✅ → G-02 ✅ → G-03 ✅`. `P0-spec` is done — draft 2 of the
Business Model Kernel specification (`library/development/SPEC-business-model-kernel.md`) passes the
vision's own 40-item gate (**only the owner's ratification remains**). **`G-01`** (the Business Model
Kernel, code repo `ee406e8`) is a view over the platform's own declarations, with the export/reimport
round-trip empty. **`G-02`** (the Business IR and the compiler) runs §51's ten stages as named steps
and passes the **rename test** both directions. **`G-03`** (User Functions) is the product's
distinctive feature, created with AI assistance and running with **no AI at all**, proven by two
routes one of which was falsified. **`G-07`** (the Widget contract, IR and registry) is built, and a
published Function placed in a Widget runs from the Widget's own inputs with no AI.

**Take the first unbuilt item in `BACKLOG.md` §"The list".** Do not assume the order has not changed
since this prompt was written; read the list and take item 1 unless you have a reason not to. **At
the time of writing the first unbuilt items are `G-12`** (business backup and restore — the safety
net, depends on nothing) **and `G-17`** (schema-constrained generation — **the AI that produces the
Business IR**, which is the vision's own missing join). **`S0` is done.** Both `G-12` and `G-17` are
startable; **which goes first is the owner's call** (he asked on 2026-10-06 to "keep the eye on the
goal", which points at `G-17` — but `G-12` is the safety net). Read the two rows in `BACKLOG.md`
before choosing.

**Keep the eye on the prize while you build.** The whole product is one loop: *a need → the AI
understands it → the AI writes a **Business IR** → the platform **validates** it → it **runs** → the
person **confirms** it → it is **saved as a Function** → from then on it runs with **zero AI**. When
you build a feature, ask which part of that loop it serves. **Consult the imported material in the
library (`ai/` except `ai-first/`, `ai/source-docs/`) only when the specific feature in front of you
can learn something from it** — never "for context". Our direction is `ai/ai-first/`, and
`library/WHAT-WE-ARE-BUILDING.md` explains the split.

**Two things are now decided, and they shape what you build next.** **B-05, the Hermes runtime
boundary:** one product, one repository, one deployment, one interface (ours), with Hermes as a
**supervised private runtime process behind the internal port**, and Hermes **headless**. **The
long-term model default (item 13): per-tenant policy is the destination, cloud-first is the
interim.** The second turns three pieces of work from *nice* to *required* — the model registry, the
Hermes **agent / persona / profile** mapping, and platform-managed local models — tracked as the
**`ML-`** items in `BACKLOG.md`. Two further owner requirements are recorded in
`library/development/ARCHITECTURE-model-server-integration.md`: the open-source lane must **not
reserve a vendor's settings** (§4.2), and the platform must be able to **choose which local model
runs** (§6.4).

**Items left deliberately undone, each with a named trigger** — read them in `BACKLOG.md` before
planning anything adjacent: a Function's **database row** (trigger: `G-09`, to be built in one
migration with the registry's own row), a verified Function's definition being editable without
invalidating its verification (trigger: the first editing operation), and the Widget registry's
**database row** (trigger: `G-09`).

Work it in the project's four-step sprint process — **no code before step 3**. Steps 1–3 are
documents and measurement; only step 4 writes code:

1. **Research** — what already exists for this, in Hermes, in the Starting Kit, in the `V`-register?
2. **Validate** — is this the best approach, and what would break it?
3. **Write the cookbook steps** for this sprint only, in `workspace/COOKBOOK.md` — the exact commands,
   the files to touch, and the "done when" test. **No code is written in steps 1–3.**
4. **Build** it, test it against the running stack, and record it.

**5. Before you finish your turn, tell the owner, in plain English:**

- what you did, and what you measured to prove it;
- what you could not do, and why;
- what needs him specifically, and nothing else.

Every point you raise carries a status: **FIXED** (and how you re-checked) · **WILL DO X** ·
**OPEN — needs you** · **NOT AN ISSUE** (raised, then measured false).

═══════════════════════════════════════════════════════════════════════════════════════════

---

## Maintaining this file

- **If the project moves**, update the two paths at the top — they are the only absolute paths.
- **If the first task changes** (it will, once `P0-spec` is done), update step 4 only. The prompt is
  designed so that the task is the one thing that changes; the reading list and the rules are stable.
- **If a new rule costs real time**, add it to the list — but only if it is the kind of mistake that
  is invisible from the code. Everything else belongs in `LESSONS.md`.
