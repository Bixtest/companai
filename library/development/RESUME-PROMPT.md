# The resume prompt — paste this into any new session

**This file exists so that a new AI agent can pick this project up from any interruption without
being coached.** It is a *recipe*, not a status view: it tells the agent how to find out where things
stand, and what the rules are, and then gets out of the way. The status itself lives in
`MASTER-CHECKLIST.md` §2 and the memory files (rule 2 — one roadmap).

Copy the block below into the first message of a new session. It is written to be read by an agent
that has no context at all.

---

```
You are picking up an in-progress engineering project. Follow these steps in order. Do not
sketch a plan or write any code until step 6.

## 1. Where things are

Two git repositories. The code repo is a SUBDIRECTORY of the docs repo but is its own repo —
every command must run from the right one.

  Docs repo : C:/Users/Ramzi/Downloads/companai                          (branch master)
  Code repo : C:/Users/Ramzi/Downloads/companai/workspace/starting-kit   (branch main)
  Node      : C:/Users/Ramzi/Downloads/companai/workspace/.toolchain/node24/node.exe  (v24.19.0 — mandatory)

`git add -A` is BANNED in both repos. Stage explicit paths. One wildcard add once swept 10,448
of the owner's unrelated files into a commit.

## 2. Read, in this order

  1. C:/Users/Ramzi/Downloads/companai/where_we_left.md          — the resume recipe and the traps
  2. .../companai/.workbuddy-ai/memory/MEMORY.md                 — long-term memory; tail = LAST DONE + NEXT
  3. .../companai/.workbuddy-ai/memory/2026-10-17.md             — the newest daily log (newest at the bottom)
  4. .../companai/library/development/MASTER-CHECKLIST.md §2     — the canonical LAST DONE and NEXT lines
  5. .../companai/library/development/MASTER-CHECKLIST.md §5     — the full register; every open item + its trigger

Do not build a second status view. One roadmap, always.

## 3. Establish the position — by measurement, not by reading

  cd C:/Users/Ramzi/Downloads/companai && git log --oneline -25
  cd C:/Users/Ramzi/Downloads/companai/workspace/starting-kit && git log --oneline -25
  cd C:/Users/Ramzi/Downloads/companai/workspace/starting-kit && git status --porcelain

Then, in your reply, state plainly:
  - the last commit in each repo, in one line each
  - what the NEXT pointer says the next item is
  - whether either working tree is dirty (if it is, that is a half-finished edit from a previous
    session — report it BEFORE touching anything, and do not "finish" it by guessing what it meant)

## 4. The rules you are working under

  - Docs are CLAIMS; the code is the AUTHORITY. A green tick in the register means the code was
    checked and is fully done for that row. Verify from the source before relying on it. The roadmap
    has been wrong about what was already done three times.
  - Re-measure every number you repeat. An inherited number is a claim with no author in the room.
    Two wrong figures were found on 2026-10-17 this way.
  - Capture exit codes DIRECTLY: `cmd > file 2>&1; echo $?`. Never through a pipe. `tail`'s status
    is not the suite's status.
  - A suite that fails to LOAD reports zero failures. "1 failed, 0 total" is a load failure, not a
    pass. Read suite names before counts.
  - A fake is not a database. When the change is SQL, prove it against a real PostgreSQL
    (docker run -d --name <name> -e POSTGRES_PASSWORD=probe -e POSTGRES_DB=probe postgres:16-alpine),
    commit the probe beside the change with its run command, then remove the container.
  - Mutations must go RED: after a fix is green, revert it and confirm the matching test fails,
    then restore the file byte-identical.
  - Every batch ends with a commit in BOTH repos, explicit paths.
  - Report the owner in plain, everyday English. Short sentences. No jargon. Give the answer, take
    the sensible default, and say how to undo it. Ask at most one question, and only if genuinely
    blocked.
  - A lesson belongs in LESSONS.md before it belongs in your reply.

## 5. The toolchain — these exact invocations work

  NODE="/c/Users/Ramzi/Downloads/companai/workspace/.toolchain/node24/node.exe"
  COREPACK="/c/Users/Ramzi/Downloads/companai/workspace/.toolchain/node24/node_modules/corepack/dist/corepack.js"

  From workspace/starting-kit/:
    yarn            : "$NODE" "$COREPACK" yarn <cmd>
    package tests   : cd packages/ai-assistant && "$NODE" ../../node_modules/jest/bin/jest.js --config jest.config.cjs
    typecheck       : cd packages/ai-assistant && "$NODE" ../../node_modules/typescript/bin/tsc --noEmit -p tsconfig.json

  From the docs root:
    node scripts/check-master-checklist.mjs
    node scripts/derive-counts.mjs
    node scripts/__tests__/check-master-checklist.mutations.mjs

  NOTE: jest must be run from INSIDE the package directory. Run from the repo root it fails with
  TS5011 and reports "1 failed, 0 total" — a load failure that reads as nothing. And
  `node .bin/jest` fails: `.bin/*` are shell scripts. Call node_modules/jest/bin/jest.js.

## 6. Then, and only then

Take the NEXT item from the register. If it has a PLAN-*.md in library/development/, read it before
writing code — it holds the measured inventory, the donor re-read, the design and the proof plan. For
an SR-* item the donor re-read is mandatory: read the donor's SOURCE at the cited line, never the
digest, and apply the chain rule (who CREATES the thing, who CHECKS it, who CONSUMES the answer, who
DELETES it).

Work in named increments, each ending green and committed. Update the docs as you go, not at the
end. Get back to me with: what you found (measured, not assumed), what you did, how you proved it,
and what is left — with every open point carrying a status of FIXED, WILL DO, OPEN, or NOT AN ISSUE.
```

---

## How to keep this file true

When a session ends, the only thing that has to be edited is whatever the NEXT pointer and the memory
tail say. This file points at them, so **it does not need editing on a normal day** — which is the
property that keeps a handover from going stale.

Edit this file only when:
- the toolchain changes (a new package, a different node, a changed jest config location),
- a new trap is discovered that would cost a future agent hours,
- a rule changes.

Then commit it to the docs repo with the rest of the batch.
