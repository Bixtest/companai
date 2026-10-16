# Zulip Study — Batch 03: the workspace (P2)

**Status:** DONE · **Date:** 2026-10-16 · **Pole:** **P2 — the workspace**
**Source:** `library/architecture/platforms/_extracted/zulip-main/` @ `12.0-dev+git`

**The question this batch answers:** *how is a tenant built, and how is it fenced?* In Zulip
the tenant is the **`Realm`** (user-facing name: *organization*). This is the **strongest P2
documented pole in the study** — Zulip ships a whole subsystem doc for it, and the pin already
found the sharpest fact: a user's login key (email) is unique only *within* a realm. This batch
reads the model, the host-resolution boundary, the role/permission system, and the audit log.

---

## §3.1 The container: a `Realm` with 95 fields

`Realm` lives in `zerver/models/realms.py` (1,497 lines — the largest model file in the tree).
Measured: **95 model fields** on the `Realm` class alone. It is not a thin `(id, name, created)`
row; it is the **full configuration surface of an organization** — settings for
authentication, notifications, policy defaults, upload limits, push-notification state, and
more.

The three identity fields that matter (`realms.py:192-201`):

```python
# A short, identifier-like name for the organization.  Used in subdomains;
# e.g. on a server at example.com, an org with string_id `foo` is reached
# at `foo.example.com`.
string_id = models.CharField(max_length=MAX_REALM_SUBDOMAIN_LENGTH, unique=True)

# uuid and a secret for the sake of per-realm authentication with the push notification
# bouncer.
uuid = models.UUIDField(default=uuid4, unique=True)
uuid_owner_secret = models.TextField(default=generate_realm_uuid_owner_secret)
```

**What this says.** A realm has **three distinct identifiers for three distinct jobs**:
`id` (the integer primary key used in foreign keys), **`string_id`** (the human/subdomain name,
globally unique), and **`uuid`** (a stable opaque id shared with the push-notification bouncer
so the *notification service* — a separate machine — can authenticate a realm without knowing
its name). The `uuid_owner_secret` is the realm's credential to *that* external service. **This
is the first platform in the study where the tenant holds a cryptographic identity of its own**,
not merely a row id.

**The lookup is by name** (`realms.py:1325`):

```python
def get_realm(string_id: str) -> Realm:
    return Realm.objects.get(string_id=string_id)
```

---

## §3.2 The boundary: realm is resolved from the Host header, by subdomain

The tenancy fence is **not** a `WHERE realm_id = ?` filter applied by hand. It is resolved once,
from the request, in `zerver/lib/subdomains.py` (96 lines — the entire module):

```python
def get_subdomain(request: HttpRequest) -> str:
    host = request.get_host().lower()
    subdomain = get_subdomain_from_hostname(host)
    assert subdomain is not None
    return subdomain

def get_subdomain_from_hostname(host, default_subdomain=Realm.SUBDOMAIN_FOR_ROOT_DOMAIN):
    m = re.search(rf"\.{settings.EXTERNAL_HOST}(:\d+)?$", host)
    if m:
        subdomain = host[: m.start()]
        if default_subdomain is not None and subdomain in settings.ROOT_SUBDOMAIN_ALIASES:
            return default_subdomain
        return subdomain
    for subdomain, realm_host in settings.REALM_HOSTS.items():
        if re.search(rf"^{realm_host}(:\d+)?$", host):
            return subdomain
    return default_subdomain
```

**The mechanism, named (rule 6):**
- **Subdomain routing.** On a server at `example.com`, `foo.example.com` → realm `string_id = "foo"`.
- **`REALM_HOSTS` — a custom-domain override.** A realm can also be reached at a *completely
  different* hostname (`:41-43`). This is how a big customer gets `chat.theircompany.com`
  instead of `theircompany.example.com`.
- **`ROOT_SUBDOMAIN_ALIASES`** maps special subdomains (like `www`) back to the root realm.
- **The dev environment uses the same code**: `*.zulipdev.com` (the doc, `realms.md:60-74`,
  describes this; the code confirms it, since `EXTERNAL_HOST` drives everything).

**And the fence itself** is one comparison (`zerver/decorator.py:301`, `:489`):

```python
if user_matches_subdomain(get_subdomain(request), user_profile):
    ...
# subdomains.py:
def user_matches_subdomain(realm_subdomain: str, user_profile: UserProfile) -> bool:
    return user_profile.realm.subdomain == realm_subdomain
```

