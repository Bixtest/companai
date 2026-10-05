# 09 — The `aissistant-package` integration

**Batch 09 of the Paperclip + Hermes study. Written 2026-10-05.**

This batch audits the sibling project's codebase at `aissistant-package/`. It is **not ours** and is
read-only. The first thing to settle is that the codebase carries its own prior analysis: a
`diff -rq` of `aissistant-package/reboot/` against `library/ai/hermes-docs/reboot/` returns **no
differences** — they are the same 23,842-line dossier, so the programme reads it once. Everything
the dossier already settles is listed below and not repeated. Everything after that is what the
dossier does **not** cover: the exact compose contents, the connector and template internals, the
four generations of Hermes wiring still present in the tree, and the code-level evidence behind
the incidents.

Measured this session, from the tree (file counts exclude `host/` and `data/`):
`plugins/` 33 files, `connectors/` 5, `ops/` 114, `templates/` 40, `docs/` 135, `documentation/`
109, `branding/` 4, `hermes/` 8,965.

---

## What the reboot dossier already settles

**The ownership boundary.** `reboot/12-ARCHITECTURE-DECISION-COMPANAI.md` (ADR-001) is the
controlling decision: Paperclip is the company control plane, Hermes is the managed AI runtime, and
the browser talks only to the Companai host (`12-…:8-23`). It fixes the authoritative-ownership
table — company/identity, employment, Projects/Rooms, run admission/budget/audit, dangerous-operation
approval, skills catalogue, secrets, schedules and Knowledge all belong to the host
(`12-…:67-84`) — and it defines the runtime boundary as an `AiRuntimePort` of six narrow, versioned
contracts rather than one untyped proxy (`12-…:86-110`), plus a signed `ExecutionEnvelope` with
distinct `runId`, `transcriptId`, `memoryScopeId`, `roomId`, `issueId` and `capabilityGrantId`
(`12-…:112-144`). It also states the three hard prohibitions: never expose the Hermes dashboard,
never proxy it, never let the browser call a Hermes container (`12-…:157-165`).

**The front-end disposition.** `reboot/work/INV-03-SURFACING-HERMES-IN-THE-UI.md` answers the
"wire 122 Hermes capabilities into the front end" question. It counts the real end-user surface at
**about 19**, with ~46 admin/operator surfaces (`INV-03:17-29`); it rejects iframing or proxying the
Hermes dashboard with four reasons — one profile, its own auth, destructive operations, and second
admin authority (`INV-03:31-51`); it defines what "steal" is legitimate under MIT — the xterm
terminal, event stream and cost charts, not the design system (`INV-03:53-74`); and it gives the
three-tier answer: ~19 bespoke Tier-1 surfaces, ~46 Tier-2 settings **declared** as `FieldDef`s
rather than built as screens, and Tier-3 operator-only (`INV-03:76-120`).

**Projects and Rooms.** `reboot/14-PROJECTS-AND-ROOMS-RECONSTRUCTION.md` establishes that the room
is **not** a domain object today: `EngagementRoom.tsx` finds an issue titled `Room — <project>`,
stores its UUID in a hidden HTML comment in the project description, and mutates the project from a
React effect if the marker is absent (`14-…:43-55`). It records competing participation
representations (`14-…:57-64`), the inverted page hierarchy (`14-…:66-81`), and the target domain
model and API (`14-…:124-292`).

**The two incidents.** `reboot/work/REC-01.md` preserves the interrupted three-file Hermes bridge
and proves the local working files are byte-identical to the running container's patched files by
SHA-256 (`REC-01:40-43, 68-76`); it records that the patch placed a per-run Paperclip JWT in
model-visible run instructions as a recovery measure, explicitly **not** the target boundary
(`REC-01:98-100`). `reboot/work/REC-02.md` then explains the two symptoms: the final message got
`403` because the emergency live test inserted its run records directly instead of through the
normal wake path, so they lacked the source-task identifier the comment route requires, while
child-task creation does not use that check (`REC-02:38-42`); and the Manager paused because the
company had recorded **832,993 tokens against the default 500,000-token daily limit**, a separate
budget action (`REC-02:44-48`).

