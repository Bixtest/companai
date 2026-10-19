#!/usr/bin/env node
/**
 * Mutation proof for `CC-127`'s jest suites.
 *
 * WHY THIS EXISTS
 * ---------------
 * A passing suite proves the code behaves on the cases it was given; it does
 * not prove the suite would NOTICE if the behaviour regressed. This breaks the
 * production source on purpose — the default decision, the two feature
 * requirements, the guard, the tenant-wide scope, the both-links preview, the
 * both-directions cascade, the receipt — and watches the suite go red IN THE
 * CASE THE MUTATION WAS AIMED AT.
 *
 * Same discipline as `verify-cc126-mutations.mjs`: each target file is copied
 * to `<file>.orig`, the mutations are applied one at a time, the affected
 * suites are run, and every original is restored and compared byte-for-byte
 * before exit. A mutation the suite survives is reported NOT PROVEN and is a
 * real gap.
 *
 * USAGE
 * -----
 *   node scripts/verify-cc127-mutations.mjs
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
  'src/modules/ai_assistant/lib/__tests__/departure.test.ts',
  // L21 — jest reads a positional argument as a REGEX. The brackets in the real
  // path must be escaped or the pattern silently matches nothing, the suite
  // never runs, and the run still exits 0.
  'src/modules/ai_assistant/api/ai/departures/\\[userId\\]/__tests__/route.test.ts',
  'src/modules/ai_assistant/data/repositories/__tests__/AiAgentBindingRepository.test.ts',
]

const SRC = (rel) => path.join(PKG, 'src/modules/ai_assistant', rel)

/**
 * Each mutation is `{ name, file, find, replace, expects }`. `expects` names the
 * test that must fail — a mutation the suite catches in the WRONG case is not
 * proof of that case.
 */