**★ The load-bearing P2 finding.** Zulip's tenancy is enforced by **deriving the realm from the
request's Host and checking the authenticated user belongs to it**. A request to
`acme.example.com` from a user whose `user_profile.realm.subdomain` is `globex` **fails the
fence immediately** — before any row is fetched. **The realm is the ambient context of every
request, not a parameter a caller passes.** This is structurally the opposite of a design where
the tenant is an argument the developer might forget.

---

## §3.3 Identity: the realm is part of who a user is

The pin found this; batch 03 confirms and extends it. From `zerver/models/users.py`:

```python
class UserProfile(AbstractBaseUser, PermissionsMixin, UserBaseSettings):
    USERNAME_FIELD = "email"
    ...
    # Both fields are unique within a realm (in a case-insensitive fashion).
    delivery_email = models.EmailField(blank=False, db_index=True)
    email = models.EmailField(blank=False, db_index=True)
    realm = models.ForeignKey("zerver.Realm", on_delete=CASCADE)
```

And the project **silences Django's own warning** about it (`computed_settings.py:313-325`):
*"auth.W004 checks that the UserProfile field named by USERNAME_FIELD has `unique=True`. For us
this is `email`, and it's unique only per-realm."*

**Three consequences (all measured):**
1. **The same person can be a member of many realms** with the same email, as distinct
   `UserProfile` rows.
2. **The case-insensitive uniqueness is a hand-written SQL index** in migration `0295`
   (`users.py:506-509` explains why Django's `unique_together` — which is case-*sensitive` —
   could not be used).
3. **`delete on CASCADE` from realm** — deleting a realm deletes its users. The realm is the
   *owning* parent of the person.

**This is the deepest form of tenancy in the study.** In n8n, a `User` is a global object that
*memberships* attach to projects; in buzz, a community is resolved from the host but users are
separate. In Zulip, **the user does not exist without the realm** — the realm is a column on the
user row, and the login key is only meaningful inside it.

---

## §3.4 Membership and roles: 5 roles, 8 system groups, unlimited custom groups

**Roles** (`users.py:565-576`) — a fixed ladder on the user row:

| Constant | Value | API name | Display |
|---|---|---|---|
| `ROLE_REALM_OWNER` | 100 | `owner` | Organization owner |
| `ROLE_REALM_ADMINISTRATOR` | 200 | `administrator` | Organization administrator |
| `ROLE_MODERATOR` | 300 | `moderator` | Moderator |
| `ROLE_MEMBER` | 400 (**default**) | `member` | Member |
| `ROLE_GUEST` | 600 | `guest` | Guest |

**System groups** (`groups.py:11-19`) — **8 built-in groups**, each with a `role:` slug:

```
role:nobody · role:owners · role:administrators · role:moderators
role:fullmembers · role:members · role:everyone · role:internet
```

**On top of the ladder sits a full custom-group system.** `UserGroup`
(`groups.py:33`) is a real model with a **`ManyToManyField` through a membership table**
(`UserGroupMembership`), so groups can nest and overlap. **The permission model is not the role
ladder** — the ladder is a convenience; the *actual* authority is **group-based**. Every
sensitive setting on a `Realm` is a `GroupPermissionSetting`, carrying three policy flags
(`realms.py`, e.g. `can_summarize_topics_group` at `:914`):

```python
can_summarize_topics_group=GroupPermissionSetting(
    allow_nobody_group=True,
    allow_everyone_group=True,
    default_group_name=SystemGroups.EVERYONE,
),
```

**The measured shape.** A `Realm` field named `can_<action>_group` decides *who* may do
`<action>` — and it can be set to `role:nobody` (nobody), a system group, or a **custom group the
realm built**. **Measured: 38 such `can_*_group` permission fields on `Realm`.** **This is the
most granular per-tenant permission system in the study** — finer than n8n's flat 206-scope
list, because here the *granting unit* (a user-defined group) is itself tenant-defined data.

---

## §3.5 ★ The audit log: 117 event types, with a numeric namespace that encodes the topology

`zerver/models/realm_audit_logs.py` (313 lines) defines `AuditLogEventType` with **117 named
integer constants**. The numbering is **not arbitrary** — it partitions the space by *where the
event happened* (`realm_audit_logs.py:142-170`):

```python
# REALM_DEACTIVATED = 201, and REMOTE_SERVER_DEACTIVATED = 10201
REMOTE_SERVER_DEACTIVATED = 10201
...
REMOTE_REALM_VALUE_UPDATED = 20001
REMOTE_PLAN_TRANSFERRED_SERVER_TO_REALM = 20002
```

**The namespace, decoded:**

