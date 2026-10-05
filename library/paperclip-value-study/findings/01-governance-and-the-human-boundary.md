# Findings 01 — Governance and the human boundary

**Covers batches 1 and 4:** identity, access and the human/agent boundary; governance, approvals and
enforced outcomes.

**The one-line result.** This is where Paperclip is strongest and where it is closest to us. Almost
everything here is either **already in our vision** or **already on our backlog** — but three
mechanisms are worth taking, because they are the concrete way to do things we have only described.

---

## 1. The responsible-user intersection — **LEARN** (the strongest idea in the whole study)

**What it is.** An agent never acts *as* a person; it acts **on behalf of** a person, and its authority
is the **intersection** of its own permissions and that person's. If the person could not do the thing,
the agent cannot either, even if the agent's own grants would allow it.

**Evidence.** The contract is stated in `packages/shared/src/responsible-user-denial.ts:4-6`: *"When an
agent run acts on behalf of a human user, authorization is the intersection of the agent's permissions
and that user's permissions."* The mechanism is in `server/src/services/authorization.ts:2400-2427`: the
decider **re-decides as a synthetic actor for the responsible human**, and returns the agent's decision
**only if the human is also allowed**. The wording is deliberate — the same file says *"always 'on behalf
of {user}' / 'responsible user', never 'impersonate'"* (`responsible-user-denial.ts:12-13`).

**What we have.** The **rule** is already in our own vision, in our words:
*"An agent should normally operate **on behalf of** an actor, not silently above the actor"*
(`library/ai/ai-first/06_Platform_Foundation_and_Security_Kernel_Specification.md:1308`), and
*"An Agent may act on behalf of a user"* (`:447`). The library's source shelf says the same thing from
the other direction: *"AI should never be allowed to bypass permissions. If a user cannot access a
document, project, record, or portal, AI cannot use it in that user's answer"*
(`library/05-platform-audit-and-srs/15-ai-first-operating-model.md:7`). Our platform already has
`ai_worker` as an identity kind and the `A0`–`A5` autonomy gates.

**What is new: the mechanism, not the rule.** "Re-decide as the responsible human and take the
intersection" is a concrete, testable way to implement the rule we already hold. It is also the thing
that makes the rule *impossible to bypass by accident*, because it is applied inside the single decider
rather than at each call site.

**Verdict: LEARN.** Implement the intersection as a step **inside** our resolver, the way Paperclip does
— not as a rule each caller must remember.

---

## 2. Pure policy modules, separate from persistence — **LEARN**

**What it is.** Every governance branch lives in a function that takes **facts in** and returns a
**decision out**, with no database access. A separate adapter reads and writes.

**Evidence.** `server/src/modules/wake-queue/domain/policy.ts:44-61` is a complete example:

```ts
export function decideWakeAdmission(facts: WakeAdmissionFacts): WakeAdmissionDecision {
  if (… ) return { kind: "coalesce" };
  if (facts.availableActiveExecutionRunPresent) return { kind: "defer" };
  return { kind: "proceed" };
}
```

The same shape repeats at `policy.ts:94, 165, 184, 376`. The module's own comment calls the port
temporary and the domain permanent (`modules/wake-queue/application/ports.ts:267-277`).

**What we have.** Nothing that names this pattern. Our specification's tool policy and approval token are
described as behaviour, not as a code structure.

**Verdict: LEARN.** Our governance layer is the product, and it is the thing most in need of tests that
do not need a database. This pattern is the cheapest way to get them.

---

## 3. Consumed-once, run-bound consent — **LEARN**

**What it is.** An approval authorises **exactly one action, once**, and it is bound to the run that
requested it. Re-using it fails.

**Evidence.** `server/src/services/change-consent-gate.ts:165-175` requires an accepted, unconsumed
`request_confirmation` with a **displayed diff**, created in a **previous** run; `:201-227` consumes it
with a compare-and-set, so a replay finds nothing.

**What we have.** Our specification has an **approval token** (Draft 2, §14). This is the mechanism.

**Verdict: LEARN.** It is the concrete shape of §14, and the "created in a *previous* run" rule is the
part we had not written down.

---

## 4. Argument-bound approvals and changed-tool quarantine — **CONFIRMATION**

**What it is.** An approval is bound to the **exact arguments** of the call. A retry with different
arguments is rejected. Separately, a tool whose schema or version **changes** is quarantined again.

**Evidence.** `server/src/services/tool-content-guards.ts:75-107` canonicalises the arguments, hashes
them, and HMAC-signs a payload of `invocationId`, `toolName`, `canonicalArguments`. The quarantine is at
`server/src/services/tool-access.ts:7359-7393` — `changed = existing.versionHash !== hash ||
existing.schemaHash !== schemaHash`.

