import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthFromRequest } from '@open-mercato/shared/lib/auth/server'
import { createRequestContainer } from '@open-mercato/shared/lib/di/container'
import type { OpenApiRouteDoc } from '@open-mercato/shared/lib/openapi'
import {
  STRUCTURAL_LEVELS,
  STRUCTURAL_SETTINGS_MODULE,
  STRUCTURAL_SETTINGS_NAME,
  loadStructuralSettings,
  parseStructuralSettings,
} from '@open-mercato/shared/lib/permissions/structural-settings'
import { beginAuthMutationGuard } from '../mutation-guard'

/**
 * The structural-permission **manage screen's** data route (SD-5).
 *
 * **What this is.** The read/write endpoint behind the "Structural permissions"
 * settings page: it exposes the S11/S12 grammar — the level a structural change
 * is permitted at, **per (object kind, verb, actor type)** — so a person can see
 * and change it. The *policy* lives in
 * `@open-mercato/shared/lib/permissions/structural-settings` (the grammar's home,
 * the same module the CC-37 guard reads); this route is the thin transport over
 * it, exactly as `entities/api/entity-settings.ts` is the transport over the
 * `newEntitiesRestrictedByDefault` policy.
 *
 * **Why it lives in `auth`.** There is **no `permissions` module** — the string
 * `permissions` above is only the setting's *module id* in the `module_configs`
 * store, not a code module. The roles-and-permissions surface (the shape SD-5
 * reuses, S5) is the `auth` module's, gated by `auth.acl.manage`; homing this
 * route there keeps the manage screen beside the ACL editor it mirrors, rather
 * than inventing a module for one setting.
 *
 * **Fail closed on read, strictly validated on write.** GET runs whatever was
 * stored through `parseStructuralSettings` (via `loadStructuralSettings`, which
 * also swallows a store error) and returns the seed when the value is malformed —
 * so a broken setting reads as *no* setting, never as a looser one. PUT runs the
 * incoming body through the *same* `parseStructuralSettings` and returns 400 on
 * anything it will not accept, so the screen can only ever write a value a reader
 * will accept back. Both directions use one validator, so they cannot drift.
 *
 * **The write passes the module's mutation-guard seam.** The PUT goes through
 * `beginAuthMutationGuard` (the `auth` module's registry wrapper) before it
 * writes — the D2-gap rule: a write that changes a security control passes the
 * same seam every other write in the module shares, so the first `auth` guard
 * ever registered for this resource kind is enforced rather than skipped.
 */
export const metadata = {
  GET: { requireAuth: true, requireFeatures: ['auth.acl.manage'] },
  PUT: { requireAuth: true, requireFeatures: ['auth.acl.manage'] },
}

const STRUCTURAL_SETTINGS_RESOURCE_KIND = 'auth.structural_permissions'

type ModuleConfigServiceLike = {
  getValue: (
    moduleId: string,
    name: string,
    options?: { defaultValue?: unknown; scope?: { tenantId?: string | null } },
  ) => Promise<unknown>
  setValue: (
    moduleId: string,
    name: string,
    value: unknown,
    scope?: { tenantId?: string | null },
  ) => Promise<unknown>
}

/**
 * The wire shape of the setting. **Zod validates the SHAPE; the grammar's own
 * parser validates the VALUES.**
 *
 * The rules map is deliberately validated here as an **open
 * `string → string → string → level` record** rather than with a `z.enum` key at
 * each level. Two reasons:
 *
 * 1. **Sparse is the point (S11).** The screen sends only the triples a person
 *    chose; every other cell inherits `defaultLevel`. A `z.record(z.enum(...), …)`
 *    in zod v4 demands *every* enum key be present, which would force the client to
 *    materialise all 90 cells just to change one — the opposite of the inheritance
 *    model, and a shape `parseStructuralSettings` does not produce.
 * 2. **One validator owns the closed sets.** `parseStructuralSettings` already
 *    rejects an unknown object kind, verb, actor or level (and a `straight`
 *    default). Re-encoding the closed sets in zod would be a *second* source of
 *    truth that could drift from the grammar. Zod checks that the body is
 *    JSON-object-shaped and that `defaultLevel` is a known level name; the parser
 *    checks everything else.
 */
const structuralSettingsBodySchema = z.object({
  rules: z.record(z.string(), z.unknown()).optional(),
  defaultLevel: z.enum(STRUCTURAL_LEVELS),
})

