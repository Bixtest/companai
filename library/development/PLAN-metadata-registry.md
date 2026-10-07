# PLAN — the **Metadata Registry** (`GAP A / C5`)

**Written:** 2026-10-07 · **Task:** the Metadata Registry (BUILD-ORDER Phase 0, item 4; `platform_points.md`
`GAP A / C5`) · **Status:** IMPLEMENTED (verification in §7; one scope claim corrected by a hostile-critic pass)
**Protocol:** the owner's 6-step work protocol (pick the task → pick the points → combine → fact-check the
code → plan, execute, verify → update all docs, BACKLOG and platform_points).

---

## 1. The task, and where it comes from

**BUILD-ORDER.md Phase 0 item 4 (verbatim):**

> **NEW — Metadata Registry service (GAP A / C5).** Answers "what exists / who owns it / what depends on
> it". Read-only to start; it is what lets the permissions gate enumerate objects and lets the AI be
> bounded. *(Blueprint §54, §86.)*

**BLUEPRINT-GAP-ANALYSIS.md GAP A (verbatim, the requirement):**

> **What to add.**
> 1. A **`Resource` envelope** — a declared, shared shape (conceptually the blueprint's JSON above),
>    implemented as a shared type + a base convention, **not** as one giant table. Modules that model a
>    resource declare it; the envelope's fields are then **guaranteed present**.
> 2. A **Metadata Registry** service — reads the kernel's model + module declarations and answers the
>    §54 questions. Start read-only (an *inventory*), grow it into the control-plane service the blueprint
>    describes.

**Blueprint §54 (verbatim, the questions the service must answer):**

> ```text
> What exists?
> Who owns it?
> What type is it?
> What does it depend on?
> Who can access it?
> What APIs expose it?
> What events does it emit?
> What workflows use it?
> What UI renders it?
> What metrics measure it?
> What documentation describes it?
> What data produced it?
> What AI systems can access it?
> ```

## 2. The relevant points from `platform_points.md` (owner's step 2)

| Point | Line | Why it is in scope |
|---|---|---|
| `C5` — Metadata registry & schema conventions (PARTIAL) | §A | **the task itself**: the queryable service C5 names; today only a *view* exists |
| `C1` — Resource envelope: the shape every object shares (NOT DONE) | §A | GAP A part 1; the envelope the registry answers *through* |
| `GAP A / C5` | §G | the named backlog item; "THE POSTED NEXT TASK" |
| `SD-1` (S2 permissions gate) | §G | **the consumer**: cannot *list what it is gating* without the registry |
| `SD-4` (S11/S12 structural grammar) | §G | enumerates objects × verbs × actors; needs the object list |
| `C3` — Tenancy & isolation (PARTIAL) | §A | the envelope's `tenant_id`; the registry must not leak across tenants |
| `C2` — Actor & context model (PARTIAL) | §A | "who can access it" is answered *per actor*; the `Principal` is the actor |
| `C6` — Command / action contract (PARTIAL) | §A | "what APIs expose it" — the command/route surface |
| `C8` — Audit contract (PARTIAL) | §A | provenance: "created_by / updated_by" |
| `Never *` — no second source of truth | §D | the registry must **read** the kernel view, never copy it |
| `G-08` — relationships as first-class metadata | §G | the kernel already carries them; the registry exposes them |

**Task requirement = §1 + §2 combined:** *A **read-only Metadata Registry service** that answers the
blueprint §54 questions over the platform's **existing declarations** (the kernel descriptor +
`custom_field_defs`/`custom_entity` + merged extensions), enumerable and tenant-scoped, so the permissions
gate can list objects and Hermes can learn the business shape without a database handle. Whether the
**`Resource` envelope** (GAP A part 1, `C1`) is built now or folded into Phase −1 is the one scope decision
this plan must make explicitly, not by accident.*

## 3. Fact-check of the code (owner's step 4) — measured 2026-10-07

**What exists (read, not assumed):**

