#!/usr/bin/env node
/**
 * `SR-02` — the mutation proof.
 *
 * Each mutation breaks ONE mechanism on purpose and names the test that must go
 * red. A mutation that leaves the suite green means the test was decoration.
 *
 * The restore is byte-exact: the original bytes are held in memory, written back,
 * and the md5 is compared. A "restored" file that differs by one byte is a failed
 * restore, not a pass.
 *
 * Run: node scripts/verify-sr02-mutations.mjs
 */
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const PKG = path.resolve(HERE, '..')

const MIGRATION = path.join(
  PKG,
  'src/modules/ai_assistant/migrations/Migration20261017120000_ai_agent_runtimes.ts',
)
const ENTITIES = path.join(PKG, 'src/modules/ai_assistant/data/entities.ts')
const REPOSITORY = path.join(
  PKG,
  'src/modules/ai_assistant/data/repositories/AiAgentRuntimeRepository.ts',
)
const REGISTRY = path.join(PKG, 'src/modules/ai_assistant/lib/agent-runtime-registry.ts')
const SELECTOR = path.join(PKG, 'src/modules/ai_assistant/lib/resolve-ai-runtime-port.ts')

const SCHEMA_TEST = 'src/modules/ai_assistant/data/__tests__/agent-runtime-schema.test.ts'
const REPO_TEST =
  'src/modules/ai_assistant/data/repositories/__tests__/AiAgentRuntimeRepository.test.ts'
const REGISTRY_TEST = 'src/modules/ai_assistant/lib/__tests__/agent-runtime-registry.test.ts'
const SELECTOR_TEST = 'src/modules/ai_assistant/lib/__tests__/resolve-ai-runtime-port.test.ts'

const MUTATIONS = [
  {
    name: 'M1 — the binding-name index is no longer UNIQUE',
    file: MIGRATION,
    find: 'create unique index "ai_agent_runtimes_tenant_org_name_uq"',
    replace: 'create index "ai_agent_runtimes_tenant_org_name_uq"',
    test: SCHEMA_TEST,
    mustFailWith: 'ai_agent_runtimes_tenant_org_name_uq',
  },
  {
    name: 'M2 — the entity expression drifts from the migration predicate',
    file: ENTITIES,
    find:
      '("tenant_id", "organization_id", "daemon_id", "provider") where "organization_id" is not null and "deleted_at" is null',
    replace: '("tenant_id", "organization_id", "daemon_id", "provider") where "organization_id" is not null',
    test: SCHEMA_TEST,
    mustFailWith: 'no entity/schema drift',
  },
  {
    name: 'M3 — daemon_id becomes nullable (the donor defect, re-introduced)',
    file: MIGRATION,
    find: '"daemon_id" text not null',
    replace: '"daemon_id" text null',
    test: SCHEMA_TEST,
    mustFailWith: 'NOT NULL daemon_id',
  },
  {
    name: 'M4 — a liveness column is re-added with no writer to set it',
    file: MIGRATION,
    find: '"metadata" jsonb not null default \'{}\',',
    replace: '"status" text not null default \'offline\',\n        "metadata" jsonb not null default \'{}\',',
    test: SCHEMA_TEST,
    mustFailWith: 'no writer exists',
  },
  {
    name: 'M5 — the provider vocabulary is frozen into SQL as a CHECK',
    file: MIGRATION,
    find: 'constraint "ai_agent_runtimes_pkey" primary key ("id")',
    replace:
      'constraint "ai_agent_runtimes_pkey" primary key ("id"),\n        constraint "ai_agent_runtimes_provider_chk" check ("provider" <> \'\')',
    test: SCHEMA_TEST,
    mustFailWith: 'does not constrain the provider vocabulary',
  },
  {
    name: 'M6 — register() pre-checks with a SELECT (the race window returns)',
    file: REPOSITORY,
    find: '    try {\n      return await this.em.transactional',
    replace:
      '    await this.em.findOne(AiAgentRuntime, { tenantId: ctx.tenantId } as never)\n    try {\n      return await this.em.transactional',
    test: REPO_TEST,
    mustFailWith: 'does NOT pre-check',
  },
  {
    name: 'M7 — the unique violation is rethrown raw (no typed key)',
    file: REPOSITORY,
    find: '      if (!violation) throw error',
    replace: '      throw error',
    test: REPO_TEST,
    mustFailWith: 'translates a name collision',
  },
  {
    name: 'M8 — the provider vocabulary is not validated before the write',
    file: REPOSITORY,
    find: '    if (!isAiRuntimeEngine(input.provider)) {',
    replace: '    if (false && !isAiRuntimeEngine(input.provider)) {',
    test: REPO_TEST,
    mustFailWith: 'refuses an unknown provider BEFORE writing',
  },
  {
    name: 'M9 — a missing binding falls back to "no runtime" instead of refusing',
    file: REGISTRY,
    find: '    if (!named) throw new AiAgentRuntimeBindingNotFoundError(binding, tenantId)',
    replace: '    if (!named) return NO_TENANT_RUNTIME',
    test: REGISTRY_TEST,
    mustFailWith: 'never falls back',
  },
  {
    name: 'M10 — an ambiguous tenant silently gets its first runtime',
    file: REGISTRY,
    find: '  if (active.length === 1) return active[0]',
    replace: '  if (active.length >= 1) return active[0]',
    test: REGISTRY_TEST,
    mustFailWith: 'never picks the first',
  },
  {
    name: 'M11 — the selector ignores the tenant runtime entirely',
    file: SELECTOR,
    find: '      : deps.tenantRuntime',
    replace: '      : false && deps.tenantRuntime',
    test: SELECTOR_TEST,
    mustFailWith: 'outranks the environment',
  },
  {
    name: 'M12 — an unknown provider in a row silently becomes the default engine',
    file: SELECTOR,
    find: '  throw new Error(\n    `${source} names an unknown engine',
    replace: '  return DEFAULT_ENGINE\n  throw new Error(\n    `${source} names an unknown engine',
    test: SELECTOR_TEST,
    mustFailWith: 'refuses an unknown provider in a row',
  },
]

