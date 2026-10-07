# platform_points.md — every point that must be in the platform, as micro one-liners

**Written:** 2026-10-07 (project health & quality assessment round)
**Asked by:** the owner —
> *"create a checklist called platform_points.md where you list everything that needs to be in the
> platform, not with details but as micro broken down oneliners."*

**What this is.** The **master point list** — the union of every source that says what the platform must
contain: the vision (`library/ai/ai-first/`), the module register
([`CORE-MODULES-REGISTER.md`](CORE-MODULES-REGISTER.md)), the boundary
([`CORE-BOUNDARY.md`](CORE-BOUNDARY.md)), the blueprint gaps
([`BLUEPRINT-GAP-ANALYSIS.md`](BLUEPRINT-GAP-ANALYSIS.md)), the Hermes design
([`ARCHITECTURE-hermes-integration.md`](ARCHITECTURE-hermes-integration.md) +
[`ARCHITECTURE-hermes-service-map.md`](ARCHITECTURE-hermes-service-map.md)), the agent half
([`AGENT-HALF.md`](AGENT-HALF.md)), the standards
([`SPECIFICATIONS-DICTIONARY.md`](SPECIFICATIONS-DICTIONARY.md)), and the live plan
([`BACKLOG.md`](BACKLOG.md) + [`BUILD-ORDER.md`](BUILD-ORDER.md)).

**How to read a line.** `- [ ] **ID** — the point *(doc status · ★ Hermes joint)*`. The ID is the
dev-doc id where one exists. **The doc status is what the development documents CLAIM**; it is not
authority. **The checkbox is authority: a box is ticked ONLY when the point (and its prerequisites) was
verified in the code**, per the rule below.

