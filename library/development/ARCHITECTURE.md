# Architecture — how the three run together

**What this document is.** The Starting Kit, Hermes and the model server are three separate
things that must work as one. This is the picture of how they connect, **written before we
build**, so that every later decision has a shape to fit into. It answers the question the
owner asked directly: *"how will starting-kit + Hermes + llama server be working together?"*

**Status:** design, grounded in what the code already shows. Where a claim rests on reading
code rather than running it, it says so.

**Read this with:** [`../library/analysis/findings/12-development-plan.md`](../analysis/findings/12-development-plan.md)
(the plan), [`../library/analysis/findings/09-overlap-matrix.md`](../analysis/findings/09-overlap-matrix.md)
(who covers what), and [`../library/analysis/findings/10-contested-ownership.md`](../analysis/findings/10-contested-ownership.md)
(who owns what).

---

## 1. The three components, in one line each

| Component | What it is | Where it lives |
|---|---|---|
| **The Starting Kit** | The **platform** — the business system, the governance layer, the database, the screens. This is the product. | `workspace/starting-kit/` |
| **Hermes** | The **agent runtime** — the agent loop, tools, skills, sessions, subagents, model routing. Borrowed, not built. | `library/ai/hermes-agent-main/` |
| **The model server** | **Inference** — a local, OpenAI-compatible endpoint (llama.cpp) so the product can run without sending data to a cloud model. | to be added as a service |

**The one sentence that keeps them apart:** *the platform owns the business truth and the
authorization; Hermes owns the agent's work; the model server owns nothing but answers.*

---

## 2. The picture

```
                        ┌─────────────────────────────────────────────┐
                        │              THE STARTING KIT               │
                        │   (the platform — the product)              │
                        │                                             │
   person ────────────► │   app  :3000   Next.js · screens · API      │
                        │   postgres     the business truth           │
                        │   redis        cache · queue                │
                        │   meilisearch  search                       │
                        │                                             │
                        │   MCP server  :3001  ── the platform's      │
                        │                         tools, exposed      │
                        └───────────────┬─────────────────────────────┘
                                        │  (1) agent reaches platform tools
                                        │      over MCP, authorized by our gate
                                        │
                        ┌───────────────▼─────────────────────────────┐
                        │                  HERMES                     │
                        │   (the agent runtime — borrowed)            │
                        │                                             │
                        │   gateway   the agent loop, tools, sessions │
                        │   dashboard :9119  (localhost only)         │
                        │   state.db  its own conversation store      │
                        └───────────────┬─────────────────────────────┘
                                        │  (2) agent asks for inference
                                        │      (OpenAI-compatible)
                                        │
                        ┌───────────────▼─────────────────────────────┐
                        │              THE MODEL SERVER               │
                        │   llama.cpp  OpenAI-compatible  :8080       │
                        │   (local-first — data need not leave)       │
                        └─────────────────────────────────────────────┘
```

**Two arrows, and they are the whole integration.** Arrow **(1)** is how an agent *does*
something in the business — it reaches the platform's tools through the MCP server, and every
call is checked by our authorization first. Arrow **(2)** is how an agent *thinks* — it asks a
model for an answer, and that model can be local (llama.cpp) or a cloud provider, chosen by
policy.

**Everything else is infrastructure:** Postgres holds the business truth, redis caches and
queues, meilisearch indexes for search. Hermes keeps its own `state.db` for conversation
history — which is **not** business truth (batch 9, RQ-103).

---

## 3. What already exists, and what must be added

**The good news, measured from the code.** The Starting Kit **already ships a dockerised
stack** that runs most of this: `workspace/starting-kit/docker-compose.fullapp.yml` brings up
`app` + `mcp` + an agent runtime (`opencode`) + `postgres` + `redis` + `meilisearch`. It is
**already parameterised by `DEPLOY_ENV`** — the same file targets `local` and a cloud
environment, with per-environment volumes. **So "local first, cloud later" is already how the
stack is built, not something we must add.**

| Piece | State today | What is needed |
|---|---|---|
| The platform (`app`) | ✅ running, dockerised | nothing |
| The platform's MCP server (`mcp :3001`) | ✅ running, dockerised | the platform's own tools registered as MCP tools |
| An agent runtime in the slot (`opencode :4096`) | ✅ present | **Hermes takes this slot** (Q6 closed) |
| Hermes (`gateway` + `dashboard`) | ✅ its own compose exists | **join it to the stack** (see §5) |
| The model server (llama.cpp) | ❌ not present | **add it as a service**; point the runtime at it |
| Postgres · redis · meilisearch | ✅ running, dockerised | nothing |

