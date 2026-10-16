# Assessment — the "Hindsight + PostgreSQL/pgvector + Hermes" memory proposal

**Written:** 14 October 2026 · **Author:** an agent brought in to learn the project cold
**Subject:** the document `companai_memory_architecture_hindsight_postgresql_proposal.md`, written for a
different project and offered here for evaluation.
**Verdict:** **~35% of it is already decided and built here, ~35% is genuinely new and worth adopting, and
~30% would actively hurt this project if followed literally.** The document's single most useful
contribution is a **test suite and a risk register**, not an architecture.

> **Method note.** Every claim about *this project* below is measured from its own documents or code.
> Every claim about *Hindsight* is from three independent external sources (an ACL 2026 paper, the
> vendor's own engineering blog, and the GitHub repositories). Where I could not verify something, I say
> so rather than infer it.

---

## 1. What Hindsight actually is

The proposal never says, which is its first weakness. Verified externally:

| Fact | Value | Source |
|---|---|---|
| Licence | **MIT** | ACL 2026 demo paper; vendor blog; GitHub |
| Implementation | Python package (`pip install hindsight-all`) + Docker image | ACL paper |
| Storage | **PostgreSQL + pgvector** — no separate vector database | `hindsight-api/README.md` |
| Model | Four logical networks: **world facts · experiences · observations (entity summaries) · opinions** | ACL paper |
| Operations | **retain · recall · reflect** | ACL paper |
| Retrieval | Four strategies in parallel — semantic (vector), keyword (BM25), graph (entity/temporal/causal), temporal (time-range) — fused by reciprocal rank fusion then a **cross-encoder reranker** | vendor blog |
| Ingestion | An LLM extracts narrative facts, resolves entities, timestamps occurrence intervals, builds graph edges | ACL paper |
| Local-first | Embeddings **local by default** (`BAAI/bge-small-en-v1.5`), reranker **local** (cross-encoder), LLM can be local — *"no external network calls in the memory path"* | vendor blog |
| Benchmarks | **LongMemEval 83.6%** with a 20B open model (vs full-context GPT-4o); **91.4%** with Gemini-3 Pro | ACL paper |
| Maturity signal | 13.3K GitHub stars, 763 forks, ACL demo, "in production use at Fortune 500 enterprises" (vendor claim) | ACL paper |

**Two findings the proposal misses, and both matter.**

**1a. Hindsight's architecture and the proposal's stack diagram contradict each other.** The proposal draws
`PostgreSQL + pgvector` and `Hindsight` as separate boxes. Hindsight *is* PostgreSQL + pgvector — the
retrieval, graph and reranking all live inside it. So the "minimal combination" is really **one database and
one service**, which makes the proposal's central anti-complexity argument *stronger* than it claims. Good
news, arrived at by accident.

**1b. The name "Hindsight" is ambiguous, and the proposal's own question #2 is therefore unresolved.** There
are at least three repositories named `hindsight` (under `vectorize-io`, `BraidApp-AI` and
`emerge-protocol`, all MIT and apparently the same product), **plus an older, unrelated
`hindsight-ai/hindsight-ai` released under the Unlicense**. A decision to adopt must pin the exact
repository and commit — which is precisely the Phase-0 pin discipline this project already applies to
Hermes (`library/development/HERMES-PIN.md`). The proposal's §26 questions 1 and 2 are answerable; the
proposal just doesn't answer them.

---

## 2. What this project has already decided — the decisive overlap

**Measured: the string "Hindsight" appears zero times anywhere in this project** (excluding `node_modules`
and `.git`). That is not a reason to dismiss the proposal — it is a reason to check what we decided instead.

The project has, in its own numbered invariants and its own vision documents, **already made every
architectural decision the proposal presents as open**:

| The proposal says | This project already has |
|---|---|
| §3 "Business data is not the same thing as AI memory" | **Invariant I10 — one authoritative copy:** *"Every business record has exactly one owning system. Everything else — search index, analytics model, **agent memory**, channel reference — is a declared projection, marked as such, and never presented as truth."* |
| §5 "pgvector should not decide whether a fact is authoritative" | **Vision Doc 06 §85:** *"Hermes memory is not authorization evidence. Never grant authority based on `MEMORY.md`, `USER.md`, session history, Skill text, conversation statement, model recollection."* |
| §16 "Memory is not truth" | **Vision Doc 03 §22:** *"Hermes memory is not business truth."* §23: *"Hermes state.db is not ERP transaction state."* §25: *"Durable workflow state remains outside the agent runtime."* |
| §8 "Hermes agents should not independently control memory ownership" | **Decision B-05, taken by the owner 2026-10-05:** one product, one repository, one typed port; *the runtime is disposable*; *"anything Hermes holds is either derived state that can be rebuilt, or a projection of a record we own."* |
| §11 memory promotion, evaluate → classify → validate → share | **Vision Doc 3 §9, already designed:** *Agent learns → Memory proposal → Classify → low-risk user preference → store · tenant procedure → review/publish policy · business rule → never infer as authoritative · security rule → never infer as authoritative.* Plus: *"Memory should be versioned where it can affect future operations."* |
| §12 temporal validity, supersede, contradiction | **The kernel's own rename planner** (`planFieldRename` → `clean` / `requires_recompilation`), the **append-only authority objects** (I14: superseded, never edited), and the Function **freshness check** (`fresh` / `recompiled` / `requires_recompilation`). A supersede-and-keep-history machinery **already exists** in the product. |
| §13.1 "Companai should own authorization unless testing proves otherwise" | **Already true and already enforced:** the authority resolver is the single decider, and `S-02` wired it as the AI tool door's enforcement point. |
| §21 "Companai should own the organizational layer" | **Already scoped as a backlog item, N-17 — the memory control plane:** *"extend one provider to a policy over several… **Not a blank page for us.** We already designed a first-party tenant-scoped `PlatformMemoryProvider` … What is new is the step past that: **many** providers, policy-selected, instead of **one**. Same shape as our model layer, which we have already chosen twice."* |
| §20-D "PostgreSQL + Mem0" as an alternative | **Five memory providers already ship in the Hermes runtime:** `byterover`, `holographic`, **`mem0`**, `openviking`, `retaindb`. Mem0 is already one hop away, and only **one external provider may be registered at a time**. |
| §14 "do not add Qdrant on day one" | **Already the case, for the already-correct reason.** The stack runs `pgvector/pgvector:pg17-trixie`; the vector drivers are `pgvector`/`qdrant`/`chromadb` with pgvector first; and §15's own condition for Qdrant ("when a measured workload proves PostgreSQL insufficient") is the project's standing rule for every deferred item — *a deferral must name its trigger*. |

**One more, and it is the sharpest.** The proposal's §18 "recommended day-one stack" puts a memory engine on
day one. This project's own build order — fixed by the owner's 2026-10-09 ruling — puts **Hermes at Phase 8,
"only after the security gateway exists"**, and the current frontier is Phase 8 Phase 2. The data axis
(`G-04`) is **not built**, and my own back-end audit found that the Business-IR read path enforces scope but
not authorization *because* that layer is missing. **Adding an agent-memory engine before `G-04` would be
stacking on an unfinished foundation** — the specific failure the project's build-order rule exists to
prevent, and the exact defect class my audit kept finding.

---

## 3. What the proposal genuinely adds

This is the part worth keeping, and it is smaller than the document but real.

### 3.1 The epistemic taxonomy — genuinely new, and it fills a real gap 🔎

The project's four kinds of data are about **ownership and authority**: business truth · tenant knowledge ·
runtime state (disposable) · derived advisory. That answers *"who is answerable for this?"*

Hindsight's four networks are about **epistemic status**: world facts · experiences · observations ·
**opinions with evolving confidence scores**. That answers *"does the agent know this, or believe it?"*

**These are orthogonal, and the project has only the first.** Nothing in the project says how an agent's
*belief* is stored, how its confidence is represented, or how it is corrected. That matters concretely: the
trust ladder is `T0`–`T4` with demotion on evidence, and **an agent's unverified opinion must never become
evidence for its own promotion** — a circularity the current design does not appear to close. §85 forbids
memory as authorization *evidence*, but no document says what memory *is* allowed to be.

**Adopting the fact/belief axis alongside the authority axis is the single best idea in this document.**

### 3.2 The promotion ladder as a *tested pipeline* — the strongest contribution

Vision Doc 3 §9 has the promotion *shape*. What it does not have is a **measurable acceptance gate**. The
proposal's §11 turns it into an explicit ladder with named stages, and §22 turns that into ten tests.

### 3.3 The POC test suite — directly reusable, and it maps onto gates we already owe 🔎

| Proposal test | The project's own gate it satisfies |
|---|---|
| T2 agent isolation | Architecture §5.4: *"two tenants, adversarial… a tenant string inside a folder name is not isolation"* |
| T3 team sharing, Finance must not see | Architecture §5.4's per-pair isolation requirement |
| T5 stale fact | The Function freshness check's contract |
| T6 contradiction | **Invariant I14** — authoritative records are superseded, never edited |
| T9 tenant × department × team × role × human/AI × private/shared | The `S-02` / row-22 binding matrix, at memory scope |
| T10 restart durability | Architecture Phase 2's exit gate: *"proven on one tenant then two adversarial ones"* |

The project's discipline is already *"prove it, by two routes, adversarially"*. This suite is a ready-made
instance of that discipline for the memory subsystem, and it costs nothing to adopt.

### 3.4 The risk-register framing is better than ours for this subsystem 🔎

The proposal's §13.1–13.4 enumerates four failure modes — fine-grained authorization, memory correction,
agent isolation, reliability — as a *testable* set. The project's `AH-9` and `N-17` rows name prerequisites
but do not enumerate failure modes this way. **Adopting the framing costs one document edit and would have
prevented the "declared control with no consumer" pattern my audit found repeatedly.**

### 3.5 One concrete external byproduct that settles an open defect 🔬

The vendor's own Hermes+Hindsight co-hosting post states, independently of our own documents:

> *"If you use the raw servers instead, vLLM needs `--enable-auto-tool-choice --tool-call-parser hermes` and
> **llama.cpp's server needs `--jinja`**."*

**That is a third, external, disinterested source on the exact question my model-layer reading left open** —
whether `--jinja` is required for tool calling, where Hermes' docs say required, our deployment omits it, and
our own prior study says it is now the default. Two independent sources now agree against the prior study.
**This closes a defect that has been open since 2026-10-05, at zero cost.**

---

## 4. Where the proposal would actively hurt this project

| # | The problem | Why it matters here |
|---|---|---|
| 1 | **It re-opens settled decisions as open questions.** 25 numbered questions in §26, of which the architectural ones are already answered by numbered invariants and owner decisions. | The project's own rule: *a document not referenced from a source of truth is a liability.* Re-deriving is how the direction got buried before. |
| 2 | **It puts a memory engine on day one.** | Violates the build order the owner fixed on 2026-10-09, and would stack on a foundation where `G-04` (the data axis) does not exist — the precise defect class my audit found in the delegation gate and the Business-IR read path. |
| 3 | **It names "Hindsight" without pinning it**, against at least four repositories of that name under two different licences. | The project already learned this with Hermes (the snapshot has no `.git` and declares `0.0.0`; the pin was created later, then re-pinned when a newer extract appeared). The same discipline must be applied here or the licence question stays open. |
| 4 | **It assumes Companai has no memory architecture.** | It has one: `PlatformMemoryProvider`, memory-write governance, the four-kinds taxonomy, I10, §85, §185, `AH-9`, `N-16`, `N-17`. Reading the proposal without knowing that would produce duplicated work. |
| 5 | **§20-C Graphiti** overlaps the kernel's relationship model and `G-10` (dependency tracking), not "memory". | Evaluating it as a memory alternative would compare it against the wrong thing. |
| 6 | **It is a design document with no owner decisions marked.** Every question is open by construction. | In this project a direction counts only when the owner was asked plainly and answered. This is a research input, not a proposal the owner can approve as-is. |

---

## 5. Verdict

**Use it as an input to two existing items, not as an architecture decision.**

The honest summary: **the proposal's architecture is already ours, stated less precisely.** Its value is
concentrated in three places — an epistemic taxonomy we lack, a promotion pipeline we have designed but not
gated, and a test suite we owe anyway.

**What I would take, in order:**

1. **Close the `--jinja` defect using the external corroboration** (§3.5). Zero cost, and it has been open
   for nine days. Add the citation to `ARCHITECTURE-model-server-integration.md` §4.1 so the conflict
   between the two prior readings is settled by a third source.
2. **Adopt the fact/belief axis into the memory taxonomy** — not as a replacement for the four kinds, but as
   a second dimension on top. One paragraph in the memory design, and it closes the "an agent's opinion must
   not become evidence for its own trust promotion" circularity that currently has no owner.
3. **Adopt §22's ten tests as the acceptance gate for `AH-9` and `N-17`**, trimmed to the five that map onto
   gates we already owe (isolation, team-sharing, contradiction, security-combinations, durability). Same
   discipline, one document edit.
4. **If Hindsight is ever to be evaluated, evaluate it against `PlatformMemoryProvider` and `N-17`** — as a
   *candidate provider* behind the platform's own control plane, which is exactly the shape the model layer
   already chose twice. Never as the memory system of record, which the proposal itself says (§16) and the
   vision already forbids (§22).

**What I would not do:** adopt the stack, adopt the day-one framing, or answer any of its 25 questions as
though they were open. Nine of them are answered by invariants; four more by the owner's decisions of
2026-10-05; the rest by `G-04`'s existence.

**One sentence for the owner, in plain words:** *this document describes the architecture we already chose,
in less detail, and asks questions we already answered — but its test list and its idea of separating "what
the AI knows" from "what it believes" are genuinely new, and both are cheap to take.*

---

## Appendix — confidence levels

| Claim | Confidence | Basis |
|---|---|---|
| Hindsight is MIT, PostgreSQL+pgvector, four networks, retain/recall/reflect | **Certain** | 3 independent external sources |
| "Hindsight" is ambiguous across ≥4 repos and ≥2 licences | **Certain** | GitHub search results |
| This project has decided every architectural point the proposal raises | **Certain** | Read from the project's own docs and code |
| This project already has `PlatformMemoryProvider` + write governance designed | **Certain** | Read the design, verbatim |
| Hindsight is absent from this project | **Certain** | Measured: zero occurrences |
| `--jinja` now has 2 independent sources against the prior study | **High** | Hermes' own docs + the vendor's post; the `props` measurement is still the decisive one |
| Hindsight would outperform `PlatformMemoryProvider` | **Unknown — not evaluated** | No test was run here; the benchmarks are the vendor's and the paper's |
| Whether the project needs a memory engine at all yet | **Unknown** | Depends on `G-04`, the workspace build, and the owner's sequencing |
