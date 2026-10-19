/**
 * `CC-125` — **the floor**: the capabilities no configuration may ever grant to a machine.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHY A FLOOR AT ALL, IF THE CEILING IS CONFIGURATION
 * ─────────────────────────────────────────────────────────────────────────────
 * `CC-128` made the ceiling **configuration**: the platform admin sets it, tenants inherit a subset, and a
 * tenant may only narrow. That is the right shape for every business capability — a customer's appetite for
 * what its agents may do is the customer's business.
 *
 * It is the wrong shape for the five things below, because **a machine that can grant itself authority
 * makes every other control decoration.** The locks would be held by the thing they are meant to lock out.
 * So these five are a **constant in code**, and the owner's answer on 2026-10-19 was *"we follow your
 * recommendations"* — recorded as a ruling, not a default (`PLAN-2026-10-18-one-agent.md` §4.5).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * IT APPLIES TO MACHINES ONLY, AND THAT IS THE WHOLE DISTINCTION
 * ─────────────────────────────────────────────────────────────────────────────
 * A **human** holding any of these is the point of the system: somebody has to mint the keys, grant the
 * roles and edit the types. The floor is not "nobody may do this" — it is *"nobody may CONFIGURE a machine
 * to do this"*. A person is bounded by their own grant and by `CC-128`'s ceiling; a machine is additionally
 * bounded here.
 *
 * `system` is included with `service` and `ai_worker`: the platform acting on its own behalf is still not a
 * person, and a floor that exempted it would be a floor with a door in it.
 *
 * **★ AND THAT ENTRY WAS INERT UNTIL `CC-136`, WHICH IS WHY IT IS WORTH READING.** `PrincipalKind`
 * declared `'system'` from the start and `parseSubject` could never produce it — it recognised
 * `ai_worker:` and `api_key:` and called **everything else** `human`. `decideFor` takes a *subject
 * string* and parses it, so a platform act arrived as a **human**, and `human` is the one kind this
 * floor does not bind. The entry was correct and unreachable: a control with no producer, which is
 * `CC-101`'s class in the identity layer. **`CC-136` taught the parser and the derivation, and the
 * entry is live from that change onward** — a `system:` subject is now refused the seven ids below.
 * The row's own claim that the hole was "past the floor **and** the ceiling" was corrected in
 * `PLAN-CC-136-system-subject.md` §2.1: `CC-128`'s ceiling is resolved by tenant, not by kind, so
 * this was a floor hole and only a floor hole.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHAT THE FIVE CATEGORIES ACTUALLY ARE, MEASURED — AND TWO OF THEM ARE NOT WHAT THEY SOUND LIKE
 * ─────────────────────────────────────────────────────────────────────────────
 * The owner's wording is five categories. Mapping them to real capability ids found **two that have no
 * capability expressing them**, and saying so is part of the work — a floor that silently covers four of
 * five looks complete.
 *
 * | The category | The capability | What the measurement found |
 * |---|---|---|
 * | minting or widening credentials | `api_keys.create` | `api_keys.delete` is **excluded**: deleting a key narrows. Named here so the omission is a decision, not an oversight. |
 * | granting roles or writing delegations | `auth.roles.manage`, `auth.delegations.manage`, `auth.acl.manage`, `auth.denials.manage` | `auth.denials.manage` is included because **lifting** a denial widens — the capability is symmetric and a machine must not hold either end. |
 * | editing the catalogue or the type bundles | `ai_assistant.settings.manage` | There is **no** `ai_assistant.agent_types.*` capability. This one guards the type routes, the binding routes **and the mutation-policy / loop-override / prompt-override routes** — so a machine holding it could raise its own gate. That is the category in spirit and then some. |
 * | writing to, or erasing, the audit ledger | **none exists** | Measured: the audit capabilities are `view_*`, `undo_*`, `redo_*`. **Nothing can erase the ledger**, which is the correct end state — recorded as a finding rather than left as an empty row. |
 * | anything that reaches across tenants | `directory.tenants.manage` | The only capability whose effect is not confined to one tenant. |
 *
 * **Three consequences worth stating plainly.** The floor is **nine** ids, not five — the granting
 * category expands to four (roles · delegations · ACL · denials) and, since `CC-137`, the two user
 * capabilities join it, so the arithmetic is 1 + 4 + 1 + 1 + 2 and `MACHINE_FLOOR.size` is asserted as 9
 * in `lib/__tests__/machineFloor.test.ts`. One category is **empty because the capability it would name
 * does not exist**, which is a stronger result than a refusal: the ledger cannot be erased by anyone,
 * machine or human. And the count is the one number in this file that a reader will trust without
 * re-counting, so it is pinned by a test rather than by this sentence.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHAT USED TO BE A GAP HERE, AND WHY IT WAS TWO DEFECTS — `CC-137`, CLOSED 2026-10-19
 * ─────────────────────────────────────────────────────────────────────────────
 * Category 2 ("granting roles") was fully covered for the four *direct* writers, and "grant a role" was
 * ALSO reachable through `auth.users.create` / `auth.users.edit`, neither on the floor, whose `roles`
 * arrays were checked only against the actor's own ACL (`assertActorCanGrantRoles`,
 * `lib/grantChecks.ts:58-90`, subset check, early return for a superadmin).
 *
 * **The measurement that made the row worth more than its own description:** the floor's
 * `auth.roles.manage` entry has been live since `CC-125`, and the users route **never asked a question
 * this floor answers** — it only ever asked *"do you hold `auth.users.edit`?"*. A control that is correct
 * and that no caller calls is `CC-101`'s class, and it was here, one layer down. So the fix had two
 * halves: the route now asks for `auth.roles.manage` when a request carries roles (**that is what makes
 * the existing answer reachable**), and the two user capabilities join the list below (**that is what
 * refuses the machine at the route's own gate**). Either half alone leaves a door: without the first, a
 * machine with `auth.users.edit` still reaches the handler; without the second, the handler's capability
 * check is the only thing standing there.
 *
 * `auth.users.list` and `auth.users.delete` stay off: reading is not granting, and deleting narrows.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHY THIS IS CODE AND NOT A ROW IN THE CEILING TABLE
 * ─────────────────────────────────────────────────────────────────────────────
 * The ceiling is data because a customer may narrow it. The floor is **code** because it must not be
 * raisable by the thing it constrains — and a row is reachable by whoever can write the table. The only way
 * to raise the floor is to change this file and redeploy, which is exactly the cost it should have.
 */

