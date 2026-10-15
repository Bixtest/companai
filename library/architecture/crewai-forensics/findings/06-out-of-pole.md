# CrewAI forensics — Batch 06: out-of-pole (PZ), and closing the tenancy question

**What belongs in this batch.** Everything the pole batches did not claim: the security layer, the
identity story, telemetry, the auth/enterprise surfaces, the MCP client, and the docs practice.
It also **closes the question Batch 04 §4.6 left open**: does CrewAI have a tenancy model?

**Method rules in force.** Read from `lib/**/*.py` only; `docs/**/*.mdx` never used as authority
(rule 1). Every claim carries `file:line`. No platform comparison inside a batch (rule 5). Pole-tag
every finding (rule 9); name every capability (rule 6), including absences. Report divergences and
correct earlier batches where the evidence now demands it (rule 13).

Paths relative to `library/architecture/platforms/_extracted/crewAI-main/`. Version `1.15.28`.

---

## 6.0 Answer to the open question: there is no tenancy model

Batch 04 could not find a tenant concept; this batch resolves it by reading the security layer in
full. The security directory is **274 lines across four files**, and the central class is
`SecurityConfig` (`security/security_config.py:20`). Its own docstring lists what it is *for*:

```
- Authentication credentials *TODO*          (security_config.py:25)
- Identity information (agent fingerprints)
- Scoping rules *TODO*                      (:27)
- Impersonation/delegation tokens *TODO*    (:28)
```

And the only field it actually has is:

```python
fingerprint: Fingerprint = Field(                 # security_config.py:39
    default_factory=Fingerprint, description="Unique identifier for the component"
)
```

Three of the four purposes are literally `TODO` in the shipped source. `Authentication credentials`,
`Scoping rules` and `Impersonation/delegation tokens` are **unimplemented** — and those three are
exactly the three things a tenancy model is made of (who you are, what you may see, acting on
behalf of someone).

The word "tenant" was searched for across both packages. It appears in twelve files
(`crewai/**` + `crewai_core/**`), and **not one is a tenancy model**: they are ChromaDB/RAG config
(`rag/chromadb/config.py`, `constants.py`, `factory.py`), Azure/OpenAI embedding provider types
(`rag/embeddings/providers/…`), the skills registry (a publish scope, not a data scope),
`utilities/agent_utils.py`, and two files of *generated catalog prose*