**What we have.** Both are **already on our backlog** as **AH-8** ("MCP governance — binding precedence
(narrowest-first), changed-tool quarantine, argument-bound approvals").

**Verdict: CONFIRMATION.** Our plan was right. No change needed; the mechanism is now readable if we
want it.

---

## 5. The self-modification gate — **IDEA** (the most interesting thing for our differentiator)

**What it is.** A built-in agent that proposes changes to **agents' own instructions and skills** is
held to a fixed contract: it must **show a diff**, it must get an **accepted interaction**, and it may
**only apply in a separate follow-up run**.

**Evidence.** `server/src/services/built-in-agents.ts:341-349`:

```ts
builtInMutationPolicy: {
  requiresDisplayedDiff: true,
  requiresAcceptedTaskInteraction: true,
  applyInSeparateFollowUpRun: true,
}
```

The shipped material states the same contract in plain words:
*"Never hot-swap production instructions or edit another agent's live configuration in the same run that
discovers the pattern. Discovery and application are always separate runs"*
(`server/src/built-ins/agents/reflection-coach/AGENTS.md:18`);
*"No-same-run-apply is a load-bearing property of this loop"* (`:30`);
*"Every proposed rule needs linked issue/comment evidence or it is dropped"* (`:19`);
*"**No cluster survives without at least 2 evidence tuples** — one-offs are not patterns"*
(`packages/skills-catalog/catalog/bundled/paperclip-operations/reflection-coach/SKILL.md:109`);
and size caps — *"AGENTS.md +20% max per proposal, skills 15KB max, tool descriptions 500 chars max"*
(`server/src/built-ins/agents/reflection-coach/routines/recent-agent-reflection.md:73`).

**What we have — the prohibition, but not the process.** *(Corrected 2026-10-06: the first draft said
"nothing". That was too strong and it flattered the finding, so it is corrected here.)*

We already hold the **prohibition**: *"A Skill proposal or memory record must not be able to mutate: role,
permission, policy, secret, tenant boundary"*
(`library/ai/ai-first/06_Platform_Foundation_and_Security_Kernel_Specification.md:4775-4785`), and the
vision already uses the words **"Skill proposal"**
(`library/ai/ai-first/03_Local_First_AI_Runtime_and_User_Function_Architecture.md:3214`;
`AI_Native_Business_Platform_Hermes_Forensic_Analysis_and_Architecture.md:828, 3732`). Hermes itself ships
a write-approval gate with a diff and an approve/reject surface
(`library/ai/hermes-agent-main/website/docs/reference/slash-commands.md:108-109`), and the predecessor
product ran it on: `skills.write_approval: true`, `memory.write_approval: true`,
`skills.guard_agent_created: true` (`library/16-konsult-product-docs/consulting-operating-model.md:87`).

What we do **not** have is the **process contract**. Measured at the time of writing: the rule that the
change may be applied **only in a separate follow-up run** appeared nowhere in our own documents —
`separate run`, `same-run` and `follow-up run` returned **zero hits** across `library/development/` and
`library/ai/ai-first/`. Neither did the evidence floor (at least two linked evidence tuples per proposed
rule) or the size caps. *(Re-measured 2026-10-06 after this study's own backlog change: the exact phrases
`separate follow-up run` and `same-run` now return **one hit each**, and both are
`library/development/BACKLOG.md` item **N-16**, which this study added. The looser substring `separate
run` also matches `06_Platform_Foundation_and_Security_Kernel_Specification.md:5377`, the heading
"# 209. Separate runtime roles" — a different thing, and named here so the number is reproducible. The
measurement stands for the documents as they were, and the sentence is left in the past tense rather than
quietly re-scoped.)*
Paperclip's
"Self-Organization" and "Automatic Organizational Learning" roadmap items also have **zero occurrences** in
our vision or our backlog; in our own documents they appear only in the predecessor product's audit
(`library/16-konsult-product-docs/forensic-product-audit.md:283, 300, 464`, which exists in a second
identical copy at `library/ai/hermes-docs/docs-more/forensic-product-audit.md` — see finding 06 §3 for
the full search).

**Verdict: IDEA, and it is the *process* we are missing, not the idea.** This is a governance primitive
aimed exactly at our differentiator: *how does an AI employee propose a change to how it works, without
being trusted to make it?* We have the prohibition and the write-approval gate already; what is new is
**discovery and application in separate runs**, the **evidence floor**, and the **size caps**. Worth a
backlog item on its own, independent of whether we ever build the "learning" features around it.

---

## 6. Typed approval stages and reviewer identity — **LEARN**

**What it is.** A review stage has **typed participants**; only the current participant can advance it;
an escalated human hold is **sticky**. And a review policy can require that the approver is **not the
person who wrote the work**.

**Evidence.** `server/src/services/issue-execution-policy.ts:708-735` (typed participants, sticky
escalation); `server/src/services/issue-review-policy.ts:111-147` (`human_only` rejects any non-user;
`not_creator` requires the verdict actor to differ from whoever moved the work to review).

**What we have.** Our platform has approvals and the `A0`–`A5` gates, and the vision names approval
stages. The **"not the creator"** rule is the part worth naming explicitly.

**Verdict: LEARN.** Cheap, and it closes a real hole: self-approval.

---

## 7. Warnings worth keeping

| Warning | Evidence | Why it matters to us |
|---|---|---|
| **An enforcement switch that can be silently off** | `authorization.ts:504-508` and `:2451` — in "shadow mode" some denials fall through to the agent's own decision | We must never ship a mode where the intersection is not applied. Fail closed, or do not ship the switch |
| **The trusted-local mode is fully unauthenticated** | `server/src/middleware/auth.ts:231-240` — anyone who reaches the port is instance admin | We run a loopback stack too. Bind to loopback, and say so where it can be seen |
| **A claim challenge held only in memory** | `server/src/board-claim.ts:22` — a module-level singleton, lost on restart | Do not put a one-time token in process memory |
| **A plugin's UI bundle is trusted, not sandboxed** | `doc/plugins/PLUGIN_SPEC.md:23-24` — manifest capabilities do not stop same-origin JS calling ordinary HTTP | If we ever allow third-party UI, capabilities are not a boundary |
| **A governance gateway that can be bypassed** | `doc/MCP-ACCESS-GOVERNANCE.md:135` — an unmanaged client bypasses the gateway, and they "cannot prevent or audit that bypass" | Our claim is "one place decides". A bypass path is not a policy, it is a hole |
