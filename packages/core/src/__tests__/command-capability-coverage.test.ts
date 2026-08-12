/**
 * Which commands the authority gate can bind, and which it deliberately cannot.
 *
 * **Why a test rather than a note.** The gate is keyed by capability and a
 * command that declares none is not gated — silently, and by design, because
 * refusing every unmapped command would break the platform. That makes the gap
 * invisible: nothing fails, nothing warns, and coverage decays one new command
 * at a time.
 *
 * This is the thing that notices. It was written when live coverage went from
 * 54% to 98% (item 16), and it fails if a new command arrives without a
 * decision — either declare a capability, or add it to the list below with the
 * reason.
 *
 * **Parked modules are excluded.** They do not run, so their commands cannot be
 * dispatched. If one is ever un-parked, this test starts failing for it, which
 * is the right moment to classify its commands rather than months later.
 */
import fs from 'node:fs'
import path from 'node:path'

const repoRoot = path.resolve(__dirname, '../../../..')

const PARKED = new Set([
  'catalog', 'checkout', 'customer_accounts', 'customers', 'gateway_stripe',
  'payment_gateways', 'portal', 'resources', 'sales', 'shipping_carriers',
  'staff', 'sync_akeneo', 'sync_excel', 'wms',
])

/**
 * Commands that run ungated on purpose. Each needs a reason, because the whole
 * value of this list is that somebody had to write one.
 */
const DELIBERATELY_UNGATED: Record<string, string> = {
  'messages.tokens.consume':
    'The external-recipient path. A token from an emailed link is exchanged for ' +
    'access, and the token IS the credential — the caller has no session and no ' +
    'ACL, so there is no capability to check. Gating it would break external ' +
    'access rather than add a control.',
}

function walk(dir: string, out: string[] = []): string[] {
  if (!fs.existsSync(dir)) return out
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (['node_modules', 'dist', '.mercato', '.next', '__tests__'].includes(entry.name)) continue
      walk(full, out)
    } else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts') && !entry.name.endsWith('.spec.ts')) {
      if (full.split(path.sep).includes('commands')) out.push(full)
    }
  }
  return out
}

function moduleOf(file: string): string {
  const parts = file.split(path.sep)
  const i = parts.indexOf('modules')
  return i >= 0 ? parts[i + 1] : '?'
}

type Command = { id: string; module: string; gated: boolean }

function collectCommands(): Command[] {
  const files = [
    ...walk(path.join(repoRoot, 'packages')),
    ...walk(path.join(repoRoot, 'apps', 'mercato', 'src')),
  ]
  const commands: Command[] = []
  for (const file of files) {
    const module = moduleOf(file)
    if (PARKED.has(module)) continue
    const src = fs.readFileSync(file, 'utf8')
    const idPattern = /\bid:\s*'([a-z_0-9]+\.[a-z_0-9.]+)'/g
    let match: RegExpExecArray | null
    while ((match = idPattern.exec(src)) !== null) {
      const window = src.slice(Math.max(0, match.index - 400), match.index + 400)
      commands.push({
        id: match[1],
        module,
        // A capability may be a quoted string or a function reference (U14).
        gated: /\bcapability:\s*(?:'|[A-Za-z_])/.test(window),
      })
    }
  }
  return commands
}

describe('the authority gate can bind every live command', () => {
  const commands = collectCommands()

  it('finds commands to check at all', () => {
    // Guards the collector itself. A regex that silently matches nothing would
    // make every assertion below pass while proving nothing — the failure mode
    // that made an earlier guard useless (L37).
    expect(commands.length).toBeGreaterThan(40)
  })

  it('leaves no command ungated without a recorded reason', () => {
    const unexplained = commands
      .filter((command) => !command.gated)
      .filter((command) => !(command.id in DELIBERATELY_UNGATED))
      .map((command) => `${command.module}: ${command.id}`)

    expect(unexplained).toEqual([])
  })

  it('keeps every documented exception real', () => {
    // The other direction: an entry left behind after its command was gated or
    // deleted turns this list into folklore.
    const ids = new Set(commands.map((command) => command.id))
    const stale = Object.keys(DELIBERATELY_UNGATED).filter((id) => !ids.has(id))

    expect(stale).toEqual([])
  })

  it('states a reason for each exception', () => {
    // A one-word reason is not a reason; the point of the list is that somebody
    // had to justify the exception in prose.
    const tooThin = Object.entries(DELIBERATELY_UNGATED)
      .filter(([, reason]) => reason.length < 40)
      .map(([id]) => id)

    expect(tooThin).toEqual([])
  })
})
