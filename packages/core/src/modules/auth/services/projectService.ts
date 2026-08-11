import type { EntityManager } from '@mikro-orm/postgresql'
import {
  AuthorityProject,
  AuthorityProjectMembership,
  AuthorityProjectRecord,
} from '@open-mercato/core/modules/auth/data/entities'
import { parseProjectOverlay, type ProjectOverlay } from '@open-mercato/shared/modules/project-overlays'
import { TASK_GRADES, type TaskGrade } from '@open-mercato/shared/modules/capabilities'

export type ProjectScope = { tenantId?: string | null }

export type ProjectContext = {
  projectId: string
  name: string
  /** `null` when nobody has graded the matter. */
  grade: TaskGrade | null
  /** The acting principal's overlay, or `null` when they are not a member. */
  overlay: ProjectOverlay | null
  isMember: boolean
}

/**
 * The project an act is happening in, and what it permits there.
 *
 * One question, one lookup path: given the record an act names and the principal
 * performing it, find the matter and the rules. The resolver asks this on every
 * gated act that carries a record id, so it is deliberately two indexed reads and
 * no aggregation.
 */
export class ProjectService {
  constructor(private readonly em: EntityManager) {}

  /**
   * The project context for an act, or `null` when the record is in no project.
   *
   * **A closed project still applies.** Closing a matter does not un-govern the
   * records inside it — if anything the rules matter more afterwards, when nobody
   * is watching it day to day.
   */
  async contextFor(
    recordId: string,
    principalId: string,
    scope: ProjectScope,
  ): Promise<ProjectContext | null> {
    if (!scope.tenantId || !recordId) return null

    const link = await this.em.findOne(AuthorityProjectRecord, {
      tenantId: scope.tenantId,
      recordId,
    })
    if (!link) return null

    const project = await this.em.findOne(AuthorityProject, {
      id: link.projectId,
      tenantId: scope.tenantId,
    })
    if (!project) return null

    const membership = principalId
      ? await this.em.findOne(AuthorityProjectMembership, {
          tenantId: scope.tenantId,
          projectId: project.id,
          principalId,
        })
      : null

    return {
      projectId: project.id,
      name: project.name,
      grade: this.parseGrade(project.grade),
      overlay: membership ? parseProjectOverlay(membership.permissionOverlay) : null,
      isMember: Boolean(membership),
    }
  }

  async createProject(
    name: string,
    scope: ProjectScope,
    details: { organizationId?: string | null; grade?: TaskGrade | null } = {},
  ): Promise<AuthorityProject> {
    if (!scope.tenantId) throw new Error('[internal] a project needs a tenant')
    const created = this.em.create(AuthorityProject, {
      tenantId: scope.tenantId,
      organizationId: details.organizationId ?? null,
      name,
      grade: details.grade ?? null,
      closedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    await this.em.persist(created).flush()
    return created
  }

  async addMember(
    projectId: string,
    principalId: string,
    principalKind: string,
    scope: ProjectScope,
    overlay?: unknown,
  ): Promise<AuthorityProjectMembership> {
    if (!scope.tenantId) throw new Error('[internal] a membership needs a tenant')
    const existing = await this.em.findOne(AuthorityProjectMembership, {
      tenantId: scope.tenantId,
      projectId,
      principalId,
    })
    if (existing) {
      existing.permissionOverlay = overlay ?? existing.permissionOverlay ?? null
      await this.em.flush()
      return existing
    }
    const created = this.em.create(AuthorityProjectMembership, {
      tenantId: scope.tenantId,
      projectId,
      principalId,
      principalKind,
      permissionOverlay: overlay ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    await this.em.persist(created).flush()
    return created
  }

  /**
   * Puts a record into a project.
   *
   * Moving a record from one project to another is an update rather than a second
   * row: one project per record, or an act inside it would have two sets of rules
   * and no way to choose.
   */
  async assignRecord(projectId: string, recordId: string, scope: ProjectScope): Promise<void> {
    if (!scope.tenantId) throw new Error('[internal] assigning a record needs a tenant')
    const existing = await this.em.findOne(AuthorityProjectRecord, {
      tenantId: scope.tenantId,
      recordId,
    })
    if (existing) {
      existing.projectId = projectId
      await this.em.flush()
      return
    }
    const created = this.em.create(AuthorityProjectRecord, {
      tenantId: scope.tenantId,
      projectId,
      recordId,
      createdAt: new Date(),
    })
    await this.em.persist(created).flush()
  }

  async listProjects(scope: ProjectScope): Promise<AuthorityProject[]> {
    if (!scope.tenantId) return []
    return this.em.find(AuthorityProject, { tenantId: scope.tenantId }, { orderBy: { updatedAt: 'desc' } })
  }

  private parseGrade(value: string | null | undefined): TaskGrade | null {
    if (!value) return null
    // An unreadable grade means "say nothing", not `G0`. Reading it as the lowest
    // grade would buy autonomy from a typo -- the defect fixed in the resolver on
    // 2026-08-11, which is not worth reintroducing here.
    return (TASK_GRADES as readonly string[]).includes(value) ? (value as TaskGrade) : null
  }
}