**The capability ledger.** `reboot/06-CAPABILITY-AND-GAP-LEDGER.md` already grades every product
surface and names the P0/P1/P2 blockers (`06-…:3-61`), and `reboot/00-CURRENT-STATE.md` pins the
source state and the "not complete" list (`00-…:16-24, 66-76`).

---

## 1. What is vendored and what they wrote

### 1.1 Vendored — not their code

| What | Evidence | Status |
|---|---|---|
| **Paperclip, forked** | `docker-compose.yml:82-86` builds the host image from `context: host`, `target: production`. The fork is Paperclip 0.3.1, branch `aissistant`, local HEAD `91e80d4`, upstream tag `upstream-pristine` commit `4feef98`, delta 177 files (`reboot/00-CURRENT-STATE.md:16-24`). | Their delta, upstream's base |
| **Hermes source** | `hermes/` is present (8,965 files) and is labelled "Vendored **Hermes** source, MIT, v0.20.1. ⚠️ **Reference only — this is not what runs.**" (`README.md:32`). `docs/SOURCE-MAP.md` repeats it: the running runtime is the official image at `/opt/hermes` inside the container, and "the two have already differed in ways that mattered". | Reference copy, not the artefact |
| **The images actually pulled** | `docker-compose.yml` pulls `postgres:17-alpine` (`:65`), `node:22-alpine` for the knowledge side-car (`:188`), `nousresearch/hermes-agent` (`:358`), a digest-pinned `llama.cpp` build (`:230`), and the Konsult images (`:27, 486`). | Third-party images |

### 1.2 Written by them

| What | Where | Evidence |
|---|---|---|
| **The knowledge side-car** | `plugins/knowledge-spaces/` (33 files) — a Node HTTP server that the compose runs with `node dist/http-server.js` (`docker-compose.yml:187-205`). It is a Paperclip plugin with a manifest (`src/manifest.ts`) and an API/UI/tools surface. | Own code |
| **The Konsult connector** | `connectors/konsult/` (5 files) — a governed client plus a write-action registry. | Own code |
| **Ops tooling** | `ops/` (114 files) — health probes, ~50 `prove-*.sh` scripts, the Hermes lifecycle scripts, compose references, `verify-room-into-session.py`. | Own code |
| **The firm template** | `templates/compliance-consulting/` (40 files) — an importable `agentcompanies/v1` company pack. | Own code |
| **Branding** | `branding/` (4 files) — `product.json` string map and `tokens.css`. | Own code |
| **The compose stack** | `docker-compose.yml` plus the two overrides and `.env.example`. | Own code |

### 1.3 A doc-versus-tree contradiction

`README.md:36` and `README.md:63` list `konsult/` as the vendored "Konsult GRC (CISO Assistant
community) vendored source", and `ARCHITECTURE.md:72, 266` repeats it. **The directory does not
exist in this copy** — `ls konsult` returns "No such file or directory". The root compose still
references `konsult-ciso-backend:1.1.3` / `konsult-ciso-frontend:1.1.3` with `pull_policy:
if_not_present` (`docker-compose.yml:27, 486`), and the profile is off by default
(`COMPANAI_KONSULT_MODE=disabled`, `docker-compose.yml:150`). So the documented vendored tree is
absent here; only the images are referenced. This is recorded as a gap, not resolved.

---

## 2. The four generations of Hermes wiring still in the tree

This is the part the dossier does not lay out, and it matters because the compose files disagree
with each other. The tree contains **four** distinct ways of attaching Hermes to Paperclip, from
oldest to newest:

1. **One shared-home Hermes API server.** `ops/docker-compose.yml:33-53` runs a single `hermes`
   service with `API_SERVER_ENABLED=true`, `API_SERVER_PORT=8642`, `command: ["gateway","run",
   "--replace","--accept-hooks"]`, and one default volume. `ops/docker-compose.hermes.yml:1-3`
   is the same shape and is explicitly stamped "**LEGACY / LAB-ONLY — do NOT run on Contabo**".
