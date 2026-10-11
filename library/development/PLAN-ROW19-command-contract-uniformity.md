# PLAN — Row 19 / `CC-61`: the command contract made uniform (`risk` · `approval` · `idempotency`)

**Row:** `platform_points.md` LIST **row 19** — *"Every state-changing action goes through one typed
'command', never a raw write."* (ID: Phase −1 **C6** / **S5**.) **Register:** `CC-61`.
**Owner's approval (2026-10-11):** *"yes proceed with your recommendations approved"* — the recommendation
recorded in `CC-61`: add the three fields as **optional**, have the bus **record** them, keep **approval's
enforcement in the authority layer** (one engine — never a second), and record the `S5` measurement.

Written 2026-10-11 as the **requirement** (rule 10c) **before** any code, per rule 0b/10d.

---

## 1. What exists today (measured in code, 2026-10-11 — rule 0b)

| Fact | Evidence |
|---|---|
| **The command bus is real and widely used.** | `packages/shared/src/lib/commands/` (`command-bus.ts` 38 KB, `types.ts`, `undo`/`redo`, `registry.ts`, interceptors, scopes, `flush.ts`); **~122 command files across ~18 modules**; **19 test files** in `__tests__/`. |
| **The contract today has SIX facets, of which three are missing.** | `CommandHandler` (`types.ts:129-184`) declares `id`, `isUndoable?`, `capability?`, `prepare?`, `execute`, `buildLog?`, `captureAfter?`, `undo?`, `redo?`. So: **schema** (the input type) ✓ · **permissions** (`capability`) ✓ · **side effects** (`execute`/`undo`/`redo`/`prepare`) ✓ — and **`risk`, `approval`, `idempotency` are ABSENT**. A grep for those keys across the command modules returns **nothing**. |
| **A place to record them exists — no migration needed.** | The action log entity (`audit_logs/data/entities.ts`) carries `context_json` (`:91`, jsonb) and `changes_json`; `CommandLogMetadata.context` (`types.ts:79`) is the free-form bag that reaches it. |
| **The authority layer owns approval — and must keep owning it.** | `shared/src/lib/authority/` (`decision.ts` `resolveDecision` `:227`) produces the `escalation` outcome; `CC-37`/`CC-38` and `pending_acts` are its intake. **Re-implementing approval in the bus would be a second engine** — exactly what `S5` forbids. |
| **The feature matcher IS single (the `S5` measurement).** | `shared/src/lib/auth/featureMatch.ts` (`matchFeature` / `hasAllFeatures`), imported by **7** non-test files; `ai-assistant/lib/auth.ts`'s `hasRequiredFeatures` and `customer_accounts`'s `customerRbacService` both **delegate** to it. There are **two RBAC *services*** (staff / customer population) but **one engine**. |

**So the honest gap:** *"every action goes through one typed command"* **holds**; *"the **full** contract
uniform across every action"* (`C6b`) **does not** — three of its six facets have no declaration at all.

---

## 2. The requirement (rule 10c = the row's own definition + the platform points, combined)

**Row 19:** every state-changing action goes through **one typed command**. **`C6b`:** that command's contract
is **uniform** — schema · permissions · side effects · **risk · approval · idempotency**. **`S5`:** one
permission engine, never a second.

**Therefore, in one change:**

