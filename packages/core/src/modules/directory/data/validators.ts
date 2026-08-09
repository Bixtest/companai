import { z } from 'zod'

export const tenantCreateSchema = z.object({
  name: z.string().min(1).max(200),
  isActive: z.boolean().optional(),
})

export const tenantUpdateSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(200).optional(),
  isActive: z.boolean().optional(),
})

const slugField = z.string().trim().toLowerCase().regex(/^[a-z0-9\-_]+$/).max(150).optional().nullable()
const logoUrlField = z
  .union([
    z.string().trim().url().max(2048).refine(
      (value) => value.startsWith('https://') || value.startsWith('http://'),
      { message: 'Logo URL must use http or https.' },
    ),
    z.string().trim().regex(/^\/api\/attachments\/(?:image|file)\/[A-Za-z0-9%_.~/?=&-]+$/).max(2048),
  ])
  .optional()
  .nullable()

export const organizationCreateSchema = z.object({
  tenantId: z.string().uuid().optional(),
  name: z.string().min(1).max(200),
  slug: slugField,
  logoUrl: logoUrlField,
  isActive: z.boolean().optional(),
  parentId: z.string().uuid().nullable().optional(),
  childIds: z.array(z.string().uuid()).optional(),
})

export const organizationUpdateSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid().optional(),
  name: z.string().min(1).max(200).optional(),
  slug: slugField,
  logoUrl: logoUrlField,
  isActive: z.boolean().optional(),
  parentId: z.string().uuid().nullable().optional(),
  childIds: z.array(z.string().uuid()).optional(),
})

export type TenantCreateInput = z.infer<typeof tenantCreateSchema>
export type TenantUpdateInput = z.infer<typeof tenantUpdateSchema>
export type OrganizationCreateInput = z.infer<typeof organizationCreateSchema>
export type OrganizationUpdateInput = z.infer<typeof organizationUpdateSchema>

/**
 * Typed authority edges between organizations (R6).
 *
 * The enums are duplicated from the shared authority module rather than imported
 * so that a validator failure names the value the caller sent. Keeping them in
 * step is what the `organization_edges_*_ck` database constraints are for — if
 * these ever drift, the write fails at the database rather than storing a value
 * the resolver cannot read.
 */
export const organizationRelationshipTypes = [
  'owns', 'manages', 'advises', 'serves', 'licenses', 'templates', 'supervises',
] as const

export const organizationInheritanceModes = [
  'strict', 'flexible', 'reference_only', 'none',
] as const

export const autonomyGates = ['A0', 'A1', 'A2', 'A3', 'A4', 'A5'] as const

const edgeBodySchema = z.object({
  relationshipType: z.enum(organizationRelationshipTypes).default('owns'),
  inheritanceMode: z.enum(organizationInheritanceModes).default('strict'),
  authorityCeiling: z.enum(autonomyGates).default('A5'),
  /**
   * `null` restricts nothing; `[]` passes nothing. Kept distinct deliberately —
   * an empty allowlist is the correct configuration for a reference-only
   * engagement, and collapsing the two would make it unreachable.
   */
  moduleGrants: z.array(z.string().min(1)).nullable().optional(),
  note: z.string().max(1000).nullable().optional(),
})

export const organizationEdgeCreateSchema = edgeBodySchema.extend({
  parentId: z.string().uuid(),
  childId: z.string().uuid(),
})

export const organizationEdgeUpdateSchema = edgeBodySchema.partial().extend({
  id: z.string().uuid(),
})
