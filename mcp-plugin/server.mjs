import os from 'node:os';
import fs from 'node:fs/promises';

import { createMcpExpressApp } from '@modelcontextprotocol/express';
import { toNodeHandler } from '@modelcontextprotocol/node';
import { createMcpHandler, McpServer } from '@modelcontextprotocol/server';
import * as z from 'zod/v4';

const HOST = process.env.MCP_BIND_HOST || '127.0.0.1';
const PORT = Number.parseInt(process.env.MCP_PORT || '8780', 10);
const VERSION = '1.0.0';

const readOnlyAnnotations = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
};

function result(output) {
  return {
    content: [{ type: 'text', text: JSON.stringify(output) }],
    structuredContent: output,
  };
}

async function httpStatus(url, options = {}) {
  try {
    const response = await fetch(url, {
      method: 'GET',
      redirect: 'manual',
      signal: AbortSignal.timeout(7000),
      headers: {
        Accept: 'application/json,text/plain,*/*',
        'User-Agent': 'Mercasto-MCP-Status/1.0',
        ...(options.headers || {}),
      },
    });
    return {
      url,
      status: response.status,
      ok: response.status >= 200 && response.status < 400,
    };
  } catch {
    return { url, status: 0, ok: false };
  }
}

async function runtimeSnapshot() {
  const disk = await fs.statfs('/');
  const totalBytes = disk.blocks * disk.bsize;
  const freeBytes = disk.bavail * disk.bsize;
  const usedBytes = Math.max(0, totalBytes - freeBytes);
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const memory = process.memoryUsage();

  return {
    hostname: os.hostname(),
    uptimeSeconds: Math.floor(os.uptime()),
    loadAverage: os.loadavg().map((n) => Number(n.toFixed(2))),
    process: {
      pid: process.pid,
      rssBytes: memory.rss,
      heapUsedBytes: memory.heapUsed,
    },
    memory: {
      totalBytes: totalMem,
      freeBytes: freeMem,
      usedPercent: totalMem > 0
        ? Number((((totalMem - freeMem) / totalMem) * 100).toFixed(1))
        : 0,
    },
    filesystem: {
      totalBytes,
      freeBytes,
      usedBytes,
      usedPercent: totalBytes > 0
        ? Number(((usedBytes / totalBytes) * 100).toFixed(1))
        : 0,
    },
    scope: 'mcp-container-runtime',
  };
}

async function githubOperatorStatus() {
  const url =
    'https://api.github.com/repos/johnslimg-alt/mercasto/actions/workflows/chatgpt-server-operator.yml/runs?per_page=5';

  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(7000),
      headers: {
        Accept: 'application/vnd.github+json',
        'User-Agent': 'Mercasto-MCP-Status/1.0',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });

    if (!response.ok) {
      return { ok: false, status: response.status, runs: [] };
    }

    const payload = await response.json();
    const runs = Array.isArray(payload.workflow_runs)
      ? payload.workflow_runs.slice(0, 5).map((run) => ({
          id: run.id,
          status: run.status,
          conclusion: run.conclusion,
          event: run.event,
          createdAt: run.created_at,
          updatedAt: run.updated_at,
        }))
      : [];

    return { ok: true, status: response.status, runs };
  } catch {
    return { ok: false, status: 0, runs: [] };
  }
}

