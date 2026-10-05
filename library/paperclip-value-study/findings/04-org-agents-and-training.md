# Findings 04 — The org, the agents, and training them

**Covers batches 6 and 7:** the org chart, agents, teams and portability; and skills, Skill Studio,
evals, skill version history and performance reviews.

**The one-line result.** Two ideas here are genuinely ours to take, and one warning is sharp: **their
own portability feature can leak a secret**, and they say so. The training pillar (skills, evals,
reviews) is largely *not* for us yet, but its **versioning mechanic** lands on `AH-9`.

---

## 1. A portable package format with a vendor sidecar — **IDEA**

**What it is.** A company (its agents, skills, projects, routines) exports as a **vendor-neutral,
markdown-first** package — `agentcompanies/v1-draft` — plus a **`.paperclip.yaml` sidecar** that carries
the vendor-only fidelity. Another tool can read the base format and ignore the sidecar.

**Evidence.** `docs/companies/companies-spec.md:5` (the format and version), `:26-36` (markdown is
canonical, the sidecar is vendor-specific), `:417-442` (the sidecar). Export/import is one 6,446-line
service, `server/src/services/company-portability.ts` (`:4695-4717` export; `:4820-5193` import preview).

**What we have.** Our vision has company templates, and our Business Model Kernel is a **view over the
platform's own declarations** (G-01) with an export/import round-trip. So we already have the *shape* of
"a company is portable data".

**What is new: the split.** Markdown as the canonical, tool-neutral layer, with **one vendor file beside
it** for what only we understand. That is a way to make a Companai company **readable by other tools**
without giving up our own semantics — and it is the opposite of our current instinct, which is to keep
everything in the kernel.

**Verdict: IDEA.** Worth a design note, not a build. It only pays off if we want third parties to read
our company packages.

---

## 2. Their portability feature can leak a secret, and they admit it — **WARN**

**What it is.** Export **drops the whole `env` object** and re-emits it as **declarations**
(`secret_ref` becomes `kind:"secret", defaultValue:""`). That part is right. But whether a value is
treated as sensitive is decided by a **name heuristic** (`isSensitiveEnvKey`), **not by looking at the
value**.

**Evidence.** `server/src/services/company-portability.ts:2262-2275` (the whole `env` is dropped);
`:597-672` (`extractPortableScopedEnvInputs`); `:556-586` (`isSensitiveEnvKey`); `:617-628` (a
`secret_ref` becomes an empty default). The leak is at `:647` and `:665`: a value stored as a plain
string under a key that does **not** match the heuristic is exported **verbatim** as `defaultValue`.
Their own README warns the same way: *"review packages before sharing because plain environment values
and local paths can remain"* (`README.md:321`).

**What we have.** Nothing — we have not built an export.

**Verdict: WARN.** If we ever export a company, **scan the value, not the key name**. This is a
two-line-sounding fix guarding a serious leak, and a name heuristic will always miss the credential
called `URL` or `TOKEN2`.

---

## 3. Collision handling on import — **LEARN**

**What it is.** Importing a package that already exists is a policy, not an accident. The default is
**rename**; a stricter `agent_safe` mode **forbids replace** and refuses to import execution-workspace
policies or non-schedule triggers.

**Evidence.** `company-portability.ts:194` (default `"rename"`), `:1874-1884`
(`uniqueNameBySlug` → "Name 2"), `:4835` (`agent_safe` forbids replace), `:264-301` (what `agent_safe`
refuses).

**Verdict: LEARN.** The pattern — a named collision strategy with a *safer* mode that deliberately loses
fidelity — is the right shape for importing anything.

---

## 4. Org integrity rules — **LEARN**

| Rule | Evidence | Why |
|---|---|---|
| **No reporting cycles** | `server/src/services/agents.ts:463-471` (`assertNoCycle`) | An org chart without this is corruptible in one edit |
| **Terminate revokes the agent's keys** | `agents.ts:1024-1045` | Firing must actually remove access |
| **Remove reassigns the agent's work and nulls `reportsTo`** | `agents.ts:1059-1071` | Deleting a node must not orphan work |
| **Hire is idempotent** | `routes/agents.ts:430-451` (request fingerprint + per-run lock) | A retried hire must not create two agents |

**Verdict: LEARN.** These four are the difference between an org chart that is data and one that is
merely drawn.

---

## 5. Skill versioning by content hash — **LEARN** (lands on AH-9)

**What it is.** A skill is a versioned package whose identity is a **content hash** over its files, and
an update must name the version it expects to replace.

**Evidence.** `server/src/services/skill-snapshot.ts:13-20` (`skillSnapshotHash` over sorted
path+executable+bytes); `server/src/services/company-skills.ts:3618-3672` (`createVersion` advances
`currentVersionId`); `doc/runner-created-skills.md:7-26` (`expectedVersionId` + idempotency key); the
catalog builds a hash over per-file SHA-256 and derives a **trust level** from the file kinds
(`packages/skills-catalog/src/catalog-builder.ts:763-775`).

**What we have.** `AH-9` — *"Skills — description-indexed, loaded on demand, with a **derived** trust
level."*

**Verdict: LEARN.** The `expectedVersionId` optimistic-concurrency rule and the content-hash identity are
exactly what `AH-9` will need, and the "trust level derived from the file kinds" is the mechanism for
the derived trust our item already asks for.

---

## 6. Evals as a matrix, with a fail-closed preflight — **IDEA**

**What it is.** An eval is a **scenario × candidate matrix** with frozen results, and the run refuses to
start if a candidate does not pass preflight.

**Evidence.** `packages/paperclip-eval-kernel/src/index.ts:40-79` (`runPaperclipEvalMatrix` returns
frozen scenario×candidate results with fail-closed candidate preflight); `doc/evals.md:3-19` (two live
families: Runner Evals and Product E2E Evals).

**What we have.** Our specification **defers** "the evaluation benchmark" with a named trigger. Our
vision's "eval" hits are policy evaluation, not agent evaluation.

**Verdict: IDEA.** Not now — but when the deferred benchmark is built, this is the shape: a matrix, not
a script, and a preflight that fails closed.

---

## 7. "Performance review" is one built-in agent, not a feature — **IDEA**

**What it is.** Paperclip's agent-performance-review pillar is a **Reflection Coach** agent plus a
**paused** weekly routine that only emits **proposals**. It cannot change anything itself.

**Evidence.** `server/src/services/built-in-agents.ts:332-402` (the built-in, `defaultStatus: "paused"`,
and the `builtInMutationPolicy` quoted in finding 01 §5);
`server/src/built-ins/agents/reflection-coach/AGENTS.md` and its
`routines/recent-agent-reflection.md`.

**What we have.** Nothing.

**Verdict: IDEA.** The *governance* half is the valuable half and is already finding 01 §5. The
"performance review" framing itself is thin — a paused routine that proposes. Do not build a review
feature; build the gate.

---

## 8. Warnings worth keeping

| Warning | Evidence | Why it matters to us |
|---|---|---|
| **Two advertised features do not exist** | `doc/CLIPHUB.md` is a design doc only (no code references); `docs/companies/companies-spec.md:596` — `companies.sh` is spec text | A product's README is a claim. We measured the code; two features are not there |
| **Agent files sync last-write-wins** | `doc/agent-files.md:133-137` — a run can overwrite a saved edit, with no merge or recovery | If agents and humans edit the same file, say who wins |
| **Over-quota saves are discarded whole** | `doc/agent-files.md:63-73` | A limit that silently drops work is a data-loss bug |
| **`agent_safe` import loses fidelity silently** | `company-portability.ts:264-301` | Safety by omission must be reported, not silent |