2. **One container per employee, network `aisisstant_net`.** `ops/docker-compose.profiles.yml`
   defines `hermes-manager`, `hermes-assessment-manager`, `hermes-journey-planner`,
   `hermes-researcher`, each `<<: *hermes-employee` with `HERMES_HOME: /opt/data` and a per-slug
   profile volume, and the comment says "Aisisstant production topology" (`:1-11, 31-90`).
3. **One container per employee, network `docker_default`.** `ops/docker-compose.hermes-profiles.yml`
   does the same for ten slugs with `container_name: aisisstant-hermes-<slug>` (`:36-95`). This is
   the generation `hire-employee.sh` and `bind-paperclip-agents.sh` were written against.
4. **One shared runtime for every employee, driven by `hermes-acp`.** The current root compose
   defines `hermes-runtime` with `command: ["sleep","infinity"]` and the comment "One container, not
   one per Aissistant … hiring creates a directory here rather than a container"
   (`docker-compose.yml:348-389`). The per-turn identity is passed at exec time:
   `docker exec -i -e HERMES_HOME=/opt/data/profiles/<slug> ... hermes-acp`
   (`docker-compose.yml:350-353`). `reboot/work/B10-SHARED-RUNTIME.md:21-38` is the record: one
   container ever, 9.9 MiB total instead of ~85 MiB per employee, "hiring creates a directory, not a
   container".

**The adapter lane changed with it.** The older generation binds each agent with
`adapterType: "hermes_gateway"` and `apiBaseUrl: http://aisisstant-hermes-<slug>:8642`, plus
`dangerouslyAllowInsecureRemoteHttp: true` and `sessionKeyStrategy: "issue"`
(`ops/hermes/hire-employee.sh:222-232`, `ops/hermes/bind-paperclip-agents.sh:52-74`,
`ops/hermes/adapter-config.schema.json:8-11`). The product lane is `hermes_acp`
(`reboot/18-WHAT-AN-AISSISTANT-IS.md:68`; `docs/SOURCE-MAP.md` lists `host/packages/adapters/hermes/`
and the ACPX engine).

**The consequence: the override files are stale relative to the root compose.** The corporate
override still names ten per-employee services — `hermes-manager`, `hermes-assessment-manager`,
… `hermes-company-assistant` (`docker-compose.corporate-override.yml:27-46`) — that the current
root compose no longer defines at all. The newer Companai override instead names `hermes-runtime`
(`docker-compose.companai-override.yml:27-28`), which matches the root. So the corporate override
was written for generation 3 and never updated to generation 4. The deployment guide only ever
brings up `db paperclip knowledge` from that override (`DEPLOYMENT.md:224-227`), which is why the
stale service names do not fail in practice.

---

## 3. The three compose files, exactly

**`docker-compose.yml`** (23 KB, project name `aissistant`, `:23`) is the "ONE product bring-up
(M3.5 repack)". Its services are:

- `db` — `postgres:17-alpine`, healthchecked (`:64-79`).
- `paperclip` — the host fork, built from `host/`, port `${PAPERCLIP_PORT:-3100}:3100`, mounting
  `/paperclip`, `/opt/aisisstant`, and **`/var/run/docker.sock`** so the host can provision runtimes
  on hire (`:82-185`). It carries the knowledge URL, the watchers, the local-model knobs, the
  Hermes provisioning knobs (`HERMES_PROVISIONING`, `HERMES_DOCKER_NETWORK`, `HERMES_IMAGE`,
  `HERMES_API_SERVER_KEY`, `:134-137`) and the spend soft-cap (`:144-148`).
- `knowledge` — `node:22-alpine` running `plugins/knowledge-spaces`, `container_name:
  aisisstant-knowledge`, published only on `127.0.0.1:3199` (`:187-205`).
- `llama-server` and `llama-server-small` — optional local models behind profiles, on an
  `internal: true` `inference_net` (`:228-346, 534-540`).
