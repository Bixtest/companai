/**
 * The audience filter, as it reaches the query.
 *
 * `visibility.test.ts` in shared decides *which* scopes a reader may see. This
 * decides that the decision actually reaches SQL — and reaches it as a predicate
 * rather than as something the service applies to rows after fetching them.
 *
 * The distinction is not pedantic. Filtering after the query still leaks through
 * anything that counts, pages or exports, and this route does all three: `count()`
 * and `loadEntries()` share one builder precisely so a hidden row cannot show up
 * in a total.
 *
 * **What these tests cannot tell you** is whether the SQL is valid — the builder
 * here is a fake, and a fake answers questions about my understanding of Kysely
 * rather than about Postgres ([[L34]]). The predicate was executed against a real
 * database separately; see PROGRESS under G6.
 */
import { ActionLogService } from '../actionLogService'

type Clause = { column: unknown; op: unknown; value: unknown }
type Group = { kind: 'and' | 'or'; children: unknown[] }

function isGroup(value: unknown): value is Group {
  return typeof value === 'object' && value !== null && 'kind' in (value as Record<string, unknown>)
}

function flatten(node: unknown, into: Clause[]): void {
  if (isGroup(node)) {
    for (const child of node.children) flatten(child, into)
    return
  }
  if (typeof node === 'object' && node !== null && 'column' in (node as Record<string, unknown>)) {
    into.push(node as Clause)
  }
}

function inspect(query: Record<string, unknown>) {
  const direct: Clause[] = []
  const groups: Group[] = []

  const builder: Record<string, unknown> = {}
  const chain = () => builder
  Object.assign(builder, {
    selectAll: chain,
    orderBy: chain,
    where: (...args: unknown[]) => {
      if (typeof args[0] === 'function') {
        const eb = ((column: unknown, op: unknown, value: unknown) => ({ column, op, value })) as Record<string, unknown> &
          ((column: unknown, op: unknown, value: unknown) => Clause)
        eb.and = (children: unknown[]) => ({ kind: 'and', children })
        eb.or = (children: unknown[]) => ({ kind: 'or', children })
        const produced = (args[0] as (builderArg: unknown) => unknown)(eb)
        if (isGroup(produced)) groups.push(produced)
        else if (produced) direct.push(produced as Clause)
      } else {
        direct.push({ column: args[0], op: args[1], value: args[2] })
      }
      return builder
    },
  })

  const service = new ActionLogService({ getKysely: () => ({ selectFrom: () => builder }) } as never)
  const internals = service as unknown as {
    parseListQuery: (input: Record<string, unknown>) => Record<string, unknown>
    buildListQuery: (parsed: Record<string, unknown>) => unknown
  }
  internals.buildListQuery(internals.parseListQuery(query))

  const all: Clause[] = [...direct]
  for (const group of groups) flatten(group, all)
  const visibility = all.filter((clause) => clause.column === 'action_logs.visibility_scope')
  return { visibility, groups, all }
}

const TENANT = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
const READER = 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22'

describe('the audience reaches the query', () => {
  it('filters on the scopes the reader may see', () => {
    const { visibility } = inspect({ tenantId: TENANT, visibilityScopes: ['tenant', 'portal'] })

    expect(visibility).toContainEqual({
      column: 'action_logs.visibility_scope',
      op: 'in',
      value: ['tenant', 'portal'],
    })
  })

  it('does not restrict at all when no audience is supplied', () => {
    // Every existing caller passes nothing. Introducing a vocabulary must not
    // quietly change what they return.
    const { visibility } = inspect({ tenantId: TENANT })

    expect(visibility).toEqual([])
  })

  it('returns nothing when the reader may see nothing', () => {
    // The failure that matters: an empty list must not compile to the same SQL
    // as "no restriction". Fail closed, or the most restricted reader becomes
    // the least restricted one.
    const { visibility } = inspect({ tenantId: TENANT, visibilityScopes: [] })

    expect(visibility).toEqual([
      { column: 'action_logs.visibility_scope', op: '=', value: '__none__' },
    ])
  })
})

describe('own private acts', () => {
  it('come back to the reader who performed them', () => {
    // Nobody is locked out of their own history, and this cannot live in the
    // scope list: whether a private row is readable depends on who performed it.
    const { all } = inspect({
      tenantId: TENANT,
      visibilityScopes: ['tenant', 'portal'],
      visibilityActorUserId: READER,
    })

    expect(all).toContainEqual({
      column: 'action_logs.visibility_scope',
      op: '=',
      value: 'private',
    })
    expect(all).toContainEqual({
      column: 'action_logs.actor_user_id',
      op: '=',
      value: READER,
    })
  })

  it('joins the two conditions with AND, inside an OR against the scope list', () => {
    // `scope in (...) OR (scope = 'private' AND actor = me)`. Getting the nesting
    // wrong the other way -- ANDing the actor across everything -- would silently
    // narrow the whole timeline to the reader's own acts.
    const { groups } = inspect({
      tenantId: TENANT,
      visibilityScopes: ['tenant'],
      visibilityActorUserId: READER,
    })

    const visibilityGroup = groups.find((group) => group.kind === 'or'
      && group.children.some((child) => isGroup(child) && child.kind === 'and'))
    expect(visibilityGroup).toBeDefined()
    expect(visibilityGroup!.children).toHaveLength(2)
  })

  it('still returns own private acts when the reader may see no other scope', () => {
    const { all, visibility } = inspect({
      tenantId: TENANT,
      visibilityScopes: [],
      visibilityActorUserId: READER,
    })

    expect(visibility).not.toContainEqual(
      { column: 'action_logs.visibility_scope', op: '=', value: '__none__' },
    )
    expect(all).toContainEqual({ column: 'action_logs.actor_user_id', op: '=', value: READER })
  })
})
