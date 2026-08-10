import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { McpClient } from '../mcp-client'

/**
 * Spawns a real Node process and completes an MCP handshake, so it is bound by
 * how busy the machine is rather than by anything in the code under test. On an
 * idle machine it takes about six seconds; under a parallel gate — twenty-two
 * packages compiling and testing at once — it exceeded jest's 5s default and
 * failed a green change.
 *
 * The assertion is fine; only the budget was wrong. A timeout tuned for an idle
 * machine is a test that reports "the gate is red" when it means "the laptop was
 * busy", and that is how people learn to re-run instead of read.
 */
const SPAWN_HANDSHAKE_TIMEOUT_MS = 30_000

describe('McpClient stdio integration', () => {
  it('starts exactly one SDK-managed server process for one stdio client connection', async () => {
    const previousSpawnLog = process.env.MCP_SPAWN_LOG
    const logPath = path.join(os.tmpdir(), `open-mercato-mcp-spawn-${Date.now()}.log`)
    process.env.MCP_SPAWN_LOG = logPath

    const serverCode = `
import fs from 'node:fs';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
fs.appendFileSync(process.env.MCP_SPAWN_LOG, String(process.pid) + '\\n');
const server = new Server(
  { name: 'open-mercato-spawn-proof', version: '1.0.0' },
  { capabilities: { tools: {} } }
);
server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: [] }));
await server.connect(new StdioServerTransport());
`

    try {
      const client = await McpClient.connect({
        transport: 'stdio',
        apiKeySecret: 'test-secret',
        command: process.execPath,
        args: ['--input-type=module', '-e', serverCode],
        cwd: process.cwd(),
      })

      try {
        await expect(client.listTools()).resolves.toEqual([])
      } finally {
        await client.close()
      }

      await new Promise((resolve) => setTimeout(resolve, 250))
      const pids = fs.readFileSync(logPath, 'utf8').trim().split('\n').filter(Boolean)
      expect(pids).toHaveLength(1)
    } finally {
      if (previousSpawnLog === undefined) {
        delete process.env.MCP_SPAWN_LOG
      } else {
        process.env.MCP_SPAWN_LOG = previousSpawnLog
      }
      fs.rmSync(logPath, { force: true })
    }
  }, SPAWN_HANDSHAKE_TIMEOUT_MS)
})
