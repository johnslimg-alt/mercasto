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

async function runtimeSnapshot() {
  const disk = await fs.statfs('/');
  const totalBytes = disk.blocks * disk.bsize;
  const freeBytes = disk.bavail * disk.bsize;
  const usedBytes = Math.max(0, totalBytes - freeBytes);
  const totalMem = os.totalmem();
  const freeMem = os.freemem();

  return {
    uptimeSeconds: Math.floor(os.uptime()),
    loadAverage: os.loadavg().map((n) => Number(n.toFixed(2))),
    memoryUsedPercent: Number((((totalMem - freeMem) / totalMem) * 100).toFixed(1)),
    filesystemUsedPercent:
      totalBytes > 0 ? Number(((usedBytes / totalBytes) * 100).toFixed(1)) : 0,
  };
}

async function httpStatus(url) {
  const target = new URL(url).pathname || '/';
  try {
    const response = await fetch(url, {
      method: 'GET',
      redirect: 'manual',
      signal: AbortSignal.timeout(5000),
      headers: { 'User-Agent': 'Mercasto-MCP-Status/1.0' },
    });
    return {
      target,
      status: response.status,
      ok: response.status >= 200 && response.status < 400,
    };
  } catch {
    return { target, status: 0, ok: false };
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
        'Public read-only Mercasto observability. This server intentionally exposes no write, shell, filesystem-browsing, Docker-control, deploy, restart, credential, secret-reading, private-data, or arbitrary-command tools. Mutating production work remains behind the separate GitHub allowlist.',
    },
  );

  server.registerTool(
    'runtime_resources',
    {
      title: 'MCP runtime resources',
      description:
        'Read coarse resource percentages for the isolated MCP runtime container. This is not unrestricted host inspection.',
      inputSchema: z.object({}).strict(),
      outputSchema: z.object({
        uptimeSeconds: z.number(),
        loadAverage: z.array(z.number()),
        memoryUsedPercent: z.number(),
        filesystemUsedPercent: z.number(),
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
        'Check only the public Mercasto homepage and public categories API and return HTTP status codes.',
      inputSchema: z.object({}).strict(),
      outputSchema: z.object({
        checks: z.array(
          z.object({
            target: z.string(),
            status: z.number(),
            ok: z.boolean(),
          }),
        ),
        allHealthy: z.boolean(),
      }),
      annotations: { ...readOnlyAnnotations, openWorldHint: true },
    },
    async () => {
      const checks = await Promise.all([
        httpStatus('https://mercasto.com/'),
        httpStatus('https://mercasto.com/api/categories'),
      ]);
      return result({
        checks,
        allHealthy: checks.every((check) => check.ok),
      });
    },
  );

  server.registerTool(
    'plugin_status',
    {
      title: 'MCP plugin status',
      description:
        'Return the plugin version and immutable security posture for this public endpoint.',
      inputSchema: z.object({}).strict(),
      outputSchema: z.object({
        version: z.string(),
        mode: z.literal('read-only'),
        transport: z.literal('streamable-http'),
        writeTools: z.literal(false),
        arbitraryShell: z.literal(false),
        privateDataAccess: z.literal(false),
      }),
      annotations: readOnlyAnnotations,
    },
    async () =>
      result({
        version: VERSION,
        mode: 'read-only',
        transport: 'streamable-http',
        writeTools: false,
        arbitraryShell: false,
        privateDataAccess: false,
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
