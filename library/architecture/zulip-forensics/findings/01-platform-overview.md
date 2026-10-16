# Zulip Study — Batch 01: the platform overview

**Status:** DONE · **Date:** 2026-10-16 · **Pole:** overview (no pole — the frame)
**Source:** `library/architecture/platforms/_extracted/zulip-main/` @ `12.0-dev+git`

This batch answers one question: **what is Zulip, as one measured picture?** Every number here
was produced by reading the source, not the documentation (rule 1). Where a first-party doc
makes a claim, the claim is quoted and then traced to code.

---

## §1.1 The one-paragraph shape

Zulip is a **Python/Django monolith** with a **separate Tornado service** for real-time push and
a **TypeScript client** that is *not* a framework SPA. Its defining structural choice — the
thing that makes it different from every other chat product in this study — is that **every
message carries a topic**, and the server's whole data model is organised around that
(`zerver/models/messages.py`, `zerver/models/user_topics.py`). It runs as **three process
families** on one machine: Django (HTTP + business logic), Tornado (long-poll event delivery),
and a fleet of **RabbitMQ-backed queue workers** for anything slow. Tenancy is **first-class and
internal**: the product is *multi-org by design*, and the code calls an organisation a
**`Realm`** everywhere.

---

## §1.2 The measured process topology — three families, one database

Measured from `zproject/computed_settings.py`, `zerver/worker/`, `zerver/tornado/` and
`docs/subsystems/queuing.md`:

| Process family | Entry point | Role | Files |
|---|---|---|---|
| **Django** (WSGI) | `manage.py runserver` / uWSGI | HTTP API + web app + business logic | `zerver/` (1,186) |
| **Tornado** | `manage.py runtornado` | **event queues** — the long-poll client sync | `zerver/tornado/` (10 files) |
| **Queue workers** | `manage.py process_queue --queue=X` | async work (email, push, thumbnails, analytics) | `zerver/worker/` (19 files) |

The `INSTALLED_APPS` list (`computed_settings.py:277`) is deliberately short — **14 apps**:

```
django.contrib.{auth,contenttypes,sessions,staticfiles}
confirmation · zerver · social_django · django_scim
django_otp.{otp_static,otp_totp} · two_factor · two_factor.phonenumber
```

Two of these are opt-in and reveal the product's split: **`zilencer`** (the mobile push-notification
bouncer — only needed in a hosted deployment) and **`corporate`** (billing + support — the
Zulip-Cloud side). The settings file gates them by name: `ZILENCER_ENABLED = "zilencer" in
INSTALLED_APPS`, `CORPORATE_ENABLED = "corporate" in INSTALLED_APPS`
(`computed_settings.py:295-296`).

**The single-process count matters for the study:** nine platforms in, Zulip is the first that is
*a multi-process server by construction* rather than "one binary + a database". The Tornado
split exists purely because Django's sync request/response model cannot hold hundreds of
thousands of open long-poll connections; Zulip moved that to an async runtime and kept the
business logic in Django. `ROOT_URLCONF` is swapped to `zproject.tornado_urls` **only when the
same codebase is booted as `runtornado`** (`computed_settings.py:307-311`) — one repository,
three entry points, one `manage.py`.

---

## §1.3 The four stores, named

| Store | What it holds | Evidence |
|---|---|---|
| **PostgreSQL** | All relational state — 812 migrations | `zerver/migrations/` |
| **RabbitMQ** | The internal queues; 17 `@assign_queue` processors | `zerver/lib/queue.py`, `zerver/worker/` |
| **Redis / Memcached** | Caching layer | `docs/subsystems/caching.md`, `MEMCACHED_LOCATION` |
| **The filesystem / S3** | Uploads, thumbnails, exports | `zerver/lib/thumbnail.py`, `LOCAL_UPLOADS_DIR` |

**812 migrations** (`0001`–`0812`, minus `__init__`; measured) — the second-largest migration
chain in the study after n8n's, and unlike n8n's they are **linear** (`0001_initial` forward),
not branched per app. `docs/subsystems/schema-migrations.md` documents the discipline: every
schema change is a numbered migration, and the project refuses to edit an applied migration.

---

## §1.4 The API surface — hand-written, not generated

| Fact | Value | How measured |
|---|---|---|
| OpenAPI spec | **`zerver/openapi/zulip.yaml`** — **31,869 lines** | `wc -l` |
| REST paths | **119** | `grep -c "^  /"` on the YAML |
| Distinct event types (spec) | **~53** | `grep` of `"type":` literals |
| API doc pages | 24 top-level files (`api_docs/`) | `ls` |
| `API_FEATURE_LEVEL` | **513** | `version.py` |

**The spec is the contract, and it is checked.** Zulip's OpenAPI file is not a summary written
after the fact — it is the source from which endpoint documentation *and* tests are generated,
and `zerver/openapi/` contains 8 files of machinery (`python_examples`, `javascript_examples`,
`markdown_extension`, …) that keep the spec, the docs, the Python client (`zulip` PyPI package)
and the tests in lockstep. This is the **strongest API-contract discipline in the study** — n8n
and OpenRig both have types, but neither has a single hand-maintained spec that four artefacts
are generated from.

---

## §1.5 The tenancy statement hides in a silenced linter check

The sharpest single line about Zulip's whole identity is not in the docs — it is a **Django
system check that the project deliberately silences** (`computed_settings.py:313-325`):

```python
SILENCED_SYSTEM_CHECKS = [
    # auth.W004 checks that the UserProfile field named by USERNAME_FIELD has
    # `unique=True`.  For us this is `email`, and it's unique only per-realm.
    # Per Django docs, this is perfectly fine so long as our authentication
    # backends support the username not being unique; and they do.
    "auth.W004",
    ...
]
```

