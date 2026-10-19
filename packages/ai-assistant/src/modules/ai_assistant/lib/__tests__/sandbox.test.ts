import { createSandbox, normalizeCode } from '../sandbox'

describe('normalizeCode', () => {
  it('strips markdown code fences', () => {
    expect(normalizeCode('```javascript\nasync () => 42\n```')).toBe('async () => 42')
  })

  it('strips ts fences', () => {
    expect(normalizeCode('```ts\nasync () => 42\n```')).toBe('async () => 42')
  })

  it('auto-wraps bare expressions into async arrow functions', () => {
    expect(normalizeCode('spec.paths')).toBe('async () => { return spec.paths }')
  })

  it('auto-wraps Object.keys(...) calls', () => {
    expect(normalizeCode('Object.keys(spec.paths)')).toBe(
      'async () => { return Object.keys(spec.paths) }'
    )
  })

  it('preserves async arrow functions', () => {
    expect(normalizeCode('async () => spec.paths')).toBe('async () => spec.paths')
  })

  it('preserves async arrow functions with body', () => {
    const code = 'async () => { const x = 1; return x }'
    expect(normalizeCode(code)).toBe(code)
  })

  it('trims whitespace', () => {
    expect(normalizeCode('  async () => 42  ')).toBe('async () => 42')
  })

  it('wraps const declarations without auto-return', () => {
    expect(normalizeCode('const x = 1; return x')).toBe(
      'async () => { const x = 1; return x }'
    )
  })

  it('wraps let declarations without auto-return', () => {
    expect(normalizeCode('let x = 1; x')).toBe('async () => { let x = 1; x }')
  })

  it('wraps var declarations without auto-return', () => {
    expect(normalizeCode('var x = 1')).toBe('async () => { var x = 1 }')
  })

  it('wraps for loops without auto-return', () => {
    expect(normalizeCode('for (const x of [1]) { console.log(x) }')).toBe(
      'async () => { for (const x of [1]) { console.log(x) } }'
    )
  })

  it('wraps if statements without auto-return', () => {
    expect(normalizeCode('if (true) { return 1 }')).toBe(
      'async () => { if (true) { return 1 } }'
    )
  })

  it('wraps try/catch without auto-return', () => {
    expect(normalizeCode('try { return 1 } catch(e) { return 2 }')).toBe(
      'async () => { try { return 1 } catch(e) { return 2 } }'
    )
  })
})

