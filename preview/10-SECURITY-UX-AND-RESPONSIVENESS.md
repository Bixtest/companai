# Security, UX/UI and responsiveness

**Written:** 12 October 2026 · **Author:** an agent brought in to learn the project cold
**Companion to:** [`08-FORENSIC-AUDIT.md`](08-FORENSIC-AUDIT.md) (the defects) and
[`09-OPTIMIZATIONS-AND-ENHANCEMENTS.md`](09-OPTIMIZATIONS-AND-ENHANCEMENTS.md).

Everything here is written from the position of *someone who has to use the platform*, not someone who
built it. Where I say a control is good, I mean I tried to break it and could not.

---

# Part 1 — Security

## 1.1 What is genuinely strong 🔬

I want this on the record first, because it is the part a security review usually gets wrong.

| Control | Why it holds |
|---|---|
| **The code-mode sandbox** | Fresh `Isolate` per execution; `globalThis` set to `undefined`; no `require`, no `process`, no `fs`, no `fetch`, no `Buffer`, no database handle. The documented `node:vm` prototype escape is closed. `isUnsafeApiRequestPath` is thorough on control characters, backslashes, and percent-encoded and tab-smuggled traversal. Scope is **force-replaced** from context, never read from sandbox input. |
| **The Business IR as a boundary** | The IR has no scope field *in the type*. `businessQueryIrSchema` is `.strict()`, so a guessed `tenantId` is rejected at the boundary. Scope comes from the authenticated request only. This is the single best design decision in the platform. |
| **The guard registry** | Guards are ordered, feature-filtered, entity-scoped, and the escalate outcome is honoured at **every** consumer on the enabled set — zero check only `!ok`. |
| **Fail-closed in the structure gate** | Its refusals are a closed set, on the principle that *"we did not recognise this" is never evidence that it is safe.* A malformed surface id, an unrecognised kind and an empty decision are all refused. |
| **The default grant goes to superadmin** | A new surface is never granted to *nobody* — invisible-to-everyone is a silent failure. |
| **The command gate's 202** | A held act returns `202 pending_review`, never a 2xx that implies the write landed. A 403 would say "you may not"; a 500 would invite a retry that queues a second copy. |
| **Undo/redo on the command path** | The one place with a real compare-and-set (`claimForUndo`'s `nativeUpdate`). |

## 1.2 The security model's own blind spot: a declared control with no reader

This is the most valuable thing I can say about security on this project.

`.delegable: false` is declared on **more than twenty** capabilities, each with a carefully written
reason: *"handing out the ability to mint identities is how a bounded grant becomes an unbounded one."*
*"somebody who can delegate the power to delegate has created a chain nobody can see the end of."*

**Nothing reads it.** Grep for `.delegable` outside the `acl.ts` declaration files returns zero hits.
The whole invariant is prose.

That is the pattern behind most of the security findings in the audit: a control that is *described*
rather than *wired*. The architecture tests cover tables, entities, guard wiring, command capabilities and
CRUD read gates. **None covers "this declared control has a consumer."**

**The fix, concretely:** a test that enumerates the declared controls — `delegable`,
`standingApprovable`, `effectClass`, `reversibility`, `allowedMutations`, `evidenceRequired`, the
capability `note` field as the human-readable half — and asserts each is read by at least one production
file. It would have caught the delegation bypass, the dead trust demotion, and the dead command contract
at build time.

## 1.3 Scope is not authorization

The platform enforces **scope** (which tenant, which organisation) almost everywhere, and it is careful
about it. **Authorization** (may this actor read this entity, this row, this field) is enforced on some
paths and absent on others.

| Surface | Scope | Authorization |
|---|---|---|
| The AI search tools | ✅ | ✅ `authorizeEntityAccess` + `aclFeatures` on all 53 entities |
| The human CRUD read path | ✅ | ✅ route-metadata `requireFeatures`, enforced 403 |
| **`business_ir.run_query`** | ✅ | ❌ **none** — `userFeatures` is passed in and never read |
| **Code Mode** | ✅ | ⚠️ a *third* authorizer, per-endpoint strings, no resolved Decision |
| **The HTTP RBAC path** | ✅ | ⚠️ no invoker passed, so no invoker ceiling |

The project's own security kernel states the rule: *"unauthorized data should not enter an AI context in
the first place."* The AI search path does this. The business-IR path does not.

**I would unify these onto one predicate.** There is already a single matcher (`featureMatch.ts`) shared
by both RBAC services — the "one engine" rule (`S5`) is honoured for the matcher. What is missing is one
*per-entity* gate applied at every execute hop, rather than three that differ in strictness.

## 1.4 The four things that must never be possible — verified

1. **A model-widened grant.** Holds on the tool door and the command gate. **Open** on the delegation
   route (audit §1) — a model cannot mint authority, but a human can lend authority they do not hold.
2. **A secret in a prompt, log or instruction.** Holds. Secrets are referenced, never inlined, and nothing
   secret is model-visible.
3. **A business mutation outside the typed command path and its approval.** Holds for bus commands.
   **Open** for reads and non-command routes through Code Mode.
4. **A second identity plane.** Holds — `ai_worker` is derived server-side, `parseSubject` is the single
   decoder, and the Hermes door is dead code rather than a second way to be someone.

## 1.5 Security improvements, ranked

| # | Improvement | Type | Why |
|---|---|---|---|
| S1 | A **declared-control coverage test** | structural | Catches the whole class, not one instance |
| S2 | The delegation grant check: read the descriptor, refuse `delegable: false`, refuse self-delegation with a null ceiling | one function | Closes a live escalation route |
| S3 | One per-entity feature check at the Business-IR execute hop — copy `authorizeEntityAccess` | one call | Closes the AI-context hole |
| S4 | Make the four fail-open paths fail closed | four small edits | Removes silent degradation |
| S5 | `UUID_PATTERN` `[1-5]` → `[0-9a-f]` | **one character** | Locked records become writable by a v7-id payload |
| S6 | One CAS on pending-act approve, and a ledger append that cannot be skipped | two | The flagship screen and the chain |
| S7 | A build gate: an enabled module's command must declare a capability | one test | Turns a latent bypass into a compile error |
| S8 | Hash `resourceKind`/`resourceId` into the ledger | one | Protects the chain's only pointer to the business object |
| S9 | Schedule `ledger:verify` | one registration | A chain nobody checks is a chain nobody can claim |
| S10 | Point Code Mode at the single authority resolver | one | Three authorizers is two too many |
| S11 | Arm `enforce` for one tenant, **after** reading its shadow report | an operator's decision | The whole layer is currently measurement-only |

## 1.6 Security properties worth *keeping* as they are 💭

- **Hermes headless.** No dashboard, no pairing flow, no second identity plane. The dead adapter code is
  a tidiness problem, not a safety one — but it must never become a second door.
- **Declarative-only tenant authoring.** The safest possible shape, and the safety is structural.
- **The 202 response.** A held act that looks like a success is worse than a refusal.
- **Append-only authority objects.** An "edit" on an authority object never overwrites; it creates a new
  version with a diff and an approval. That is what makes "what were the rules at that moment" answerable.
- **A control says what it actually enforces** (`I15`). Overstating a control is as bad as a broken one.

---

# Part 2 — UX and UI

## 2.1 What already works well 🔬

- **One interface, gated by the resolver.** There is no admin portal and no user portal; a manager and
  an AI worker see the same screen, and the difference is a gate. That is `I1a`, and it is rare.
- **The approvals queue.** Two lists on one page that never share a row, a verb or a colour, with each
  gate translated into a plain sentence. It is the best-designed screen in the platform.
- **The empty dashboard tells the truth** instead of rendering ten broken panels.
- **Test instructions are click-by-click** with verified URLs and expected results, and the project says
  plainly when a change is invisible.

## 2.2 The UX problems, in the order a user hits them

| # | Problem | What it feels like | The fix |
|---|---|---|---|
| U1 | **The dashboard is empty and the reason is invisible.** | A new user lands on a blank page and concludes the product is unfinished. | One honest empty state that *says* it: which areas are switched off, why, and how they come back. The code already knows; the screen does not say it. |
| U2 | **There is no way to find a saved Function** — no library, no menu entry, no share by link. | You build something with the AI and it evaporates. | The workspace design already specifies this: `placement` → menu item, group derived from the path. It is three small edits. |
| U3 | **The AI's answers cannot be told apart.** | A one-time answer, a proposed structure change and a saved Function look like chat replies. | The six-moments design: show *which* of the three endings you are in, always. |
| U4 | **Nothing shows what the AI did.** | You get prose and cannot check it. | The activity-feed design: verb → object → outcome, in business words, with a one-click inspect view showing which tables and columns were read. Never a raw id, never query text. |
| U5 | **A saved Function looks fully verified when it is not.** | Trust misplaced. | One line, already producing: *"Structurally verified. Permissions were not checked."* |
| U6 | **The model dropdown shows OpenAI's catalogue while a local model serves.** | Confusing and slightly alarming. | The `llamacpp` preset, so the operator sees what is actually running. |
| U7 | **"Invalid OpenAI API key" in the MCP log.** | Looks like a credentials problem; is a missing base URL. | Fix the base URL and serve an embedding model, then make the lane fail closed rather than warn. |
| U8 | **Fourteen modules are parked and nothing says which.** | Looks like missing features. | A visible, honest list of what is switched off and what it would take to bring back. |
| U9 | **The permissions catalogue is a list of strings.** | A granting decision is unreadable. | Group by module, show each capability's risk class, and say what granting it actually permits. `I1a` already calls this a first-class area. |
| U10 | **MCP tool errors are opaque.** | `401 {"error":"API key required (x-api-key header)"}` after an hour of setup. | Error text that names the accepted credential *forms*. |

## 2.3 Responsiveness and the design system

**What exists.** ~90 design-system primitives in `packages/ui/src/primitives/`, an ESLint plugin
enforcing the design system, a `WidgetResponsive` type that declares constraints rather than CSS, and a
`frontend-vocabulary` guard that keeps front-end terms out of the Widget IR.

**What is thin.** The owner's own adopted blueprint lists **responsive behaviour, accessibility (WCAG
2.2 AA), and RTL/LTR as first-class component contracts** — and the module register records the actual
state as `BUILT-UNEVEN` for the surfaces that matter:

| Area | State |
|---|---|
| `dashboards` | tables and APIs exist, **zero UI pages** |
| `perspectives` | tables and APIs exist, **zero UI pages** |
| `progress` (background jobs) | service and API, **no UI** |
| `notifications` templates | **code-defined, not user-editable** |
| `api_keys` | one composite route file, the thinnest module by structure |
| `translations` | one route, one page — machinery there, management surface thin |
| `integrations` | **read and update only** — no create, no delete |

**The honest observation.** The *product* surfaces (the approvals queue, the audit viewer, the AI chat,
the entity editor) are strong. The *administrative* surfaces — the ones that configure the platform — are
where the zero-UI modules cluster. That is the opposite of what a platform needs, because the
administrative surfaces are how the platform's own guarantees are exercised.

**What I would do, in order:**
1. **A responsive contract on the design system.** Declare breakpoint behaviour as part of each
   primitive's type, the way `WidgetResponsive` already does. It is a contract, not a stylesheet.
2. **Dashboard and perspective configuration screens.** Both are fully specified by the tables under them.
3. **An accessibility baseline.** WCAG 2.2 AA as a lint rule rather than a phase.
4. **RTL as layout, not theme.** English, Swedish and Arabic are seeded with direction metadata on day
   one — which is one of the project's better calls. The remaining work is enforcing it in the component
   layer rather than retrofitting later, which is the expensive path.

## 2.4 The one UX rule I would add

The owner's rule is *"if it is ready to be switched on in the front end, switch it on."* The natural
corollary, which I have not seen stated: **if it is switched on, it must say when it is not working.**

Three places currently fail silently in a way a user cannot interpret: the embedding lane, the model
allowlist's provider axis, and the authority layer in shadow mode (which is the default, so *no refusal
anywhere is currently real*). A user cannot distinguish "the platform decided yes" from "the platform has
not decided anything."

---

# Part 3 — A short, honest close

**Security.** The architecture is right and the wiring has holes. The holes are all the same shape — a
control described in a document and not read by the code — which is the project's own diagnosis of itself
and is correct. The highest-leverage fix is not any single patch but a test that makes a declared control
without a consumer a build failure.

**UX.** The product surfaces are genuinely good. The administrative surfaces are not, and they matter
more, because they are where the platform's guarantees are exercised. The two biggest UX gaps — no way to
find a saved Function, and no way to see what the AI did — are both already fully designed and are small.

**Responsiveness.** Declared in the design system's types, thin in the screens that need it. The
zero-UI modules are the clearest evidence, and `dashboards` and `perspectives` are the two that would be
noticed first.