- `hermes-runtime` — the shared runtime described above, on both `paperclip_net` (with
  `gw_priority: 100`) and `inference_net` (`:357-389`).
- `konsult-*` — vendored GRC behind `konsult-engine` / `konsult-ui` profiles, off by default
  (`:392-513`).
- `mailpit` — lab SMTP behind the `lab` profile (`:516-527`).

**`docker-compose.companai-override.yml`** (the newest override, 45 lines) is a pure isolation
layer for a fresh Companai install at `/opt/companai/aissistant-package` (`:1-9`). It renames
`paperclip` → `companai-paperclip`, `knowledge` → `companai-knowledge`, `hermes-runtime` →
`companai-hermes-runtime`, the llama servers and mailpit to `companai-*` (`:14-39`); repoints
`HERMES_DOCKER_NETWORK` to `companai_net` and the knowledge URL to `http://companai-knowledge:3199`
(`:19-20`); sets `PAPERCLIP_PRODUCT_NAME: Companai` (`:21`); and redefines `paperclip_net` as
`companai_net` with `external: false` (`:41-44`). It also binds the shell to
`127.0.0.1:3100:3100` (`:16-17`).

**`docker-compose.corporate-override.yml`** (68 lines) is the older corporate layer for
`aissistant.corprorate.com`, kept "Plesk sibling of lawai/operion/…" (`:1-2`). Its stated purpose is
"Unique container_name prefix aissistant-* (avoids clobbering live demo)" and "Isolated network
aissistant_net" (`:10-12`). It renames `knowledge` → `aissistant-knowledge`, repoints the knowledge
URL and `HERMES_DOCKER_NETWORK` to `aissistant_net` (`:20-25`), and — as noted in §2 — renames ten
per-employee Hermes services that no longer exist in the root compose (`:27-46`). It deliberately
does **not** re-declare `paperclip` ports, with the comment that Compose appends port lists and
would double-bind (`:17-19`).

**The spelling split is real in the compose itself.** The tree mixes `aissistant` (the product
name, single `s` after the `i`) with `aisisstant` (the legacy slug). The root compose's host image
variable is `AISSISSTANT_HOST_IMAGE` (`docker-compose.yml:83`), the knowledge container is
`aisisstant-knowledge` (`:189`), and the data path is `/opt/aisisstant` (`:108`), while the
override files use `aissistant-*`. This is the P1 blocker "`aisisstant` versus `aissistant`
DNS/container/path naming split" (`reboot/06-CAPABILITY-AND-GAP-LEDGER.md:44`), visible at line
level.

---

## 4. What the connectors do

There is **one** connector: `connectors/konsult/` (5 files — `package.json`, `README.md`,
`src/client.ts`, `src/registry.ts`, `src/policy.md`). It is a governed bridge between the agents and
a Konsult GRC system of record (`connectors/konsult/README.md:1-3`).

- **Three modes.** `client.ts` returns `mode: "read" | "proposal" | "deep_link"` (`client.ts:39`).
  Read actions call Konsult directly (`list_frameworks`, `list_perimeters`, `list_presets`,
  `list_journeys`, `get_journey`, `get_assessment_summary`, `:172-202`). Write actions never write:
  they return a `proposal` object with `requiresApproval: true` (`client.ts:120-169`).
  `open_deep_link` builds a URL for a human to continue editing (`client.ts:86-118`).
- **The governed-write registry.** `registry.ts` defines five write actions — `create_evidence`,
  `update_applied_control`, `answer_requirement`, `create_assessment`, `complete_journey_step` —
  each with a `normalize`, a human-readable `renderApproval`, and the exact REST mutation `toHttp`
  applied only after approval (`registry.ts:53-294`).
- **Dual tokens, reader and writer.** The README requires `KONSULT_API_TOKEN` (a Knox **read** PAT)
  and `KONSULT_WRITE_TOKEN` (write PAT, host apply only, deny if missing), and lesson L-021 records
  that Knox PATs inherit the user's RBAC with no per-token scopes, so denial only works with a real
  reader identity (`README.md:7-11`; `LESSONS.md:16-21`).