**The honest limit, stated plainly.** Everything above is read from the compose files and the
code, **not from a run**. The one measurement that would upgrade it is standing the trio up
and watching the two arrows work — which is exactly what **Sprint 0** (§5) is for.

---

## 4. The three boundaries that make it work

These are not preferences. They are the decisions from batch 10, and the architecture must
obey them.

1. **One door per message.** A business message arrives through the platform (our channels);
   agent-facing chat goes through Hermes's adapters. A customer's message is answered once.
   (C-11)
2. **One clock for business work.** Business jobs are scheduled by the platform's scheduler;
   Hermes's cron does only runtime chores, and an agent cannot create a business job without
   passing our gate. (C-3)
3. **One decision point.** Every agent action that touches business data is authorized by
   **our** resolver, through the MCP boundary — Hermes's own approvals guard raw tool use
   (shell, computer-use), not business actions. (C-1, C-17, I5)

**The rule that ties them together:** *anything the user would see, or that touches business
data, is ours.* Hermes is the agent; the platform is the company.

---

## 5. The dockerisation decision — **Sprint 0**

**The owner asked me to decide when to dockerise.** Here is the decision, and the reasoning.

### The decision

**Sprint 0 — stand up the local dockerised trio — is the first thing we build, in parallel
with writing the Business Model Kernel specification.** It is not deferred to "when we need
it"; it comes before any kernel code.

### Why then, and not later

1. **It is not a big build — it is finishing one that already exists.** The stack is
   dockerised and `DEPLOY_ENV`-parameterised today. The work is: add the **Hermes** service and
   the **model server** service to the compose stack, wire the two arrows, and prove they work.
2. **The architecture must be proven by running, not by reading.** Item 5 asks how the three
   work together. The honest answer is a design until we watch the two arrows fire — and the
   programme's own standing limit is that every "live and tested" claim is *code read, not
   behaviour run* (batch 11 §7). Sprint 0 is what converts that.
3. **Every later step then develops against a real stack.** Once the trio runs, each kernel and
   security item is built and tested against a live platform + agent + model — instead of
   against a description of one.
4. **It resolves the shortcut risk early.** The biggest shortcuts we rely on (S-01 the agent
   runtime, S-02 the resolver, S-03 the model routing) are exactly the ones Sprint 0 exercises.

### Why it satisfies the owner's two conditions

- **"Test locally fully on my laptop first, so it is easier to update as you go."** The whole
  point of `docker compose up` locally: rebuild one service, restart, and the change is live —
  no server, no deploy.
- **"As long as deploying on the cloud is guaranteed once all works locally."** The same
  compose file already targets the cloud through `DEPLOY_ENV`. Local and cloud run the **same
  images with the same file** — so a thing that works locally deploys unchanged. **This is the
  guarantee, and it is already in the code, not a promise.**

### What Sprint 0 delivers (definition of done)

1. One command — `docker compose -f docker-compose.fullapp.yml up` (extended) — brings up the
   **platform + Hermes + model server** together on the laptop.
2. **Arrow (1) works:** a Hermes agent lists and calls a platform tool through the MCP server,
   and the call is **checked by our authorization** (visible in the ledger).
3. **Arrow (2) works:** the agent answers using the **local** model server, with no cloud key.
4. The dashboard is reachable on localhost; no service is exposed to the LAN.
5. **The same file is unchanged for cloud** — only env values differ.

### What Sprint 0 is *not*

It is not the product, and it is not the kernel. It is the **workbench** — the running stack
the product is built on. Its output is a working environment and a one-page "how to run it",
not a feature.

### The platform is deployed, and reachable from outside this network

**Owner's requirement, given 2026-10-05** — his words: *"No need to do it now, but take note."* He then
approved preparing it: *"this way you have environment fully ready to update and test as you proceed
with development."*

- The **main platform is deployed inside the WAN / hosting VM** and is reachable **from outside this
  machine and outside this network** — proven end-to-end from the public internet, not assumed. The
  evidence and the operating commands are in
  [`RUNBOOK-deploying-a-site.md`](RUNBOOK-deploying-a-site.md) §10.
- It currently answers on an **ephemeral Cloudflare quick tunnel**. The owner **sets the domain names
  himself** — "a couple later today" — and moving onto one is a single command (`set-host.sh`).
