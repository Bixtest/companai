/**
 * `CC-102` — the writer exists and is reachable.
 *
 * This suite exists because of the defect it is testing around: `register()` was
 * written in `SR-02` slice 1 and **called by nothing**, so `ai_agent_runtimes` had
 * no writer at all. A repository method with no caller is a declaration, and a
 * declaration is what the slice exists to remove. These assertions are the cheap
 * ones — that the commands are registered and that their argument handling refuses
 * before touching a database — because the expensive half (the upsert, the scope)
 * is proven in `AiAgentRuntimeRepository.test.ts`.
 */
import cliCommands from '../cli'

const byName = new Map(cliCommands.map((command) => [command.command, command]))

describe('CC-102 — the runtime CLI is registered', () => {
  it.each(['runtime:register', 'runtime:retire', 'runtime:touch'])(
    '%s is exported',
    (name) => {
      expect(byName.has(name)).toBe(true)
      expect(typeof byName.get(name)!.run).toBe('function')
    },
  )
})

describe('CC-102 — the runtime commands refuse bad input before touching a database', () => {
  let originalExitCode: typeof process.exitCode
  let errorSpy: jest.SpyInstance

  beforeEach(() => {
    originalExitCode = process.exitCode
    process.exitCode = undefined
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined)
  })

  afterEach(() => {
    process.exitCode = originalExitCode
    errorSpy.mockRestore()
  })

  it('runtime:register prints the usage and fails when arguments are missing', async () => {
    await byName.get('runtime:register')!.run([])
    expect(process.exitCode).toBe(1)
    expect(errorSpy).toHaveBeenCalled()
    expect(String(errorSpy.mock.calls[0][0])).toMatch(/runtime:register/)
  })

  it('runtime:register refuses a call with no tenant rather than defaulting one', async () => {
    // The daemon id is a uuid here, so the failure must come from the missing
    // tenant — not from the id — and it must not reach the repository.
    await byName.get('runtime:register')!.run(
      ['--daemon', '11111111-2222-4333-8444-555555555555', '--name', 'primary', '--provider', 'hermes'],
    )
    expect(process.exitCode).toBe(1)
    expect(String(errorSpy.mock.calls[0][0])).toMatch(/--tenant/)
  })

  it('runtime:retire requires an id', async () => {
    await byName.get('runtime:retire')!.run([])
    expect(process.exitCode).toBe(1)
  })

  it('runtime:touch requires an id', async () => {
    await byName.get('runtime:touch')!.run([])
    expect(process.exitCode).toBe(1)
  })
})
