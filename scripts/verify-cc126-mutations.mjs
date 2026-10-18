#!/usr/bin/env node
/**
 * Mutation proof for `CC-126`'s jest suites.
 *
 * WHY THIS EXISTS
 * ---------------
 * A passing suite proves the code behaves on the cases it was given; it does
 * not prove the suite would NOTICE if the behaviour regressed. This breaks the
 * production source on purpose — the precedence, the refusals, the index, the
 * CHECKs — and watches the suite go red IN THE CASE THE MUTATION WAS AIMED AT.
 *
 * Same discipline as `verify-two-reads-mutations.mjs`: each target file is
 * copied to `<file>.orig`, the mutations are applied one at a time, the
 * affected suites are run, and every original is restored and compared
 * byte-for-byte before exit. A mutation the suite survives is reported NOT
 * PROVEN and is a real gap.
 *
 * USAGE
 * -----
 *   node scripts/verify-cc126-mutations.mjs
 *
 * Run from the repo root. Exits 0 only if EVERY mutation is proven.
 */
import { spawnSync } from 'node:child_process'
import { copyFileSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const REPO = path.resolve(HERE, '..')
const PKG = path.join(REPO, 'packages', 'ai-assistant')
// The suites carry the toolchain they were verified on; mirror it here.
// (`companai/workspace/.toolchain/node24` — two levels above the repo root.)
const NODE = path.resolve(HERE, '..', '..', '.toolchain', 'node24', 'node.exe')
const JEST = path.resolve(REPO, 'node_modules', 'jest', 'bin', 'jest.js')

const SUITES = [
  'src/modules/ai_assistant/lib/__tests__/agent-type-catalog.test.ts',
  'src/modules/ai_assistant/lib/__tests__/agent-policy.test.ts',
  'src/modules/ai_assistant/lib/__tests__/agent-binding.test.ts',
  'src/modules/ai_assistant/ai-tools/__tests__/meta-pack.test.ts',
  'src/modules/ai_assistant/api/ai/agent-types/__tests__/agent-types.route.test.ts',
  // Jest reads a positional argument as a REGEX — the brackets in the real
  // path must be escaped or the pattern silently matches nothing and that suite
  // never runs (which is how two mutations first reported NOT PROVEN).
  'src/modules/ai_assistant/api/ai/agent-types/\\[key\\]/__tests__/agent-type.route.test.ts',
  'src/modules/ai_assistant/api/ai/agents/__tests__/route.test.ts',
  'src/modules/ai_assistant/api/ai/chat/__tests__/route.test.ts',
  'src/modules/ai_assistant/data/__tests__/schema-unique-indexes.test.ts',
  'src/modules/ai_assistant/data/repositories/__tests__/AiAgentTypeRepository.test.ts',
]

const SRC = (rel) => path.join(PKG, 'src/modules/ai_assistant', rel)

/**
 * Each mutation is `{ name, file, find, replace, expects }`. `expects` names the
 * test that must fail — a mutation the suite catches in the WRONG case is not
 * proof of that case.
 */
const MUTATIONS = [
  // ── the resolver's precedence — the security row ──────────────────────────
  {
    name: 'resolution flips to tenant-first (a tenant definition runs under a platform key)',
    file: SRC('lib/agent-type-catalog.ts'),
    find: "  if (codeAgent) return { definition: codeAgent, layer: 'platform' }",
    replace: '  // MUTATION: the code layer is no longer consulted first',
    expects: 'returns the CODE definition when a tenant row claims the same key',
  },
  {
    name: 'the tenant layer is read with no DB handle (the fail-closed branch is dropped)',
    file: SRC('lib/agent-type-catalog.ts'),
    find: '  if (!input.em) return null',
    replace: '  if (false) return null',
    expects: 'refuses the tenant layer with no DB handle even when a row exists',
  },
  {
    name: 'a shadowed row is silently dropped from the catalogue',
    file: SRC('lib/agent-type-catalog.ts'),
    find: '      shadowedByCode: getAgent(row.key) != null,',
    replace: '      shadowedByCode: false,',
    expects: 'tags platform and tenant entries, and marks a shadowed tenant row',
  },
  // ── the gate takes its subject ─────────────────────────────────────────────
  {
    name: 'the gate ignores a handed subject and does the global lookup again',
    file: SRC('lib/agent-policy.ts'),
    find: '  const agent = input.agent !== undefined ? input.agent : getAgent(agentId)',
    replace: '  const agent = getAgent(agentId)',
    expects: 'approves a hand-resolved subject the global registry does not hold — a tenant-authored type',
  },
  {
    name: 'the gate accepts a subject that does not match the asked id',
    file: SRC('lib/agent-policy.ts'),
    find: '  if (agent.id !== agentId) {',
    replace: '  if (false) {',
    expects: 'refuses a handed subject whose id is not the id being asked about',
  },
  // ── the repository — the retired-key rule ─────────────────────────────────
  {
    name: 'the resolution read forgets the status filter (a retired type runs again)',
    file: SRC('data/repositories/AiAgentTypeRepository.ts'),
    find: '      { tenantId: ctx.tenantId, key, status: \'active\' } as any,',
    replace: '      { tenantId: ctx.tenantId, key } as any,',
    expects: 'findActiveByKey resolves nothing for a retired row',
  },
  {
    name: 'create reuses a retired key (the unique index is removed from the pre-check)',
    file: SRC('data/repositories/AiAgentTypeRepository.ts'),
    find: `      const existing = await tx.findOne(AiAgentType, {
        tenantId: ctx.tenantId,
        key: input.key,
      } as any)
      if (existing) {
        throw new AiAgentTypeKeyCollisionError(input.key)
      }`,
    replace: `      const existing = await tx.findOne(AiAgentType, {
        tenantId: ctx.tenantId,
        key: input.key,
        status: 'active',
      } as any)
      if (existing) {
        throw new AiAgentTypeKeyCollisionError(input.key)
      }`,
    expects: 'refuses a RETIRED key too — the key is never reusable',
  },
  // ── the write surface's loud half ─────────────────────────────────────────
  {
    name: 'the route stops refusing a key the platform already claims',
    file: SRC('api/ai/agent-types/route.ts'),
    find: `    await loadAgentRegistry()
    if (getAgent(keyParamResult.data.key)) {
      return jsonError(
        409,
        \`Agent key "\${keyParamResult.data.key}" is a platform-shipped agent; a tenant type cannot claim it.\`,
        'agent_key_claimed_by_code',
      )
    }`,
    replace: '    // MUTATION: the loud half of the code-collision check is removed',
    expects: 'POST 409s when a code-shipped agent already claims the key',
  },
  {
    name: 'the route swallows the collision refusal into a 500',
    file: SRC('api/ai/agent-types/route.ts'),
    find: '      if (error instanceof AiAgentTypeKeyCollisionError) {',
    replace: '      if (false) {',
    expects: 'POST 409s when this tenant already holds the key (active or retired)',
  },
  {
    name: 'the route stops refusing an edit to a retired type',
    file: SRC('api/ai/agent-types/[key]/route.ts'),
    find: `    if (existing.status === 'retired') {
      return jsonError(
        409,
        \`Agent type "\${paramResult.data.key}" is retired; retirement is one-way and the key is never reusable.\`,
        'agent_type_retired',
      )
    }`,
    replace: '    // MUTATION: the retired precondition is removed',
    expects: 'PUT 409s a retired type — retirement is one-way',
  },
  {
    name: 'the route stops refusing an edit to a shadowed type',
    file: SRC('api/ai/agent-types/[key]/route.ts'),
    find: `    await loadAgentRegistry()
    if (getAgent(paramResult.data.key)) {
      return jsonError(
        409,
        \`Agent key "\${paramResult.data.key}" is a platform-shipped agent; this tenant row is inert (code-first precedence). Retire it to remove the shadow.\`,
        'agent_type_shadowed',
      )
    }`,
    replace: '    // MUTATION: the shadow precondition is removed',
    expects: 'PUT 409s a shadowed type — the row is inert under code-first precedence',
  },
  // ── the read surfaces ─────────────────────────────────────────────────────
  {
    name: 'the picker stops filtering a shadowed duplicate (one id offered twice)',
    file: SRC('api/ai/agents/route.ts'),
    find: `      .filter((entry) => !(entry.layer === 'tenant' && entry.shadowedByCode))`,
    replace: '      .filter(() => true)',
    expects: 'never offers the same id twice when the platform has claimed a tenant key',
  },
  {
    name: 'the picker stops tagging provenance',
    file: SRC('api/ai/agents/route.ts'),
    find: '        layer: entry.layer,',
    replace: "        layer: 'platform' as const,",
    expects: 'merges the code layer and the tenant layer, tagged',
  },
  {
    name: 'the meta picker stops filtering a shadowed duplicate',
    file: SRC('ai-tools/meta-pack.ts'),
    find: `    const offered = filtered.filter((entry) => !(entry.layer === 'tenant' && entry.shadowedByCode))`,
    replace: '    const offered = filtered',
    expects: 'list_agents does not offer a shadowed tenant row beside the platform entry',
  },
  {
    name: 'describe_agent stops reporting the layer (a tenant type reads as platform-shipped)',
    file: SRC('ai-tools/meta-pack.ts'),
    find: '        ...summarizeAgent(agent, { layer: resolved.layer }),',
    replace: '        ...summarizeAgent(agent),',
    expects: 'describe_agent describes a tenant type as layer "tenant"',
  },
  // ── the schema — the index and the CHECKs ─────────────────────────────────
  {
    name: 'the unique index becomes partial (a retired key is reusable)',
    file: SRC('migrations/Migration20261018120000_ai_agent_types.ts'),
    find: `      create unique index "ai_agent_types_tenant_key_uq"
        on "ai_agent_types" ("tenant_id", "key");`,
    replace: `      create unique index "ai_agent_types_tenant_key_uq"
        on "ai_agent_types" ("tenant_id", "key") where "status" = 'active';`,
    expects: 'creates the tenant_key unique index over every row — no partial pair',
  },
  {
    name: 'the dialect CHECK moves to a later alter (a window where the second spelling is representable)',
    file: SRC('migrations/Migration20261018120000_ai_agent_types.ts'),
    find: `        constraint "ai_agent_types_key_format_ck" check ("key" ~ '^[a-z0-9_]+\\\\.[a-z0-9_]+$'),
`,
    replace: '',
    expects: 'ships the dialect CHECK with the table, not as a later alter',
  },
  {
    name: 'tenant_id becomes nullable (the "platform level" sentinel is representable)',
    file: SRC('migrations/Migration20261018120000_ai_agent_types.ts'),
    find: '        "tenant_id" uuid not null,',
    replace: '        "tenant_id" uuid,',
    expects: 'requires tenant_id — the sentinel has no column to live in',
  },
  {
    name: 'the entity drifts from the migration index',
    file: SRC('data/entities.ts'),
    find: `    'create unique index "ai_agent_types_tenant_key_uq" on "ai_agent_types" ("tenant_id", "key")',`,
    replace: `    'create unique index "ai_agent_types_tenant_key_uq" on "ai_agent_types" ("key")',`,
    expects: 'declares the same index expression on the entity — no migration/entity drift',
  },
]

const TARGETS = [...new Set(MUTATIONS.map((m) => m.file))]
const originals = new Map(TARGETS.map((file) => [file, readFileSync(file, 'utf8')]))
const backups = new Map()
for (const file of TARGETS) {
  const backup = `${file}.orig`
  copyFileSync(file, backup)
  backups.set(file, backup)
}

function runSuites() {
  const result = spawnSync(NODE, [JEST, '--config', 'jest.config.cjs', '--forceExit', ...SUITES], {
    cwd: PKG,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  })
  if (result.error) {
    // A harness that cannot run the suites is not a proof — say so loudly.
    console.log(`SPAWN ERROR ${mutationLabel} — ${result.error.message}`)
    allProven = false
    return ''
  }
  const output = `${result.stdout ?? ''}\n${result.stderr ?? ''}`
  // L21 — the denominator. A pattern that selects nothing exits 0 and looks
  // green; `Test Suites: N passed, M total` is the only honest count. The line
  // reads "X failed, Y passed, M total" when a mutation bites, so the TOTAL is
  // taken as the last number on the line, not the one after "passed".
  const ran = output.match(/Test Suites:[^\n]*?(\d+) total/)
  if (!ran) {
    console.log(`NO SUITE COUNT ${mutationLabel} — jest printed no summary; the run is not a proof`)
    allProven = false
  } else if (Number(ran[1]) !== SUITES.length) {
    console.log(
      `SUITE COUNT ${mutationLabel} — asked for ${SUITES.length}, jest ran ${ran[1]} (a pattern matched nothing)`,
    )
    allProven = false
  }
  return output
}

let allProven = true
let mutationLabel = '(harness)'
try {
  for (const mutation of MUTATIONS) {
    mutationLabel = mutation.name
    const original = originals.get(mutation.file)
    if (!original.includes(mutation.find)) {
      console.log(`SKIP        ${mutation.name} — anchor not found in ${path.basename(mutation.file)}`)
      allProven = false
      continue
    }
    const mutated = original.replace(mutation.find, mutation.replace)
    if (mutated === original) {
      console.log(`SKIP        ${mutation.name} — the replacement was a no-op`)
      allProven = false
      continue
    }
    writeFileSync(mutation.file, mutated)

    const output = runSuites()
    const suiteFailed = /✕|● .*›/.test(output) || /Tests:.*failed/.test(output)
    const caughtTheRightCase = output.includes(mutation.expects)

    if (suiteFailed && caughtTheRightCase) console.log(`PROVEN      ${mutation.name}`)
    else if (suiteFailed) {
      console.log(`PARTIAL     ${mutation.name} — the suite failed, but not the case it should`)
      allProven = false
    } else {
      console.log(`NOT PROVEN  ${mutation.name} — the suite still passed with the bug present`)
      allProven = false
    }
    // Restore before the next mutation regardless of outcome.
    writeFileSync(mutation.file, original)
  }
} finally {
  for (const [file, backup] of backups) {
    copyFileSync(backup, file)
    try {
      unlinkSync(backup)
    } catch {
      /* already gone */
    }
  }
}

let restored = true
for (const file of TARGETS) {
  if (readFileSync(file, 'utf8') !== originals.get(file)) {
    console.log(`\nRESTORE FAILED — ${path.basename(file)} is NOT byte-identical to before this run.`)
    restored = false
  }
}
if (!restored) process.exitCode = 1
else console.log('\nEvery mutated file restored — byte-identical to before this run.')

console.log(
  allProven
    ? `All ${MUTATIONS.length} mutations proven: every refusal, precedence and constraint in CC-126 has teeth.`
    : 'SOME MUTATIONS NOT PROVEN — the suite has a gap. Read the NOT PROVEN lines above.',
)
if (!allProven) process.exitCode = 1
