# AI workers — how a machine gets an identity

**In one sentence.** An AI worker is an API key marked `principal_kind =
'ai_worker'`, which makes it issue an `ai_worker:` subject and therefore appear
as a machine to the journal, the ledger and the authority resolver.

## The gap this closed

`ai_worker` was one of four principal kinds and **the only one nothing could
produce**. No authentication path issued a subject that parsed to it, so:

- no graph ceiling could bound a machine differently from a person
- no delegation, trust grant or denial could target one
- the **effect-class matrix**, which exists specifically to bound machines and
  delegated authority, never engaged
- the journal recorded every machine as `service`

The kind was a type with no inhabitants, and the governance layer's
machine-specific half was unreachable.

## The design, and why

**An AI worker authenticates with a credential, and we already had those.**

| | |
|---|---|
| Table | `api_keys`, column `principal_kind` |
| Values | `null` (= service, the default) or `ai_worker` |
| Subject issued | `ai_worker:<keyId>` instead of `api_key:<keyId>` |
| Set via | `POST /api/api_keys/keys` with `principalKind: 'ai_worker'` |

An API key is already hashed, revocable, org-scoped, rate-limited and
role-bearing. A parallel identity system for AI workers would have duplicated
every one of those controls and given us two places for them to drift apart.
Marking a key changes only the subject it issues — and that is enough, because
everything downstream keys off the principal kind.

**Three deliberate limits:**

- **Only `service` and `ai_worker` are accepted.** Not `human`: a credential
  impersonating a person is the one thing the principal split exists to prevent.
  Not `system`: that is the platform acting on its own behalf, never something a
  key should be able to claim.
- **Null, not `'service'`, when unset.** Every key issued before the column
  existed holds null, and a default would make new rows differ from old ones for
  no reason. Both read as a service.
- **No database check constraint.** The application validates against the
  principal vocabulary; a constraint would need altering every time that
  vocabulary grows, coupling a migration to a type.

## What it looks like when one acts

Verified against the running instance, 2026-08-12:

```text
action_logs:    actor_kind = ai_worker   actor_user_id = <the key's id>
ledger_events:  actor_kind = ai_worker   correlation_id = <this request's id>
```

Not `service`. Not `human`. And the correlation id is item 14 working alongside
it, so a task that fans out into many acts can be reassembled.

## The trap it set, and the lesson

Adding a kind **made every `kind === 'service'` check silently incomplete.**
Those checks all meant *"resolve this actor's permissions from its key row"*, and
there were suddenly two kinds that needed it. `RbacService` tested only for
`service`, so an AI worker fell through to the **human** branch:

```text
DriverException: invalid input syntax for type uuid:
  "ai_worker:28c2b7f3-529e-4591-812c-c16bfcc1f738"
```

Every unit test passed. Typecheck passed. The bug lived at the seam between a new
enum value and old conditionals that had quietly become partial, and only
appeared when a real request hit a real database.

The fix is a **named predicate**, `isApiKeyBackedKind()`, so the next kind is a
question somebody has to answer rather than a runtime surprise. It is
deliberately narrower than the existing `isMachinePrincipal()`, which also
covers `system` — the platform acting from a CLI or scheduled job, with no key
row at all. Reusing the broader one here would have looked correct and failed
differently.

## What this unblocks

- **Charter grants** (roadmap, deferred) — needed an AI worker to exist first
- **Hermes** — its agents authenticate as `ai_worker` credentials, so everything
  they do is bounded and attributed as machine work from the first act
- **Budget as a ceiling** — spend can now be attributed to a machine actor

Related: [`denials.md`](denials.md), [`delegations.md`](delegations.md),
[`authority-overview.md`](authority-overview.md).