| Range | Meaning |
|---|---|
| 1xx–2xx | Events **inside a realm** (101 USER_CREATED, 201 REALM_DEACTIVATED, …) |
| 9xx | Channel-folder events (901–905) |
| 1001 | `INVITATION_REVOKED` |
| **10xxx** | Events on a **remote server** — offset by exactly **+10000** from their realm twin |
| **20xxx** | Events on a **remote realm**, reported back to the bouncer |

**Why this matters (rule 10 — the retirement rule, and the "most honest document" idea).**
Zulip has **three tiers of self-description**: a realm; the *server that hosts* realms
(`RemoteRealm`); and the **central push-notification bouncer** that many self-hosted servers
report to (`RemoteServer`). The audit-log numbering **encodes that hierarchy arithmetically** —
a reader can tell from the *number alone* whether an event is local, server-scoped, or
bouncer-scoped. **This is the clearest example in the study of a data model that documents its
own topology.**

The base class `AbstractRealmAuditLog` shares fields between the local and remote logs
(`event_time` with a **`backfilled` boolean** — *"If True, event_time is an overestimate… Can be
used by migrations when introducing a new event_type"*). **That `backfilled` flag is rule 10 in
miniature**: it admits, in the schema, that a historical record is not trustworthy about *when*
it happened. The extra-data keys encode old/new values as stringified integers (`OLD_VALUE = "1"`,
`NEW_VALUE = "2"`, `ROLE_COUNT = "10"`).

---

## §3.6 Realm creation, invitations, and the initial owner

- **Creation** (`zerver/actions/create_realm.py`) has two documented paths (`realms.md:20-35`):
  a **unique link** (`./manage.py generate_realm_creation_link`, expiry
  `CAN_CREATE_REALM_LINK_VALIDITY_DAYS`, **7 days**, single-use) and **open realm creation**
  (a server setting). Each path creates the realm **and an administrator user**.
- **The root domain is special.** `is_subdomain_root_or_alias` and
  `SUBDOMAIN_FOR_ROOT_DOMAIN` (`subdomains.py:48-59`) — a realm *can* claim the root domain, but
  only if `is_root_domain_available()` says the root is not already taken.
- **Domain restriction.** `RealmDomain` (`realms.py:1406-1419`) — when
  `emails_restricted_to_domains` is on, only listed domains may join; `allow_subdomains` extends
  it; the constraint is `unique_together = ("realm", "domain")`.

---

## §3.7 Divergences and honest limits (batch 03)

| # | Divergence / limit | Detail |
|---|---|---|
| **D3-1** | **The realm is 95 fields — a config monolith** | Every policy default lives on one wide row. It is a *single-tenant-per-row* design that scales to thousands of realms but makes each realm a large object. |
| **D3-2** | **Subdomain routing assumes wildcard DNS** | `realms.md:45-48` requires a wildcard `A` record; without it, realms must be reached via `REALM_HOSTS`. The code *supports* the override but the normal path depends on DNS the operator must configure. |
| **D3-3** | **The fence is a Host-derived check, not a DB policy** | There is **no Postgres row-level security** in this tree (searched: 0 RLS policies). Containment is the application's `user_matches_subdomain` + every query being written realm-aware. **A query that forgets `realm=` is a bug the model does not prevent.** |
| **D3-4** | **Two identity systems coexist** | `UserProfile` (Zulip's own) sits beside Django's `contrib.auth` — Zulip uses `AbstractBaseUser` and silences the framework's uniqueness check rather than reshaping auth. |
| **D3-5** | **The push-bouncer tier is partly out of this tree** | `RemoteRealm` / `RemoteServer` models exist, but the bouncer itself is a separate deployment. Batch 03 can read the *client* half only. |

---

## §3.8 Batch-03 verdict

Zulip's workspace is the study's **most complete tenancy implementation**, and its completeness
is not a feature bolted on — it is the spine. The realm is (1) a **95-field configuration
object**, (2) resolved **ambiently from the Host header** by subdomain (or a custom domain via
`REALM_HOSTS`), (3) **part of the user's identity** (email unique only per-realm, enforced by a
hand-written SQL index), (4) governed by **5 roles over 8 system groups plus unlimited
tenant-defined custom groups**, and (5) recorded in a **117-event audit log whose numeric
namespace encodes a three-tier topology** (realm / remote server / remote realm).

**The single most transferable P2 mechanism** is the **ambient-context resolution**: the tenant
is decided once, from the request, and every downstream check is a comparison against it —
rather than a `tenant_id` a developer must remember to filter on. **The honest counterweight** is
D3-3: Zulip has *no database-level enforcement* of that fence; it is an application invariant,
held by discipline and a very large test suite.

---

*Batch 03 · Zulip · the realm is the spine · subdomain-resolved, identity-embedded,
group-governed, audit-logged · no RLS — the fence is application-held.*