describe('createSandbox', () => {
  describe('basic execution', () => {
    it('executes simple expressions', async () => {
      const sandbox = createSandbox({})
      const result = await sandbox.execute('async () => 1 + 2')
      expect(result.error).toBeUndefined()
      expect(result.result).toBe(3)
      expect(result.durationMs).toBeGreaterThanOrEqual(0)
    })

    it('returns objects', async () => {
      const sandbox = createSandbox({})
      const result = await sandbox.execute('async () => ({ name: "test", count: 42 })')
      expect(result.result).toEqual({ name: 'test', count: 42 })
    })

    it('handles arrays', async () => {
      const sandbox = createSandbox({})
      const result = await sandbox.execute('async () => [1, 2, 3].filter(x => x > 1)')
      expect(result.result).toEqual([2, 3])
    })

    it('returns undefined for void functions', async () => {
      const sandbox = createSandbox({})
      const result = await sandbox.execute('async () => { const x = 1 }')
      expect(result.error).toBeUndefined()
      expect(result.result).toBeUndefined()
    })
  })

  describe('injected globals', () => {
    it('exposes custom globals', async () => {
      const sandbox = createSandbox({ myValue: 42 })
      const result = await sandbox.execute('async () => myValue')
      expect(result.result).toBe(42)
    })

    it('exposes complex objects as globals', async () => {
      const spec = {
        paths: {
          '/api/customers/companies': { get: { summary: 'List companies' } },
          '/api/sales/orders': { get: { summary: 'List orders' } },
        },
      }
      const sandbox = createSandbox({ spec })
      const result = await sandbox.execute('async () => Object.keys(spec.paths)')
      expect(result.result).toEqual(['/api/customers/companies', '/api/sales/orders'])
    })

    it('exposes helper functions as globals', async () => {
      const spec = {
        findEndpoints: (kw: string) =>
          ['/api/customers/companies', '/api/sales/orders']
            .filter((p) => p.includes(kw))
            .map((p) => ({ path: p })),
      }
      const sandbox = createSandbox({ spec })
      const result = await sandbox.execute(
        'async () => spec.findEndpoints("customer")'
      )
      expect(result.result).toEqual([{ path: '/api/customers/companies' }])
    })

    it('makes the context object available', async () => {
      const context = { tenantId: 't1', organizationId: 'o1', userId: 'u1' }
      const sandbox = createSandbox({ context })
      const result = await sandbox.execute('async () => context.tenantId')
      expect(result.result).toBe('t1')
    })
  })

  describe('security restrictions', () => {
    it('blocks require', async () => {
      const sandbox = createSandbox({})
      const result = await sandbox.execute("async () => require('fs')")
      expect(result.error).toBeDefined()
    })

    it('blocks process', async () => {
      const sandbox = createSandbox({})
      const result = await sandbox.execute('async () => process.env')
      expect(result.error).toBeDefined()
    })

    it('blocks fetch', async () => {
      const sandbox = createSandbox({})
      const result = await sandbox.execute("async () => fetch('http://evil.com')")
      expect(result.error).toBeDefined()
    })

    it('blocks globalThis', async () => {
      const sandbox = createSandbox({})
      const result = await sandbox.execute('async () => globalThis')
      expect(result.result).toBeUndefined()
    })

    it('blocks Buffer', async () => {
      const sandbox = createSandbox({})
      const result = await sandbox.execute("async () => Buffer.from('test')")
      expect(result.error).toBeDefined()
    })

    it('blocks setTimeout', async () => {
      const sandbox = createSandbox({})
      const result = await sandbox.execute(
        'async () => setTimeout(() => {}, 100)'
      )
      expect(result.error).toBeDefined()
    })

    it('blocks setInterval', async () => {
      const sandbox = createSandbox({})
      const result = await sandbox.execute(
        'async () => setInterval(() => {}, 100)'
      )
      expect(result.error).toBeDefined()
    })

    it('blocks prototype-chain escape via Object.constructor.constructor', async () => {
      const sandbox = createSandbox({})
      const result = await sandbox.execute(
        "async () => Object.constructor('return process')()"
      )
      expect(result.result).toBeFalsy()
      expect(result.error).toBeDefined()
    })

    it('blocks prototype-chain escape via Array.constructor.constructor', async () => {
      const sandbox = createSandbox({})
      const result = await sandbox.execute(
        "async () => Array.constructor('return this')()"
      )
      const leaked = result.result as Record<string, unknown> | null | undefined
      const gotHostProcess = typeof leaked === 'object' && leaked !== null
        && typeof (leaked as { process?: unknown }).process === 'object'
        && (leaked as { process?: { pid?: unknown } }).process?.pid !== undefined
      expect(gotHostProcess).toBe(false)
    })

    it('blocks prototype-chain escape via Promise.constructor.constructor', async () => {
      const sandbox = createSandbox({})
      const result = await sandbox.execute(
        "async () => Promise.constructor('return process.env')()"
      )
      const leaked = result.result as Record<string, unknown> | null | undefined
      expect(leaked === undefined || leaked === null || Object.keys(leaked as object).length === 0).toBe(true)
    })

    it('blocks (() => {}).constructor escape', async () => {
      const sandbox = createSandbox({})
      const result = await sandbox.execute(
        "async () => ((()=>{}).constructor)('return process.mainModule.require(\"child_process\").execSync(\"id\").toString()')()"
      )
      expect(result.error).toBeDefined()
    })
  })

  describe('allowed built-ins', () => {
    it('allows JSON', async () => {
      const sandbox = createSandbox({})
      const result = await sandbox.execute(
        'async () => JSON.parse(JSON.stringify({ a: 1 }))'
      )
      expect(result.result).toEqual({ a: 1 })
    })

    it('allows Object methods', async () => {
      const sandbox = createSandbox({})
      const result = await sandbox.execute(
        'async () => Object.keys({ a: 1, b: 2 })'
      )
      expect(result.result).toEqual(['a', 'b'])
    })

    it('allows Array methods', async () => {
      const sandbox = createSandbox({})
      const result = await sandbox.execute(
        'async () => [3, 1, 2].sort((a, b) => a - b)'
      )
      expect(result.result).toEqual([1, 2, 3])
    })

    it('allows Map and Set', async () => {
      const sandbox = createSandbox({})
      const result = await sandbox.execute(
        'async () => { const s = new Set([1,2,2,3]); return s.size }'
      )
      expect(result.result).toBe(3)
    })

    it('allows Math', async () => {
      const sandbox = createSandbox({})
      const result = await sandbox.execute('async () => Math.max(1, 5, 3)')
      expect(result.result).toBe(5)
    })

    it('allows RegExp', async () => {
      const sandbox = createSandbox({})
      const result = await sandbox.execute(
        "async () => /customer/.test('customers/companies')"
      )
      expect(result.result).toBe(true)
    })

    it('allows Promise', async () => {
      const sandbox = createSandbox({})
      const result = await sandbox.execute(
        'async () => Promise.resolve(42)'
      )
      expect(result.result).toBe(42)
    })
  })

  describe('console capture', () => {
    it('captures console.log output', async () => {
      const sandbox = createSandbox({})
      const result = await sandbox.execute(
        'async () => { console.log("hello"); return 42 }'
      )
      expect(result.result).toBe(42)
      expect(result.logs).toContain('hello')
    })

    it('captures multiple console methods', async () => {
      const sandbox = createSandbox({})
      const result = await sandbox.execute(
        'async () => { console.info("a"); console.warn("b"); console.error("c"); return true }'
      )
      expect(result.logs).toEqual(['a', 'b', 'c'])
    })

    it('serializes objects in console output', async () => {
      const sandbox = createSandbox({})
      const result = await sandbox.execute(
        'async () => { console.log("data:", { x: 1 }); return true }'
      )
      expect(result.logs[0]).toContain('data:')
      expect(result.logs[0]).toContain('"x":1')
    })
  })

  describe('error handling', () => {
    it('catches runtime errors', async () => {
      const sandbox = createSandbox({})
      const result = await sandbox.execute(
        'async () => { throw new Error("boom") }'
      )
      expect(result.error).toBe('boom')
      expect(result.result).toBeNull()
    })

    it('catches type errors', async () => {
      const sandbox = createSandbox({})
      const result = await sandbox.execute(
        'async () => { const x = null; return x.foo }'
      )
      expect(result.error).toBeDefined()
    })

    it('catches syntax errors', async () => {
      const sandbox = createSandbox({})
      const result = await sandbox.execute('async () => { if ( }')
      expect(result.error).toBeDefined()
    })
  })

  describe('timeout', () => {
    it('times out long-running code', async () => {
      const sandbox = createSandbox({}, { timeout: 100 })
      const result = await sandbox.execute(
        'async () => { while(true) {} }'
      )
      expect(result.error).toBeDefined()
      expect(result.error).toMatch(/timed out/i)
    }, 10_000)
  })

  describe('async api.request() integration', () => {
    it('executes async api.request calls', async () => {
      const api = {
        request: jest.fn().mockResolvedValue({
          success: true,
          statusCode: 200,
          data: { items: [{ id: '1', name: 'ACME' }] },
        }),
      }
      const sandbox = createSandbox({ api })
      const result = await sandbox.execute(
        'async () => api.request({ method: "GET", path: "/api/customers/companies" })'
      )
      expect(result.error).toBeUndefined()
      expect(result.result).toEqual({
        success: true,
        statusCode: 200,
        data: { items: [{ id: '1', name: 'ACME' }] },
      })
      expect(api.request).toHaveBeenCalledWith({
        method: 'GET',
        path: '/api/customers/companies',
      })
    })

    it('executes multiple sequential api.request calls', async () => {
      let callCount = 0
      const api = {
        request: jest.fn().mockImplementation(async (params: { path: string }) => {
          callCount++
          return {
            success: true,
            statusCode: 200,
            data: { id: callCount, path: params.path },
          }
        }),
      }
      const sandbox = createSandbox({ api })
      const result = await sandbox.execute(`
        async () => {
          const companies = await api.request({ method: "GET", path: "/api/customers/companies" })
          const people = await api.request({ method: "GET", path: "/api/customers/people" })
          return { companies: companies.data, people: people.data }
        }
      `)
      expect(result.error).toBeUndefined()
      expect(api.request).toHaveBeenCalledTimes(2)
      expect(result.result).toEqual({
        companies: { id: 1, path: '/api/customers/companies' },
        people: { id: 2, path: '/api/customers/people' },
      })
    })

    it('handles api.request errors gracefully', async () => {
      const api = {
        request: jest.fn().mockResolvedValue({
          success: false,
          statusCode: 404,
          error: 'Not found',
        }),
      }
      const sandbox = createSandbox({ api })
      const result = await sandbox.execute(
        'async () => api.request({ method: "GET", path: "/api/nonexistent" })'
      )
      expect(result.error).toBeUndefined()
      expect(result.result).toEqual({
        success: false,
        statusCode: 404,
        error: 'Not found',
      })
    })

    it('handles api.request rejections', async () => {
      const api = {
        request: jest.fn().mockRejectedValue(new Error('Network error')),
      }
      const sandbox = createSandbox({ api })
      const result = await sandbox.execute(
        'async () => api.request({ method: "GET", path: "/api/fail" })'
      )
      expect(result.error).toBe('Network error')
    })

    it('supports write operations in sandbox', async () => {
      const api = {
        request: jest.fn().mockResolvedValue({
          success: true,
          statusCode: 201,
          data: { id: 'new-id', name: 'New Company' },
        }),
      }
      const sandbox = createSandbox({ api })
      const result = await sandbox.execute(`
        async () => api.request({
          method: "POST",
          path: "/api/customers/companies",
          body: { name: "New Company", isActive: true }
        })
      `)
      expect(result.error).toBeUndefined()
      expect(api.request).toHaveBeenCalledWith({
        method: 'POST',
        path: '/api/customers/companies',
        body: { name: 'New Company', isActive: true },
      })
    })

    it('supports processing API results with JS logic', async () => {
      const api = {
        request: jest.fn().mockResolvedValue({
          success: true,
          statusCode: 200,
          data: {
            items: [
              { id: '1', name: 'ACME', city: 'New York' },
              { id: '2', name: 'Beta', city: 'London' },
              { id: '3', name: 'Gamma', city: 'New York' },
            ],
          },
        }),
      }
      const sandbox = createSandbox({ api })
      const result = await sandbox.execute(`
        async () => {
          const res = await api.request({ method: "GET", path: "/api/customers/companies" })
          return res.data.items
            .filter(c => c.city === "New York")
            .map(c => c.name)
        }
      `)
      expect(result.result).toEqual(['ACME', 'Gamma'])
    })
  })

  describe('spec search patterns', () => {
    const spec = {
      paths: {
        '/api/customers/companies': {
          get: { summary: 'List companies', parameters: [{ name: 'name', in: 'query' }] },
          post: { summary: 'Create company', requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { name: { type: 'string' } }, required: ['name'] } } } } },
        },
        '/api/customers/people': {
          get: { summary: 'List people' },
        },
        '/api/sales/orders': {
          get: { summary: 'List orders' },
          post: { summary: 'Create order' },
        },
      },
      entitySchemas: [
        { className: 'Company', tableName: 'customers_companies', module: 'customers', fields: [{ name: 'id', type: 'string' }, { name: 'name', type: 'string' }] },
        { className: 'Person', tableName: 'customers_people', module: 'customers', fields: [{ name: 'id', type: 'string' }, { name: 'firstName', type: 'string' }] },
      ],
      findEndpoints: (kw: string) =>
        Object.entries(spec.paths)
          .filter(([p]) => p.toLowerCase().includes(kw.toLowerCase()))
          .map(([path, methods]) => ({
            path,
            methods: Object.keys(methods).filter((m) => m !== 'parameters'),
          })),
      describeEntity: (kw: string) =>
        spec.entitySchemas.find(
          (e) =>
            e.className.toLowerCase().includes(kw.toLowerCase()) ||
            e.tableName.toLowerCase().includes(kw.toLowerCase())
        ) || null,
    }

    it('finds endpoints by keyword', async () => {
      const sandbox = createSandbox({ spec })
      const result = await sandbox.execute(
        'async () => spec.findEndpoints("customer")'
      )
      expect(result.result).toEqual([
        { path: '/api/customers/companies', methods: ['get', 'post'] },
        { path: '/api/customers/people', methods: ['get'] },
      ])
    })

    it('reads endpoint details directly from paths', async () => {
      const sandbox = createSandbox({ spec })
      const result = await sandbox.execute(
        'async () => spec.paths["/api/customers/companies"].get'
      )
      expect(result.result).toEqual({
        summary: 'List companies',
        parameters: [{ name: 'name', in: 'query' }],
      })
    })

    it('extracts request body schema', async () => {
      const sandbox = createSandbox({ spec })
      const result = await sandbox.execute(
        'async () => spec.paths["/api/customers/companies"].post.requestBody.content["application/json"].schema'
      )
      expect(result.result).toEqual({
        type: 'object',
        properties: { name: { type: 'string' } },
        required: ['name'],
      })
    })

    it('discovers entity schemas by keyword', async () => {
      const sandbox = createSandbox({ spec })
      const result = await sandbox.execute(
        'async () => spec.describeEntity("company")'
      )
      expect(result.result).toEqual({
        className: 'Company',
        tableName: 'customers_companies',
        module: 'customers',
        fields: [
          { name: 'id', type: 'string' },
          { name: 'name', type: 'string' },
        ],
      })
    })

    it('lists all available paths', async () => {
      const sandbox = createSandbox({ spec })
      const result = await sandbox.execute(
        'async () => Object.keys(spec.paths)'
      )
      expect(result.result).toEqual([
        '/api/customers/companies',
        '/api/customers/people',
        '/api/sales/orders',
      ])
    })

    it('combines search + execute pattern', async () => {
      const api = {
        request: jest.fn().mockResolvedValue({
          success: true,
          statusCode: 200,
          data: { items: [{ id: '1', name: 'ACME' }] },
        }),
      }

      // Step 1: search for endpoints
      const searchSandbox = createSandbox({ spec })
      const searchResult = await searchSandbox.execute(
        'async () => spec.findEndpoints("companies")'
      )
      expect(searchResult.result).toEqual([
        { path: '/api/customers/companies', methods: ['get', 'post'] },
      ])

      // Step 2: execute API call using discovered path
      const execSandbox = createSandbox({ api })
      const execResult = await execSandbox.execute(`
        async () => api.request({
          method: "GET",
          path: "/api/customers/companies"
        })
      `)
      expect(execResult.result).toEqual({
        success: true,
        statusCode: 200,
        data: { items: [{ id: '1', name: 'ACME' }] },
      })
    })
  })

  describe('statement execution', () => {
    it('executes code with const declarations', async () => {
      const api = {
        request: jest.fn().mockResolvedValue({
          success: true,
          statusCode: 200,
          data: { items: [{ id: '1', name: 'ACME' }] },
        }),
      }
      const sandbox = createSandbox({ api })
      const result = await sandbox.execute(
        'const result = await api.request({ method: "GET", path: "/api/customers/companies" }); return result'
      )
      expect(result.error).toBeUndefined()
      expect(result.result).toEqual({
        success: true,
        statusCode: 200,
        data: { items: [{ id: '1', name: 'ACME' }] },
      })
    })

    it('executes for loops', async () => {
      const sandbox = createSandbox({})
      const result = await sandbox.execute(
        'const items = [1, 2, 3]; let sum = 0; for (const item of items) { sum += item }; return sum'
      )
      expect(result.error).toBeUndefined()
      expect(result.result).toBe(6)
    })

    it('executes try/catch blocks', async () => {
      const sandbox = createSandbox({})
      const result = await sandbox.execute(
        'try { throw new Error("test") } catch (e) { return e.message }'
      )
      expect(result.error).toBeUndefined()
      expect(result.result).toBe('test')
    })

    it('executes if/else blocks', async () => {
      const sandbox = createSandbox({ val: 42 })
      const result = await sandbox.execute(
        'if (val > 10) { return "big" } else { return "small" }'
      )
      expect(result.error).toBeUndefined()
      expect(result.result).toBe('big')
    })

    it('executes let declarations', async () => {
      const sandbox = createSandbox({})
      const result = await sandbox.execute('let x = 5; x = x * 2; return x')
      expect(result.error).toBeUndefined()
      expect(result.result).toBe(10)
    })
  })

  describe('auto-wrapping bare expressions', () => {
    it('handles bare property access', async () => {
      const sandbox = createSandbox({ spec: { paths: { '/a': 1 } } })
      const result = await sandbox.execute('Object.keys(spec.paths)')
      expect(result.result).toEqual(['/a'])
    })

    it('handles bare function calls', async () => {
      const fn = jest.fn().mockReturnValue('result')
      const sandbox = createSandbox({ fn })
      const result = await sandbox.execute('fn()')
      expect(result.result).toBe('result')
    })
  })
})