function buildMcpServer() {
  const server = new McpServer(
    {
      name: 'Mercasto Server Status',
      version: VERSION,
      websiteUrl: 'https://mercasto.com',
    },
    {
      instructions:
        'Read-only operational observability for Mercasto. This server intentionally exposes no shell, filesystem mutation, Docker control, deployment, service restart, database mutation, or arbitrary command execution. The historical public Shell MCP remains retired.',
    },
  );

  server.registerTool(
    'mcp_runtime_status',
    {
      title: 'MCP runtime status',
      description:
        'Read the isolated MCP container runtime snapshot: process memory, uptime, load and container filesystem usage. This is not host-root access.',
      inputSchema: z.object({}).strict(),
      outputSchema: z.object({
        hostname: z.string(),
        uptimeSeconds: z.number(),
        loadAverage: z.array(z.number()),
        process: z.object({
          pid: z.number(),
          rssBytes: z.number(),
          heapUsedBytes: z.number(),
        }),
        memory: z.object({
          totalBytes: z.number(),
          freeBytes: z.number(),
          usedPercent: z.number(),
        }),
        filesystem: z.object({
          totalBytes: z.number(),
          freeBytes: z.number(),
          usedBytes: z.number(),
          usedPercent: z.number(),
        }),
        scope: z.literal('mcp-container-runtime'),
      }),
      annotations: readOnlyAnnotations,
    },
    async () => result(await runtimeSnapshot()),
  );

  server.registerTool(
    'production_status',
    {
      title: 'Mercasto production status',
      description:
        'Check public Mercasto production endpoints without reading private account or application data.',
      inputSchema: z.object({}).strict(),
      outputSchema: z.object({
        checks: z.array(
          z.object({
            url: z.string(),
            status: z.number(),
            ok: z.boolean(),
          }),
        ),
      }),
      annotations: { ...readOnlyAnnotations, openWorldHint: true },
    },
    async () => {
      const checks = await Promise.all([
        httpStatus('https://mercasto.com/'),
        httpStatus('https://mercasto.com/api/categories'),
        httpStatus('https://mercasto.com/up'),
      ]);
      return result({ checks });
    },
  );

  server.registerTool(
    'github_operator_status',
    {
      title: 'GitHub server operator status',
      description:
        'Read the latest public GitHub Actions runs for the fixed Mercasto ChatGPT server-operator workflow. This tool cannot trigger or mutate workflows.',
      inputSchema: z.object({}).strict(),
      outputSchema: z.object({
        ok: z.boolean(),
        status: z.number(),
        runs: z.array(
          z.object({
            id: z.number(),
            status: z.string(),
            conclusion: z.string().nullable(),
            event: z.string(),
            createdAt: z.string(),
            updatedAt: z.string(),
          }),
        ),
      }),
      annotations: { ...readOnlyAnnotations, openWorldHint: true },
    },
    async () => result(await githubOperatorStatus()),
  );

  server.registerTool(
    'mcp_server_info',
    {
      title: 'MCP server information',
      description:
        'Return the Mercasto MCP plugin version and its intentionally read-only security boundary.',
      inputSchema: z.object({}).strict(),
      outputSchema: z.object({
        name: z.string(),
        version: z.string(),
        mode: z.literal('read-only'),
        transport: z.literal('streamable-http'),
        endpoint: z.literal('/mcp'),
        arbitraryShell: z.literal(false),
        writeTools: z.literal(false),
      }),
      annotations: readOnlyAnnotations,
    },
    async () =>
      result({
        name: 'Mercasto Server Status MCP',
        version: VERSION,
        mode: 'read-only',
        transport: 'streamable-http',
        endpoint: '/mcp',
        arbitraryShell: false,
        writeTools: false,
      }),
  );

  return server;
}

const mcpHandler = createMcpHandler(buildMcpServer);
const nodeHandler = toNodeHandler(mcpHandler);

const app = createMcpExpressApp({
  host: '0.0.0.0',
  allowedHosts: ['mcp.mercasto.com', '127.0.0.1', 'localhost'],
});

app.get('/', (_req, res) => {
  res.json({
    name: 'Mercasto Server Status MCP',
    version: VERSION,
    mode: 'read-only',
    endpoint: '/mcp',
  });
});

app.get('/healthz', (_req, res) => {
  res.json({ ok: true, version: VERSION, mode: 'read-only' });
});

app.get('/.well-known/openai-apps-challenge', (_req, res) => {
  const token = process.env.OPENAI_APPS_CHALLENGE;
  if (!token) {
    res.status(404).type('text/plain').send('not configured');
    return;
  }
  res.type('text/plain').send(token);
});

app.all('/mcp', (req, res) => {
  void nodeHandler(req, res, req.body);
});

app.use((_req, res) => {
  res.status(404).json({ error: 'not_found' });
});

app.listen(PORT, HOST, () => {
  console.log(`Mercasto read-only MCP listening on http://${HOST}:${PORT}/mcp`);
});