- **The tool surface.** `KONSULT_TOOL_DEFS` exports 14 tools to register into Hermes or an agent's
  `TOOLS.md` (`client.ts:216-292`).
- **The policy line.** "Never invent collected evidence (L-004)" (`README.md:36`), and the proposal
  body carries the same rule (`client.ts:141`).

---

## 5. What is in `templates/`

`templates/` holds one importable pack, `compliance-consulting/` (40 files), described as an
"Importable **paperclip/v1** package — Aissistant ready-for-business default"
(`templates/compliance-consulting/README.md:1-11`). Its parts:

- **`COMPANY.md`** — the firm definition, front-matter `schema: agentcompanies/v1`, `kind: company`,
  with goals, `optional_secrets: [KONSULT_API_TOKEN, KONSULT_BASE_URL]`, and
  `metadata.aisisstant.defaultAdapter: hermes_gateway` (`COMPANY.md:1-34`).
- **`agents/*/AGENTS.md`** — ten role definitions: `manager`, `account-assistant`,
  `assessment-manager`, `researcher`, `journey-planner`, `evidence-coach`, `policy-drafter`,
  `risk-analyst`, `support-assistant`, `company-assistant`. Each carries front-matter
  `adapterType: hermes_gateway` and `metadata.aisisstant.hermesProfile: <slug>` and a role prompt
  (`agents/manager/AGENTS.md:1-35`).
- **`skills/*`** — 20 `SKILL.md` files, the Hermes/firm skill pack. The one that is the actual
  integration seam is `knowledge-spaces-http/SKILL.md`: it tells the agent to call the side-car at
  `http://aisisstant-knowledge:3199` directly with `companyId` and `actorSlug`, to write **drafts
  only**, and never to call approve (`skills/knowledge-spaces-http/SKILL.md:13-52`). There are also
  `konsult-http`, `konsult-governed-write`, `human-approval-gate`, `engagement-isolation` and
  framework-mapping skills.
- **`projects/`** — two sample engagements (`sample-nis2-engagement`, `sample-cyfun-engagement`),
  each a `PROJECT.md`.
- **`evals/`** — per-role eval prompts plus a `default.md` and `README.md`.
- **`knowledge-map.md`** — the spaces/onboarding-kit/room pattern.

The pack is built by `ops/template-pack.sh` into a `paperclip/v1` zip whose stage `TASK.md` files are
unassigned and whose adapters are `hermes_gateway`, then imported via Company → Import
(`README.md:15-31`). Import does **not** start gateways; the operator must provision profiles
separately (`README.md:32-37`).

---

## 6. The known incidents, in plain English

The batch plan names two incidents. In the tree they are three events across two records plus one
audit.

### 6.1 The `403` and the paused Manager (REC-01, REC-02)

The corporate instance was running an uncommitted three-file patch to the Hermes gateway adapter
that minted a per-run Paperclip JWT and put the callback URL and token into Hermes' run
instructions, because the Hermes `/v1/runs` API ignores a request `env` block
(`reboot/00-CURRENT-STATE.md:7-9`). A live test created child tasks BRI-2…BRI-9 successfully, then
its final comment returned `403` and the Manager appeared paused (`reboot/00-CURRENT-STATE.md:9`).

`REC-02` proves the two symptoms were unrelated. The `403` happened because the **emergency test
inserted its run records directly** rather than through the normal wake path, so the records lacked
the source-task identifier that the comment route requires; child-task creation does not use that
check, so eight children were created and only the comment was refused — "the failure was therefore
in the emergency test setup, not proof that the normal Hermes callback identity was rejected"
(`REC-02:38-42`). The pause was the **daily usage limit**: the company had recorded 832,993 tokens
against the default 500,000-token limit, and an emergency script later set only the Manager back to
`idle` without clearing the company-level pause, leaving an inconsistent live state
(`REC-02:44-48`). No product code was changed; a supported-path regression test was added later
(`REC-02:150-158`).

