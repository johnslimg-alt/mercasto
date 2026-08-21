import { serve } from '@hono/node-server';
import { createMcpHonoApp } from '@modelcontextprotocol/hono';
import { createMcpHandler, McpServer } from '@modelcontextprotocol/server';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import * as z from 'zod/v4';

const execFileAsync = promisify(execFile);
const port = Number.parseInt(process.env.PORT || '8765', 10);
const maxOutput = 64 * 1024;

async function gate(operation, ...args) {
  const { stdout, stderr } = await execFileAsync(
    '/usr/bin/sudo',
    ['-n', '/usr/local/sbin/reef-mcp-gate', operation, ...args],
    { timeout: 15000, maxBuffer: maxOutput, encoding: 'utf8' },
  );
  const text = `${stdout || ''}${stderr || ''}`.trim();
  return text.slice(0, maxOutput);
}

function textResult(text) {
  return { content: [{ type: 'text', text: text || '(no output)' }] };
}

function buildServer() {
  const server = new McpServer({ name: 'reef-crm-vps', version: '1.0.0' });

  server.registerTool('server_status', {
    description: 'Use this when you need a read-only health snapshot of srv1526037.',
    inputSchema: z.object({}),
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
  }, async () => textResult(await gate('server_status')));

  server.registerTool('reef_crm_status', {
    description: 'Use this when you need the current Reef CRM container and health status.',
    inputSchema: z.object({}),
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
  }, async () => textResult(await gate('reef_crm_status')));

  server.registerTool('reef_crm_logs', {
    description: 'Use this when you need recent redacted Reef CRM application logs.',
    inputSchema: z.object({ lines: z.number().int().min(10).max(200).default(80) }),
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
  }, async ({ lines }) => textResult(await gate('reef_crm_logs', String(lines))));

  server.registerTool('network_snapshot', {
    description: 'Use this when you need a read-only list of server TCP listeners and firewall state.',
    inputSchema: z.object({}),
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
  }, async () => textResult(await gate('network_snapshot')));

  server.registerTool('mcp_agent_status', {
    description: 'Use this when you need the local Reef MCP agent service status.',
    inputSchema: z.object({}),
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
  }, async () => textResult(await gate('mcp_agent_status')));

  return server;
}

const handler = createMcpHandler(buildServer);
const app = createMcpHonoApp();
app.get('/health', c => c.json({ ok: true, service: 'reef-mcp-agent' }));
app.all('/mcp', c => handler.fetch(c.req.raw));

const server = serve({ fetch: app.fetch, port, hostname: '127.0.0.1' }, () => {
  console.error(`[reef-mcp-agent] listening on http://127.0.0.1:${port}/mcp`);
});

async function shutdown(signal) {
  console.error(`[reef-mcp-agent] ${signal}`);
  await handler.close().catch(() => {});
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 5000).unref();
}

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));
