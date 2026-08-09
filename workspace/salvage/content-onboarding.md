# Salvage analysis — `content` and `onboarding`

**Analysed:** 2026-08-08 · **Status: complete**
**Verdict: KEEP both.** Both were misdescribed in my earlier catalogue entries.
**Rule applied:** [Cookbook Rule One](../COOKBOOK.md) — doubt resolves to keep.

---

## `onboarding` — 4,645 LOC · 1 table · **KEEP, enabled**

### It is not "onboarding flows". It is self-service company sign-up.

I catalogued this as "onboarding request flows… useful when the Company Compiler
starts provisioning new companies". That undersold it. Reading the code:

`api/post/onboarding.ts` accepts first name, last name, **organisation name**,
terms acceptance, marketing consent and a password, then:

1. Creates an onboarding request with a hashed verification token and an expiry
2. Sends a verification email
3. Notifies an administrator
4. On verification, provisions a **tenant, an organisation and a user**
5. Sends a "workspace ready" email

Its table carries `tenant_id`, `organization_id`, `user_id`, `token_hash`,
`processing_started_at`, `expires_at`, `completed_at`, `last_email_sent_at`.

**This is tenant provisioning — the front door to the platform.**

### Why it matters to us specifically

Our product thesis begins: *"A business describes itself in plain language…"*
Something has to receive that description, create the company, and let the person
in. This is that mechanism, already built, with email verification, expiry,
rate limiting, password policy and four email templates
(`VerificationEmail`, `AdminNotificationEmail`, `WorkspaceReadyEmail`,
`FeedbackEmail`).

The Company Compiler will need exactly this as its entry point. Rebuilding
sign-up, verification and tenant creation is a week we do not need to spend.

### Coupling

| Q | Finding |
|---|---|
| Q2 | Three matches, none of them real dependencies: `modules.ts` registers it, `globals.css` globs it for Tailwind, and the CLI resolver knows its package path |
| Q3 | Not declared by anything |
| Q4 | `acl.ts`, API routes, emails, its own entity and validators |
| Q5 | The token/expiry/verification pattern is generic |
| Q6–Q7 | None |

It imports `auth`'s `User` entity — a module we keep. **Clean.**

---

## `content` — 1,382 LOC · no tables · **KEEP, parked**

### It is not a CMS. It is the legal pages.

I catalogued this as "a small content-management module". Wrong. The entire
package is:

```text
ContentLayout.tsx      a layout wrapper
privacy/page.tsx       the privacy policy page
terms/page.tsx         the terms page
+ tests
```

No entities, no tables, no editor, no content model.

### Why keep it

Every platform that lets people sign up needs a privacy policy and terms page,
and `onboarding` collects `terms_accepted` — so the pages those terms refer to
must exist. It is 1,382 lines of layout and routing that we would otherwise write
by hand.

Under Rule One this is not even borderline: tiny, harmless, and needed the moment
anyone signs up.

**Park it** — the code stays, the module can be switched on when we have real
legal text to put in it.

---

## Corrections to my own catalogue

Both entries in [`attic/CATALOG.md`](../attic/CATALOG.md) were written from
module names and sizes rather than from the code. Both were wrong:

| Module | I wrote | Reality |
|---|---|---|
| `onboarding` | "onboarding request flows" | Self-service sign-up and **tenant provisioning** |
| `content` | "a small content-management module" | The **privacy and terms pages** — no CMS at all |

**This is [`LESSONS.md`](../../LESSONS.md) L1 in a new form** — a confident label
standing in for an inspection. The catalogue was written ahead of the analyses to
stop it falling behind, which was right, but writing entries before reading the
code meant two of them described modules that do not exist as described.

**Rule going forward:** a catalogue entry is written **after** its salvage
analysis, never before. Entries added ahead of analysis are marked `UNVERIFIED`
until the analysis lands.

---

## Action

1. Enable `onboarding`; park `content`.
2. Remove both from `attic/CATALOG.md` — neither is going to the attic.
3. Mark every remaining unanalysed catalogue entry `UNVERIFIED`.
4. Note in `planning/08` that tenant provisioning already exists — the Company
   Compiler has a front door.