### 6.2 The adopted Hermes container (A-3)

This is the incident the batch plan calls "a Hermes container adopted because compose named it
identically". The root compose used to define ten per-employee gateway services, each pinning a
fixed name — `hermes-manager: container_name: aisisstant-hermes-manager`
(`reboot/AUDIT-2026-08-14.md:119-125`). The host's provisioning function
`containerNameForSlug("manager")` produces **exactly that string**, and `startHermesGateway`
short-circuits when the container already exists:

```ts
const state = await dockerContainerExists(name);
if (state === "running") {
  return { containerName: name, apiBaseUrl: gatewayUrlForSlug(slug) };
}
```

So if anyone ran a bare `docker compose up -d` — which started all ten, because they sat behind no
profile — and later hired a gateway-lane Aissistant whose slug matched one of the ten names,
**provisioning adopted a container it did not create**, configured from the deployment environment
rather than from that Aissistant's provisioning, and reported success
(`reboot/AUDIT-2026-08-14.md:127-143`). The dossier's summary is blunt: "Compose named containers
exactly as provisioning would, so `startHermesGateway` found one running and **adopted a container
it did not create** … Nothing errored. That is the dangerous kind"
(`reboot/CONTESTED-HERMES-VS-COMPANAI.md:15-22`). Three things made it survivable, none by design:
the product lane never called that path, the deployment guide warns against a bare `up -d`, and
only those ten slugs were at risk (`reboot/AUDIT-2026-08-14.md:145-150`). The fix belongs with "B11
(remove the roster from compose)" and had not landed at the time of the audit. The generalised
lesson the dossier draws is that two owners of one fact is the most expensive kind of bug here,
because it produces no error (`reboot/CONTESTED-HERMES-VS-COMPANAI.md:24-25`).

---

## 7. The front end — what they added (cross-check with INV-03)

`INV-03` settles the disposition, so this section only records what the tree shows at code level.

- **The knowledge plugin registers a product page.** `src/manifest.ts` declares `categories: ["ui",
  "automation"]`, `capabilities` including `api.routes.register` and `tools.register`, a UI slot
  `{ type: "page", id: "knowledge-spaces", label: "Knowledge", exportName: "KnowledgeSpacesPage" }`,
  seven API routes, and three agent tools (`plugins/knowledge-spaces/src/manifest.ts:13-57`).
- **The page itself is a descriptor, not bespoke React.** `src/ui/index.tsx` returns a plain object
  `{ type, title, companyId, apiBase, copy }` rather than JSX (`plugins/knowledge-spaces/src/ui/index.tsx:1-21`).
  So the plugin contributes a declared page plus copy, and Paperclip renders it — consistent with
  `INV-03`'s "declared, not built" Tier-2 pattern, though at a smaller scale than a full settings
  screen.
- **Branding is presentation-only.** `branding/product.json` sets the product name to `Aissistant`
  and a `replaceStrings` map from `Paperclip`→`Aissistant` scoped to `ui-chrome`, with the note "Do
  not rewrite API routes or package names — branding is presentation-layer only for v1"
  (`branding/product.json`). `docs/WHITELABEL-SPEC.md:23-26` states the same rule: never rename
  `@paperclipai/*`, `PAPERCLIP_*`, cookies, API paths or Docker service names; presentation only.
- **The main product surfaces are in the fork's UI.** `INV-03` and `14-PROJECTS-AND-ROOMS-…` cite
  `host/ui/src/pages/EngagementRoom.tsx` (~1,164 lines), `ProjectDetail.tsx` (~971) and
  `ProjectProperties.tsx` (~1,288) as the actual front-end additions
  (`reboot/14-PROJECTS-AND-ROOMS-RECONSTRUCTION.md:87-89, 616-622`). Per this batch's rules I did not
  open `host/`; those line counts are the dossier's, not re-measured.

---

## What I added that the dossier does not cover

