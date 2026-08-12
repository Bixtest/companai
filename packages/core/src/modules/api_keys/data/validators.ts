import { z } from 'zod'

const uuid = z.string().uuid()

const expiresAtSchema = z.preprocess((value) => {
  if (value === undefined || value === null || value === '') return null
  const date = value instanceof Date ? value : new Date(String(value))
  return Number.isNaN(date.getTime()) ? undefined : date
}, z.date().nullable().refine((date) => date === null || date.getTime() > Date.now(), {
  message: 'expiresAt must be in the future',
}))

export const createApiKeySchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(1000).optional().nullable(),
  tenantId: uuid.optional().nullable(),
  organizationId: uuid.optional().nullable(),
  roles: z.array(z.string().trim().min(1)).optional().default([]),
  expiresAt: expiresAtSchema.optional(),
  /**
   * What kind of actor this credential is.
   *
   * Omitted means `service` — an ordinary integration key, which is what every
   * key was before AI workers could exist. Marking one `ai_worker` changes the
   * subject it issues and therefore how the resolver, the journal and the
   * ledger classify everything it does.
   *
   * Deliberately only these two. `human` would let a credential impersonate a
   * person, which is the one thing the principal split exists to prevent, and
   * `system` is the platform acting on its own behalf — never something a key
   * should be able to claim.
   */
  principalKind: z.enum(['service', 'ai_worker']).optional(),
})

export const updateApiKeySchema = createApiKeySchema.partial().extend({
  id: uuid,
})