/** The four level names, used to describe the response in the OpenAPI doc. */
const levelSchema = z.enum(STRUCTURAL_LEVELS)

const structuralSettingsResponseSchema = z.object({
  rules: z.record(z.string(), z.record(z.string(), z.record(z.string(), levelSchema))),
  defaultLevel: levelSchema,
})

async function GET(req: Request) {
  const auth = await getAuthFromRequest(req)
  if (!auth || !auth.tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Read through the same loader the guard uses, so the screen and the guard see
  // one value. A malformed/absent setting yields the seed (fail closed).
  let reader: ModuleConfigServiceLike | null = null
  try {
    const container = await createRequestContainer()
    reader = container.resolve('moduleConfigService') as ModuleConfigServiceLike
  } catch {
    reader = null
  }
  const settings = await loadStructuralSettings(reader, { tenantId: auth.tenantId ?? null })
  return NextResponse.json({ rules: settings.rules, defaultLevel: settings.defaultLevel })
}

async function PUT(req: Request) {
  const auth = await getAuthFromRequest(req)
  if (!auth || !auth.tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let raw: unknown
  try {
    raw = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // Zod first (shape), then the grammar's own parser (closed sets + fail-closed
  // default). A body that passes zod but says `defaultLevel: 'straight'` is
  // rejected by the parser — the same refusal the guard's reader applies.
  const shape = structuralSettingsBodySchema.safeParse(raw)
  if (!shape.success) {
    return NextResponse.json({ error: 'Invalid payload', details: shape.error.flatten() }, { status: 400 })
  }
  const settings = parseStructuralSettings({
    rules: shape.data.rules ?? {},
    defaultLevel: shape.data.defaultLevel,
  })
  if (!settings) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  // Resolve the container with the same care the GET applies: a container failure
  // must be a controlled 500, not an unhandled throw. Nothing has been written at
  // this point, so failing here is safe (fail closed — no write happens).
  let container: Awaited<ReturnType<typeof createRequestContainer>>
  try {
    container = await createRequestContainer()
  } catch {
    return NextResponse.json({ error: 'Service unavailable' }, { status: 500 })
  }

  const guard = await beginAuthMutationGuard({
    container,
    tenantId: auth.tenantId ?? null,
    organizationId: auth.orgId ?? null,
    userId: auth.sub ?? null,
    req,
    resourceKind: STRUCTURAL_SETTINGS_RESOURCE_KIND,
    resourceId: STRUCTURAL_SETTINGS_NAME,
    operation: 'update',
    mutationPayload: { defaultLevel: settings.defaultLevel, rules: settings.rules },
  })
  if (guard.blockedResponse) return guard.blockedResponse

  const moduleConfigService = container.resolve('moduleConfigService') as ModuleConfigServiceLike
  await moduleConfigService.setValue(STRUCTURAL_SETTINGS_MODULE, STRUCTURAL_SETTINGS_NAME, settings, {
    tenantId: auth.tenantId ?? null,
  })
  await guard.runAfterSuccess()
  return NextResponse.json({ ok: true, rules: settings.rules, defaultLevel: settings.defaultLevel })
}

const errorSchema = z.object({ error: z.string() })

export const openApi: OpenApiRouteDoc = {
  tag: 'Authentication & Accounts',
  summary: 'Structural permission levels',
  methods: {
    GET: {
      summary: 'Read structural permission levels',
      description:
        'Returns the S11/S12 grammar — the level each (object kind, verb, actor type) sits at — falling back to the fail-closed seed when the stored value is malformed or absent.',
      responses: [
        { status: 200, description: 'Current structural permission levels', schema: structuralSettingsResponseSchema },
        { status: 401, description: 'Missing authentication', schema: errorSchema },
      ],
    },
    PUT: {
      summary: 'Update structural permission levels',
      description:
        'Replaces the structural permission levels. The body is validated by the grammar parser, so an unknown verb, actor, level or object kind is rejected (400) rather than silently accepted.',
      requestBody: { schema: structuralSettingsBodySchema },
      responses: [
        {
          status: 200,
          description: 'Updated structural permission levels',
          schema: z.object({
            ok: z.literal(true),
            rules: z.record(z.string(), z.record(z.string(), z.record(z.string(), levelSchema))),
            defaultLevel: levelSchema,
          }),
        },
        { status: 400, description: 'Invalid payload', schema: errorSchema },
        { status: 401, description: 'Missing authentication', schema: errorSchema },
      ],
    },
  },
}

export { GET, PUT }
