import { buildShadowReport, renderShadowReport } from '../shadow-report'

/**
 * The reporter reads real server output, which is mostly *not* shadow lines —
 * banners, warnings, task-runner prefixes, and whatever else a production log
 * contains. Every test here is about surviving that without either dying or
 * quietly reporting nothing.
 */

const line = (fields: Record<string, unknown>) => JSON.stringify({ level: 30, time: 1786000000000, ...fields })

describe('reading a real log', () => {
  it('ignores everything that is not a shadow observation', () => {
    const log = [
      '╔═══════════════════════╗',
      '  🧩 Open Mercato CLI  ',
      'not json at all',
      line({ msg: 'Job completed', queue: 'x' }),
      line({ msg: 'Resolver agrees', capability: 'a.b', gate: 'A5' }),
    ].join('\n')

    const report = buildShadowReport(log)

    expect(report.agreements).toBe(1)
    expect(report.linesParsed).toBe(1)
    expect(report.linesRead).toBe(5)
  })

  it('handles the task runner prefix around the JSON', () => {
    // Turbo prefixes every line with the package and task name.
    const log = `@open-mercato/app:start: ${line({ msg: 'Resolver disagrees with RBAC', capability: 'a.b', bindingRule: 'graph-ceiling', actorKind: 'human' })}`

    const report = buildShadowReport(log)

    expect(report.disagreements).toHaveLength(1)
    expect(report.disagreements[0].capability).toBe('a.b')
  })

  it('keeps read and parsed counts separate, so a bad match looks wrong', () => {
    // A report that parsed 1 of 40,000 lines should be visibly suspicious
    // rather than confidently empty.
    const log = Array.from({ length: 100 }, () => 'noise').concat(
      line({ msg: 'Resolver agrees', capability: 'a.b' }),
    ).join('\n')

    const report = buildShadowReport(log)

    expect(report.linesRead).toBe(101)
    expect(report.linesParsed).toBe(1)
  })

  it('does not throw on truncated JSON', () => {
    expect(() => buildShadowReport('{"msg":"Resolver agrees",')).not.toThrow()
  })
})

describe('what it counts', () => {
  const log = [
    line({ msg: 'Resolver disagrees with RBAC', capability: 'attachments.manage', bindingRule: 'graph-ceiling', actorKind: 'human' }),
    line({ msg: 'Resolver disagrees with RBAC', capability: 'attachments.manage', bindingRule: 'graph-ceiling', actorKind: 'human' }),
    line({ msg: 'Resolver would add an obligation', capability: 'messages.email', bindingRule: 'irreversible-cap', actorKind: 'ai_worker' }),
    line({ msg: 'Resolver agrees', capability: 'customers.view' }),
  ].join('\n')

  it('groups by capability, binding rule and actor kind', () => {
    const report = buildShadowReport(log)

    expect(report.disagreements).toEqual([
      { capability: 'attachments.manage', bindingRule: 'graph-ceiling', actorKind: 'human', count: 2 },
    ])
    expect(report.addedObligations).toEqual([
      { capability: 'messages.email', bindingRule: 'irreversible-cap', actorKind: 'ai_worker', count: 1 },
    ])
    expect(report.agreements).toBe(1)
  })

  it('orders findings by frequency, because the decision is about what breaks most', () => {
    const noisy = [
      line({ msg: 'Resolver disagrees with RBAC', capability: 'rare.thing', bindingRule: 'policy', actorKind: 'human' }),
      ...Array.from({ length: 5 }, () =>
        line({ msg: 'Resolver disagrees with RBAC', capability: 'common.thing', bindingRule: 'policy', actorKind: 'human' })),
    ].join('\n')

    const report = buildShadowReport(noisy)

    expect(report.disagreements[0].capability).toBe('common.thing')
  })

  it('reports the observation window', () => {
    const report = buildShadowReport([
      JSON.stringify({ msg: 'Resolver agrees', capability: 'a.b', time: 1786000000000 }),
      JSON.stringify({ msg: 'Resolver agrees', capability: 'a.b', time: 1786000060000 }),
    ].join('\n'))

    expect(report.firstSeen?.getTime()).toBe(1786000000000)
    expect(report.lastSeen?.getTime()).toBe(1786000060000)
  })
})

describe('the rendered report', () => {
  it('says plainly when there is nothing, and why that might be', () => {
    const rendered = renderShadowReport(buildShadowReport('nothing here'))

    expect(rendered).toContain('No shadow observations')
    expect(rendered).toContain('OM_AUTHORITY_SHADOW is off')
  })

  it('separates what would break from what would need a person', () => {
    const rendered = renderShadowReport(buildShadowReport([
      line({ msg: 'Resolver disagrees with RBAC', capability: 'a.b', bindingRule: 'policy', actorKind: 'human' }),
      line({ msg: 'Resolver would add an obligation', capability: 'c.d', bindingRule: 'irreversible-cap', actorKind: 'human' }),
    ].join('\n')))

    expect(rendered).toContain('would CHANGE these outcomes')
    expect(rendered).toContain('would ALLOW these, with a condition')
  })

  it('states when there is nothing to fear', () => {
    const rendered = renderShadowReport(buildShadowReport(line({ msg: 'Resolver agrees', capability: 'a.b' })))

    expect(rendered).toContain('Disagreements: none')
  })
})

describe('the heartbeat separates silence from absence', () => {
  const heartbeat = (observed: number) =>
    JSON.stringify({ msg: 'Shadow heartbeat', observed, disagreements: 0, obligations: 0, agreements: observed })

  it('reports "nothing to report" as a result when checks were observed', () => {
    // The case that motivated the heartbeat: after the autonomy matrix was
    // scoped to workers, ordinary traffic produced no interesting line at all,
    // and an empty log could not be told apart from a dead shadow.
    const report = buildShadowReport(heartbeat(240))

    expect(report.observedChecks).toBe(240)
    expect(report.linesParsed).toBe(0)

    const rendered = renderShadowReport(report)
    expect(rendered).toContain('Nothing to report, and that is a finding')
    expect(rendered).toContain('240 permission check(s)')
  })

  it('still says it saw nothing when there is no heartbeat either', () => {
    const rendered = renderShadowReport(buildShadowReport('unrelated log output'))

    expect(rendered).toContain('not even a')
    expect(rendered).toContain('OM_AUTHORITY_SHADOW is off')
  })

  it('takes the highest count, so a process restart cannot shrink the total', () => {
    const report = buildShadowReport([heartbeat(10), heartbeat(90), heartbeat(30)].join('\n'))

    expect(report.observedChecks).toBe(90)
  })

  it('shows the observed total alongside findings when there are some', () => {
    const rendered = renderShadowReport(buildShadowReport([
      heartbeat(500),
      JSON.stringify({ msg: 'Resolver would add an obligation', capability: 'a.b', bindingRule: 'effect-class-floor', actorKind: 'ai_worker' }),
    ].join('\n')))

    expect(rendered).toContain('Permission checks observed: 500')
    expect(rendered).toContain('would ALLOW these, with a condition')
  })
})
