/** @type {import('jest').Config} */
const fs = require('node:fs')
const path = require('node:path')
const base = require('../../jest.config.base.cjs')

/**
 * Parked modules do not run, and their tests cannot pass.
 *
 * A module absent from `enabledModules` in `apps/mercato/src/modules.ts` gets no
 * generated artifacts — no entity modules, no registry entries — because the
 * generator covers enabled modules only. Its tests then fail on missing
 * generated dependencies, which says nothing about the code. The same reasoning
 * excludes parked source from `tsconfig.json`; treating tests differently would
 * be incoherent.
 *
 * **The trade-off, stated plainly and measured:** this stops running **3,472
 * tests across 520 suites** — 42% of this package's tests. `yarn test` for core
 * goes from 8,234 tests to 4,762.
 *
 * We accept it because parked code is already outside the safety net: its source
 * is excluded from `tsconfig.json` for the same reason, so it was no longer
 * being type-checked either. Running its tests while not compiling it would be
 * signal without a foundation. PARK therefore means **frozen**, not
 * "maintained alongside everything else" — a change from how it was first
 * described, recorded in workspace/references/parked-modules.md.
 *
 * Re-enabling a module in `modules.ts` restores both its type-checking and its
 * tests automatically, with no edit here.
 *
 * Derived rather than hand-listed so it cannot drift. If `modules.ts` cannot be
 * read, nothing is excluded: failing loudly with every test running beats
 * silently skipping half the suite.
 */
function parkedModuleTestPatterns() {
  const modulesConfig = path.join(__dirname, '..', '..', 'apps', 'mercato', 'src', 'modules.ts')
  let source
  try {
    source = fs.readFileSync(modulesConfig, 'utf8')
  } catch {
    return []
  }

  // Only live entries count. The parked set is documented in that file as
  // commented-out entries of exactly this shape, so skipping comment lines is
  // what separates "enabled" from "documented as parked".
  const enabled = new Set()
  for (const rawLine of source.split('\n')) {
    const line = rawLine.trim()
    if (line.startsWith('//') || line.startsWith('*') || line.startsWith('/*')) continue
    // Matches both entry forms: the single-line `{ id: 'auth', from: … },` and
    // the multi-line object used when an entry carries `overrides` — where the
    // id sits on its own line. Missing the second form silently reclassifies an
    // ENABLED module as parked, which skips its tests.
    const match = line.match(/^\{?\s*id:\s*'([a-z0-9_]+)'/)
    if (match) enabled.add(match[1])
  }
  // A parse that finds almost nothing means the file format moved. Excluding
  // every module's tests on that basis would hide the whole suite.
  if (enabled.size < 10) return []

  const modulesDir = path.join(__dirname, 'src', 'modules')
  let entries
  try {
    entries = fs.readdirSync(modulesDir, { withFileTypes: true })
  } catch {
    return []
  }

  return entries
    .filter((entry) => entry.isDirectory() && !enabled.has(entry.name))
    .filter((entry) => fs.existsSync(path.join(modulesDir, entry.name, 'index.ts')))
    .map((entry) => `<rootDir>/src/modules/${entry.name}/`)
}

module.exports = {
  ...base,
  testEnvironment: 'node',
  testTimeout: 30000,
  watchman: false,
  rootDir: '.',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  moduleNameMapper: {
    '^#generated/entities\\.ids\\.generated$': '<rootDir>/jest.mocks/entities.ids.generated.js',
    '^#generated/(.*)$': '<rootDir>/generated/$1',
    '^@open-mercato/core/generated/entities\\.ids\\.generated$': '<rootDir>/jest.mocks/entities.ids.generated.js',
    '^@open-mercato/core/generated/(.*)$': '<rootDir>/generated/$1',
    '^@open-mercato/core/(.*)$': '<rootDir>/src/$1',
    '^@open-mercato/cache$': '<rootDir>/../cache/src/index.ts',
    '^@open-mercato/cache/(.*)$': '<rootDir>/../cache/src/$1',
    '^@open-mercato/queue/worker$': '<rootDir>/../queue/src/worker/runner.ts',
    '^@open-mercato/queue/(.*)$': '<rootDir>/../queue/src/$1',
    '^@open-mercato/queue$': '<rootDir>/../queue/src/index.ts',
    '^@open-mercato/shared/(.*)$': '<rootDir>/../shared/src/$1',
    '^@open-mercato/ui/(.*)$': '<rootDir>/../ui/src/$1',
    '^@open-mercato/ai-assistant/(.*)$': '<rootDir>/../ai-assistant/src/$1',
    '^@/\\.mercato/generated/inbox-actions\\.generated$': '<rootDir>/jest.mocks/inbox-actions.generated.js',
    '^react-markdown$': '<rootDir>/jest.mocks/react-markdown.js',
    '^remark-gfm$': '<rootDir>/jest.mocks/remark-gfm.js',
  },
  transform: {
    '^.+\\.(t|j)sx?$': [
      '<rootDir>/../../scripts/jest-mikroorm-transformer.cjs',
      {
        tsconfig: {
          jsx: 'react-jsx',
          rootDir: '.',
          ignoreDeprecations: '6.0',
        },
      },
    ],
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  transformIgnorePatterns: [
    'node_modules/(?!(@mikro-orm|kysely|ai|@ai-sdk|ai-sdk-ollama|@workflow|@standard-schema)/)',
  ],
  testMatch: ['<rootDir>/src/**/__tests__/**/*.test.(ts|tsx)'],
  testPathIgnorePatterns: [...(base.testPathIgnorePatterns ?? []), ...parkedModuleTestPatterns()],
  passWithNoTests: true,
}
