# OpenRig Study — Batch 02: the aissistant (P1)

**Folder:** `library/architecture/openrig-forensics/` · **Batch 02 of 08** · **Status:** OPEN
**Pole:** **P1 — the aissistant** (the AI user: a versatile, integratable, rich-featured agent)
**What this batch answers:** what *is* an agent in OpenRig — how it is declared, launched,
identified, given skills and context, and how much it is allowed to do. OpenRig's premise is
that **the agent is not OpenRig's** (`ARCHITECTURE.md:15`: *"the agents themselves are
unmodified"*), so this batch is really about **the seam OpenRig builds around someone else's
agent.**

**Rule 5 reminder:** no comparison to our own platform appears in this batch.

**Rule 1 reminder:** every claim was read from source; divergences are in §6.

---

## 1. The one-sentence shape

**An OpenRig agent is a YAML *AgentSpec* (a blueprint) resolved into an *AgentSpec resource
set*, bound to a *seat* (an address), launched by a *runtime adapter* as an unmodified
Claude Code or Codex process inside tmux, with a small allow-listed environment and a
permission posture that is decided on every launch path by one function per harness.**

Six ideas do the work, and this batch reads each from code:

| Idea | The file that owns it | §  |
|---|---|---|
| the runtime adapter contract | `domain/runtime-adapter.ts` | 2 |
| the agent blueprint | `domain/agent-resolver.ts`, `profile-resolver.ts`, `specs/agents/**` | 3 |
| the seat (identity ≠ process) | `domain/seat-*`, `seat-identity-store.ts` | 4 |
| the seat's environment | `domain/seat-launch-environment.ts` | 5 |
| the permission posture | `adapters/yolo-mode.ts`, `domain/permission-policy/**`, `policies/builtin/**` | 6 |
| the skill/context loadout | `domain/skill-catalog.ts`, `skill-discovery.ts` | 7 |

---

## 2. The runtime adapter — the P1 seam, in full

`domain/runtime-adapter.ts` (188 lines) is the **interface every agent runtime must satisfy**.
Its header comment states the contract precisely:

> *"The five-method runtime adapter contract. Adapters own projection, delivery, harness
> launch, reconciliation, and readiness. Startup action execution is NOT part of this
> contract — that belongs to the startup orchestrator after `checkReady()`."*

The six methods (`RuntimeAdapter`):

| Method | What it does |
|---|---|
| `listInstalled(binding)` | what is currently projected for a node |
| `project(plan, binding)` | write skills/guidance/plugins to runtime target locations |
| `deliverStartup(files, binding, sendText?)` | deliver startup files (order, required/optional) |
| `launchHarness(binding, {name, resumeToken?, forkSource?})` | launch/resume/fork the harness inside tmux |
| `checkReady(binding)` | is the harness responsive |
| (`readonly runtime`) | its name |

**Six implementations** (`adapters/*-adapter.ts`): `claude-code` (1,130 lines),
`codex` (1,668 — the largest), `pi`, `omp` (**extends** Pi), `terminal` (**50 lines** — the
smallest, the reference), `stub` (the test double).

### 2.1 The readiness taxonomy — 8 named gate codes

`runtime-adapter.ts` declares **`ATTENTION_REQUIRED_READINESS_CODES`**, a **set of 8 gate
codes** that mean *a seat cannot proceed without a human*:

```
trust_gate · hook_trust_gate · update_gate · login_required ·
mcp_gate · bypass_consent_gate · codex_auth_refusal · codex_client_incompatible
```

> **★ Finding-grade detail:** OpenRig does not model "the agent is blocked" as a string; it
> **names each gate** (`trust_gate`, `bypass_consent_gate`, …) and has a predicate
> `isAttentionRequiredReadinessCode()`. A launch failure is then classified as either
> **`retry_fresh`** or **`attention_required`** (`HarnessLaunchRecovery`), and the
> `attention_required` case carries **`evidence`** (*"the last-N pane lines"*) so the failure
> *"can flow honest evidence through to `RestoreNodeResult`"*. **The agent's blocked states are
> first-class, named, and evidence-bearing.** *(P1 — a mechanism worth naming.)*