/**
 * `T-35` — the caps the sandbox advertised and nothing read.
 *
 * `SandboxOptions` declared `maxOutputSize` and `maxApiCalls`; `createSandbox` destructured only `timeout`.
 * A caller writing `{ maxApiCalls: 5 }` got no limit and no warning. The api-call cap is now enforced inside
 * the sandbox, `apiCallCount` is written, and `maxOutputSize` is gone with its reason.
 *
 * **What is deliberately not tested here**: the caller's method-aware mutation cap
 * (`CODE_MODE_MAX_MUTATION_CALLS`), which lives in `codemode-tools.ts` and is covered by its own suite. That
 * is a different control on the same axis, and this file's cap is the backstop.
 */
describe('T-35 — the sandbox enforces the api-call cap it advertises', () => {
  /** A stub api whose request records the arguments it was handed. */
  function apiStub() {
    const calls: Array<{ method: string; path: string }> = []
    return {
      calls,
      request: async (args: { method: string; path: string }) => {
        calls.push(args)
        return { ok: true }
      },
    }
  }

  async function runWith(code: string, maxApiCalls?: number) {
    const api = apiStub()
    const sandbox = createSandbox({ api }, maxApiCalls === undefined ? {} : { maxApiCalls })
    const result = await sandbox.execute(code)
    return { result, api }
  }

  /** A run that calls api.request exactly `times` times. */
  const codeCalling = (times: number) => `
    async () => {
      ${Array.from({ length: times }, (_, i) => `await api.request({ method: 'GET', path: '/x${i}' })`).join('\n      ')}
      return 'done'
    }
  `

  it('★ refuses one call past the cap, naming the cap in the message', async () => {
    const { result, api } = await runWith(codeCalling(4), 3)

    expect(api.calls).toHaveLength(3)
    expect(result.error).toContain('API call limit exceeded (max 3)')
    expect(result.result).toBeNull()
  })

  it('★ allows exactly the cap — the boundary is the cap, not the cap minus one', async () => {
    // The mutation that breaks this is the off-by-one (`>=` instead of `>`): a cap of 3 refusing the third
    // call would quietly deny every legitimate run.
    const { result, api } = await runWith(codeCalling(3), 3)

    expect(result.error).toBeUndefined()
    expect(result.result).toBe('done')
    expect(api.calls).toHaveLength(3)
  })

  it('★ reports what the sandbox counted, because the field was declared and never written', async () => {
    const { result } = await runWith(codeCalling(2), 10)

    expect(result.apiCallCount).toBe(2)
  })

  it('applies the documented default (50) when the caller does not opt in', async () => {
    // The whole point: a caller that forgets still gets a bounded run.
    const { result, api } = await runWith(codeCalling(51))

    expect(result.error).toContain('max 50')
    expect(api.calls).toHaveLength(50)
  })

  it('leaves a sandbox with no api injected alone — the search tool passes only a spec', async () => {
    const sandbox = createSandbox({ spec: {} }, { maxApiCalls: 1 })
    const result = await sandbox.execute(`async () => 'ok'`)

    expect(result.error).toBeUndefined()
    expect(result.result).toBe('ok')
  })

  it('passes an injected api with no request straight through', async () => {
    const sandbox = createSandbox({ api: { version: 1 } }, { maxApiCalls: 1 })
    const result = await sandbox.execute(`async () => 'ok'`)

    expect(result.error).toBeUndefined()
  })
})