And the model confirms it (`zerver/models/users.py:447-513`):

```python
class UserProfile(AbstractBaseUser, PermissionsMixin, UserBaseSettings):
    USERNAME_FIELD = "email"
    ...
    # Both fields are unique within a realm (in a case-insensitive
    # fashion). Since Django's unique_together is case sensitive, this
    # is enforced via SQL indexes created by
    # zerver/migrations/0295_case_insensitive_email_indexes.py.
    delivery_email = models.EmailField(blank=False, db_index=True)
    email = models.EmailField(blank=False, db_index=True)
    realm = models.ForeignKey("zerver.Realm", on_delete=CASCADE)
```

**What this means.** In Zulip, **the same email address may exist in many realms** — it is unique
*per organisation*, not globally. `USERNAME_FIELD = "email"` is the login key, and because that
key is not globally unique, **the realm is part of the identity triple** (email + realm). The
project's own comment says the case-insensitive enforcement is done by **a hand-written SQL
index in migration `0295`**, because Django's `unique_together` is case-sensitive. **This is the
first platform in the study where tenancy is encoded in the *primary identity* of the user, not
merely in a foreign-key fence.** It is the anatomy batch 03 will dissect.

---

## §1.6 The codebase has a dominant test mass

Measured with an honest walk (the mechanism from batch 00 §2.3):

| Bucket | Files | Lines |
|---|---|---|
| `zerver/tests/` (Python) | 150 | **163,703** |
| `web/tests/` + `web/e2e-tests/` (TS) | 21 | — |
| **All Python, excluding tests & migrations** | ~907 | ~202,219 |

**Tests are 38% of the `zerver/tests`-relative Python and 43% of all Python.** The backend's
test suite alone (163,703 lines) is **larger than seven of the nine studied platforms' entire
Python/code footprint**. Zulip's README advertises this explicitly ("we have invested in making
Zulip's code highly readable, thoughtfully tested, and easy to modify"). Per rule 1, the claim
is a claim — but the measured file mass supports it.

---

## §1.7 The three poles, as the overview sees them

| Pole | What the overview already shows | Batch |
|---|---|---|
| **P1 — aissistant** | Not a focus of the product; Zulip is human chat. But it has **bot infrastructure** (`zerver/models/bots.py`, `zerver/lib/bot_lib.py`, `outgoing_webhook.py`) and an **`/outgoing webhooks`** seam. No LLM anywhere in the tree. | 02 |
| **P2 — workspace** | **The strongest documented pole in the study.** `Realm` is a first-class model (`realms.py`, 1,497 lines), a documented subsystem (`docs/subsystems/realms.md`), and — per §1.5 — baked into the user's identity. | 03 |
| **P3 — automations** | **RabbitMQ + the queue workers** (17 processors), **scheduled messages** (`zerver/actions/scheduled_messages.py`), **reminders** (`reminders.py`), and **outgoing webhooks**. A delivery model that is *at-least-once with explicit dedup*, not a workflow engine. | 04 |
| **PX-W** | **A real widget model exists** — `widget_schema.ts` (zod discriminated union), `widgetize.ts`, `poll_widget.ts`, `todo_widget.ts`, plus `docs/subsystems/widgets.md`. **Likely the study's first.** | 05 |
| **PX-F** | ~463 hand-written `.ts` modules organised by feature; server-rendered hbs templates; **not React/Vue.** | 05 |
| **PZ** | Linters (`tools/`), the OpenAPI contract machinery, and a heavyweight CI culture. | 06 |

---

## §1.8 Divergences and honest limits (batch 01)

| # | Divergence / limit | Detail |
|---|---|---|
| **D1-1** | **Two "versions" in one tree** | `version.py` says `12.0-dev+git` while `LATEST_RELEASE_VERSION = "12.3"`. The extract is a *development* snapshot of the 12.x line, not a release. |
| **D1-2** | **Three unrelated version constants** | `DESKTOP_MINIMUM_VERSION` / `DESKTOP_WARNING_VERSION` belong to `zulip-desktop` (a different product); `API_FEATURE_LEVEL = 513` is a monotonic counter. None is this tree's version. |
| **D1-3** | **The extract is 99.92%, not 100%** | 7 Mattermost-import test fixtures exceeded Windows' 260-char path limit (batch 00 §1.2). Named, not hidden. |
| **D1-4** | **The doc body is enormous and unverified here** | 249,760 words of contributor docs; batch 01 quotes them but defers code-verification of each claim to the relevant pole batch. |
| **D1-5** | **No git history** | The extract has no `.git`, so **the retirement rule (rule 10) cannot read Zulip's migration *history* the way it read n8n's and Multica's** — only the *present* 812-migration chain. This is a real methodological limit and batch 04/06 must work around it by reading migration *bodies* rather than commit messages. |

---

## §1.9 Batch-01 verdict

Zulip is **the most mature, largest, and most conventionally-engineered platform in the study**:
a 425,702-line Python monolith, a 153,253-line TypeScript client, 249,760 words of docs, an
812-step linear schema history, and a 31,869-line hand-maintained API contract that four
artefacts are generated from. **Its architectural centre of gravity is not the agent and not the
workflow — it is the realm**, and the realm is encoded so deep that a user's *login key* is only
unique within it. **The single most important thing to carry forward is §1.5's silenced linter
check:** tenancy in Zulip is not a fence bolted onto a single-tenant core; it is assumed by the
identity model itself.

---

*Batch 01 · Zulip · three process families, four stores, 812 migrations, 119 REST paths ·
tenancy in the identity triple · no LLM anywhere.*