const MUTATIONS = [
  // ── the route: the safe default ────────────────────────────────────────────
  {
    name: 'the omitted decision is no longer the safe one',
    file: SRC('api/ai/departures/[userId]/route.ts'),
    find: "  const decision: DepartureDecision = bodyResult.data.decision ?? 'deactivate'",
    replace:
      '  const decision: DepartureDecision =\n    bodyResult.data.decision ?? (undefined as unknown as DepartureDecision)',
    expects: 'POST with no body takes the safe default and names it',
  },
  {
    name: 'an unknown decision is accepted instead of refused',
    file: SRC('api/ai/departures/[userId]/route.ts'),
    find: `  if (!bodyResult.success) {
    return jsonError(400, 'Invalid request body.', 'invalid_decision', {
      issues: bodyResult.error.issues,
    })
  }
  const decision: DepartureDecision = bodyResult.data.decision ?? 'deactivate'`,
    replace: `  if (!bodyResult.success && false) {
    return jsonError(400, 'Invalid request body.', 'invalid_decision', {
      issues: bodyResult.error.issues,
    })
  }
  const decision: DepartureDecision =
    (bodyResult.success ? bodyResult.data.decision : 'deactivate') ?? 'deactivate'`,
    expects: 'POST 400s on an unknown decision and does not delete',
  },
  {
    name: 'the decision stops travelling into the delete\'s audit context',
    file: SRC('api/ai/departures/[userId]/route.ts'),
    find: `          departure: {
            decision,`,
    replace: `          departure: {
            decision: 'deactivate' as DepartureDecision,`,
    expects: 'POST carries the decision into the audit context of the delete',
  },
  // ── the route: two powers, not one ─────────────────────────────────────────
  {
    name: 'deleting a person is enough — the agent feature is no longer required',
    file: SRC('api/ai/departures/[userId]/route.ts'),
    find: 'const DEPARTURE_FEATURES = [DELETE_USER_FEATURE, MANAGE_FEATURE]',
    replace: 'const DEPARTURE_FEATURES = [DELETE_USER_FEATURE]',
    expects: 'GET 403s when the caller holds only ONE of the two features',
  },
  // ── the route: the guard ───────────────────────────────────────────────────
  {
    name: 'deactivate no longer runs the binding guard',
    file: SRC('api/ai/departures/[userId]/route.ts'),
    find: "    if (decision === 'deactivate' && preview.agents.length > 0) {",
    replace: "    if (false && decision === 'deactivate' && preview.agents.length > 0) {",
    expects: 'deactivate runs the binding guard before the delete',
  },
  {
    name: 'leave runs the binding guard it has nothing to guard',
    file: SRC('api/ai/departures/[userId]/route.ts'),
    find: "    if (decision === 'deactivate' && preview.agents.length > 0) {",
    replace: '    if (preview.agents.length > 0) {',
    expects: 'leave touches no binding, so it runs no binding guard',
  },
  {
    name: 'a blocked guard no longer stops the departure',
    file: SRC('api/ai/departures/[userId]/route.ts'),
    find: '      if (guard.blockedResponse) return guard.blockedResponse',
    replace: '      if (guard.blockedResponse && false) return guard.blockedResponse',
    expects: 'a blocked guard stops the departure before anything is deleted',
  },
  // ── the route: the two failure directions ──────────────────────────────────
  {
    name: 'a failure BEFORE the delete is reported as partial',
    file: SRC('api/ai/departures/[userId]/route.ts'),
    find: '    if (deleteCommitted) {',
    replace: '    if (true) {',
    expects: 'a failure BEFORE the delete is departure_failed — nothing happened',
  },
  {
    name: 'a failure AFTER the delete is reported as "nothing happened"',
    file: SRC('api/ai/departures/[userId]/route.ts'),
    find: '    if (deleteCommitted) {',
    replace: '    if (false) {',
    expects: 'a failure AFTER the delete is departure_partial — the person is gone',
  },
  // ── the preview ────────────────────────────────────────────────────────────
  {
    name: 'the preview reads only the `created` link (the session link is dropped)',
    file: SRC('lib/departure.ts'),
    find: '    $or: [{ sessionUserId: userId }, { createdBy: userId }],',
    replace: '    $or: [{ createdBy: userId }],',
    expects: 'lists a binding through BOTH key links, tagging each',
  },
  {
    name: 'the preview reads only one delegation direction',
    file: SRC('lib/departure.ts'),
    find: "      { granteePrincipalId: userId, granteeKind: 'human' },\n",
    replace: '',
    expects: 'lists delegations in both directions, with the direction named',
  },
  {
    name: 'the preview stops filtering the user by tenant',
    file: SRC('lib/departure.ts'),
    find: '    { id: userId, tenantId, deletedAt: null },',
    replace: '    { id: userId, deletedAt: null },',
    expects: 'scopes the user lookup to the tenant — a cross-tenant id is a miss, not a read',
  },
  // ── the cascade ────────────────────────────────────────────────────────────
  {
    name: 'the binding cascade narrows to one organization (a binding in another survives)',
    file: SRC('lib/departure.ts'),
    find: `        preview.agents.map((agent) => agent.principalId),
        { tenantId },`,
    replace: `        preview.agents.map((agent) => agent.principalId),
        { tenantId, organizationId: preview.agents[0]?.organizationId } as any,`,
    expects: 'deactivate revokes bindings TENANT-WIDE — no organization in the scope',
  },
  {
    name: 'the receipt is built from the preview instead of from the write',
    file: SRC('lib/departure.ts'),
    find: '    const revoked = revokedKeys.has(bindingKey(agent.principalId, agent.agentId))',
    replace: '    const revoked = true',
    expects: 'builds the receipt from the WRITE, not from the preview list',
  },
  {
    name: 'leave revokes the agent rows after all',
    file: SRC('lib/departure.ts'),
    find: `      agents: preview.agents.map((agent) => ({
        ...agent,
        revoked: false,`,
    replace: `      agents: preview.agents.map((agent) => ({
        ...agent,
        revoked: true,`,
    expects: 'leave writes NOTHING and says so per agent',
  },
  // ── the repository ─────────────────────────────────────────────────────────
  {
    name: 'the bulk read narrows to one organization',
    file: SRC('data/repositories/AiAgentBindingRepository.ts'),
    find: `      {
        tenantId: scope.tenantId,
        principalId: { $in: ids },
        deletedAt: null,
      } as any,`,
    replace: `      {
        tenantId: scope.tenantId,
        organizationId: 'org-1',
        principalId: { $in: ids },
        deletedAt: null,
      } as any,`,
    expects: 'returns bindings for several principals across organizations of the tenant',
  },
  {
    name: 'the bulk revoke forgets the tenant filter',
    file: SRC('data/repositories/AiAgentBindingRepository.ts'),
    find: `      const rows = await tx.find(AiAgentBinding, {
        tenantId: scope.tenantId,
        principalId: { $in: ids },
        deletedAt: null,
      } as any)`,
    replace: `      const rows = await tx.find(AiAgentBinding, {
        principalId: { $in: ids },
        deletedAt: null,
      } as any)`,
    expects: "leaves another tenant's binding alone",
  },
  {
    name: 'the bulk revoke reports already-revoked rows as changed',
    file: SRC('data/repositories/AiAgentBindingRepository.ts'),
    find: `      const rows = await tx.find(AiAgentBinding, {
        tenantId: scope.tenantId,
        principalId: { $in: ids },
        deletedAt: null,
      } as any)`,
    replace: `      const rows = await tx.find(AiAgentBinding, {
        tenantId: scope.tenantId,
        principalId: { $in: ids },
      } as any)`,
    expects: 'never reports a row it did not change — already-revoked rows are not returned',
  },
  {
    name: 'the principal list is no longer de-duplicated',
    file: SRC('data/repositories/AiAgentBindingRepository.ts'),
    find: `  return Array.from(
    new Set(values.filter((value) => typeof value === 'string' && value.trim().length > 0)),
  )`,
    replace: `  return values.filter((value) => typeof value === 'string' && value.trim().length > 0)`,
    expects: 'de-duplicates the principal list before querying',
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

let allProven = true
let mutationLabel = '(harness)'

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
  // green; `Test Suites: … N total` is the only honest count. The line reads
  // "X failed, Y passed, M total" when a mutation bites, so the TOTAL is the
  // last number on the line, not the one after "passed".
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
    ? `All ${MUTATIONS.length} mutations proven: the default, the two features, the guard, the tenant-wide scope, both key links, both delegation directions and the receipt all have teeth.`
    : 'SOME MUTATIONS NOT PROVEN — the suite has a gap. Read the NOT PROVEN lines above.',
)
if (!allProven) process.exitCode = 1