### 2.2 The launch result is honest about what it cannot prove

`HarnessLaunchResult` distinguishes `ok: true` (with `resumeToken` *"the NEW post-fork token,
never the parent"*) from `ok: false` (with `recovery`, `evidence`, and `missingConversation`
*"set only when the runtime itself reported that the requested conversation doesn't exist"*).
The comments are explicit about the boundary of knowledge — e.g. `launchedProcess` is *"the
first process the launch's own readiness check pinned as the one it started, kept even when a
later sample saw it replaced (#1077)"*.

**Fork is a first-class launch mode** (`ForkSource`): `kind: "native_id" | "artifact_path" |
"name" | "last"`, with a `pendingIdAllowed` flag *"set only by a seat handover: a launch whose
new id isn't captured yet still succeeds, with the id pending, so the handover can commit the
ready successor."* **A seat can hand its conversation to a successor without losing the
address** — this is the same identity≠process idea, mechanised. *(P1.)*

---

## 3. The agent blueprint — AgentSpec, resolved

### 3.1 What an AgentSpec is (measured from a shipped one)

`packages/daemon/specs/agents/development/implementer/agent.yaml`:

```yaml
name: implementer
version: "1.0"
description: Implementation agent — implements and verifies coherent changes
defaults:
  runtime: claude-code
imports:
  - ref: local:../../shared
profiles:
  default:
    uses:
      skills: [development-team, systematic-debugging, verification-before-completion]
      plugins: [shared:openrig-core]
      runtime_resources: [shared:claude-default-settings, shared:claude-default-mcp,
                          shared:codex-default-config, shared:claude-activity-hooks]
resources:
  guidance: [{ id: role, path: guidance/role.md }]
startup:
  files: [{ path: guidance/role.md, delivery_hint: send_text, required: true }]
  actions: []
```

**An AgentSpec has 5 resource categories** (`ResolvedResources` in `profile-resolver.ts:38`):
`skills · guidance · subagents · plugins · runtimeResources`. It has **`imports`** (composable
specs) and **`profiles`** (named resource selections). The QA spec differs from the
implementer in exactly two visible ways: its `defaults.runtime` is **`codex`** and its skill
list adds `agent-browser, dogfood` — **the same blueprint format spans both harnesses.**

### 3.2 Resolution is real work, and it reports 7 named failure modes

`agent-resolver.ts` resolves a spec through `parseAgentSpec → validateAgentSpec →
normalizeAgentSpec`, returning a **tagged union with 7 explicit failure codes**:

```
not_found · parse_error · validation_failed · version_mismatch ·
import_error (with importRef) · cycle_detected
```

It also emits **`ResourceCollision`** records (*"category, resourceId, sources[]"*) — so when
two imported specs claim the same resource, the resolver **surfaces the collision instead of
silently picking one.** The resolved spec carries a **`hash`** (integrity). *(P1/PZ.)*

### 3.3 Profile resolution = the "what does this seat get" step

`profile-resolver.ts` produces `ResolvedNodeConfig` with `runtime`, `model`, `effort`, `cwd`,
`restorePolicy`, **`compactionStrategy`** (*"resolved continuity mode, most-specific-wins"*),
`mechanic`, `lifecycle`, and `selectedResources`. Skill discovery is **runtime-aware**
(`discoverSkillsForRuntime(..., SkillRuntime)`) — the same skill catalogue serves Claude Code
and Codex, and (per the CHANGELOG section read in the pin) *"Rig-local skill references still
win first"*.

---

## 4. The seat — identity that outlives the process

The seat vocabulary is stated in the README (`:339`): *"a stable role and address … the
conversation occupying it can change while its identity and authored context remain."*
The code backs this with a family of `seat-*` domain files:

| File | Concern |
|---|---|
| `seat-identity-store.ts`, `seat-identity-reconciler.ts` | the stable identity, reconciled |
| `seat-lifecycle-service.ts` | launch / stop / restore |
| `seat-handover-service.ts`, `seat-handover-planner.ts` | handing a seat to a successor |
| `seat-launch-environment.ts` | the environment a seat receives (§5) |
| `seat-delivery-guard.ts` | whether a message may be typed into a seat |
| `seat-attention-reconciler.ts` | the 8 attention gates, reconciled |
| `seat-effort.ts`, `seat-activity-service.ts` | effort level; activity |

**The `seat-delivery-guard` is the P1×P3 hinge** and it is the *3-layer guard* the CHANGELOG
mentions: `rig send` **defaults to refuse** a send when the target pane is at an interactive
prompt or permission block — with `--raw` still guarded and
`--dangerously-interact --reason "…"` an **audited** override. **The default is fail-safe: an
automatic message will not be typed into an agent that is waiting for a human.** *(P1/P3.)*

---

## 5. The seat's environment — an explicit 10-key allow-list

`seat-launch-environment.ts` opens with a comment that states the security stance precisely:

> *"Explicit public launch metadata, not a prefix/denylist over credential names. Provider
> keys and OPENRIG_ACTIVITY_HOOK_TOKEN keep their non-typed channel."*

```ts
export const SEAT_PUBLIC_ENV_KEYS = [
  "OPENRIG_HOME", "OPENRIG_URL", "OPENRIG_HOST", "OPENRIG_PORT",
  "OPENRIG_NODE_ID", "OPENRIG_SESSION_NAME", "OPENRIG_RUNTIME",
  "OPENRIG_OCCUPANT_GENERATION", "OPENRIG_TRANSCRIPTS_LINES",
  "OPENRIG_TRANSCRIPTS_POLL_INTERVAL_SECONDS",
] as const;
```

`publicSeatEnvironment()` copies **only these 10 keys** into a seat's typed metadata. Then it
**re-validates `OPENRIG_URL`**: if the URL carries a username, password, query or hash it is
**deleted** from the typed channel, with the comment *"Never log its value."*

> **★ The design choice, named:** OpenRig does **not** filter by credential *prefix* (which
> would leak a differently-named secret); it **projects an allow-list**. Fail-closed by
> construction: a new secret is invisible to a seat until someone adds it to this array.
> *(P1 — a security mechanism of real interest for the mapping step.)*

The same module also **locates the CLI paired with the daemon** (`pairedCli()`) — *"never a
PATH-first global install"* — so a seat always calls the daemon's own `rig`, not whatever is
on `PATH`. *(P1.)*

---

## 6. The permission posture — the strongest P1 surface in the study

This is the batch's centre of gravity. OpenRig's permission model has **four distinct layers**,
and it is careful not to confuse them.

### 6.1 The founder's two-surface rule

`adapters/yolo-mode.ts` opens with a **design principle stated as a comment**:

> *"A simple deterministic setting that rides the STABLE launch-flag surface only (per the
> founder's **two-surface rule: launch flags may be deterministic code; config-file policy may
> NOT**)."*

