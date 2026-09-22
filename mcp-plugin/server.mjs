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

const RUNNER_UNITS = {
  primary: 'actions.runner.johnslimg-alt-mercasto.srv1526037.service',
  mobile: 'actions.runner.johnslimg-alt-mercasto-mobile.srv1526037-mobile.service',
};

const MCP_UNITS = {
  legacyShell: 'mercasto-ssh-mcp.service',
  legacyShellStdio: 'mercasto-ssh-mcp-stdio.service',
  legacyDesktopCommander: 'desktop-commander.service',
  remoteDesktopCommander: 'remote-desktop-commander.service',
  plugin: 'mercasto-mcp-plugin.service',
};

const SYSTEMD_ALLOWLIST = new Set([
  ...Object.values(RUNNER_UNITS),
  ...Object.values(MCP_UNITS),
]);

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
  if (!SYSTEMD_ALLOWLIST.has(unit)) {
    throw new Error('Unit is not allowlisted');
  }

  try {
    const { stdout } = await execFileAsync(
      '/usr/bin/systemctl',
      [
        'show',
        unit,
        '--no-pager',
        '--property=LoadState,ActiveState,SubState,NRestarts,UnitFileState',
      ],
      { timeout: 2500, maxBuffer: 64 * 1024 },
    );

    const s = parseSystemctlShow(stdout);
    return {
      loadState: s.LoadState || 'unknown',
      activeState: s.ActiveState || 'unknown',
      subState: s.SubState || 'unknown',
      unitFileState: s.UnitFileState || 'unknown',
      restarts: Number.parseInt(s.NRestarts || '0', 10) || 0,
    };
  } catch {
    return {
      loadState: 'unknown',
      activeState: 'unknown',
      subState: 'unknown',
      unitFileState: 'unknown',
      restarts: 0,
    };
  }
}

async function tcpOpen(port) {
  return await new Promise((resolve) => {
    const socket = net.createConnection({ host: '127.0.0.1', port });
    let settled = false;

    const finish = (open) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(open);
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
      target: new URL(url).pathname || '/',
      status: response.status,
      ok: response.status >= 200 && response.status < 400,
    };
  } catch {
    return {
      target: new URL(url).pathname || '/',
      status: 0,
      ok: false,
    };
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
    uptimeSeconds: Math.floor(os.uptime()),
    loadAverage: os.loadavg().map((n) => Number(n.toFixed(2))),
    memoryUsedPercent: Number((((totalMem - freeMem) / totalMem) * 100).toFixed(1)),
    diskUsedPercent: totalBytes > 0 ? Number(((usedBytes / totalBytes) * 100).toFixed(1)) : 0,
  };
}

function isActive(s) {
  return s.activeState === 'active' && s.subState === 'running';
}

function isRetired(s) {
  return s.activeState === 'inactive' && s.subState === 'dead';
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
        'Read-only operational observability for Mercasto. Never claim that a server mutation was performed: this server intentionally exposes no write, shell, filesystem, Docker-control, deploy, restart, credential, or secret-reading tools. The historical public Shell MCP remains retired.',
    },
  );

  server.registerTool(
    'server_resources',
    {
      title: 'Server resources',
      description: 'Read coarse VPS uptime, load, memory-use percentage and root-filesystem-use percentage. No process list, hostname, filesystem content or secrets are returned.',
      inputSchema: z.object({}).strict(),
      outputSchema: z.object({
        uptimeSeconds: z.number(),
        loadAverage: z.array(z.number()),
        memoryUsedPercent: z.number(),
        diskUsedPercent: z.number(),
      }),
      annotations: readOnlyAnnotations,
    },
    async () => result(await resourceSnapshot()),
  );

  server.registerTool(
    'production_status',
    {
      title: 'Production status',
      description: 'Check only the public Mercasto homepage and public categories API and return HTTP status codes.',
      inputSchema: z.object({}).strict(),
      outputSchema: z.object({
        checks: z.array(
          z.object({
            target: z.string(),
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
      description: 'Read sanitized status of the two fixed Mercasto GitHub Actions runner services. No service names, PIDs, command lines, credentials or control actions are exposed.',
      inputSchema: z.object({}).strict(),
      outputSchema: z.object({
        runners: z.array(
          z.object({
            name: z.enum(['primary', 'mobile']),
            active: z.boolean(),
            restarts: z.number(),
          }),
        ),
        allHealthy: z.boolean(),
      }),
      annotations: readOnlyAnnotations,
    },
    async () => {
      const [primary, mobile] = await Promise.all([
        unitStatus(RUNNER_UNITS.primary),
        unitStatus(RUNNER_UNITS.mobile),
      ]);
      const runners = [
        { name: 'primary', active: isActive(primary), restarts: primary.restarts },
        { name: 'mobile', active: isActive(mobile), restarts: mobile.restarts },
      ];
      return result({
        runners,
        allHealthy: runners.every((runner) => runner.active),
      });
    },
  );

  server.registerTool(
    'integration_status',
    {
      title: 'Integration status',
      description: 'Read a sanitized summary of MCP-related integration health. Confirms that retired public-shell services stay off and that the approved local bridges are available.',
      inputSchema: z.object({}).strict(),
      outputSchema: z.object({
        legacyPublicShellRetired: z.boolean(),
        remoteDesktopCommanderActive: z.boolean(),
        remoteDesktopListenerOpen: z.boolean(),
        pluginServiceActive: z.boolean(),
        pluginListenerOpen: z.boolean(),
      }),
      annotations: readOnlyAnnotations,
    },
    async () => {
      const [legacyShell, legacyShellStdio, remoteDesktopCommander, plugin, remoteDesktopListenerOpen, pluginListenerOpen] =
        await Promise.all([
          unitStatus(MCP_UNITS.legacyShell),
          unitStatus(MCP_UNITS.legacyShellStdio),
          unitStatus(MCP_UNITS.remoteDesktopCommander),
          unitStatus(MCP_UNITS.plugin),
          tcpOpen(8765),
          tcpOpen(8780),
        ]);

      return result({
        legacyPublicShellRetired: isRetired(legacyShell) && isRetired(legacyShellStdio),
        remoteDesktopCommanderActive: isActive(remoteDesktopCommander),
        remoteDesktopListenerOpen,
        pluginServiceActive: isActive(plugin),
        pluginListenerOpen,
      });
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