- **People in other countries will check and test it.** The path therefore had to work from the public
  internet, which is a different requirement from Sprint 0's, which is deliberately loopback-only
  (item 4 above). Sprint 0's boundary is unchanged and intact: the VM's app publishes on `127.0.0.1`
  only, and the proxy reaches it over the docker network rather than a published port.
- **Status: deployed and proven; not yet on the owner's own domain.** The only thing still missing is
  his domain plus a Cloudflare tunnel token. Nothing else is waiting on us.
- **One known limitation, measured rather than guessed:** the application cannot see the visitor's IP
  address. Traefik replaces `X-Forwarded-For` with the docker bridge gateway, and the app's rate limiter
  reads only that header — so the per-IP login limit is shared by every visitor. The real address does
  arrive, in `CF-Connecting-Ip`, which the limiter does not read. See §10.

**Why it was worth recording at the time.** Sprint 0's definition of done stops at "reachable on
localhost; no service exposed to the LAN". A domain-reachable deployment is the next boundary after it,
and it is where the compose file's `DEPLOY_ENV` branch stops being a claim and gets exercised for real —
which is exactly what happened: `DEPLOY_ENV=wan` now names the image tag, the containers, the volumes
and the docker network. The related WordPress-and-subdomain request (**item 12**) is separate and still
to be discussed — the owner wants **directory-based hosting**, not WordPress-as-Docker: he adds the
domain, creates a directory, uploads his own backup into it, imports the database through phpMyAdmin,
then tests.

---

## 6. Decisions taken — 2026-10-04

The owner answered the questions this document raised. **These are settled, and the plan obeys
them.**

| # | Question | Decision |
|---|---|---|
| **A1** | Which agent runtime fills the slot? | **Hermes** — confirmed. **OpenCode is removed from the stack**, because two agent runtimes is exactly the "second copy of something we already run" the analysis forbids (DB-10). *The removal is a Sprint 0 step, done after confirming nothing else depends on it.* |
| **A2** | Which model does the local server run first? | A **small instruction model (about 7–8 billion parameters)**. Sprint 0 tests that the pipes connect, not the quality of the answers. |
| **A3** | How much of the laptop can the stack use? | Assume **16 GB RAM minimum**; the model server may use up to about **half**. On less RAM, a smaller model and slower answers. |

**A3 — resolved 2026-10-04.** The 16 GB figure was an **assumption**; the owner confirmed the target
machine (`BIXMASERVER`, a Dell Precision 7510) and it measures **32 GB** (2 × 16 GB — see
[`README.md`](README.md)). So **A3's 16 GB stands as a conservative floor** — the stack must still run
on a 16 GB machine — but **on this machine the model server may use up to about half of 32 GB**, which
allows a larger model than a 16 GB floor would. The model choice (**A2**) can be sized accordingly.

**Why Hermes is the right runtime — the basis for certainty.** This was not a preference. The
140-requirement map (batch 9) measured it: **Hermes covers 10 requirements fully, conflicts on
3, and is *missing on none*; the platform is missing 64.** Hermes *is* the agent runtime — it
ships the agent loop, tools, skills, sessions, subagents, 38 model providers and 34 channel
adapters, all running. Building any of that ourselves would be rebuilding a tested system
(DB-04, DB-05, DB-10). **The certainty is the measurement, not an opinion.**

**OpenCode removal — the check, and its result (2026-10-04).** OpenCode currently sits in the
agent-runtime slot. The check was: grep the compose and env for `OPENCODE_*` references, and confirm
nothing else depends on it. **The check failed — something does depend on it.** The platform's own
AI Assistant chat is built on OpenCode: `api/chat/route.ts` imports `createOpenCodeClient` /
`opencode-handlers`, and `opencode-handlers.ts` calls `OPENCODE_URL`
(`http://localhost:4096`); `api/health` uses `handleOpenCodeHealth`. So the rule applies — *if
anything depends on it, it stays* — **OpenCode stays and is NOT removed in Sprint 0.** Removing it
requires first **rewiring the platform chat to the app's own LLM registry**
(`model-factory.ts` + `llm-provider-registry` already exist), which is a code migration, not a
compose edit. Tracked as **N-8** in [`BACKLOG.md`](BACKLOG.md). See blocker **B-05**.

*(The legacy `OPENCODE_*` **env vars** are a separate thing — only back-compat aliases for the LLM
provider, per `model-factory.ts`. Those can be dropped independently of the service.)*

---

## 7. What is still open

Nothing in this document. The remaining open items for the owner live in the **backlog**
([`BACKLOG.md`](BACKLOG.md), *waiting on the owner*) — chiefly the object list, which the
Business Model Kernel specification settles.