describe('T-35 — the interface no longer advertises a cap nothing implements', () => {
  /**
   * The one mutation a runtime test cannot see. `maxOutputSize` was declared with a documented default and
   * implemented nowhere; it was removed, with the reason written beside the removal. Re-advertising it is a
   * silent regression, so the contract is asserted at the type level: this line must NOT type-check.
   *
   * `@ts-expect-error` fails the build when the expression stops being an error — i.e. when somebody
   * re-adds the option. Verified by mutation M4.
   */
  it('★ refuses maxOutputSize as a sandbox option', () => {
    // @ts-expect-error — maxOutputSize was removed in T-35; passing it must not compile.
    const options: import('../sandbox').SandboxOptions = { maxOutputSize: 1024 }
    // Unreachable if the line above compiles; kept so the object is not dead code to a reader.
    expect(options).toBeDefined()
  })
})

/**
 * `T-35`, added after a mutation caught the gap. Dropping `apiCallCount` from the **success** return went
 * red immediately; dropping it from the **error** return did not, because nothing asserted the count on a
 * failed run. A failed run is exactly when the number matters most — it is the only place a caller can learn
 * that the sandbox stopped the run rather than the code failing.
 */
describe('T-35 — the count is populated on a failed run too', () => {
  it('★ reports the observed calls when the cap threw', async () => {
    const calls: string[] = []
    const sandbox = createSandbox(
      { api: { request: async (args: { path: string }) => { calls.push(args.path); return { ok: true } } } },
      { maxApiCalls: 2 },
    )

    const result = await sandbox.execute(
      `async () => { await api.request({ path: '/a' }); await api.request({ path: '/b' }); await api.request({ path: '/c' }); return 'done' }`,
    )

    expect(result.error).toContain('API call limit exceeded (max 2)')
    expect(result.apiCallCount).toBe(2)
  })

  it('★ reports the observed calls when the code itself throws', async () => {
    const sandbox = createSandbox(
      { api: { request: async () => ({ ok: true }) } },
      { maxApiCalls: 10 },
    )

    const result = await sandbox.execute(
      `async () => { await api.request({ path: '/a' }); throw new Error('boom') }`,
    )

    expect(result.error).toContain('boom')
    // The run failed for an unrelated reason, and the count is still what the sandbox saw.
    expect(result.apiCallCount).toBe(1)
  })
})
