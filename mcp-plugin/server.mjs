import os from 'node:os';
import fs from 'node:fs/promises';
import net from 'node:net';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

import { createMcpExpressApp } from '@modelcontextprotocol/express';
import { toNodeHandler } from '@modelcontextprotocol/node';
import { createMcpHandler, McpServer } from '@modelcontextprotocol/server';
import * as z from 'zod/v4';

const execFileAsync = promisify(execFile);

const HOST = process.env.MCP_BIND_HOST || '127.0.0.1';
const PORT = Number.parseInt(process.env.MCP_PORT || '8780', 10);
const VERSION = '1.0.0';

const RUNNER_UNITS = [
  'actions.runner.johnslimg-alt-mercasto.srv1526037.service',
  'actions.runner.johnslimg-alt-mercasto-mobile.srv1526037-mobile.service',
];

const MCP_UNITS = [
  'mercasto-ssh-mcp.service',
  'mercasto-ssh-mcp-stdio.service',
  'desktop-commander.service',
  'remote-desktop-commander.service',
  'mercasto-mcp-plugin.service',
];

const OBSERVED_PORTS = [3080, 3081, 3091, 8765, 8780];

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

function parseSystemctlShow(stdout) {
  const out = {};
  for (const line of stdout.split('\n')) {
    const idx = line.indexOf('=');
    if (idx <= 0) continue;
    out[line.slice(0, idx)] = line.slice(idx + 1);
  }
  return out;
}

async function unitStatus(unit) {
  const allowed = new Set([...RUNNER_UNITS, ...MCP_UNITS]);
  if (!allowed.has(unit)) {
    throw new Error('Unit is not allowlisted');
  }

  try {
    const { stdout } = await execFileAsync(
      '/usr/bin/systemctl',
      [
        'show',
        unit,
        '--no-pager',
        '--property=LoadState,ActiveState,SubState,MainPID,NRestarts,ExecMainStartTimestamp,UnitFileState',
      ],
      { timeout: 2500, maxBuffer: 64 * 1024 },
    );

    const s = parseSystemctlShow(stdout);
    return {
      unit,
      loadState: s.LoadState || 'unknown',
      activeState: s.ActiveState || 'unknown',
      subState: s.SubState || 'unknown',
      unitFileState: s.UnitFileState || 'unknown',
      mainPid: Number.parseInt(s.MainPID || '0', 10) || 0,
      restarts: Number.parseInt(s.NRestarts || '0', 10) || 0,
      startedAt: s.ExecMainStartTimestamp || null,
    };
  } catch {
    return {
      unit,
      loadState: 'unknown',
      activeState: 'unknown',
      subState: 'unknown',
      unitFileState: 'unknown',
      mainPid: 0,
      restarts: 0,
      startedAt: null,
    };
  }
}

async function tcpStatus(port) {
  return await new Promise((resolve) => {
    const socket = net.createConnection({ host: '127.0.0.1', port });
    let settled = false;

    const finish = (open) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve({ port, open });
    };

    socket.setTimeout(700);
    socket.once('connect', () => finish(true));
    socket.once('timeout', () => finish(false));
    socket.once('error', () => finish(false));
  });
}

async function httpStatus(url) {
  try {
    const response = await fetch(url, {
      method: 'GET',
      redirect: 'manual',
      signal: AbortSignal.timeout(5000),
      headers: { 'User-Agent': 'Mercasto-MCP-Status/1.0' },
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

async function resourceSnapshot() {
  const disk = await fs.statfs('/');
  const totalBytes = disk.blocks * disk.bsize;
  const freeBytes = disk.bavail * disk.bsize;
  const usedBytes = Math.max(0, totalBytes - freeBytes);
  const totalMem = os.totalmem();
  const freeMem = os.freemem();

  return {
    hostname: os.hostname(),
    uptimeSeconds: Math.floor(os.uptime()),
    loadAverage: os.loadavg().map((n) => Number(n.toFixed(2))),
    memory: {
      totalBytes: totalMem,
      freeBytes: freeMem,
      usedPercent: Number((((totalMem - freeMem) / totalMem) * 100).toFixed(1)),
    },
    diskRoot: {
      totalBytes,
      freeBytes,
      usedBytes,
      usedPercent: totalBytes > 0 ? Number(((usedBytes / totalBytes) * 100).toFixed(1)) : 0,
    },
  };
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
        'Read-only operational observability for Mercasto. Never claim that a server mutation was performed: this server intentionally exposes no write, shell, filesystem, Docker-control, deploy, or restart tools. The historical public Shell MCP is retired.',
    },
  );

  server.registerTool(
    'server_resources',
    {
      title: 'Server resources',
      description: 'Read current uptime, load average, memory use and root-filesystem use from the Mercasto VPS.',
      inputSchema: z.object({}).strict(),
      outputSchema: z.object({
        hostname: z.string(),
        uptimeSeconds: z.number(),
        loadAverage: z.array(z.number()),
        memory: z.object({
          totalBytes: z.number(),
          freeBytes: z.number(),
          usedPercent: z.number(),
        }),
        diskRoot: z.object({
          totalBytes: z.number(),
          freeBytes: z.number(),
          usedBytes: z.number(),
          usedPercent: z.number(),
        }),
      }),
      annotations: readOnlyAnnotations,
    },
    async () => result(await resourceSnapshot()),
  );

  server.registerTool(
    'production_status',
    {
      title: 'Production status',
      description: 'Check the public Mercasto web app and its public categories API without reading private application data.',
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
      ]);
      return result({ checks });
    },
  );

  server.registerTool(
    'runner_status',
    {
      title: 'GitHub runner status',
      description: 'Read status of the two fixed Mercasto GitHub Actions runner services. No service control is available.',
      inputSchema: z.object({}).strict(),
      outputSchema: z.object({
        services: z.array(
          z.object({
            unit: z.string(),
            loadState: z.string(),
            activeState: z.string(),
            subState: z.string(),
            unitFileState: z.string(),
            mainPid: z.number(),
            restarts: z.number(),
            startedAt: z.string().nullable(),
          }),
        ),
      }),
      annotations: readOnlyAnnotations,
    },
    async () => result({ services: await Promise.all(RUNNER_UNITS.map(unitStatus)) }),
  );

  server.registerTool(
    'mcp_services_status',
    {
      title: 'MCP service status',
      description: 'Read status of the fixed MCP-related systemd units and whether a small allowlist of localhost ports is accepting TCP connections.',
      inputSchema: z.object({}).strict(),
      outputSchema: z.object({
        services: z.array(
          z.object({
            unit: z.string(),
            loadState: z.string(),
            activeState: z.string(),
            subState: z.string(),
            unitFileState: z.string(),
            mainPid: z.number(),
            restarts: z.number(),
            startedAt: z.string().nullable(),
          }),
        ),
        listeners: z.array(
          z.object({
            port: z.number(),
            open: z.boolean(),
          }),
        ),
      }),
      annotations: readOnlyAnnotations,
    },
    async () => {
      const [services, listeners] = await Promise.all([
        Promise.all(MCP_UNITS.map(unitStatus)),
        Promise.all(OBSERVED_PORTS.map(tcpStatus)),
      ]);
      return result({ services, listeners });
    },
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