(`crewai_core/platform_catalog.py` — which quotes other products' documentation) plus `plus_api.py`
(HTTP calls to the hosted service). There is no tenant type, no tenant column, no tenant parameter
on any data path.

What *does* exist is **organization**, and it lives in the hosted API, not here:

`lib/cli/src/crewai_cli/organization/main.py:12` `class OrganizationCommand(...)` — `list()`
(`:17`) and `switch(org_id)` (`:53`) both call `self.plus_api_client.get_organizations()`
(`:19`, `:55`). The client is `PlusAPI` (`crewai_core/plus_api.py:149`) with a `base_url`
(`:182`), and `get_organizations` (`:455`) / `get_triggers` (`:552`) are ordinary HTTP calls.

**➜ F6-1 [PZ → corrects the frontier] — CrewAI has NO tenancy model; it has a *hosted account*
model reached over HTTP.** **Plain meaning:** the open-source framework knows nothing about who
owns what data. There is a hook for authentication, scoping and impersonation, and it is empty with
a `TODO` in the docstring. The user's *organizations* exist only inside CrewAI's SaaS (called AMP),
surfaced here as an HTTP client. **Why it matters — this is the load-bearing finding of the entire
CrewAI study:** the platform we are evaluating as a reference for a multi-tenant AI-company OS
**has no multi-tenancy at all**, at any layer we can read. Every tenant-shaped requirement we have
must be built, not adapted. Batch 02's `UserWarning` naming a single
`CREWAI_ENTERPRISE_ACTION_AUTH_TOKEN` (`agent/core.py:1387-1391`) is now explained: the enterprise
"boundary" is a **token check against a remote service**, not a data-partitioning scheme.

---

## 6.1 Identity: the one thing that IS implemented

`security/fingerprint.py:41` `class Fingerprint(BaseModel)`, docstring at `:42-50`: *"Each agent has
dual identifiers: Human-readable ID: For debugging and reference (derived from role if not
specified) — Fingerprint UUID: Unique runtime identifier for tracking and auditing."*

The mechanics:

- Default identity is **random per instance**: `_uuid_str: str = PrivateAttr(default_factory=lambda:
  str(uuid4()))` (`:54`), and `_created_at` alongside it (`:55` region).
- A **deterministic** identity is available when you supply a seed:
  `_generate_uuid(cls, seed)` returns `str(uuid5(CREW_AI_NAMESPACE, seed))` (`:88`) — a **name-based
  UUID in a fixed namespace** (`security/constants.py:11-15`, a hard-coded UUID literal — and even
  here the module's own note says *"TODO: Determine if CREW_AI_NAMESPACE should be made dynamic or
  configurable"*, `:7`), so the same seed always yields the same id.
- `generate(...)` (`:91`) walks the inheritance chain and rewrites `_uuid_str` via
  `fingerprint.__dict__["_uuid_str"] = cls._generate_uuid(seed)` (`:106`).
- Round-trips via `to_dict` (`:123`) / `from_dict` (`:136`), with the uuid restored at `:151`.
- Value semantics: `__eq__` compares `uuid_str` (`:116`), `__hash__` hashes it (`:121`) — so a
  fingerprint is usable as a dict key, which is how you would key anything *by* identity.
- `metadata` is validated (`_validate_metadata`, `:17`): string keys (`:24`), **one level of nesting
  only** (`:33`), and a **10 KB cap** (`:35`), raising at `:36`.

**➜ F6-2 [P1/PZ] — Identity is a dual id: a human-readable role-derived name plus a UUID, random by
default and deterministic from a seed on demand, carrying one level of validated metadata.**
**Plain meaning:** every agent gets two names — one you can read, one the machine tracks — and you
can either let it be random or derive it reproducibly from a string. **Why it matters:** the
*deterministic-from-seed* option is the useful half. It means identity can be **stable across
processes without a database** — derive it from a known string and you get the same id every time.
That is a genuinely reusable primitive for our per-employee identity, and it is the closest CrewAI
gets to "an agent is a record": an agent is *addressable*, but it is **not filed anywhere** (nothing
stores fingerprints; there is no registry).

---

## 6.2 Auth: seven pure OAuth adapters, no authorization

`crewai_core/auth/providers/base_provider.py:10` `class BaseProvider(ABC)` — a provider is *only* a
set of URL getters. Seven abstract methods: `get_authorize_url` (`:17`), `get_token_url` (`:21`),
`get_jwks_url` (`:25`), `get_issuer` (`:29`), `get_audience` (`:33`), `get_client_id` (`:37`). Two
concrete defaults: `get_required_fields` returns `[]` (`:42`) and `get_oauth_scopes()` returns
`["openid", "profile", "email"]` (`:46`).

Five implementations ship: `auth0`, `entra_id`, `keycloak`, `okta`, `workos` — with both a core copy
(`crewai_core/auth/providers/`, 46–49 lines each) and a CLI copy
(`cli/authentication/providers/`). There is also `crewai_core/auth/oauth2.py` (186 lines,
`Oauth2Settings`) and `crewai_core/token_manager.py` (159 lines).

**➜ F6-3 [PZ] — Authentication is plumbing (URLs and a token), and there is no authorization
anywhere.** **Plain meaning:** CrewAI can log you in against five common identity providers, and
then it stops — it has no notion of what a logged-in principal is allowed to do. **Why it matters:**
the distinction to carry into the SRS is sharp and worth stating plainly: *CrewAI has
authentication (login) and no authorization (permission)*. The single
`allowed_components` allow-list from Batch 05 §5.3.5 — which filters a widget vocabulary — is the
only real enforcement mechanism found anywhere in the study, and it is about UI components, not
about data or roles.

---

## 6.3 The enterprise surface is a CLI configuration command

`cli/enterprise/main.py:16` `class EnterpriseConfigureCommand(BaseCommand)`. Its whole job, per
`configure(enterprise_url)` (`:21`):

1. strip a trailing slash (`:23`),
2. fetch `f"{enterprise_url}/auth/parameters"` (`:41`),
3. store the result as OAuth settings (`:27`), with `enterprise_base_url` persisted (`:75`).

It prints *"Successfully configured CrewAI AMP with OAuth2 settings from …"* (`:30`).

**➜ F6-4 [PZ] — "Enterprise" means pointing the tool at a server that describes its own OAuth
settings.** **Plain meaning:** the enterprise integration is a bootstrap: the CLI asks the corporate
server how to authenticate, and stores the answer. **Why it matters:** this confirms the pattern of
§6.0/§6.1 — everything that looks like "the platform manages organisations/tenants" resolves to
**a remote service plus a client that talks to it**. The open-source half is deliberately thin, and
we should treat the hosted half as out of scope for study (its code is not in this tree).

---

## 6.4 Telemetry: OTLP, opt-out, and an explicit data-minimisation claim

`crewai_core/telemetry.py` (671 lines) is the leaf telemetry layer, used by both the framework and
the CLI. The docstring states the promise (`:1-9`): *"No prompts, task descriptions, agent
backstories/goals, responses, or sensitive data are collected."*

Mechanics: OTLP over HTTP via `OTLPSpanExporter`, to a hard-coded endpoint
`CREWAI_TELEMETRY_BASE_URL = "https://telemetry.crewai.com:4319"` (`:45`), posting to
`f"{CREWAI_TELEMETRY_BASE_URL}/v1/traces"` (`:312`), service name `"crewAI-telemetry"` (`:46`),
tracer `"crewai.telemetry"` (`:48`). Opt-out is an env flag via `_is_telemetry_disabled` (`:354`)
honouring `OTEL_SDK_DISABLED` (`:356`). The resource is enriched with environment facts from
`crewai_core/runtime_env.py` (`detect_coding_agent`, `detect_cpu_band`, `detect_runtime_context`,
imported `:39-43`) and a project id from `get_project_id` (`:38`).

**➜ F6-5 [PZ] — Telemetry is standard OTLP with a hard-coded first-party endpoint and a flag-based
opt-out, plus an explicit list of what is *not* sent.** **Plain meaning:** usage data goes to the
vendor unless you set an environment variable, and the code names the categories it deliberately
excludes. **Why it matters:** two reusable lessons. (a) The **hard-coded endpoint** means the
telemetry target is not configurable — a decision we should make the opposite way. (b) The
**explicit exclusion list in the source docstring** is a good practice worth copying: it makes the
privacy claim checkable in code rather than promised in a policy document.

---

## 6.5 The MCP client, and the seam that stayed empty

Batch 02 found that CrewAI ships a `ToolFilterContext(agent, server_name, run_context)`
(`mcp/filters.py:17`) which nothing populates. This batch read the surrounding client to size it:
`mcp/` is **2,716 lines** — `client.py` (799), `tool_resolver.py` (686), `exceptions.py` (271),
`transports/http.py` (195), `stdio.py` (169), `filters.py` (163), `config.py` (123),
`transports/base.py` (115), `sse.py` (112).

The seam itself is a pydantic model with three fields, and every one of them is the *right* field:

```python
class ToolFilterContext(BaseModel):                          # mcp/filters.py:17
    agent: Any = Field(..., description="The agent requesting tools.")        # :24
    server_name: str = Field(..., description="Name of the MCP server.")      # :25
    run_context: dict[str, Any] | None = Field(...)                          # :26
```

and its docstring example (`:150`) filters on `context.agent.role == "Code Reviewer"`.

**➜ F6-6 [P1/PZ] — The MCP tool-filtering seam is well-shaped and unused.** `agent` +
`server_name` + `run_context` is precisely the triple a per-tenant or per-role tool policy needs,
and the example in the source filters by role. **Plain meaning:** the hook for "this agent, on this
server, in this run, may see these tools" exists and is documented — but nothing in the framework
supplies a policy to it. **Why it matters:** it is the *second* real permission-shaped seam (after
Batch 05's `allowed_components`), and it is the one aimed at **tools** rather than widgets. Both are
"the framework provides an empty slot where policy goes" — which is a pattern, and possibly a
warning: a seam nobody populates is indistinguishable from a feature nobody shipped.

---

## 6.6 The docs practice, restated with its consequence

Batch 00 pinned the hazard: `docs/` is **33,251 `.mdx` files / 292 MB**, 45 version-trees × 4
languages. Batch 05 D5-2 found the site config is Mintlify (`docs/docs.json`, 3.16 MB,
`"$schema": "https://mintlify.com/docs.json"`). The consequence for method is worth restating here
because it is the reason every batch in this study reads `.py`:

There are **45 copies** of the same documentation, one per released version, from `edge` through
`v1.10.0`…`v1.15.28`, times four natural languages (`ar`/`en`/`ko`/`pt-BR`). Any claim read from a
`.mdx` file is therefore (a) of unknown vintage relative to `lib/`, and (b) one of 180 near-copies.
`AGENTS.md` and `DOCS_TRANSLATIONS.md` at the repo root exist to manage this archive.

**➜ F6-7 [PZ] — The documentation is a versioned, translated, externally-rendered archive, and it
cannot be an authority for any behavioural claim.** **Plain meaning:** there is 292 MB of docs, but
it is 180 versions of the same text, published by a third party, and it drifts from the code (four
divergences found in Batch 01 alone; more in 02–05). **Why it matters:** this is the single
strongest justification for the study's first rule, and it is a *design* lesson too: a
docs-as-product decision (translate everything, keep every version) makes the docs **unusable as
reference** while making them look authoritative. For our own platform, one authoritative source
per fact, generated from the code where possible, is the opposite choice.

---

## 6.7 The cross-cutting ledger (what the whole study found, by surface)

This is not the synthesis batch (that is batch 07), but the out-of-pole material is best recorded
as one ledger. Every row cites a batch.

| Surface | Present? | Where | Batch |
|---|---|---|---|
| Per-run identity | ✅ | contextvar minted on kickoff (`execution.py:9-11`) | 01 |
| Per-agent identity | ✅ addressable, ❌ filed | dual id + `uuid5` seed (`security/fingerprint.py:41-88`) | 02, **06** |
| Typed event bus (163 events) | ✅ | `events/event_bus.py:95` | 01 |
| Hooks (10 interception points) | ✅ | `hooks/dispatch.py:40` | 01 |
| Checkpoint / resume / fork | ✅ | `state/checkpoint_config.py:160` | 01 |
| Durable per-method flow state | ✅ | `flow/persistence/sqlite.py:44` | **04** |
| Scheduler / queue / worker / cron | ❌ | (searched, absent) | **04** |
| Trigger delivery | ❌ (convention only) | `templates/*/main.py` + hosted API | **04, 05** |
| Retry / backoff / expiry / ownership | ❌ | (absent) | **04** |
| Widget component catalogue | ✅ 18 typed | `a2ui/catalog.py` | **05** |
| Widget permission subsetting | ✅ **enforced** | `allowed_components` (`client_extension.py:397`) | **05** |
| Tool permission subsetting | ⚠️ seam only | `ToolFilterContext` (`mcp/filters.py:17`), unpopulated | 02, **06** |
| Authentication | ✅ 5 providers | `auth/providers/` | **06** |
| Authorization / roles | ❌ | (absent) | **06** |
| Tenancy | ❌ | (searched — absent; orgs are hosted) | **04, 06** |
| Agent-as-record / org chart | ❌ | (no registry, no org model) | 02, **06** |
| Telemetry (OTLP) | ✅ | `crewai_core/telemetry.py:45` | **06** |
| Web frontend | ❌ | (searched — absent) | **05** |
| Generated diagram from the definition | ✅ | `flow.plot()` → HTML | **04, 05** |

**➜ F6-8 [PZ → synthesis input] — Read as a ledger, CrewAI's shape is: a superb *execution and
observability* engine with identity primitives, wrapped in a thin client for a hosted account
service, with no persistence of *who owns what* and no delivery layer.** **Plain meaning:** the
parts that are excellent are the parts about running work and watching it. The parts about
*organisation, ownership, permission and delivery* are either absent or pushed to a SaaS whose code
is not here. **Why it matters:** this is the sentence the mapping pass should start from. It tells
us, before we compare anything to mercato, that CrewAI will be a rich source for the poles that are
about *how work executes* and a very thin source for the poles about *who it belongs to*.

---

## 6.8 Divergences and corrections

| # | Claim | Measured reality | Verdict |
|---|---|---|---|
| **D6-1** | `SecurityConfig` configures authentication, scoping and impersonation. | Its docstring marks all three as `*TODO*` (`security_config.py:25,27,28`); only `fingerprint` is implemented (`:39`). | **The API promises a security model it does not have.** Most important divergence in the study. |
| **D6-2** | CrewAI supports organisations. | `OrganizationCommand` calls the hosted Plus API (`organization/main.py:19,55`); there is no org model in the framework. | Organisations are a **SaaS account feature**. |
| **D6-3** | "Enterprise" is an integration layer. | `EnterpriseConfigureCommand` fetches OAuth parameters from a URL and stores them (`enterprise/main.py:21-75`). | It is a **bootstrap/config command**, not a tenancy layer. |
| **D6-4** | The tool filter exists. | `ToolFilterContext` is a well-shaped three-field model (`mcp/filters.py:17-26`) that nothing populates. | A seam without a supplier. Recorded, not resolved. |

---

## 6.9 Batch 06 — checklist

- [x] Read from `lib/**/*.py` only; `docs/**/*.mdx` never used as authority.
- [x] Every claim carries `file:line`; citations re-verified at write time.
- [x] No platform comparison inside the batch (rule 5).
- [x] Every finding pole-tagged (rule 9); every capability named (rule 6), including absences.
- [x] Divergences recorded (rule 6), including one that corrects the open question from batch 04.
- [x] Retirement rule honoured (C13-14).
- [x] 8 findings: F6-1…F6-8, plus a cross-cutting ledger (§6.7) that batch 07 will consume.

**Batch 07 (synthesis + reader)** is the last one. It will: (a) write the platform-level verdict
from the six batches' findings, (b) carry the two value questions (rule 4) explicitly, (c) produce
the consolidated finding index for the mapping pass, and (d) build the CrewAI reader — from the
markdown, at the end, using the platform-agnostic generator, exactly as the Paperclip reader was
built. **It will not edit any study markdown to fit the reader** (the standing directive).