1. **The four generations of Hermes wiring, laid out side by side** (§2). The dossier analyses the
   shared-runtime decision (B10) but does not assemble the four coexisting compose files, and does
   not point out that the corporate override still names ten services the root compose no longer
   defines. File evidence: `ops/docker-compose.yml`, `ops/docker-compose.hermes.yml`,
   `ops/docker-compose.profiles.yml`, `ops/docker-compose.hermes-profiles.yml`,
   `docker-compose.yml:348-389`, `docker-compose.corporate-override.yml:27-46`.
2. **The exact contents and purpose of the two override files** (§3) — including the deliberate
   "do not re-declare ports" note and the network/product-name rewrites — which the dossier treats
   only in passing.
3. **The `aisisstant` / `aissistant` spelling split shown at line level** (§3), rather than only as
   a ledger entry.
4. **What the connectors do** (§4) — the three modes, the five write actions, the dual-token rule,
   the 14-tool surface. The dossier references the connector but does not enumerate it.
5. **What is in `templates/`** (§5) — the ten agents, twenty skills, two sample projects, and the
   `knowledge-spaces-http` skill that is the real agent-to-side-car seam.
6. **The code-level evidence behind the "adopted container" incident** (§6.2) — the identical
   container name and the `dockerContainerExists` short-circuit — which the dossier states as a
   narrative but does not show.
7. **The knowledge side-car's auth shape as code** — `authOk` returns `true` when `KNOWLEDGE_API_KEY`
   is empty (`plugins/knowledge-spaces/src/http-server.ts:50-54`), the mutating check is a no-op
   then (`:78-79`), and the actor is taken from body/query/header with no verification
   (`:62-65`). The dossier states this as the P0 blocker
   (`reboot/00-CURRENT-STATE.md:78-83`); this is the source line that shows it.
8. **A doc-versus-tree contradiction** (§1.3): the vendored `konsult/` tree that `README.md` and
   `ARCHITECTURE.md` document does not exist in this copy.
9. **The plugin's front-end contribution is a descriptor, not a component** (§7).

---

## Lessons for our platform

Each lesson carries its reason; none is a decision.

- **Consider making the container/process identity of an agent irrelevant, and the agent's *home*
  the only boundary.** Reason: their own B10 record shows the thing that makes an employee itself —
  config, memory, skills, credentials — lives in the home, and that a container-per-employee cost
  ~85 MiB idle each (`reboot/work/B10-SHARED-RUNTIME.md:11-38`). The current compose already reflects
  this: one `hermes-runtime`, identity by `HERMES_HOME` per turn (`docker-compose.yml:348-389`).
- **Consider a single naming authority for runtime identities.** Reason: the adopted-container
  incident happened because two systems derived the same container name independently and one
  adopted the other's process with no error (`reboot/AUDIT-2026-08-14.md:119-143`). A deterministic
  name is only safe if exactly one component computes it.
- **Consider provisioning as a first-class product operation, not an ops script.** Reason: their
  own note is explicit — "Paperclip UI alone does NOT create a Hermes home — this script (or
  equivalent hook) is mandatory" (`ops/hermes/hire-employee.sh:3`), and the hire path then has to
  log into the API, bind secrets, and write `config.yaml` from a shell script (`hire-employee.sh:161-277`).
  The gap is the reason hire/fire is unreachable from the product UI
  (`reboot/06-CAPABILITY-AND-GAP-LEDGER.md:13`).
- **Consider keeping reader and writer credentials for any external system of record, and proving
  denial.** Reason: they learned that Knox PATs carry no per-token scopes, so a "read" token was
  still write-capable until they used a genuine reader identity and proved a real `403`
  (`LESSONS.md:16-21`). The connector's design — agents propose, the host applies with the write
  token (`connectors/konsult/README.md:28-36`) — is the pattern that makes this auditable.
- **Consider a knowledge/approval store whose actor identity is authenticated, not claimed.**
  Reason: their side-car trusts an `actor` string when its key is empty and accepts it from body,
  query or header (`plugins/knowledge-spaces/src/http-server.ts:50-65`), which their own ledger
  records as a P0 blocker against the core "AI drafts; humans approve" promise
  (`reboot/00-CURRENT-STATE.md:78-83`). Copying the shape without fixing the boundary would import
  the bug.
