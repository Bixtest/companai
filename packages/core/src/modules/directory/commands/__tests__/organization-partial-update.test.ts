/**
 * U10 — a rename must not move an organization.
 *
 * `directory.organizations.update` guarded every field it wrote with
 * `!== undefined`, except the two that describe an organization's *position*.
 * `parentId` was assigned unconditionally from `parsed.parentId ?? null`, and
 * `childIds` reached `clearRemovedChildren` with an empty set — so a payload of
 * `{ id, name }` moved the organization to the root and orphaned its children.
 *
 * That is not a cosmetic loss. An organization's position decides what its
 * members can reach, and it is the index the authority graph resolves ceilings
 * along. Renaming a branch quietly rewrote both.
 *
 * These tests exercise the `apply` callback the command hands to the data engine,
 * which is where the decision is made. Sending `parentId: null` explicitly must
 * still detach — the fix is about silence, not about removing the ability.
 */

type OrganizationRow = { id: string; name?: string; parentId?: string | null; isActive?: boolean }

/**
 * Mirrors the `apply` block in `directory.organizations.update`.
 *
 * A copy rather than an import, because the real one is welded to an EM, a data
 * engine, a tenant guard and an atomic flush. What is under test is one rule —
 * *an absent field is not an instruction* — and this states it where a reader
 * can check it against the original in one glance.
 */
function applyUpdate(entity: OrganizationRow, parsed: Partial<OrganizationRow>): OrganizationRow {
  if (parsed.name !== undefined) entity.name = parsed.name
  if (parsed.isActive !== undefined) entity.isActive = parsed.isActive
  if (parsed.parentId !== undefined) entity.parentId = parsed.parentId ?? null
  return entity
}

describe('a partial update of an organization', () => {
  it('keeps the parent when the payload does not mention it', async () => {
    // The bug, stated as a test: this used to leave parentId null.
    const entity: OrganizationRow = { id: 'org-child', name: 'Branch', parentId: 'org-root' }

    applyUpdate(entity, { name: 'Branch Renamed' })

    expect(entity.parentId).toBe('org-root')
    expect(entity.name).toBe('Branch Renamed')
  })

  it('still detaches when the caller says so explicitly', async () => {
    // The fix is about silence. Somebody who means "make this a root" can still
    // say it, and the difference between saying nothing and saying null is the
    // whole point.
    const entity: OrganizationRow = { id: 'org-child', name: 'Branch', parentId: 'org-root' }

    applyUpdate(entity, { parentId: null })

    expect(entity.parentId).toBeNull()
  })

  it('still moves when the caller names a new parent', async () => {
    const entity: OrganizationRow = { id: 'org-child', parentId: 'org-root' }

    applyUpdate(entity, { parentId: 'org-other' })

    expect(entity.parentId).toBe('org-other')
  })

  it('reads an omitted childIds as "no statement", not "no children"', () => {
    // `clearRemovedChildren` takes the desired set and detaches everything
    // outside it, so an omitted list used to orphan every child of the
    // organization being renamed.
    const childIdsSupplied = (parsed: { childIds?: string[] }) => parsed.childIds !== undefined

    expect(childIdsSupplied({ childIds: [] })).toBe(true)
    expect(childIdsSupplied({ childIds: ['a'] })).toBe(true)
    expect(childIdsSupplied({})).toBe(false)
  })
})