/**
 * The actor kinds the floor binds.
 *
 * `human` is deliberately absent: the floor constrains what a **machine** may be configured to do, and a
 * person is bounded by their grant and the tenant ceiling instead.
 */
export const FLOOR_BOUND_KINDS = ['ai_worker', 'service', 'system'] as const

/**
 * The floor. **Nine ids behind five categories** — the arithmetic is 1 (`api_keys.create`) + 4 (granting
 * is expressed four ways) + 1 (`ai_assistant.settings.manage`) + 1 (`directory.tenants.manage`) + 2 (the
 * user capabilities, `CC-137`) — and every entry carries its reason.
 *
 * Adding to this list costs a machine some autonomy. Removing from it lets a destructive act run
 * unattended — which is why the tie-break, when a case is genuinely arguable, is the one `CC-132` wrote
 * down: **when in doubt, classify higher.**
 */
export const MACHINE_FLOOR: ReadonlyMap<string, string> = new Map([
  ['api_keys.create', 'minting a credential is minting authority'],
  [
    'auth.roles.manage',
    'a role is a grant; a machine that can write one can grant itself anything',
  ],
  [
    'auth.delegations.manage',
    'a delegation is a grant with an expiry; same door, different handle',
  ],
  ['auth.acl.manage', 'the ACL is the grant list itself'],
  [
    'auth.denials.manage',
    'lifting a denial WIDENS — the capability is symmetric and both ends are the same door',
  ],
  [
    'ai_assistant.settings.manage',
    'it guards the mutation-policy and loop-override routes, so a machine holding it could raise its own gate',
  ],
  [
    'directory.tenants.manage',
    'the tenant is the outermost boundary every other scope is defined by',
  ],
  // `CC-137`. These two are how a person is created and how their access is written, so a machine holding
  // either is granting by another name — and the route's own `roles` array was the open door. They are
  // separate entries rather than one, because they are separate capabilities and a reader must be able to
  // see that `auth.users.list` and `auth.users.delete` are deliberately NOT here.
  [
    'auth.users.create',
    'creating a person is the first half of granting; the same request carries their roles',
  ],
  [
    'auth.users.edit',
    'editing a person is how their roles are rewritten — a subset check is not a grant check',
  ],
])

/** True when this principal kind is bound by the floor. */
export function isFloorBoundKind(kind: string | null | undefined): boolean {
  return typeof kind === 'string' && (FLOOR_BOUND_KINDS as readonly string[]).includes(kind)
}

/**
 * The refusal message when a machine asks for a floor capability, else `null`.
 *
 * Returns a **message** for the same reason `CC-128`'s ceiling does: the caller puts it in a `Decision`
 * reason, and an operator who reads "the actor does not hold it" will go and grant it — which is the one
 * thing that will not help.
 */
export function floorRefusalFor(
  kind: string | null | undefined,
  capability: string,
): string | null {
  if (!isFloorBoundKind(kind)) return null
  const reason = MACHINE_FLOOR.get(capability)
  if (!reason) return null
  return (
    `${capability} is on the machine floor and no configuration may grant it to a ${kind}: ${reason}. ` +
    'A person may hold it; a machine may not be configured to.'
  )
}