- **`R1` — the contract carries all six facets.** `CommandHandler` gains three **optional** declarations:
  - `risk?: CommandRisk` — the impact level (`'low' | 'medium' | 'high'`);
  - `approval?: CommandApproval` — the declared posture (`'none' | 'required'`);
  - `idempotency?: CommandIdempotency` — `{ idempotent: boolean; keyOf?: (input: never) => string | null }`.
  **Optional on purpose** (`capability`'s own precedent, `types.ts:139-143`): a command that declares nothing
  behaves **exactly as before**, so no handler breaks and the uncovered set stays visible.
- **`R2` — the bus RECORDS what a command declares.** When a handler declares any of the three, the bus writes
  them onto the action log under a single named key (`context.commandContract`), so the audit record is
  **uniform and machine-readable** — a reader that exists today (the log / its export), not a field nobody sees.
- **`R3` — approval's ENFORCEMENT does not move.** The contract **declares** the posture; the **authority
  layer enforces** it (`escalation` + `pending_acts`). The contract's own header says so, so no future reader
  builds a second gate. **This is `S5` applied to the new fields.**
- **`R4` — the `S5` measurement is written down.** The appendix (`platform_points.md` §G `S5`) is corrected
  from *"0/2 — not verified in code this round"* to the **measured** state: the matcher is single; two
  services share it; the split is stated (not hidden).
- **`R5` — a test proves it.** The declarations round-trip onto the log; a command that declares nothing is
  byte-identical to before.

**Out of scope (stated so it is not mistaken for done):** a **dedupe store** for idempotency (the field is
declared and recorded; enforcement needs a store that does not exist — named as a follow-on if wanted);
**setting** the fields on the ~122 existing handlers (that is per-handler work with a per-handler judgement,
not a blanket edit — the same reasoning as `capability`'s *"153 guesses"* note).

---

## 3. The design

```ts
export type CommandRisk = 'low' | 'medium' | 'high'
export type CommandApproval = 'none' | 'required'
export type CommandIdempotency = {
  /** True when re-running the same input has no additional effect. */
  idempotent: boolean
  /** Derive a dedupe key from the input; null = not dedupable for this call. */
  keyOf?: (input: never) => string | null
}
```

- Added to `CommandHandler` as **optional** `readonly` fields, beside `capability` — with a header comment
  that names the **enforcement split** (`R3`).
- The bus merges the declared values into the log metadata's `context` under `commandContract`, **only when
  at least one is declared** — so an undeclaring command's log is **byte-identical** to before (`R2`).
- `keyOf` takes `never` for the same contravariance reason `capability`'s function does (`types.ts:158-165`).

---

## 4. Acceptance (what "done" is measured by)

1. `CommandHandler` carries the three optional declarations; `tsc --noEmit` clean on `shared`.
2. A handler that declares them produces a log whose `context.commandContract` carries exactly those values.
3. A handler that declares **none** produces a log **byte-identical** to before (no `commandContract` key).
4. The contract's header states the enforcement split (`approval` → the authority layer).
5. The existing command-bus suites stay green (**19 files**); the whole `shared` package stays green.
6. `platform_points.md` §G `S5` is corrected to the measured state; `C6`'s `C6b` is ticked with evidence.
7. A separate-agent hostile critic confirms each claim with a command+output; **RED-then-GREEN mutations**
   with **md5-verified** restores; a **two-route** re-measure of the ONE NUMBER.
8. All development docs updated in the **same** change.

---

## 5. Risks and their handling

| Risk | Handling |
|---|---|
| **A second approval gate is built.** | `R3`: the contract **declares**, the authority layer **enforces**; the header says so; the critic is asked to look for a second gate. |
| **The fields become "plumbing with no reader"** (row 1's anti-pattern). | The reader is the **action log** — the audit record and its export — and it is **proven by test** (`R5`), not assumed. |
| **An existing handler breaks.** | The fields are **optional**; an undeclaring command's log is **byte-identical** (acceptance 3). |
| **The `capability`-style blanket-edit temptation.** | Setting the fields on all handlers is **out of scope** — each is a per-handler judgement. |
| **`S5` is over-claimed as "one engine, done".** | The measurement is written **with its split stated** (two services, one matcher) — not rounded up. |

---

---

## 6. OUTCOME (2026-10-11) — BUILT, critic-verified

**Status: ✅ DONE.** Built as designed in §2:

| Contract | What landed |
|---|---|
| `R1` the contract carries all six facets | `CommandHandler` (`types.ts`) gained optional `risk` / `approval` / `idempotency` (+ the `CommandRisk` / `CommandApproval` / `CommandIdempotency` / `CommandContractMetadata` types). |
| `R2` the bus records what is declared | `commandContractMetadata(handler)` + the merge into `mergedMeta.context.commandContract` **before `persistLog`** — so it applies **wherever a log is written**. |
| `R3` approval's enforcement does not move | The bus never refuses on `approval`; the header comment names the authority layer as the owner (`S5`). |
| `R4` the `S5` measurement is written down | `platform_points.md` §G `S5` now carries the measurement (one matcher; two services) and is **not** ticked — recorded, not rounded up. |
| `R5` a test proves it | `__tests__/command-contract.test.ts` — **8 tests** (declaring records; non-declaring adds **no** key; `keyOf` never serialized; context preserved; **no-buildLog** case; `approval` does not block). |

**Proof.** `src/lib/commands` — **20 suites / 169 tests green**; whole `shared` — **206 of 207 suites, 2555 tests** (the 1 failure is the **known-environmental `CC-19`** sandbox suite, not this change); `tsc --noEmit` clean on `shared`. **5 RED-then-GREEN mutations**, each restore **md5-verified**: the helper returns null; no null guard; the bus refuses on `approval` (the second-engine failure); the handler's context overwritten — **all re-proved against the final code** after the fix below.

**The hostile critic (separate agent, a command + output per claim) found 1 REAL defect — fixed:**
- **The first draft merged the contract inside `buildLog`**, which returns `null` when a handler has **no `buildLog`** — so a declaring handler recorded **nothing**, even though a log **is** written from caller-supplied `metadata`. The merge moved to just before `persistLog`, and a test now covers the no-`buildLog` case. *(Its `D2` — 0 of ~93 commands declare the fields — is not a defect but a **named follow-on: `CC-63`**.)*

**THE ONE NUMBER: MOVED to 73 / 321 = 23%** (from 72/321) — `C6b` ☐→☑ is a real `+1 done` in §A. Re-derived by **two independent routes** (a Node parse and a Python parse), both **73 / 321**.

**Honest bound (stated so it is not mistaken for more):** the contract is uniform in **shape**; **adoption is 0**. And `S5` is **measured, not closed** — the matcher is one, the two RBAC services are not yet justified.

**Not done here:** setting the declarations on the ~122 handlers (`CC-63`); an idempotency **dedupe store**; the `S5` service-split justification.

---

*Source: `platform_points.md` row 19 + §C `C6`/§G `S5`; `COMPLETION-CALLBACKS.md` `CC-61`;
`PLAN-SUPPLEMENTARY-CORE-QUEUE.md` (new §S10). Written 2026-10-11. If this plan disagrees with the code, the
code wins and this plan is broken.*