**The rule:** a *launch flag* (e.g. `--dangerously-skip-permissions`) is stable enough to be
applied by **deterministic code**; a *config-file policy* (a rules file whose schema a vendor
may change) is **not** — it must go through a **skill** that reads the installed version and
adapts. This single rule explains the whole architecture below.

### 6.2 The posture is decided by one function per harness, on every path

`yolo-mode.ts` exposes three pure functions — `claudePostureFlag`, `codexPostureArg`,
`piTrust` — and their comments state the invariant:

> *"used on EVERY managed launch path (fresh, resume, fork) so the floor (OFF) and the
> maximally-permissive posture (ON) are uniform, **never path-dependent**."*

Resolution order (measured from the code):

1. **`launchPosture` from an attached policy** (`NodeBinding.launchPosture?`) — *"Present =
   authoritative for this seat (overrides the env read in **BOTH directions**)."* So an
   attached `builtin:locked` keeps the floor **even under global YOLO**, and an attached
   `full_bypass` policy lifts a seat **without** the env switch.
2. Else **global `OPENRIG_YOLO`** env (`"1"`/`"true"`).
3. Else the **floor**.

| Harness | Floor (default) | Full bypass |
|---|---|---|
| Claude | `--permission-mode acceptEdits` | `--dangerously-skip-permissions` |
| Codex | **`-s workspace-write`** (OpenRig's *own* flag, *"NOT a harness default"*) | `-s danger-full-access -a never` |
| Pi | `--no-approve` (**resource trust**, not permissions) | `--approve` |

**Two precision details worth stealing.** (a) The Codex floor is *"OpenRig's explicit
workspace-only floor"* — the platform **refuses to inherit a harness default** it cannot see.
(b) **Pi's `--approve` is re-labelled everywhere as RESOURCE TRUST, not a permission policy** —
*"Pi has no permission surface"* — a wording discipline applied consistently in code, policy
files and the skill. *(P1.)*

### 6.3 The policy spec — Markdown + frontmatter, two exclusive surfaces

`domain/permission-policy/policy-spec.ts` (188 lines) defines a policy as a **Markdown file
with a YAML frontmatter contract**. Two surfaces, and **the validator forbids mixing them**
(`validatePolicySpec`):

| Surface | Must carry | Must NOT carry |
|---|---|---|
| **`flag`** | `launch_posture` ∈ {`floor`,`full_bypass`,`auto`} | `default_posture`, action lists |
| **`config`** | `default_posture` ∈ {`allow`,`ask`,`deny`} **+ all four** of `allow`,`ask`,`deny`,`destructive_class` | `launch_posture` |

**And the validation is `ADVISORY + fail-open` — *"never enforcement"*.** The comment is
unambiguous: *"It NEVER validates the semantic-action vocabulary (the taxonomy owns that) and
NEVER resolves intent to a harness format (flag surface = deterministic code elsewhere;
config surface = the skill)."* **So the spec is a *declaration*, not a policy engine.** What
actually enforces is (a) the harness's native rules and (b) deterministic launch flags.

### 6.4 The five built-ins, verbatim

Exactly **five** built-in policies ship (`builtin-policy-reference.ts:20`:
`BUILTIN_POLICY_NAMES = ["locked","standard","open","yolo","auto"]`), materialized as
**read-only (0444) inspection copies** at `$OPENRIG_HOME/reference/policies/builtin/` — *"a
copy-to-customize affordance, not a security boundary."*

| Policy | Surface | Posture | The interesting bit |
|---|---|---|---|
| **locked** | config | `default_posture: deny` | allow-list of only `run_toolchain, rig_up, rig_down`; *"far more usable than raw harness-default"* |
| **standard** ⭐ | config | `default_posture: allow` | allow `push_to_remote`; **ask** on `create_pr, publish_package, merge_or_release, force_push` — *"the recommended default — the 80% software-factory interactive-dev posture"* |
| **open** | config | `default_posture: allow` | everything allowed **except** the destructive class, which asks |
| **yolo** | flag | `full_bypass` | *"APPLICATION is deterministic, NOT skill-translated"* |
| **auto** | flag | `auto` | Claude `--permission-mode auto`; *"Codex and Pi do not have an auto mode and launch at their floor"* |

**The destructive class is named once** (`destructive_class`): `delete_everything`,
`drop_persistent_store`, `reset_or_discard_vcs`. And the semantic vocabulary includes
`run_toolchain`, `rig_up`, `rig_down`, `push_to_remote`, `create_pr`, `publish_package`,
`merge_or_release`, `force_push`, and (in the example) `network_egress`.

### 6.5 "ASK ≠ deny" — the philosophy, stated in the policy file

From `standard.policy.md`: *"**ASK ≠ deny**: OpenRig bakes no block; ASK = defer to the human
… `force_push` is additionally best-effort on Claude (prefix rules can't reliably split `git
push --force`), so ASK is the honest disposition, **not a can't-enforce deny**."*

And on autonomous work: *"an `ask` freezes an autonomous seat by design — autonomous fleets use
Open or YOLO, not Standard."* **The design concedes where its own enforcement is approximate
(force-push prefix matching) and prefers honesty over a false guarantee.** *(P1.)*

### 6.6 The translation skill — consent as executable instructions

The harness-format translation lives in a **skill**
(`assets/plugins/openrig-core/skills/applying-a-permission-policy/SKILL.md`, 241 lines), whose
frontmatter carries a verification caveat:

> `verification_status: "Verify the installed harness version and effective settings; a
> rule-parser result is not a native permission test."`

The skill encodes a **consent discipline** as instructions, and the sentences are worth
quoting because they are a policy, not prose:

- *"A recommendation is not consent."*
- *"Remember an explicit Yes or No … **No answer is not a remembered No.**"*
- *"An allow must not erase a stricter rule or managed requirement. Report a real conflict
  instead of silently bypassing it."*
- *"Verify an ordinary matching operation twice … a **command already allowed by the launch
  default does not prove a new persistent rule loaded**."*
- *"A parser match alone does not establish native behavior."*
- It **narrows scope on purpose**: a whole-family allow *"is not a read-only grant"*; it offers
  `rig ps`, `rig queue list` and **forbids** widening to `bash`/`sh`/`node` *"or generic
  wrappers"*.
- It ships a **reversible undo**: *"Undo the OpenRig command allowances added by this setup;
  keep my other rules."*

> **★ The mechanism, named: a permission policy whose translation is a *skill* rather than
> code, because the vendor format is not stable enough to hard-code.** The skill reads the
> installed version, edits the native rules file, verifies a rule actually loaded, and reports
> what it could not prove. **This is the two-surface rule paying off in the hardest place:
> permission policy for two third-party harnesses with different, changing rule formats.**

### 6.7 Drift is observed, not assumed

`domain/permission-drift.ts` defines a **diagnostic that compares *expected* against
*effective***: `AppliedLaunchAxis = permission | sandbox | resource_trust | not_applicable`,
`EnforcementState = aligned | drift | unknown`, with fields `expected`, `effective`,
`sourcePath`, `reason`, `observedAt`. The comments repeat one discipline:

> *"File comparison only; neither a settings file nor an argument proves native enforcement."*
> *"Emitted Codex approval argument; null/absent does not infer a native default."*

`permission-drift-observer.ts` runs it. **The platform treats "the config says X" and "the
agent is actually enforcing X" as two different facts, and says so.** *(P1.)*

### 6.8 The schema — three small migrations

| Migration | Change |
|---|---|
| `055_node_permission_policy` | `nodes.permission_policy TEXT` — the per-seat REF (`builtin:<name>` or a relative path), `NULL` = floor |
| `056_rig_permission_policy` | `rigs.permission_policy TEXT` — the rig-level REF, `NULL` = floor |
| `088_node_permission_selections` | `node_permission_selections` table: `node_id` PK, `runtime CHECK IN ('codex','claude-code')`, `mode`, `actor`, `reason`, `updated_at` — **an audited future-launch choice**; + `applied_launch_observations.approval_policy` |

**Precedence is stated once** (`policy-ref.ts` / `standard.policy.md`): **member policy
overrides rig policy** — the most-specific wins, exactly as in profile resolution. *(P1.)*

---

## 7. The skill and context loadout

- **Skills are discovered per runtime** (`skill-discovery.ts`, `SkillRuntime`), from
  **rig-local first**, then runtime/user roots; a structurally invalid `SKILL.md` is
  **rejected with a named reason** (`parseSkillFrontmatter`), and profile resolution *"surfaces
  rejected-skill reasons instead of treating every broken skill as merely missing."* A skill
  must have frontmatter with non-empty `name`, `description` and body.
- **Skills ship from three mirrored "edges"** (`spec` / `plugin` / `canonical`), and the
  layout is **hash-pinned** (`skill-edge-digests.generated.json`); `mirror-skills:check` *"fails
  on a SKILL.md the layout does not list."* `ARCHITECTURE.md` claims *"33 skills are in `spec`
  and `canonical`, 17 only in `plugin`, and 2 in all three"*; **measured on disk: 35 in
  `canonical`, 35 in `spec`, 19 in `plugin`** — another growing-surface drift (D2-5). *(P1/PZ.)*
- **Context packs** are how context reaches an agent: static packs (hand-written, `version:
  "0"`) and generated packs (built at package time from every shipped skill). The daemon serves
  them via `rig context get`.

**These are read properly in batch 05 (PX-W/PX-F) and batch 06 (PZ).**

---

## 8. Divergences (rule 1)

| # | Claim | Reality | Verdict |
|---|---|---|---|
| **D2-1** | `policies/examples/my-cautious-dev.policy.md` lists the built-ins as *"(locked / standard / open / yolo)"* | **five** built-ins ship — `auto` is omitted from that prose | **DIVERGED** (example prose misses `auto`) |
| **D2-2** | the same example uses action `network_egress` | `network_egress` appears in **no** built-in policy and in **no** daemon code — the vocabulary lives only in prose | **UNVERIFIED-AS-ENFORCED** (a declared action with no enforcement path found) |
| **D2-3** | `ARCHITECTURE.md` says *"6 runtime adapters; the command counts 5 because OmpRuntimeAdapter extends PiRuntimeAdapter"* | 6 names present; `omp-runtime-adapter` extends `pi-runtime-adapter` — **holds** | **HOLDS** |
| **D2-4** | batch 00 found **22 distinct `RIGGED_*` names** vs the release note's documented **5** | re-confirmed here: `SEAT_PUBLIC_ENV_KEYS` uses the **new** `OPENRIG_*` names, while `claude-compaction-enforcer.ts:185` still reads `OPENRIG_HOME \|\| RIGGED_HOME` | **DIVERGED** (carried from b00; the legacy read path is live) |
| **D2-5** | `ARCHITECTURE.md` claims 33 skills in `spec`+`canonical` (2 in all three; 17 plugin-only) | **measured: 35 `canonical`, 35 `spec`, 19 `plugin`** | **DIVERGED** (growing surface) |

---

## 9. Findings (batch 02)

**F2-1.** ★ **The permission model has four *separate* layers and refuses to conflate them**:
(a) the **launch flag** (deterministic code), (b) the **harness-native rules file** (translated
by a **skill**), (c) the **sandbox/resource-trust** posture (per-harness, sometimes not a
permission concept at all — Pi), and (d) the **OpenRig operating posture** (guidance, not
enforcement). The policy-spec module says it outright: *"recording a policy does not translate
config rules."* *(P1.)*

**F2-2.** ★★ **The founder's two-surface rule is the load-bearing idea of this pole**: *"launch
flags may be deterministic code; config-file policy may NOT."* It is why `yolo`/`auto` are
`surface: flag` (applied directly) and why every config-surface policy must pass through a
skill that adapts to the installed version. **It is a rule about *which parts of a third-party
interface you are allowed to hard-code*.** *(P1 — top-tier mechanism.)*

**F2-3.** ★ **The seat's environment is an explicit 10-key allow-list, re-validated for URL
credential leakage, with "Never log its value."** Fail-closed by construction — a new secret is
invisible until added. *(P1.)*

**F2-4.** **Blocked states are named, not stringified.** 8 `ATTENTION_REQUIRED_READINESS_CODES`
(`trust_gate`, `bypass_consent_gate`, …) + a two-way recovery classification
(`retry_fresh` / `attention_required`) + **pane-line `evidence`** carried to the restore result.
*(P1.)*

**F2-5.** ★ **An agent's permission posture is decided by one function per harness, called on
every launch path, with an explicit precedence (seat > rig > global env > floor) that overrides
"in BOTH directions."** *(P1.)*

**F2-6.** **The Codex floor is OpenRig's own flag, "NOT a harness default"** — the platform
refuses to inherit an invisible default from a harness it does not control. *(P1.)*

**F2-7.** **Pi is consistently re-labelled as RESOURCE TRUST, "not a permission policy"** —
across code, policy files and the skill. **The platform corrects a category error in its own
vocabulary.** *(P1 — a wording discipline worth naming.)*

**F2-8.** ★ **A permission policy's *translation* is a skill, not code** — because the two
harness rule formats are unstable. The skill carries a **consent discipline** (*"A
recommendation is not consent"*, *"No answer is not a remembered No"*), a **narrowing default**
(narrower prefixes offered; generic wrappers forbidden), **conflict reporting instead of
bypass**, **load verification** (*"a parser match alone does not establish native behavior"*),
and a **reversible undo**. *(P1 — top-tier mechanism.)*

**F2-9.** **Drift is a first-class observation, with `aligned \| drift \| unknown` per axis
(permission, sandbox, resource_trust, not_applicable)** — and the code repeats *"neither a
settings file nor an argument proves native enforcement."* *(P1.)*

**F2-10.** **AgentSpec resolution reports 7 named failure modes + resource collisions +
a spec hash.** An agent blueprint is resolved like a package, not read like a config. *(P1.)*

**F2-11.** **A seat can hand its conversation to a successor `ForkSource` without losing its
address** — identity ≠ process, mechanised (`pendingIdAllowed` commits a ready successor).
*(P1.)*

**F2-12.** **`rig send` defaults to refuse when a seat is at a prompt or permission block**,
with `--raw` still guarded and `--dangerously-interact --reason` an audited override. **An
automation will not type into an agent that is waiting for a human.** *(P1/P3 — the hinge.)*

**F2-13.** **The `standard` built-in is the study's cleanest statement of a human-in-the-loop
default**: routine dev runs free, *outward and history-rewriting* acts ask, and the design
**concedes** where its own enforcement is approximate (`force_push` prefix matching) rather
than claiming a guarantee. *(P1.)*

---

## 10. Plain-English summary of batch 02

In OpenRig, **an agent is not OpenRig's — it is a Claude Code or Codex process wrapped in a
YAML blueprint and given an address.** The blueprint (AgentSpec) declares imports, profiles and
five kinds of resource; resolution reports collisions and seven named failure types and carries
a hash. The address (a *seat*) outlives the process: a seat can fork its conversation to a
successor and keep its name.

What surrounds the agent is where the engineering is. The seat gets an **explicit 10-key
environment allow-list**, fail-closed, with URL credential leakage stripped and *"never log its
value."* Its **blocked states are named** (8 gate codes) and its failures carry pane evidence.
And its **permissions** follow a rule — *launch flags may be code, config-file policy may
not* — which is why there are two kinds of policy (`flag` vs `config`), five built-ins
(`locked` / `standard` / `open` / `yolo` / `auto`), and a **skill** that translates a
harness-neutral intent into whichever native rules file the installed Claude or Codex expects —
verifying the rule actually loaded, refusing to bypass a stricter rule, and shipping an undo.

The result is the **strongest P1 (aissistant) surface in the study so far**: not a richer agent
model than the others, but a **far more careful *seam*** — a design that names what it can and
cannot enforce, labels Pi's resource trust correctly, and won't type into an agent that is
waiting for a human.

**Next: batch 03 — the workspace (P2).** RigSpec, pods/edges, projects, the queue and state,
and the **tenancy question** the pin opened.

---

*Batch 02 of 08 — the aissistant (P1). All claims read from source at `0.6.10`. 5 divergences;
13 findings (F2-1..F2-13).*