const stripAnsi = (value) => value.replace(/\u001b\[[0-9;]*m/g, '')
const md5 = (buffer) => createHash('md5').update(buffer).digest('hex')

function runJest(testFile) {
  // Invoke jest's entry point with the current node binary rather than `npx`:
  // `npx.cmd` under `execFileSync` is an EINVAL risk on Windows, and a harness
  // that fails to SPAWN would be indistinguishable from a mutation that was
  // correctly caught.
  const jestBin = path.resolve(PKG, '..', '..', 'node_modules', 'jest', 'bin', 'jest.js')
  try {
    const stdout = execFileSync(
      process.execPath,
      [jestBin, '--config', 'jest.config.cjs', '--forceExit', '--runTestsByPath', testFile],
      { cwd: PKG, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
    )
    return { status: 0, output: stripAnsi(stdout) }
  } catch (error) {
    const stdout = stripAnsi(String(error.stdout ?? ''))
    const stderr = stripAnsi(String(error.stderr ?? ''))
    return { status: error.status ?? 1, output: `${stdout}\n${stderr}` }
  }
}

/**
 * Jest's failure markers, as this build actually prints them.
 *
 * Measured: a PASSING run prints `√ name`, not `✓ name` — the runner falls back to
 * ASCII-safe symbols when the console is not a capable TTY. The failing counterpart
 * is therefore `×` (U+00D7), and the failure summary header is `● suite › test`.
 * The first version of this harness looked for `✕` (U+2715) and found nothing, which
 * reported twelve caught mutations as twelve failures — a harness bug that would
 * have hidden a genuinely toothless test. Collect every shape.
 */
const FAILURE_MARKERS = ['\u00d7', '\u2715', '\u2716']

function failedTestNames(output) {
  return output
    .split('\n')
    .map((line) => line.replace(/^\s+/, ''))
    .filter(
      (line) =>
        FAILURE_MARKERS.some((marker) => line.startsWith(marker)) ||
        // The `● suite › test` header of a failure block. Not `●` alone: jest also
        // uses it for console output headers, so require the separator.
        (line.startsWith('\u25cf') && line.includes('\u203a')),
    )
}

function main() {
  const snapshots = new Map()
  let proven = 0

  for (const mutation of MUTATIONS) {
    const original = readFileSync(mutation.file)
    snapshots.set(mutation.file, original)
    const originalMd5 = md5(original)
    const originalText = original.toString('utf8')

    const occurrences = originalText.split(mutation.find).length - 1
    if (occurrences !== 1) {
      console.log(`FAIL  ${mutation.name} — anchor found ${occurrences}x (needs exactly 1)`)
      process.exitCode = 1
      continue
    }

    writeFileSync(mutation.file, originalText.replace(mutation.find, mutation.replace))

    const { status, output } = runJest(mutation.test)
    const failing = failedTestNames(output)
    const namedFailure = failing.some((line) => line.includes(mutation.mustFailWith))

    writeFileSync(mutation.file, original)
    const restored = md5(readFileSync(mutation.file)) === originalMd5

    if (status !== 0 && namedFailure && restored) {
      proven += 1
      const firstMatch = failing.find((line) => line.includes(mutation.mustFailWith)) ?? ''
      console.log(`PROVEN  ${mutation.name}`)
      console.log(`        red: ${firstMatch.slice(0, 110)}`)
    } else {
      process.exitCode = 1
      console.log(`FAIL    ${mutation.name}`)
      console.log(`        exit=${status} namedFailure=${namedFailure} restored=${restored}`)
      console.log(`        failing: ${failing.slice(0, 3).join(' | ') || '(none)'}`)
    }
  }

  console.log(`\n${proven}/${MUTATIONS.length} mutations PROVEN`)
}

main()
