/**
 * SD-1 (CC-3) — the `entities add-field` CLI runs the same permissions gate.
 *
 * `add-field` creates a `CustomFieldDef` directly (it does not go through
 * `ensureCustomFieldDefinitions`), so it is its own creation site and needs its own
 * gate. These tests prove it: a new field is decided before it lands, the default's
 * records are written after the commit, a malformed key is refused (fail closed), and
 * a global field is not granted (no tenant to grant in).
 *
 * The readline interface is mocked so the interactive prompts are deterministic — with
 * the field's flags supplied, only the three scope prompts remain.
 */
import cli from '../cli'
import { applyStructureChangeGrant } from '@open-mercato/core/modules/auth/lib/permission-decision-grant'
import { CustomFieldDef } from '../data/entities'

const mockQuestion = jest.fn()

jest.mock('node:readline/promises', () => ({
  __esModule: true,
  default: {
    createInterface: () => ({
      question: (prompt: string) => mockQuestion(prompt),
      close: jest.fn(async () => {}),
    }),
  },
}))

jest.mock('@open-mercato/core/modules/auth/lib/permission-decision-grant', () => ({
  applyStructureChangeGrant: jest.fn(async () => ({
    applied: true,
    roleName: 'superadmin',
    roleId: 'role-1',
    aclCreated: false,
    added: [],
    alreadyPresent: [],
  })),
}))

const mockFindOne = jest.fn()
const mockFlush = jest.fn(async () => {})
const create = jest.fn((_entity: unknown, data: Record<string, unknown>) => ({ ...data }))
const persist = jest.fn(() => ({ flush: mockFlush }))

jest.mock('@open-mercato/shared/lib/di/container', () => ({
  createRequestContainer: async () => ({
    resolve: () => ({
      findOne: (...args: unknown[]) => mockFindOne(...args),
      create: (entity: unknown, data: Record<string, unknown>) => create(entity, data),
      persist: (entity: unknown) => persist(entity),
      flush: () => mockFlush(),
    }),
  }),
}))

const grantMock = applyStructureChangeGrant as unknown as jest.Mock

/**
 * How many times a mock was called **for a given entity class**.
 *
 * `M3e`/`P3b` added a second, independent `create`/`persist` path (a `PermissionSurfaceRecord`
 * row for the catalogue) alongside the `CustomFieldDef` write these tests are about. Counting
 * all calls now conflates the two, so the assertions narrow to the entity under test.
 */
function callsFor(mock: jest.Mock, entity: unknown): unknown[][] {
  return mock.mock.calls.filter((call) => call[0] === entity)
}

function addFieldCommand() {
  const commands = cli as unknown as Array<{ command: string; run: (rest: string[]) => Promise<void> }>
  const command = commands.find((entry) => entry.command === 'add-field')
  if (!command) throw new Error('add-field command not found')
  return command
}

/**
 * The flags that leave only the three scope prompts (global, org, tenant). The boolean
 * flags are given bare, and `--default=` suppresses the default-value prompt.
 */
function fieldFlags(key = 'foo'): string[] {
  return [
    '--entity', 'a:one',
    '--key', key,
    '--kind', 'text',
    '--label', 'Foo',
    '--required', '--multi', '--filterable', '--listVisible', '--formEditable', '--indexed',
    '--default=',
  ]
}

/** Answer the three remaining scope prompts: not global, org-1, tenant-1. */
function answerScopePrompts() {
  mockQuestion.mockResolvedValueOnce('n').mockResolvedValueOnce('org-1').mockResolvedValueOnce('tenant-1')
}

beforeEach(() => {
  grantMock.mockClear()
  create.mockClear()
  persist.mockClear()
  mockFlush.mockClear()
  mockFindOne.mockReset()
  mockFindOne.mockResolvedValue(null)
  mockQuestion.mockReset()
})

describe('entities add-field — the SD-1 permissions gate (CC-3)', () => {
  it('gates a new field and grants its records after it lands', async () => {
    answerScopePrompts()

    await addFieldCommand().run(fieldFlags())

    expect(callsFor(create, CustomFieldDef)).toHaveLength(1)
    expect(grantMock).toHaveBeenCalledTimes(1)
    const [, grantInput] = grantMock.mock.calls[0]
    expect(grantInput.tenantId).toBe('tenant-1')
    expect(grantInput.decision.outcome).toBe('defaulted')
    // The create commits before the grant is written.
    expect(persist.mock.invocationCallOrder[0]).toBeLessThan(grantMock.mock.invocationCallOrder[0])
  })

  it('refuses a malformed key and creates nothing (fail closed)', async () => {
    answerScopePrompts()

    await addFieldCommand().run(fieldFlags('Bad-Key'))

    expect(callsFor(create, CustomFieldDef)).toHaveLength(0)
    expect(persist).not.toHaveBeenCalled()
    expect(grantMock).not.toHaveBeenCalled()
  })

  it('gates a reactivation — an inactive row this command brings back', async () => {
    answerScopePrompts()
    mockFindOne.mockResolvedValueOnce({
      entityId: 'a:one', key: 'foo', kind: 'text', isActive: false, deletedAt: null, configJson: {},
    })

    await addFieldCommand().run(fieldFlags())

    expect(callsFor(create, CustomFieldDef)).toHaveLength(0) // it updated the existing row, not created one
    expect(grantMock).toHaveBeenCalledTimes(1)
    const [, grantInput] = grantMock.mock.calls[0]
    expect(grantInput.decision.outcome).toBe('defaulted')
  })

  it('does not gate an update that keeps the field active', async () => {
    answerScopePrompts()
    mockFindOne.mockResolvedValueOnce({
      entityId: 'a:one', key: 'foo', kind: 'text', isActive: true, deletedAt: null, configJson: {},
    })

    await addFieldCommand().run(fieldFlags())

    expect(grantMock).not.toHaveBeenCalled()
  })

  it('does not grant a global field — it has no tenant to grant in', async () => {
    // `--global` answers the scope question, so no prompt is needed.
    await addFieldCommand().run(['--global', ...fieldFlags()])

    expect(create).toHaveBeenCalledTimes(1)
    expect(grantMock).not.toHaveBeenCalled()
  })
})