**The tick rule (owner's instruction, 2026-10-07).**
1. A box is ticked **only after the code was read** and the point *and its prerequisites* are done
   properly, with no bug and no further work required elsewhere on the platform.
2. If any of that is false → the box stays **unticked**, and the **development documents are updated**
   (BACKLOG etc.) with what is wrong/missing, and any box the docs ticked for it is **unticked**.
3. A point that a document calls done but the code does not back is the exact failure mode this round
   exists to catch ("it exists" ≠ "it is built").

**Status tags used inline (the docs' claim):** `DONE` · `PART` · `OPEN` · `ABSENT` · `DESIGN`.

**★ Hermes** marks the joint where the point meets the AI runtime (agent run vs wiring), per the service
map's §1 rule: *if a human's request must be understood, it is an agent; if an admin turns a knob, it is
wiring.*

---

## A. THE SUBSTRATE — Ring 1, uncustomisable core (`CORE-BOUNDARY.md` C1–C11)

- [ ] **C1** — Resource envelope: the shape every object shares (id · type · tenant · namespace · version · status · owner · created/updated by · labels · metadata · data) *(OPEN · n/a)*
- [ ] **C2** — Actor & context model: who is acting (human/service/AI/device) and in what context (tenant, org, locale, tz, trace) *(PART — `principal.ts` exists · ★ Hermes: the seam every run crosses)*
- [ ] **C3** — Tenancy & isolation boundary: every row belongs to a tenant and cannot escape it *(DONE in code · ★ Hermes: the tenant is derived, never declared)*
- [ ] **C4** — Authorization engine: the evaluator and grammar (who, does what, on which object, under which conditions) *(PART — resolver in `shadow` · ★ Hermes: S-02 is where a tool call is authorized)*
- [ ] **C5** — Metadata registry & schema conventions: "what exists / who owns it / what depends on it / who can access it" *(OPEN — GAP A · ★ Hermes: how Hermes learns the shape of the business without a DB handle)*
- [ ] **C6** — Command / action contract: input/output schema, permissions, side effects, risk, approval, idempotency *(PART — command bus exists)*
- [ ] **C7** — Event envelope: id · type · version · time · actor · tenant · resource · correlation/causation · payload (CloudEvents-shaped) *(PART — `packages/events` exists, no CloudEvents envelope)*
- [ ] **C8** — Audit contract: every meaningful mutation records who · what · when · before · after · actor_type · request/trace id *(PART — audit exists; actor_type incomplete)*
- [ ] **C9** — Migration & versioning contract: inspectable plan → validate → migrate → verify; independent schema/API/prompt/agent versions *(PART)*
- [ ] **C10** — Localization resolution: fallback chain + formatting contracts (numbers, dates, currency) *(PART — GAP C)*
- [ ] **C11** — Error model: code · message · details · field_errors · retryable · request/trace id *(OPEN)*
- [ ] **Ring-1 enforcement** — no config key for core; migration contract is the only door; guard refuses structural change to core objects; a test asserts the core contracts hold *(OPEN)*

---

## B. THE PLATFORM SKELETON — the `P1`–`P18` register

- [ ] **P1 Identity & accounts** — users · sessions · password reset · consent · login *(DONE — the strongest module)*
- [ ] **P2 Tenancy & org structure** — tenants · organisations · hierarchy · scoping *(DONE)*
- [ ] **P3 Roles & permissions (RBAC/ACL)** — roles · grants · feature gates *(PART — the two-table ACL is real; no permissions catalogue = SD-1)*
- [ ] **P4 Audit & compliance log** — who did what, when, to which record; retention/export policy *(PART — read+create API, one viewer page)*
- [ ] **P5 Settings / configuration** — instance- and tenant-level settings *(DONE — `module_configs`; hosts the tier setting)*
- [ ] **P6 File / document storage** — attachments · partitions · storage backends *(DONE)*
- [ ] **P7 Notifications** — in-app + email + push, templates *(PART — templates are code-defined, not user-editable)*
- [ ] **P8 Workflow / automation engine** — definitions · instances · steps · user tasks *(DONE)*
- [ ] **P9 Business rules engine** — declarative conditions → actions *(DONE)*
- [ ] **P10 Search / indexing** — full-text + vector index over data *(PART — strong engine, thin UI, `aclFeatures` covers 6 of 67 tables)*
- [ ] **P11 Integrations & sync** — external systems · credentials · mapping · cursors *(PART — `integrations` API read+update only)*
- [ ] **P12 API keys / programmatic access** — machine auth *(PART — one composite route file)*
- [ ] **P13 i18n / localisation** — translation catalogue · locales *(PART — single-route API, one UI page)*
- [ ] **P14 Feature flags** — gradual rollout · kill switches *(DONE)*
- [ ] **P15 Dashboards / widgets / perspectives** — configurable views over data *(PART — tables+APIs exist, ZERO UI pages)*
- [ ] **P16 Custom fields / entity extension** — user-defined tables and columns *(DONE — the expandable-platform core)*
- [ ] **P17 Background jobs / scheduler** — workers · queues · schedules *(PART — service+API, no UI)*
- [ ] **P18 Guard / mutation policy engine** — the gate every write passes *(DONE — D0 fixed; D2-wide enabled-complete; D2-gap 0)*

---

## C. THE AI-FIRST NATIVE LAYER — the loop that makes this not "an ERP with AI"

- [x] **P0-spec** — The Business Model Kernel specification (the vision's gate, RQ-140): one canonical object list + the 21-item object contract + the classification taxonomy *(DONE draft 2 — ratification only)*
- [x] **G-01** — Business Model Kernel: canonical, versioned, typed model *above* the DB, as a view over declarations *(DONE)*
- [x] **G-08** — Relationship fabric: relationships first-class, with declared attributes and collision reporting *(DONE with G-01)*
- [x] **G-02** — Business IR: the typed read (`BusinessQueryIR`) and write (`BusinessCommandIR`) shapes the AI produces *(DONE)*
- [x] **G-02** — IR compiler: turns a read IR into a real query; scope injected fail-closed; never a silent compile *(DONE)*
- [x] **G-17** — Schema-constrained generation: the AI *emits* the Business IR (the missing front half) *(DONE + measured live · ★ Hermes: the first real joint, §4.2 — the live chat-route rewire is a separate point, **N-8**)*
- [x] **G-03** — User Functions: a validated, reusable operation created with AI, executable without AI *(DONE)*
- [x] **G-03** — Function lifecycle: eight states as an enforced state machine *(DONE)*
- [x] **G-03** — Zero-AI execution: a published Function never calls a model at run time *(DONE — proven by import-graph test)*
- [x] **G-03** — Function verify gate (`verifyFunction`): objective checks by calling the compiler, not re-implementing *(DONE)*
- [x] **G-07** — Widget contract / Widget IR / registry: typed inputs/outputs/actions/events, semantic IR *(DONE)*
- [x] **G-07** — Function→Widget placement: a published Function runs from the Widget's inputs with no AI *(DONE)*
- [x] **G-21** — Request-outcome taxonomy: `ephemeral_answer` · `model_proposal` · `function_candidate` *(DONE)*
- [x] **G-21** — Triage: pure decision of which ending a prompt gets; can propose, never perform *(DONE)*
- [x] **G-21** — Save gate: asks `verifyFunction`; surfaces `notChecked` even on success *(DONE)*
- [ ] **G-21** — The schema-mutation IR kind (outcome 2 waits on this) *(OPEN)*
- [ ] **G-09** — `@`/`#` reference and resolution layer *(OPEN — startable)*
- [ ] **G-10** — Dependency tracking + change propagation *(OPEN — startable)*
- [ ] **G-19** — A proprietary ERP benchmark *(OPEN)*
- [ ] **G-20** — Freshness, lineage and continuous linting *(OPEN)*
- [ ] **G-12** — Business backup and restore *(OPEN — the safety net)*
- [ ] **Vision** — Business Model Kernel object list: Tenant · Organization · LegalEntity · User · Agent · Role · Permission · Module · Capability · Entity · Field · ValueObject · Enum · Relationship · Metric · Rule · Constraint · Command · Workflow · Policy · Event · Projection · View · Document · Knowledge · Skill · Tool · Integration · Function · Migration · Version · AuditRecord · Dependency *(PART — spec defines 31 objects + 4 contracts)*
- [ ] **Vision** — Core data vs capability data: one coherent business universe, no database islands *(PART — kernel + relationship fabric begin it)*
- [ ] **Vision** — Schema compiler: canonical model → database + API + UI + AI semantics + MCP + skills + docs + tests *(OPEN — pieces exist, no single compiler)*

---

## D. HERMES — the agent runtime and its joints (`ARCHITECTURE-hermes-integration.md` / service map)

- [x] **B-05** — The runtime boundary decided: Hermes as a supervised private Python runtime behind one internal typed port; headless *(DONE — decided 2026-10-05)*
- [ ] **Port** — The typed port (`describeCapabilities` · `startRun` · `streamRun` · `cancelRun` · `steerRun` · `resumeConversation` · `resolveToolCall` · `completeRun`) *(OPEN — not built · ★ Hermes: the only door)*
- [ ] **Port** — The admitted envelope: server-minted immutable identity, secret *references*, distinct run/transcript/memory/room/task ids *(OPEN)*
- [ ] **Port** — Failure is normal: `cancelRun` bounded+idempotent, `completeRun` replay-safe, unknown provider stays unknown *(OPEN)*
- [ ] **N-8** — Displace OpenCode: build the port, move the chat route onto it, *then* delete OpenCode *(OPEN — rewire first, delete second)*
- [ ] **Hermes id** — `ai_worker` principal derived server-side; `derivePrincipal`/`aiWorkerSubject`; no branch on `kind` in own files *(PART — seam built, must extend + enforce)*
- [ ] **AH-1** — The five agent kinds (`personal` · `role` · `context` · `independent` · `system`) on the agent definition *(OPEN)*
- [ ] **Tool door** — One door only: `in-process-client` + tool-registry/executor/mcp-adapter; every call re-authorizes; no direct DB handle *(PART)*
- [ ] **S-02** — Tool-call authorization at execution time, deny-by-default, responsible-user intersection *(OPEN · ★ Hermes: where a tool call is allowed or denied)*
- [ ] **G-06** — AI input/output guards + the context firewall (prompt-injection + exfiltration defence) *(OPEN)*
- [ ] **Provider** — Provider choice and fallback: Hermes may fall back; the allowlist and local/cloud rule stay ours *(PART)*
- [ ] **Sessions** — Session continuity as a *projection* keyed by our ids; our conversation records stay canonical *(PART)*
- [ ] **Memory** — Long-lived tenant-scoped memory artifact with consent, export, retention, deletion *(MISSING)*
- [ ] **AH-9** — Governed skills catalog: provenance · scan · version · approve · pin · roll back · revoke *(MISSING · ★ Hermes: "Hermes learns as you go")*
- [ ] **Subagents** — Bounded child runs with budgets, deadlines, cancellation and a trace *(MISSING)*
- [ ] **Channels** — Channels and rooms: our workspace/room objects own identity; Hermes channels are adapters, never a second inbox *(PART)*
- [ ] **Runtime state** — Isolated per tenant and agent; export, backup, delete, retention; disposable *(MISSING)*
- [ ] **Scheduling** — Our scheduler owns every business job; Hermes cron runs runtime chores only *(PART)*
- [ ] **Sandbox** — Disposable, quota-bounded, network-policed worker for terminal/browser/code/filesystem *(PART — highest risk)*
- [ ] **Phase 0** — Pin the Hermes source digest + a compatibility harness *(OPEN)*
- [ ] **Phase 0** — State the licence position, including optional components *(OPEN — V-09 gates adoption)*
- [ ] **Never 1** — A model-widened grant *(invariant)*
- [ ] **Never 2** — A secret in a prompt, a log or an instruction *(invariant)*
- [ ] **Never 3** — A business mutation outside the typed command path and its approval *(invariant)*
- [ ] **Never 4** — A second identity plane (no Hermes account/dashboard/pairing becomes a way to be someone) *(invariant)*

---

## E. THE AGENT HALF — `AH-1`–`AH-12` (`AGENT-HALF.md`)

- [ ] **AH-1** — The agent as a kernel object: `kind` · `owner` · `actsAs` · `role` · `runtime` binding · `autonomy` *(OPEN — the only agent item on the critical path)*
- [ ] **AH-2** — The responsibility rule: autonomy per action class on the `A0`–`A5` gates; the accountable party is always a person *(OPEN — needs G-04)*
- [ ] **AH-3** — Durable wake queue: every trigger is a database row, not an in-memory timer *(OPEN — needs S-05)*
- [ ] **AH-4** — Routines produce work items: schedule → task → wake *(OPEN — needs AH-3)*
- [ ] **AH-5** — The room: a first-class shared space with participants, agenda, lifecycle, speaker-labelled log *(OPEN)*
- [ ] **AH-6** — Mentions / participants: pull an agent in without assigning work *(OPEN — needs AH-5)*
- [ ] **AH-7** — Hire / fire as a product operation, not an ops script *(OPEN — needs AH-1)*
- [ ] **AH-8** — MCP governance: narrowest-first precedence, changed-tool quarantine, argument-bound approvals *(OPEN — needs G-04)*
- [ ] **AH-9** — Skills: description-indexed, on-demand, derived trust level *(OPEN — needs AH-1)*
- [ ] **AH-10** — System agents: admin-created cron/backup/cleanup workers *(OPEN — needs G-12, G-18)*
- [ ] **AH-11** — ESTOP wired to our own pause: one sentinel file, fails safe on corruption *(OPEN)*
- [ ] **AH-12** — The warm-session acceptance test *(OPEN — needs AH-5)*
- [ ] **N-15** — Draw the orchestration boundary (our scheduler vs "a second orchestration system") **before AH-3** *(OPEN — a decision first)*
- [ ] **N-16** — The self-modification gate: an agent's proposal to change how it works → diff, accept, apply in a separate run *(OPEN)*
- [ ] **N-17** — The memory control plane: a policy over several memory providers *(OPEN)*
- [ ] **N-18** — The plugin capability model: decide whether third parties may ever extend Companai *(OPEN — a decision)*
- [ ] **N-19** — Read side-effects are not attributable to the AI *(OPEN — lands with the authority layer + tool-call recording)*

---

## F. THE MODEL LAYER — `ML-1`–`ML-4` (`ARCHITECTURE-model-server-integration.md`)

- [ ] **ML-1** — The deployment model record + hardware profile ("which model runs here, and what fits?") *(OPEN)*
- [ ] **ML-2** — The growable model catalog: registered models as data, not code *(OPEN)*
- [ ] **ML-3** — The platform-driven model swap: update record, fetch file, restart the `model` service *(OPEN — a swap is a restart)*
- [ ] **ML-4** — Budgets and per-tenant quotas (blocks admission + pauses scope; a mid-run kill is separate/best-effort) *(OPEN)*
- [ ] **Model** — llama.cpp as one preset entry in the control plane *(OPEN — no llama.cpp preset today)*
- [ ] **Model** — The `--jinja` flag on the model server (without it `llama-server` ignores `tools`) *(OPEN)*
- [ ] **Model** — The MCP service given `OPENAI_BASE_URL` (the embedding lane calls OpenAI with the placeholder key) *(OPEN — B-16)*
- [ ] **Model** — The embedding lane's missing seam (`openai-compatible` provider + a real `EmbeddingProviderId` member) *(OPEN)*
- [ ] **Model** — The embedding model choice (which GGUF + its dimension — a data migration, not a setting) *(OPEN)*
- [ ] **Model** — The Model Policy Layer (Mode A Hermes-managed · B policy-managed · C hybrid) *(DESIGN)*
- [ ] **Model** — Separate model capability from model identity; a capability declaration *(OPEN)*
- [ ] **Model** — Never silently change the model behind a deterministic Function *(OPEN)*
- [ ] **Model** — Escalation / router output: when to escalate to a bigger or cloud model *(DESIGN)*
- [ ] **Item 13** — Per-tenant model policy as the destination; cloud-first as the interim *(DONE — decided 2026-10-05)*

---

## G. THE GOVERNANCE & SECURITY FLOOR — the `S1`–`S12` standards and the `G-`/`SD-`/`D` items

- [ ] **S1** — Every architectural change is gated and inspected before it is applied *(PART)*
- [ ] **SD-1 / S2** — Every architectural change answers the permissions question: the permissions catalogue + fail-closed gate *(OPEN — the owner's "critical" standard)*
- [ ] **S3** — The platform tells the user when access is refused *(OPEN)*
- [ ] **S4** — Data is the gate, not the screen *(PART — scope is tenant + org only today)*
- [ ] **S5** — One permission engine, never a second one *(PART)*
- [ ] **S6** — Every model a job uses is declared *(OPEN)*
- [ ] **S7** — Chat is a legitimate unclassified state *(DONE with G-21)*
- [ ] **S8** — The platform notices and suggests, and never acts without asking *(OPEN)*
- [ ] **SD-2 / S9** — Core functions ship by default and cannot be deleted *(OPEN — startable)*
- [ ] **S10** — Every standard has a home in code, and drift is a defect *(PART)*
- [ ] **S11** — Structural permissions are explicit, per object and per verb, and inherited by default *(OPEN)*
- [ ] **S12** — The actor type is part of every structural decision *(OPEN)*
- [ ] **S-01** — The product-half spine item (see `analysis/findings/12-development-plan.md`) *(status carried in the plan)*
- [ ] **S-02** — Wire the resolver as the enforcement point (the responsible-user intersection; fail closed or do not ship) *(OPEN)*
- [ ] **S-04** — Skills as a first-class product object *(OPEN — held; see AH-9)*
- [ ] **S-05** — The item `AH-3` (durable wake queue) depends on *(OPEN)*
- [ ] **22** — Bulk approval with a diff; **the diff is the feature** *(OPEN)*
- [ ] **23** — Deputy cover and standing approvals *(OPEN)*
- [ ] **15b** — Budget as a ceiling, not just a meter *(OPEN)*
- [ ] **21c** — A lock control on each record's own screen *(OPEN — the largest, per-entity work)*
- [ ] **24b** — A screen for the two per-tenant authority settings *(OPEN)*
- [ ] **G-04** — The data-axis authorization layer ("may this actor read this row, for this purpose?") *(OPEN)*
- [ ] **G-05** — Classification metadata on entities and fields (personal/secret/regulated) *(OPEN)*
- [ ] **G-13** — Aggregation / inference controls (the risk an agent learns what no single read revealed) *(OPEN)*
- [ ] **G-14** — Break-glass and separation of duties *(OPEN)*
- [ ] **G-15** — PostgreSQL Row-Level Security as the tenant-isolation backstop *(OPEN)*
- [ ] **G-16** — A security-event taxonomy (where a run's denials/escalations/tool calls land) *(OPEN)*
- [ ] **G-18** — The scheduler enforcement gate (one scheduler owns business jobs) *(OPEN)*
- [x] **D0** — The generated guard registry delivers guards *(DONE — fixed + mutation-proven)*
- [x] **D1** — The tier mapping / defaults / fallbacks are a superadmin setting *(DONE)*
- [x] **SD-3** — The tier mapping is a setting, seeded, failing closed *(DONE)*
- [x] **D2-wide** — Retire the deprecated guard resolver — every enabled module *(DONE — 106 parked sites recorded)*
- [x] **D2-gap** — Write routes that call no guard: 0 unguarded *(DONE — sweep complete)*
- [x] **D2-gap** — The write-performing-GET class *(DONE — 1 fixed, 2 set aside as read side-effects)*
- [ ] **SD-6** — The two read side-effect GETs: set aside or wire — to be revisited *(OPEN — recorded, owner-settled 2026-10-07)*
- [ ] **D3** — The `escalate` outcome on the guard result *(OPEN)*
- [ ] **GAP A / C5** — The Metadata Registry service *(OPEN — the last Phase-0 foundation item)*
- [ ] **GAP B** — The true-core vs domain-pack boundary, and the uncustomisable layer, as a contract *(PART — `CORE-BOUNDARY.md` written; not yet a contract in Phase −1)*
- [ ] **GAP D** — Phase −1: twelve architecture contracts before all code *(OPEN)*

---

## H. THE EXPERIENCE CONTRACTS — localization, accessibility, and the screens (`GAP C`, register §2)

- [ ] **GAP C** — The localization contract: fallback chain, plural/interpolation, CLDR *(OPEN)*
- [ ] **GAP C** — RTL/LTR as a first-class layout concern (logical CSS properties, root direction) *(OPEN)*
- [ ] **GAP C** — The accessibility baseline: WCAG 2.2 AA, declared and tested *(OPEN)*
- [ ] **GAP C** — The TZ rule: recurring schedules store the IANA zone, not an offset *(OPEN)*
- [ ] **GAP C** — The 11-dimension component test matrix (blueprint §88) as an automated check *(OPEN)*
- [ ] **P15 / M5** — Dashboard / perspective screens (tables+APIs exist, zero UI) *(OPEN)*
- [ ] **P13** — The i18n management surface (thin API + one page) *(OPEN)*
- [ ] **P7** — Notification templates: decide code-defined vs user-editable *(OPEN — needs the owner only if a template surface is wanted)*
- [ ] **P12** — API keys: complete the routes (one composite file today) *(OPEN)*
- [ ] **P10** — Search gate coverage: extend `aclFeatures` from 6 to all 67 tables *(OPEN — blocks the AI data work)*
- [ ] **P17** — A jobs/scheduler UI *(OPEN)*
- [ ] **G-16b** — The ledger carries `policy_version`/`decision_id` (Doc 8 §118 requires both) *(OPEN)*
- [ ] **Register** — Every module with a `0` in any layer column is a candidate for the "looks built, is not" trap until proven *(standing rule)*

---

## I. THE BUSINESS / DOMAIN PACKS — `B1`–`B14` and the absences `M1`–`M5`

- [ ] **B1 CRM (`customers`)** — leads · contacts · pipeline *(DONE — most complete module)*
- [ ] **B2 Sales (`sales`)** — orders · quotes · invoices · returns · credit memos *(DONE)*
- [ ] **B3 Catalog (`catalog`)** — products · pricing *(DONE)*
- [ ] **B4 Inventory / WMS (`wms`)** — stock · warehouse *(DONE — light unit coverage)*
- [ ] **B5 Finance / accounting** — GL · journal · chart of accounts · AP/AR *(ABSENT — M1 · a build-vs-integrate decision is the owner's)*
- [ ] **B6 Procurement / purchasing** — suppliers · purchase orders · RFQ · goods-receipt *(ABSENT — M2 · needs M1's decision)*
- [ ] **B7 HR / people (`staff`)** — people · teams · leave · time; payroll/benefits absent *(PART)*
- [ ] **B8 Projects / PSA (`planner`)** — availability rules; no project accounting/billing *(PART)*
- [ ] **B9 BI / analytics (`query_index`, `dashboards`)** — engine yes, screens no *(PART)*
- [ ] **B10 Shipping (`shipping_carriers`)** — webhook-driven, minimal UI *(PART)*
- [ ] **B11 Payments (`payment_gateways`)** — gateway transactions + workers, minimal UI *(PART)*
- [ ] **B12 Currencies (`currencies`)** — FX *(DONE)*
- [ ] **B13 Email / messaging (`messages`, `inbox_ops`, `communication_channels`)** — *(DONE)*
- [ ] **B14 Customer portal (`portal`, `customer_accounts`)** — *(PART — `customer_accounts` duplicates `auth`; N-6 says remove, not grow)*
- [ ] **M3** — The permissions catalogue (= SD-1) *(OPEN)*
- [x] **M4** — The generated guard registry (= D0) *(DONE)*
- [ ] **M5** — Dashboard / perspective screens (= P15) *(OPEN)*
- [ ] **N-6** — `customer_accounts` duplicates `auth` — an island to remove *(OPEN)*

---

## J. DEPLOYMENT & OPERATIONS

- [ ] **S0** — The local dockerised trio (platform + Hermes + model server) comes up whole *(DONE — 8 containers healthy)*
- [ ] **Deploy** — The Companai platform deployment (compose project, image, reverse proxy) *(DONE — documented in RUNBOOK-companai-platform.md)*
- [ ] **Deploy** — The running image predates the guard sweep — a redeploy ships the fixes *(OPEN)*
- [ ] **Hermes svc** — The `hermes` service needs a healthcheck (a wedged runtime is invisible today) *(OPEN)*
- [ ] **Blueprint App. B** — The twenty non-negotiable design rules adopted *(PART — most ALIGNED, some GAPs)*
- [ ] **Observability** — Trace/context envelope crossing every execution boundary *(OPEN)*
- [ ] **Versioning** — API and event contracts versioned *(PART)*
- [ ] **Item 20** — Deploy on a real Plesk VPS *(DEFERRED — owner said "not now")*
- [ ] **Item 25** — Ledger Tier 2, signed checkpoints *(DEFERRED — a customer's-auditor feature)*
- [ ] **Item 26** — `domain_mappings` extraction *(DEFERRED — nothing needs it)*
- [ ] **Item 27** — Dashboard widgets of our own *(DEFERRED — the start page is empty by design)*
- [ ] **Item 29** — The integration control plane *(DEFERRED — 220–380 person-weeks; post-hosting)*
- [ ] **Item 11** — Native Arabic review *(DEFERRED — before shipping `ar` as a supported locale)*
- [ ] **Item C** — A lawyer on the privacy/terms before commercial use *(OPEN — needs the owner)*

---

## K. WHAT THE DEVELOPMENT DOCUMENTS ADD BEYOND THE ABOVE (the "vision upgraded as we go" set)

*Points the dev docs hold that a pure module/vision reading would miss. Kept so the checklist is the true
union.*

- [ ] **N-1** — Each phase's named tests must be written when that phase starts *(OPEN)*
- [ ] **N-2** — The vocabulary register: four word-collisions (Capability, delegation, project, widget) *(OPEN)*
- [ ] **N-3** — `where_we_left.md` is stale (predates the analysis programme) *(OPEN — hygiene)*
- [ ] **N-4** — `workspace/PROGRESS.md` has three overlapping views that disagree *(OPEN — superseded by the backlog)*
- [ ] **N-5** — The `S-02` five missing inputs to the resolver are read but supplied by nothing *(OPEN)*
- [ ] **N-7** — The `V`-register HOLDs each need a review before use *(OPEN)*
- [ ] **N-11** — The host cannot run the codebase natively (no Node 24 / yarn) — the container is the path *(recorded)*
- [ ] **N-16 / N-17 / N-18 / N-19** — the Paperclip-pass items (self-modification gate · memory control plane · plugin model · read side-effect attribution) *(OPEN — see §E)*
- [ ] **Paperclip** — The four "do not build" classes (tasks-as-only-communication, opaque model jsonb, generic event→agent engine, shell-script hire path) *(DECIDED AGAINST)*
- [ ] **Agent-half exclusions** — The 14 REJECT and 4 NOT-AN-ISSUE lessons *(DECIDED)*
- [ ] **V-04** — Adopt Hermes's ops console beside our UI? *(OPEN — needs the owner; Hermes stays headless)*
- [ ] **V-09 · V-10 · V-11 · V-12 · V-13 · S-04** — the 7 `V`-HOLDs, each with a trigger *(HELD)*

---

## L. VERIFICATION RECORD — what was checked in the code this round (2026-10-07)

**A tick means: the code was read/run this round and the point holds.** An unticked box tagged `DONE`
means *the docs claim done, but this round did not re-verify it* — treat it as carried, not confirmed.

**Verified in code (ticked):**

| Point(s) | How it was verified | Result |
|---|---|---|
| `G-01` `G-08` | ran `packages/shared/src/lib/kernel` | **5 suites / 51 tests pass** |
| `G-02` `G-03` | ran `business-ir` + `user-function` (incl. the zero-AI `no-llm` test and the live smoke test) | **13 suites / 217 tests pass** |
| `G-07` `G-21` `SD-3` `D1` | ran `business-widget` + `request-outcome` | **10 suites / 130 tests pass** |
| `G-17` | the live IR smoke test ran inside the `business-ir` suite | **pass** |
| `D0` | read `apps/mercato/.mercato/generated/guards.generated.ts` (**non-empty**: `entities`, 2 guards) + ran the registry test | **13 tests pass** |
| `D2-wide` | the tool reports `D` (deprecated) **= 0 for every enabled module** | **complete** |
| `D2-gap` | ran `node analysis/d2-gap/measure.js` (**256 write verbs, 0 unguarded**) + the `attachments`/`workflows` proof suites | **35 tests pass; 0 unguarded** |
| `M4` | same as `D0` | **done** |
| `B-05` | read `AGENT-HALF.md` §1.5 + the integration doc §11 (owner-approved 2026-10-05) | **decided** |
| `P0-spec` | the spec document exists (`SPEC-business-model-kernel.md`, draft 2) | **done (ratification only)** |

**Whole-package run (the broad check).** The **full `shared` package suite** was run: **194 suites, 2264
tests**. Result: **193 suites / 2256 tests pass**; **1 suite / 8 tests fail** — and that one is an
**environment artifact, not a code defect**. The failing suite is
`shared/src/lib/bootstrap/__tests__/dynamicLoader.tsconfig.test.ts`; its `afterAll` calls
`fs.rmSync(appRoot, { recursive: true, force: true })` on temp fixtures, and the **WorkBuddy sandbox's
safe-delete shim** (`node-safe-delete-shim.cjs` → `checkBulkDeleteGuard` → `tryTrash` /
`SAFE_DELETE_BULK_CONFIRM_REQUIRED`) intercepts it. **Proved by the differential:** the suite **fails 8/8
under the sandbox** (both alone and in the full run) and **passes 8/8 with the sandbox bypassed** — the
only variable is the delete shim. So the shared layer is **green modulo the sandbox**.

**Verified OPEN / PART (unticked, and confirmed):**

| Point | Verified in code | Result |
|---|---|---|
| The Hermes port | `api/chat/route.ts` still imports `createOpenCodeClient` / `opencode-handlers`; `opencode-handlers.ts:178` reads `OPENCODE_URL` | **NOT built — OpenCode still occupies the slot (N-8 accurate)** |
| Hermes id seam | `principal.ts` exports `aiWorkerSubject` / `derivePrincipal` / `PrincipalKind` (`human·ai_worker·service·system`) | **seam is real (PART)** |

**Not re-verified this round (carried — flagged, not confirmed):**

- The `CORE-MODULES-REGISTER.md` **COMPLETE** verdicts for the platform modules (`P1`–`P18`) and the
  business modules (`B1`–`B14`). The register's own rule stands: a module with a `0` in any layer column
  is a candidate for the "looks built, is not" trap until re-measured. **These carry forward as claims.**
- `S0` (the docker stack). Not re-run this round; the docs report 8 containers healthy.

**Documentation defects found this round (and fixed):**

- **The Hermes service map carried a STALE `D2-gap` figure** — it read **"50 unguarded"** in two live
  places (§4.1's `D2-gap` row and §13) plus a stale per-module list (`search` 7, `webhooks` 7). The tool
  reads **0**. **FIXED** in `ARCHITECTURE-hermes-service-map.md` this round. *(This matters because the
  service map is the named "starting thread in any task development".)*
- **`STATE-OF-PLAY-2026-10-07.md` §4 carried a SECOND stale figure** — a live (non-superseded) line said
  the tool "reads **41 unguarded**, not 50". The tool reads **0**. **FIXED** this round (the line is now
  marked as a superseded snapshot and points at the live figure). *(Two documents, two stale copies of
  one count — which is exactly the N-20 lesson.)*
- **The analysis lineage the owner asked about** — the "what to rewrite/reactivate from Mercato" analysis
  and the blueprint study did land, but in **three** documents, not one: `CORE-MODULES-REGISTER.md`
  (the P/B register + the M1–M5 absences + the build tiers), `CORE-BOUNDARY.md` (the three rings and the
  uncustomisable core), and `BLUEPRINT-GAP-ANALYSIS.md` (the four blueprint gaps A–D). The backlog
  carries them as the "core-module gaps" section. **This checklist is now the single index over all
  three.**

**Code/tool defect found this round (and fixed):**

- **The `D2-gap` tool could not resolve app-local modules** (`from: '@app'`, under
  `apps/mercato/src/modules/`), so it printed `(no source dir found: ratelimit_probe)` and its
  "35 enabled modules" headline actually covered **34**. **FIXED** this round: `resolveModuleDir` now
  also searches the app-local dir, and the one such default-enabled module (`ratelimit_probe` — a
  test-only probe whose `POST` returns `{ ok: true }` and writes nothing) is classified **out of
  scope**: resolved and reported, not counted, so the write-verb total stays **256** and "all 35" is
  true. *(Found by the hostile-critic pass; the tool reports the exclusion on its own line.)*

---

*If this file disagrees with the code, the code wins and this file is broken — fix it.*