- **The kernel view** — `packages/shared/src/lib/kernel/model.ts` (407 lines). `buildModelDescriptor(input)`
  is a **pure function** that reads `KernelDeclarationInput` (`customEntities`, `customFieldSets`,
  `extensions`) and returns a `ModelDescriptor`:
  - `entities: Record<string, KernelEntity>` — keyed by canonical id; each carries `kind`, `entityClass`,
    optional `grain`, `fields[]`, `relationships[]`, a content `version`.
  - `relationships: Record<string, KernelRelationship>` — keyed by canonical id; carries `fromEntityId`,
    `toEntityId`, `cardinality?`, `optionality`, `ownership?`, `allowedTraversal?`, `deleteBehaviour?`,
    `securityInheritance?`, `multiplicityRisk?`, a content `version`.
  - `relationshipIdCollisions: [...]` — a **finding**, not a warning.
  - **It holds no copy** (its own header says so, and that is the invariant the registry must keep).
- **Supporting kernel files:** `canonical-id.ts` (the §12.1 id grammar: `entityIdOf`, `fieldIdOf`,
  `relationshipIdOf`), `from-modules.ts` (builds the input from live module declarations),
  `round-trip.ts` (byte-equality proof the model is deterministic), `rename.ts`.
- **The 21-item contract** is declared **once** (`KernelObjectContract`, model.ts:51) and **intersected** —
  so "every object has a declared contract" is true by construction. Fields the platform does not yet
  populate are **explicitly absent** (`?`), never defaulted.

**What does NOT exist (measured, and this is the gap):**

- No `ResourceEnvelope` / `BaseEntity` / shared base type anywhere in `shared` or `core` (C1, NOT DONE).
- No `MetadataRegistry` / `ResourceModel` service (a code search returns **nothing**). Nothing answers
  *who owns it / what depends on it / who can access it*.
- Each module declares its own `tenantId` / `organizationId` columns independently — the envelope is not
  shared, so "ownership, version, lifecycle, labels, provenance" are re-decided per resource (blueprint §122:
  *"the most critical architectural mistake would be allowing these concerns to develop independently"*).

**Prerequisites that must be functional first (checked):**

- The kernel view — ✅ **exists and is tested** (`packages/shared/src/lib/kernel/__tests__/`).
- `entity-fields-registry` registered at bootstrap — ✅ (per `platform_points.md` C5).
- The generated entity/extension registry (D0) — ✅ done, mutation-proven.

## 3b. Decisive fact-check finding (read this before designing)

**The kernel is a *view*; the registry is a *service over that view* — and the difference is exactly the
three questions the view cannot answer.**

`buildModelDescriptor` produces `entities` and `relationships` with canonical ids and content-versions. It
can answer *"what exists?"* (enumerate entities/fields/relationships) and *"what type is it?"*
(`kind`/`entityClass`/`fieldKind`). It **cannot** answer:

- **"who owns it?"** — there is no `owner` field on `KernelObjectContract`; `source` says *which module
  declared it*, which is provenance, not ownership.
- **"what depends on it?"** — relationships are declared **edges**, but nothing computes the **transitive
  closure** ("if I change `customer`, what breaks?") or the reverse index. `relationshipIdCollisions` is the
  only dependents-flavoured output, and it is a defect report.
