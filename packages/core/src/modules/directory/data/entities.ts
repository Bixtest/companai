import { Collection } from '@mikro-orm/core'
import { Entity, ManyToOne, OneToMany, PrimaryKey, Property, Unique } from '@mikro-orm/decorators/legacy'

@Entity({ tableName: 'tenants' })
export class Tenant {
  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()' })
  id!: string

  @Property({ type: 'text' })
  name!: string

  @Property({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean = true

  @Property({ name: 'created_at', type: Date, onCreate: () => new Date() })
  createdAt: Date = new Date()

  @Property({ name: 'updated_at', type: Date, onUpdate: () => new Date() })
  updatedAt: Date = new Date()

  @Property({ name: 'deleted_at', type: Date, nullable: true })
  deletedAt?: Date | null

  @OneToMany(() => Organization, (o) => o.tenant)
  organizations = new Collection<Organization>(this)
}

@Entity({ tableName: 'organizations' })
@Unique({ name: 'organizations_tenant_slug_uniq', properties: ['tenant', 'slug'] })
export class Organization {
  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()' })
  id!: string

  @ManyToOne(() => Tenant)
  tenant!: Tenant

  @Property({ type: 'text' })
  name!: string

  @Property({ type: 'text', nullable: true })
  slug?: string | null

  @Property({ name: 'logo_url', type: 'text', nullable: true })
  logoUrl?: string | null

  @Property({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean = true

  @Property({ name: 'parent_id', type: 'uuid', nullable: true })
  parentId: string | null = null

  @Property({ name: 'root_id', type: 'uuid', nullable: true })
  rootId: string | null = null

  @Property({ name: 'tree_path', type: 'text', nullable: true })
  treePath: string | null = null

  @Property({ type: 'int', default: 0 })
  depth: number = 0

  @Property({ name: 'ancestor_ids', type: 'jsonb', default: [], nullable: false })
  ancestorIds: string[] = []

  @Property({ name: 'child_ids', type: 'jsonb', default: [], nullable: false })
  childIds: string[] = []

  @Property({ name: 'descendant_ids', type: 'jsonb', default: [], nullable: false })
  descendantIds: string[] = []

  @Property({ name: 'created_at', type: Date, onCreate: () => new Date() })
  createdAt: Date = new Date()

  @Property({ name: 'updated_at', type: Date, onUpdate: () => new Date() })
  updatedAt: Date = new Date()

  @Property({ name: 'deleted_at', type: Date, nullable: true })
  deletedAt?: Date | null
}

/**
 * How one organization relates to another (R6).
 *
 * Real customers are not one company with departments. They are consultancies
 * operating client companies, groups with subsidiaries, and temporary structures
 * for a single engagement. A tree cannot express *"we advise that client, and may
 * see these things but never those"* — the relationship carries meaning the
 * permission system has to be able to reason about.
 */
export type OrganizationRelationshipType =
  | 'owns'
  | 'manages'
  | 'advises'
  | 'serves'
  | 'licenses'
  | 'templates'
  | 'supervises'

/**
 * How much flows down the edge.
 *
 * `none` and `reference_only` are the interesting ones: they let a client
 * engagement appear in the structure while inheriting nothing from it, which is
 * exactly the case a tree of departments cannot express.
 */
export type OrganizationInheritanceMode = 'strict' | 'flexible' | 'reference_only' | 'none'

/**
 * A typed edge between two organizations, carrying authority (R6).
 *
 * **The tree still scopes; edges bound.** `organizations.parent_id` and its
 * closure columns remain the structural spine and the index every scoped query
 * uses — this table adds what that spine cannot carry: what kind of relationship
 * it is, how much inherits, and the ceiling on authority flowing down it.
 *
 * `authority_ceiling` is invariant **I4** made structural. A worker in a
 * subsidiary cannot be granted more than the parent's edge permits, whatever its
 * own grants say, because the resolver takes the minimum along the path. Position
 * in the graph bounds authority *before* any per-principal grant is considered.
 *
 * **An absent edge means unconstrained**, and the migration seeds one `owns` /
 * `strict` / `A5` edge per existing parent-child link. Both together mean R6
 * changes no behaviour on the day it lands: the mechanism exists, and lowering a
 * ceiling is a deliberate act somebody performs.
 */
@Entity({ tableName: 'organization_edges' })
@Unique({ name: 'organization_edges_pair_uniq', properties: ['tenantId', 'parentId', 'childId', 'relationshipType'] })
export class OrganizationEdge {
  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()' })
  id!: string

  @Property({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string

  @Property({ name: 'parent_id', type: 'uuid' })
  parentId!: string

  @Property({ name: 'child_id', type: 'uuid' })
  childId!: string

  @Property({ name: 'relationship_type', type: 'text' })
  relationshipType: OrganizationRelationshipType = 'owns'

  @Property({ name: 'inheritance_mode', type: 'text' })
  inheritanceMode: OrganizationInheritanceMode = 'strict'

  /**
   * The most autonomy that may flow down this edge (`A0`–`A5`).
   *
   * Never a grant. It is a ceiling applied on top of everything else, so
   * raising it can only ever remove a constraint this edge was imposing.
   */
  @Property({ name: 'authority_ceiling', type: 'text' })
  authorityCeiling: string = 'A5'

  /**
   * Which capabilities exist at all downstream, as an allowlist.
   *
   * `null` means "no restriction from this edge" — deliberately distinct from
   * `[]`, which means "nothing passes". An empty array is a real and useful
   * statement for a `reference_only` engagement, and conflating the two would
   * make the safest configuration unreachable.
   */
  @Property({ name: 'module_grants', type: 'jsonb', nullable: true })
  moduleGrants: string[] | null = null

  @Property({ name: 'note', type: 'text', nullable: true })
  note: string | null = null

  @Property({ name: 'created_at', type: Date, onCreate: () => new Date() })
  createdAt: Date = new Date()

  @Property({ name: 'updated_at', type: Date, onUpdate: () => new Date() })
  updatedAt: Date = new Date()

  @Property({ name: 'deleted_at', type: Date, nullable: true })
  deletedAt?: Date | null
}