- **Consider exposing only a chosen subset of runtime settings, as declarations rather than
  screens.** Reason: `INV-03` shows the end-user surface is ~19 of 122 capabilities, that ~46 admin
  settings already converge on a declarative `FieldDef` with a `secret` flag, and that
  `config_defaults.py` is 4,394 lines most of which nobody should touch (`INV-03:17-29, 105-120,
  155-164`).
- **Consider keeping one canonical owner per fact, and writing the boundary down.** Reason: their
  own register exists because two systems each believed they were in charge of approvals, skills,
  sessions, secrets, models and channels, and "two owners of one fact is the most expensive kind of
  bug in this project, because it produces no error — only a system that quietly disagrees with
  itself" (`reboot/CONTESTED-HERMES-VS-COMPANAI.md:9-26`).

### Workarounds we should not need to build

- **A shell script as the hire path.** Their `hire-employee.sh`/`employee-lifecycle.sh` exist
  because provisioning was not in the product; our platform can own hire as a server transaction
  from the start.
- **A per-employee container roster in compose.** The ten fixed `hermes-<slug>` services are the
  source of the adopted-container incident and are now dead weight the corporate override still
  references.
- **Placing a callback token in model-visible instructions.** Their bridge did this only because
  the Hermes `/v1/runs` API ignored a request `env` block, and their own ADR calls it a recovery
  patch, not the target boundary (`reboot/work/REC-01.md:98-100`;
  `reboot/12-ARCHITECTURE-DECISION-COMPANAI.md:144`).
- **A hard-coded OAuth/credential donor profile.** Their provisioning copies `auth.json` from
  `profiles/assessment-manager/` by name (`ops/hermes/hire-employee.sh:109-120`), which their audit
  lists as a root cause that "breaks on fresh instances"
  (`docs/ARCHITECTURE-DIAGNOSIS.md:188-191`).

---

## What I could not verify

- **The vendored `konsult/` tree.** `README.md:36, 63` and `ARCHITECTURE.md:72, 267` document it;
  the directory is absent in this copy. I did not attempt to find it elsewhere on disk, so I cannot
  say whether it was excluded from the copy or never present.
- **The `host/` fork delta.** The batch rules say do not read `host/` (76,216 files, almost all
  `node_modules`). Every statement about the fork — version `0.3.1`, branch `aissistant`, HEAD
  `91e80d4`, upstream `4feef98`, delta 177 files, ~+19,703/-245 lines — is quoted from
  `reboot/00-CURRENT-STATE.md:16-24` and `README.md:83-87`, not re-measured by me.
- **The front-end source.** The `EngagementRoom.tsx` / `ProjectDetail.tsx` / `ProjectProperties.tsx`
  line counts and behaviour are the dossier's (`reboot/14-…:87-89, 616-622`; `INV-03`), not
  independently confirmed, because they live under `host/`.
- **Whether the corporate override is still used with a stale root compose, or has simply not been
  cleaned up.** The file names services the root compose no longer defines; I infer drift from the
  two files, but I did not see a live deployment to confirm which compose pair is actually in use.
- **The runtime behaviour of the compose files.** I read them; I did not run `docker compose config`
  or bring anything up. In particular, `ops/docker-compose.yml:44-53` places `expose:` and `command:`
  under a `volumes:` list, which looks structurally malformed, but I did not validate it with a
  parser, so I state it as an observation, not a proven defect.
- **The plugin UI's actual rendering.** `src/ui/index.tsx` returns a descriptor object; I did not
  trace how Paperclip turns that into a page, so I cannot say how much of the Knowledge page is
  real UI versus a placeholder.
- **The `data/` and `ops-secrets/` state.** Not read (per the batch rules for `data/`), so any live
  claim about profiles, tokens or spend defaults is the dossier's, not observed here.