- **"who can access it?"** — there is no link from an entity to the permission/capability that guards it.
  (`C4` authority is shadow-mode; `SD-4`'s grammar is not built.)

**The honest reading of the blueprint's "read-only to start (an inventory)":** ship the **answers that the
declarations *do* support** — *what exists · what type · provenance (`source`) · dependents via declared
edges · the relationship graph* — and for the answers the platform genuinely cannot support yet (*who can
access it*, *what UI renders it*, *what metrics measure it*, …), return an **explicit, typed "not declared"**
rather than inventing one. That is the same discipline the kernel already uses: **declared absence, never an
invented default.** The registry's value is that it makes the **shape of the gap** queryable, not that it
pretends the gap is filled.

**Non-negotiable invariants (fail-closed / no second truth):**

1. The registry **reads** the kernel view (and the live declarations); it holds **no copy**. Two callers with
   the same declarations get equal answers (reuse the kernel's own determinism).
2. Every "unknown" is a **typed absence** (`{ known: false, reason }`), never a silent empty/`undefined`
   that could read as "nothing depends on this" when the truth is "we do not compute this yet".
3. **Tenant-scoped:** an answer is always scoped to the caller's tenant; a cross-tenant query is refused,
   not silently widened (C3).

## 4. The honest scope decision (stop-and-think, not scope creep)

**GAP A is two halves, and they have different homes.** GAP A part 1 (the `Resource` envelope) is a
**contract**; GAP D / Phase −1 (twelve architecture contracts before all code) also claims it; and
`platform_points.md` records `C1` as **NOT DONE** with the note that "each module declares its own
`tenantId`/`organizationId` columns independently". **Writing the envelope as a type with nothing using it
is exactly the "contract that is a description of what was built, not a constraint on what may be built"
failure that BUILD-ORDER's own Phase −1 warning names.**

**So the honest split:**

**In scope for THIS task (the registry service, C5):**

1. A **read-only `MetadataRegistry` service** in `packages/shared/src/lib/kernel/` (sibling of `model.ts`),
   with a **pure core** (takes a `ModelDescriptor` + optional declaration extras → answers) plus a thin
   reader that builds it from live declarations via `from-modules.ts`.
2. The **inventory answers** the declarations support: `listObjects`, `describeObject(id)`,
   `whatExists(filter)`, `dependents(id)` (reverse-edge closure over declared relationships),
   `provenance(id)` (`source`), and the relationship graph.
3. **Typed absences** for the §54 questions the platform cannot yet answer (who can access it / what UI
   renders it / what metrics measure it / what documentation describes it / …), each with the reason it is
   not answerable yet — so the gap is queryable and honest.
4. Tests: RED-then-GREEN proving each answer, and proving an unanswerable question returns the typed
   absence (not `undefined`, not `[]`).
5. **Hermes read seam** stated: this is the service the AI reads (map §4.1); the plan notes the read-only
   boundary explicitly (no write path).

**Out of scope (named, so it is not smuggled in):**

- **The `Resource` envelope (`C1`)** — it is a **Phase −1 contract** (GAP D). Building the type now with no
  consumer would be the contract-after-code failure. **Decision: the registry is built to *expose* an
  object's envelope-shaped facts where they exist (id/type/version/status/source/timestamps) and to report
  the envelope fields that are *not yet declared* as typed absences** — which is the honest bridge, and it
  makes the envelope's remaining work measurable rather than assumed. The envelope type itself is posted to
  **Phase −1** (backlog, with the trigger "the first Phase −1 contract batch", so it has an owner).
- The permissions gate wiring (**SD-1**) and the structural grammar (**SD-4**) — they **consume** the
  registry; building them is their own tasks.
- Any **write** path (create/edit/delete of metadata) — the registry is read-only by design for now.
- The **UI** for it — not named in Phase 0.

**Design constraint from the existing code:** the registry must be **pure where it matters** (so the round
trip / determinism the kernel already proves extends to it) and must **not** re-derive what
`buildModelDescriptor` already computes — it takes the descriptor as input.

## 5. Prerequisites — confirmed by measurement (2026-10-07)

- `packages/shared/src/lib/kernel/model.ts` present, 407 lines, `buildModelDescriptor` exported.
- `packages/shared/src/lib/kernel/__tests__/` present (the kernel's own tests exist to extend).
- No `MetadataRegistry` symbol exists yet (search returns nothing) — so this is a **new** file, additive.

## 6. The plan

**Delivered (2026-10-07):**

1. **`packages/shared/src/lib/kernel/metadata-registry.ts`** (new) — the read-only service.
   - Types: `RegistryObject` (`RegistryEntity | RegistryField | RegistryRelationship`), `Provenance`
     (`{ source? }` — provenance, **not** ownership), `Answer<T>` (`{known:true,value} | {known:false,…}`),
     `Unknown` (the typed absence, always an object), `RegistryQuestion` (the 13 §54 questions),
     `DependentsResult`.
   - Constants: `ANSWERED_QUESTIONS` (`what_exists · what_type_is_it · what_depends_on_it`) and
     `UNANSWERED_REASONS` (the other ten, each with a **measured** reason). The two are the independent
     sides of the coverage test.
   - `createMetadataRegistry(descriptor)` — **reads the descriptor at query time** (a live view, not a
     snapshot): `listObjects`, `describe`, `whatExists({kind})`, `typeOf`, `provenanceOf`, `dependentsOf`
     (transitive reverse-edge closure over **declared** relationships, carrying an explicit caveat),
     `unanswered()`.
   - `createMetadataRegistryFromDeclarations(input)` — the pure, test-friendly entry point.
   - `tryBuildMetadataRegistry()` / `buildMetadataRegistry()` — the live reader over `from-modules.ts`
     (`null` = "not ready", never an empty model).
2. **`packages/shared/src/lib/kernel/__tests__/metadata-registry.test.ts`** (new) — 25 assertions across
   6 groups: what exists · what type · provenance · what depends on it · the questions that cannot be
   answered yet · no second source of truth (including the live-view test).

**Not delivered (named in §4 as out of scope):** the `Resource` envelope type (Phase −1 contract, C1); the
permissions-gate wiring (SD-1); the structural grammar (SD-4); any write path; the UI.

## 7. Verification protocol

- **RED-then-GREEN**: each new answer asserted; each typed absence asserted (not `undefined`/`[]`).
- **No second truth / live view**: prove the registry reads the descriptor **at query time** — mutate
  the descriptor *after* construction and the answer must change (a snapshot fails this).
- **§54 coverage**: prove the union of answered + unanswered equals **all 13 §54 questions** — with an
  independent question list, because comparing `unanswered()` against `UNANSWERED_REASONS` is tautological
  (the former is built from the latter).
- **Unanswerable-is-typed**: prove a §54 question with no backing declaration returns
  `{ known: false, reason }`, and that removing the backing declaration changes it to that absence.
- **Hostile-critic pass** before calling it done (the D3 lesson: the critic found a real hole). **Result —
  two real holes found and fixed, one scope boundary corrected:**
  - **Hole 1 (real, fixed):** the first draft indexed the model **at construction** — a *snapshot*, though
    the docstring claimed a live view ("a stale registry is impossible"). Fixed by reading the descriptor
    at query time. Pinned by a new test that mutates the descriptor post-construction.
  - **Hole 2 (real, fixed):** the test named "the reason map and the answered set cannot drift" was
    **tautological** — it compared `unanswered()` against the map it is built from, so it stayed GREEN when a
    §54 question was actually dropped. Replaced with a real coverage test over an independent §54 list;
    proven to REDden when a question is dropped.
  - **Scope boundary 3 (claim corrected):** the plan said "a cross-tenant query must be refused"; the
    registry has **no** tenant parameter. Measured, and the honest reading: the registry describes the
    platform's **shape**, which is not tenant-owned — the *rows* are (C3, query layer). There is no
    cross-tenant read to refuse because there is no per-tenant object. The service docstring now states this;
    the tenant parameter is deferred to the day per-tenant overrides exist (concrete trigger).
- **Full suite re-run**: `shared` (194 suites; the `dynamicLoader.tsconfig` suite fails **only under the
  sandbox's `rmSync` shim** — proven pre-existing by running the suite without the new test, and it passes
  in isolation) + `core`; typecheck shared.
- **Docs**: `JOURNAL.md` ▶ box (tick → move down → post next), `BUILD-ORDER.md` Phase 0 item 4,
  `BACKLOG.md` GAP A row, `platform_points.md` C5 (+ glance totals), `STATE-OF-PLAY`, `HANDOVER`.
