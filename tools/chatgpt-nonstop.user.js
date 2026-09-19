// ==UserScript==
// @name         ChatGPT Non-Stop Loop
// @namespace    https://github.com/MShneur/ghost-in-the-loop
// @version      9.0.0-alpha.2-nonstop.3
// @description  Perpetual Play + truthful Export. External protocol activators. No controller-side reasoning.
// @author       Michael S (CTRL-AI)
// @match        https://chatgpt.com/*
// @match        https://chat.openai.com/*
// @match        https://www.perplexity.ai/*
// @match        https://gemini.google.com/*
// @match        https://claude.ai/*
// @match        https://grok.com/*
// @match        https://chat.deepseek.com/*
// @match        https://copilot.microsoft.com/*
// @match        https://chat.mistral.ai/*
// @match        https://kimi.com/*
// @match        https://www.kimi.com/*
// @match        https://chat.qwen.ai/*
// @match        https://poe.com/*
// @match        https://duck.ai/*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_setClipboard
// @grant        GM_notification
// @run-at       document-idle
// @noframes
// @license      AGPL-3.0
// ==/UserScript==

(() => {
'use strict';
if (window.__GITL_V9__ === true) return;
if (window.__GITL_V9_BOOTING__ && Date.now() - window.__GITL_V9_BOOTING__ < 15000) return;
window.__GITL_V9_BOOTING__ = Date.now();

const VER = '9.0.0-alpha.2-nonstop.3';
const TICK_MS = 1000;
const VALID_QUIET_MS = 1400;
const DRIFT_QUIET_MS = 9000;
const WRITE_VERIFY_MS = 1800;
const SEND_WAIT_MS = 2200;
const SEND_CONFIRM_MS = 16000;
const DEFAULT_MAX_ROUNDS = 50;
const HARD_MAX_ROUNDS = 200;
const CHECKPOINT_EVERY = 5;
const STAGNATION_REPEAT_LIMIT = 2;

const G = Object.freeze({
  proceed: '[[GITL::PROCEED]]',
  human: '[[GITL::HUMAN]]',
  halt: '[[GITL::HALT]]'
});
const A = Object.freeze({
  proceed: '[[AOA::CONTINUE]]',
  human: '[[AOA::HUMAN]]',
  halt: '[[AOA::HALT]]'
});

const AOA_BRANCH = 'feature/plex-universal-model-relay';
const ACT = Object.freeze({
  plex: ['PLEX', `https://raw.githubusercontent.com/MShneur/Agents-of-AI/${AOA_BRANCH}/modes/plex.md`],
  relay: ['Model Relay', `https://raw.githubusercontent.com/MShneur/Agents-of-AI/${AOA_BRANCH}/workflows/model-relay.md`],
  human: ['Human Gate', 'https://raw.githubusercontent.com/MShneur/Agents-of-AI/main/workflows/human-gate-committee.md'],
  cleanerz: ['Cleanerz', 'https://raw.githubusercontent.com/MShneur/Agents-of-AI/main/workflows/cleanerz.md'],
  quorum: ['Quorum', 'https://raw.githubusercontent.com/MShneur/Agents-of-AI/main/workflows/quorum.md'],
  ctrl: ['CTRL-AI', 'https://raw.githubusercontent.com/MShneur/CTRL-AI/main/llms-full.txt'],
  rduck: ['R-Duck', 'https://raw.githubusercontent.com/MShneur/R-Duck/main/AGENTS.md']
});

const PROFILES = [
  {
    id: 'perplexity',
    host: /perplexity\.ai$/i,
    input: ['#ask-input[contenteditable="true"][data-lexical-editor="true"]', '#ask-input[contenteditable="true"]'],
    send: ['button[aria-label="Submit"]'],
    stop: ['button[aria-label="Stop"]', 'button[aria-label*="Stop response" i]', '[data-testid="stop-button"]'],
    user: ['.group\\/user-bubble'],
    assistant: ['[data-workflow-final-text]']
  },
  {
    id: 'chatgpt',
    host: /chatgpt\.com$|chat\.openai\.com$/i,
    input: ['#prompt-textarea', 'textarea[data-id="root"]'],
    send: ['#composer-submit-button', 'button[data-testid="send-button"]', 'button[aria-label="Send prompt"]', 'button[aria-label="Send message"]'],
    stop: ['button[data-testid="stop-button"]', 'button[aria-label="Stop generating"]', 'button[aria-label="Stop streaming"]'],
    user: ['[data-message-author-role="user"]'],
    assistant: ['[data-message-author-role="assistant"]']
  },
  {
    id: 'generic',
    host: /.*/,
    input: ['div[contenteditable="true"][role="textbox"]', 'textarea[placeholder]', 'textarea'],
    send: ['button[aria-label*="Send" i]', 'button[aria-label="Submit"]', 'button[type="submit"]'],
    stop: ['button[aria-label*="Stop" i]', '[data-testid*="stop" i]'],
    user: ['[data-message-author-role="user"]', '[data-role="user"]'],
    assistant: ['[data-message-author-role="assistant"]', '[data-role="assistant"]']
  }
];
const HOST = PROFILES.find(p => p.host.test(location.hostname)) || PROFILES[2];

const storedMax = Number(GM_getValue('v9.max', DEFAULT_MAX_ROUNDS));
const initialMax = Number.isFinite(storedMax) && storedMax >= 1 && storedMax <= HARD_MAX_ROUNDS
  ? Math.floor(storedMax) : DEFAULT_MAX_ROUNDS;
const S = {
  mode: 'IDLE', detail: 'Ready', round: Math.max(0, Number(GM_getValue('v9.nonstop.round', 0)) || 0),
  max: initialMax,
  sending: false, uncertain: false, lastHandled: '', awaitingFrom: '', stableHash: '', stableSince: 0,
  drift: 0, bootstrapped: false, relay: '', timer: null,
  haltAudit: false, lastWorkHash: '', repeatCount: 0,
  tab: String(GM_getValue('v9.tab', 'play') || 'play'), events: [], lastError: null
};
GM_setValue('v9.max', S.max);
const ON = {};
for (const key of Object.keys(ACT)) ON[key] = !!GM_getValue(`v9.act.${key}`, false);
let custom = String(GM_getValue('v9.custom', '') || '');

let _ttPolicy = null;
try { if (window.trustedTypes?.createPolicy) _ttPolicy = window.trustedTypes.createPolicy('gitl9-ui', { createHTML: s => s }); } catch (_) {}
const trustedHTML = s => _ttPolicy ? _ttPolicy.createHTML(s) : s;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const now = () => Date.now();
const displayText = value => String(value ?? '').replace(/\u00a0/g, ' ').replace(/\r/g, '').trim();
const semanticText = value => displayText(value).replace(/\s+/g, ' ').trim();
const visible = el => !!el && el.isConnected && !el.disabled && el.getAttribute('aria-disabled') !== 'true' && !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);

function queryFirst(selectors, root = document, requireVisible = true) {
  for (const selector of selectors || []) {
    try {
      const nodes = [...root.querySelectorAll(selector)];
      const el = requireVisible ? nodes.find(visible) : nodes[0];
      if (el) return el;
    } catch (_) {}
  }
  return null;
}
function queryAll(selectors) {
  const out = [], seen = new Set();
  for (const selector of selectors || []) {
    try {
      for (const el of document.querySelectorAll(selector)) {
        if (!seen.has(el)) { seen.add(el); out.push(el); }
      }
    } catch (_) {}
  }
  return out;
}
function composer() { return queryFirst(HOST.input); }
function nodeText(el) { return displayText(el?.innerText ?? el?.textContent ?? el?.value ?? ''); }
function assistantText() {
  const nodes = queryAll(HOST.assistant).filter(el => el.isConnected && nodeText(el));
  return nodes.length ? nodeText(nodes[nodes.length - 1]) : '';
}
function userCount() { return queryAll(HOST.user).filter(el => el.isConnected).length; }
function generating() { return !!queryFirst(HOST.stop); }
function hash(value) {
  const s = String(value || ''); let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return `${s.length}:${(h >>> 0).toString(16)}`;
}
function finalLine(text) {
  const lines = String(text || '').split(/\r?\n/).map(x => x.trim()).filter(Boolean);
  return lines.length ? lines[lines.length - 1] : '';
}
function terminal(text) {
  const lines = String(text || '').split(/\r?\n/).map(x => x.trim()).filter(Boolean);
  const tail = lines.slice(-12).reverse();
  for (const line of tail) {
    if (line === G.proceed || line === A.proceed) return { type: 'proceed', raw: line };
    if (line === G.human || line === A.human) return { type: 'human', raw: line };
    if (line === G.halt || line === A.halt) return { type: 'halt', raw: line };
    const relay = line.match(/^\[\[AOA::RELAY:([^\]\r\n]{1,80})\]\]$/);
    if (relay) return { type: 'relay', raw: line, model: relay[1].trim() };
  }
  return { type: 'bad', raw: lines.length ? lines[lines.length - 1] : '(empty)' };
}
function log(type, data = {}) {
  S.events.push({ at: new Date().toISOString(), type, data });
  if (S.events.length > 60) S.events.shift();
  try { console.debug('[GITL9]', type, data); } catch (_) {}
}
function fail(code, detail, data = {}) {
  S.lastError = { code, detail, at: new Date().toISOString(), ...data };
  log('error', { code, ...data }); pause(`${code}: ${detail}`);
}
function notify(title, text) {
  try { if (typeof GM_notification === 'function') GM_notification({ title, text, timeout: 8000 }); } catch (_) {}
}

function contractText() {
  if (ON.relay) {
    return [
      '[GHOST CORE CONTROL]',
      'Continue the existing task without restarting or repeating completed work.',
      'Do not stop merely because one step or subtask finished. Keep going until the whole requested task is actually complete.',
      'You own all reasoning, planning, milestones, committees, recovery, and decisions. Ghost is only the mechanical relay.',
      'HALT is permitted only after a final completion audit against the original user goal and all acceptance criteria. Verify completion with available tools; do not infer success from having written code, a plan, or a patch.',
      'For software, site, service, or infrastructure work where production is part of the requested outcome, HALT requires implementation complete, relevant tests/build passed, deployment complete, and a live production smoke/health check passed with no known blocking error.',
      'If a required final state is not verified, use PROCEED when you can keep working; use HUMAN only when a real human decision, credential, approval, or external action is genuinely required.',
      'The FINAL non-whitespace line of every response must be exactly ONE bare control line. Do not add words before or after it.',
      'More work on the current model:', A.proceed,
      'A human decision is genuinely required:', A.human,
      'The task is complete:', A.halt,
      'A different model has a material advantage:', '[[AOA::RELAY:MODEL_LABEL]]',
      'Never place a control marker anywhere except the final line.'
    ].join('\n');
  }
  return [
    '[GHOST CORE CONTROL]',
    'Continue the existing task without restarting or repeating completed work.',
      'Do not stop merely because one step or subtask finished. Keep going until the whole requested task is actually complete.',
    'You own all reasoning, planning, milestones, committees, recovery, and decisions. Ghost is only the mechanical relay.',
    'HALT is permitted only after a final completion audit against the original user goal and all acceptance criteria. Verify completion with available tools; do not infer success from having written code, a plan, or a patch.',
    'For software, site, service, or infrastructure work where production is part of the requested outcome, HALT requires implementation complete, relevant tests/build passed, deployment complete, and a live production smoke/health check passed with no known blocking error.',
    'If a required final state is not verified, use PROCEED when you can keep working; use HUMAN only when a real human decision, credential, approval, or external action is genuinely required.',
    'The FINAL non-whitespace line of every response must be exactly ONE bare control line. Do not add words before or after it.',
    'More work remains:', G.proceed,
    'A human decision is genuinely required:', G.human,
    'The task is complete:', G.halt,
    'Never place a control marker anywhere except the final line.'
  ].join('\n');
}
function activatorText() {
  const out = [];
  for (const key of Object.keys(ACT)) {
    if (!ON[key]) continue;
    const [name, url] = ACT[key];
    out.push(`Activate ${name} from its canonical source and apply it silently to this existing task without restarting completed work. Canonical source: ${url}`);
  }
  if (custom.trim()) {
    const path = custom.trim().replace(/^\/+/, '');
    out.push(`Activate the Agents-of-AI component at this canonical source and apply it silently to this existing task without restarting completed work. Canonical source: https://raw.githubusercontent.com/MShneur/Agents-of-AI/main/${path}`);
  }
  return out.join('\n\n');
}
function bootstrapPrompt(existing = '') {
  const parts = [];
  if (existing.trim()) parts.push(existing.trim());
  parts.push(contractText());
  const activators = activatorText(); if (activators) parts.push(activators);
  return parts.join('\n\n---\n\n');
}
function continuationPrompt() {
  const checkpoint = S.round > 0 && S.round % CHECKPOINT_EVERY === 0;
  const work = checkpoint
    ? 'Progress checkpoint: re-read the ORIGINAL user goal and full current state. Identify every remaining acceptance criterion, then perform the highest-impact remaining concrete action. Do not merely restate status or repeat prior work. Before HALT, verify the final state with available tools; if production is part of the requested outcome, verify the live deployed system.'
    : 'Continue the existing task from the current conversation. Do not restart or repeat completed work. Perform the next concrete action toward the ORIGINAL user goal. Do not stop after a subtask. Before HALT, verify every acceptance criterion and any required live production state.';
  return ON.relay
    ? `${work} Keep all active protocols in force. End with exactly one valid Model Relay control line as the final non-whitespace line.`
    : `${work} Keep all active protocols in force. End with exactly one valid Ghost control line as the final non-whitespace line.`;
}
function completionAuditPrompt() {
  return `FINAL COMPLETION AUDIT. The previous turn proposed HALT, but Ghost requires an independent second pass before stopping. Re-read the ORIGINAL user request and the full conversation. Check every requested deliverable and acceptance criterion against actual current evidence. Use available tools to verify claims. For software/site/service/infrastructure work where production is part of the goal, verify: implementation complete; relevant tests/build passed; deployment completed; live production smoke/health check passed; no known blocking error remains. Do not accept a plan, local patch, unverified deployment claim, or partial subtask as completion. If anything required remains and you can act, continue the work and end PROCEED. If a genuine human decision/credential/approval/external action is required, end HUMAN. Only if the entire original goal is verified complete, give concise completion evidence and end HALT.\n\n${contractText()}`;
}
function stagnationPrompt() {
  return `STAGNATION RECOVERY. Your latest work repeated the previous round. Re-read the ORIGINAL goal and current evidence. Do not repeat status, plans, or already-completed actions. Choose a different concrete verification or implementation step that materially advances the task. If the goal is already truly complete, run the final completion audit before HALT. If an unavoidable human action is required, request HUMAN.\n\n${contractText()}`;
}
function workHash(text) {
  const body = String(text || '')
    .replace(/\[\[(?:GITL|AOA)::[^\]\r\n]+\]\]/g, '')
    .replace(/\s+/g, ' ').trim();
  return hash(body);
}
function regroundPrompt() {
  return `You strayed from the active control protocol. Re-read the existing conversation, reground in the current task, and continue without restarting or repeating completed work. Do not explain the protocol error. Your response must end with exactly one valid bare terminal control line as the final non-whitespace line.\n\n${contractText()}`;
}
function cleanerzPrompt() {
  return `Protocol compliance drifted twice. Activate Agents-of-AI Cleanerz from its canonical source, use it to reground the existing task and active protocols, then continue without restarting completed work. Canonical source: ${ACT.cleanerz[1]}\n\n${contractText()}`;
}

async function setComposerText(text) {
  const expected = semanticText(text); let el = composer();
  if (!el) return { ok: false, why: 'input-missing' };
  try {
    el.focus();
    if (el.isContentEditable) {
      const range = document.createRange(); range.selectNodeContents(el);
      const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(range);
      let inserted = false; try { inserted = document.execCommand('insertText', false, text); } catch (_) {}
      if (!inserted) {
        el.textContent = text;
        el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: text }));
      } else el.dispatchEvent(new Event('input', { bubbles: true }));
    } else {
      const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
      if (setter) setter.call(el, text); else el.value = text;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }
  } catch (error) { return { ok: false, why: 'write-exception', error: String(error?.message || error) }; }

  const started = now(); let observed = '';
  while (now() - started < WRITE_VERIFY_MS) {
    await sleep(75); el = composer(); if (!el) continue;
    observed = semanticText(nodeText(el));
    if (observed === expected) return { ok: true, el };
  }
  return { ok: false, why: 'visible-text-mismatch', expectedLength: expected.length, observedLength: observed.length };
}

function localSendButton(el = composer()) {
  if (!el) return null;
  for (let node = el, depth = 0; node && depth < 9; node = node.parentElement, depth++) {
    const btn = queryFirst(HOST.send, node); if (btn) return btn;
  }
  return queryFirst(HOST.send);
}
async function waitForSendButton(el) {
  const started = now();
  while (now() - started < SEND_WAIT_MS) {
    const btn = localSendButton(composer() || el); if (btn) return btn;
    await sleep(100);
  }
  return null;
}
async function confirmSend(beforeUsers, beforeComposer, beforeAssistantHash) {
  const started = now();
  while (now() - started < SEND_CONFIRM_MS) {
    if (generating()) return { ok: true, why: 'generation-started' };
    if (userCount() > beforeUsers) return { ok: true, why: 'new-user-turn' };
    const el = composer();
    if (el && beforeComposer && semanticText(nodeText(el)) === '') return { ok: true, why: 'composer-cleared' };
    const currentAssistant = assistantText();
    if (beforeAssistantHash && currentAssistant && hash(currentAssistant) !== beforeAssistantHash) return { ok: true, why: 'assistant-changed' };
    await sleep(250);
  }
  return { ok: false, why: 'unconfirmed' };
}

async function sendOnce(text, reason) {
  if (S.mode !== 'RUNNING' || S.sending || S.uncertain) return false;
  S.sending = true; S.detail = `Staging ${reason}...`; render();
  const beforeUsers = userCount();
  const beforeAssistantHash = hash(assistantText());
  const staged = await setComposerText(text);
  if (!staged.ok) {
    S.sending = false; fail('PLAY-WRITE', `Could not reliably stage the prompt (${staged.why}).`, staged); return false;
  }
  const button = await waitForSendButton(staged.el);
  if (!button) {
    S.sending = false; fail('PLAY-SEND', 'Prompt is staged, but the current host Send control did not become available.', { host: HOST.id }); return false;
  }
  const beforeComposer = semanticText(nodeText(composer()));
  log('send-click', { reason, round: S.round + 1, host: HOST.id });
  try { button.click(); }
  catch (error) {
    S.sending = false; S.uncertain = true;
    fail('PLAY-SEND-THREW', 'Send threw after actuation. Ghost stopped to prevent a duplicate.', { message: String(error?.message || error) }); return false;
  }
  const confirmed = await confirmSend(beforeUsers, beforeComposer, beforeAssistantHash);
  S.sending = false;
  if (!confirmed.ok) {
    S.uncertain = true; fail('PLAY-SEND-UNCERTAIN', 'Send was attempted but host acceptance could not be confirmed. Ghost will not resend.'); return false;
  }
  S.round += 1; GM_setValue('v9.nonstop.round', S.round); S.awaitingFrom = beforeAssistantHash; S.stableHash = ''; S.stableSince = 0;
  S.detail = `Sent once · ${confirmed.why}`; log('send-confirmed', { round: S.round, why: confirmed.why }); render(); return true;
}

async function handleTerminal(text, parsed) {
  const fp = hash(text);
  if (!text || fp === S.lastHandled || S.mode !== 'RUNNING' || S.sending) return;
  S.lastHandled = fp;
  if (parsed.type === 'halt') {
    S.drift = 0;
    if (!S.haltAudit) {
      const sent = await sendOnce(completionAuditPrompt(), 'final completion audit');
      if (sent) { S.haltAudit = true; S.detail = 'HALT proposed · independent completion audit running'; render(); }
      return;
    }
    S.haltAudit = false;
    complete('Task complete · final audit passed');
    notify('Ghost complete', 'HALT confirmed by the final completion audit.');
    return;
  }
  if (parsed.type === 'human') {
    S.drift = 0; S.haltAudit = false;
    pause('Human decision requested by the AI.');
    notify('Ghost paused', 'The AI requested a human decision.');
    return;
  }
  if (parsed.type === 'relay') {
    S.drift = 0; S.relay = parsed.model;
    pause(`Model Relay requested: ${parsed.model}.`);
    notify('Model Relay requested', parsed.model);
    return;
  }
  if (parsed.type === 'proceed') {
    S.drift = 0; S.haltAudit = false;
    const wh = workHash(text);
    if (wh && wh === S.lastWorkHash) S.repeatCount += 1;
    else { S.lastWorkHash = wh; S.repeatCount = 0; }

    if (S.repeatCount >= STAGNATION_REPEAT_LIMIT) {
      pause(`Stagnation guard: the same work repeated ${S.repeatCount + 1} rounds.`);
      notify('Ghost paused', 'Repeated output detected. Human review is safer than burning more rounds.');
      return;
    }
    if (S.round >= S.max) {
      pause(`Safety round limit reached (${S.max}). Review progress before resuming.`);
      notify('Ghost safety stop', `Reached the configured ${S.max}-round limit.`);
      return;
    }
    if (S.repeatCount === 1) await sendOnce(stagnationPrompt(), 'stagnation recovery');
    else await sendOnce(continuationPrompt(), 'continue');
  }
}
async function handleDrift(tail) {
  S.drift += 1; log('protocol-drift', { count: S.drift, tail: String(tail || '').slice(0, 80) });
  if (S.drift === 1) { await sendOnce(regroundPrompt(), 'protocol reground'); return; }
  if (S.drift === 2 && ON.cleanerz) { await sendOnce(cleanerzPrompt(), 'Cleanerz recovery'); return; }
  await sendOnce(regroundPrompt(), `protocol recovery ${S.drift}`);
}
async function tick() {
  if (S.mode !== 'RUNNING' || S.sending || S.uncertain) return;
  if (generating()) {
    S.detail = 'Model working...'; S.stableHash = ''; S.stableSince = 0; render(); return;
  }
  const text = assistantText();
  if (!text) { S.detail = 'Waiting for assistant output...'; render(); return; }
  const fp = hash(text);
  if (S.awaitingFrom) {
    if (fp === S.awaitingFrom) { S.detail = 'Waiting for the next answer...'; render(); return; }
    S.awaitingFrom = ''; S.stableHash = ''; S.stableSince = 0;
  }
  if (fp !== S.stableHash) {
    S.stableHash = fp; S.stableSince = now(); S.detail = 'Output changed · waiting for stability'; render(); return;
  }
  const quiet = now() - S.stableSince;
  const parsed = terminal(text);
  if (parsed.type !== 'bad') {
    S.detail = `Terminal detected · ${parsed.type}`; render();
    if (quiet >= VALID_QUIET_MS) await handleTerminal(text, parsed);
    return;
  }
  S.detail = quiet < DRIFT_QUIET_MS ? 'Output quiet · waiting for terminal' : 'Terminal missing · regrounding'; render();
  if (quiet >= DRIFT_QUIET_MS) { S.lastHandled = fp; await handleDrift(parsed.raw); }
}

async function play(resuming = false) {
  if (S.mode === 'RUNNING') return;
  if (!resuming && (S.mode === 'IDLE' || S.mode === 'COMPLETE')) { S.round = 0; GM_setValue('v9.nonstop.round', 0); }
  if (S.uncertain) { S.detail = 'Prior Send is uncertain. Inspect the chat or use Page Reload before resuming.'; render(); return; }
  const input = composer();
  if (!input) { fail('PLAY-INPUT', 'Current chat composer was not found.', { host: HOST.id }); return; }
  S.mode = 'RUNNING'; GM_setValue('v9.nonstop.active', true); S.detail = 'Starting non-stop loop...'; S.lastHandled = ''; S.stableHash = ''; S.stableSince = 0; S.drift = 0; S.relay = ''; S.haltAudit = false; S.lastWorkHash = ''; S.repeatCount = 0; render();
  const draft = nodeText(input); const latest = assistantText(); const parsed = terminal(latest);
  if (draft.trim()) {
    S.bootstrapped = true; if (!await sendOnce(bootstrapPrompt(draft), 'initial task')) return;
  } else if (!latest) {
    pause('Type a task into the chat first, then press Play.'); return;
  } else if (parsed.type !== 'bad') {
    S.bootstrapped = true; S.stableHash = hash(latest); S.stableSince = now() - VALID_QUIET_MS;
  } else {
    S.bootstrapped = true;
    if (!await sendOnce(bootstrapPrompt('Continue the existing task from this conversation without restarting or repeating completed work.'), 'arm existing chat')) return;
  }
  clearInterval(S.timer);
  S.timer = setInterval(() => { tick().catch(error => fail('PLAY-TICK', String(error?.message || error))); }, TICK_MS);
  await tick();
}
function pause(detail) { S.mode = 'PAUSED'; GM_setValue('v9.nonstop.active', false); S.detail = detail; clearInterval(S.timer); S.timer = null; render(); }
function stop() {
  S.mode = 'IDLE'; GM_setValue('v9.nonstop.active', false); GM_setValue('v9.nonstop.round', 0); S.round = 0; S.detail = 'Stopped'; S.sending = false; S.uncertain = false; S.lastHandled = ''; S.awaitingFrom = ''; S.stableHash = ''; S.stableSince = 0; S.drift = 0; S.haltAudit = false; S.lastWorkHash = ''; S.repeatCount = 0;
  clearInterval(S.timer); S.timer = null; log('stop'); render();
}
function complete(detail) { S.mode = 'COMPLETE'; GM_setValue('v9.nonstop.active', false); GM_setValue('v9.nonstop.round', 0); S.detail = detail; clearInterval(S.timer); S.timer = null; render(); }

function domTurns() {
  const rows = [];
  if (HOST.id === 'chatgpt') {
    const nodes = [...document.querySelectorAll('[data-message-author-role="user"],[data-message-author-role="assistant"]')];
    for (const el of nodes) {
      const role = el.getAttribute('data-message-author-role'); const text = displayText(el.innerText || el.textContent || '');
      if (role && text) rows.push({ role, text });
    }
    return rows;
  }
  if (HOST.id === 'perplexity') {
    const all = [...document.querySelectorAll('.group\\/user-bubble,[data-workflow-final-text]')];
    for (const el of all) {
      const text = displayText(el.innerText || el.textContent || ''); if (!text) continue;
      rows.push({ role: el.matches('.group\\/user-bubble') ? 'user' : 'assistant', text });
    }
    return rows;
  }
  const users = queryAll(HOST.user).map(el => ({ el, role: 'user' }));
  const assistants = queryAll(HOST.assistant).map(el => ({ el, role: 'assistant' }));
  for (const item of [...users, ...assistants].sort((a, b) => (a.el.compareDocumentPosition(b.el) & Node.DOCUMENT_POSITION_FOLLOWING) ? -1 : 1)) {
    const text = displayText(item.el.innerText || item.el.textContent || ''); if (text) rows.push({ role: item.role, text });
  }
  return rows;
}
function chatgptId() { const m = location.pathname.match(/\/c\/([0-9a-z-]+)/i); return m ? m[1] : ''; }
function perplexitySlug() { const m = location.pathname.match(/\/search\/([^/?#]+)/i); return m ? decodeURIComponent(m[1]) : ''; }
function parseChatGPTApi(data) {
  if (!data?.mapping || typeof data.mapping !== 'object') return [];
  const out = [];
  for (const node of Object.values(data.mapping)) {
    const msg = node?.message; const role = msg?.author?.role; const parts = msg?.content?.parts;
    if (!['user', 'assistant'].includes(role) || !Array.isArray(parts)) continue;
    const text = displayText(parts.filter(x => typeof x === 'string').join('\n'));
    if (text) out.push({ role, text, at: Number(msg.create_time || 0) });
  }
  out.sort((a, b) => a.at - b.at);
  return out.map(({ role, text }) => ({ role, text }));
}
async function apiCapture() {
  try {
    if (HOST.id === 'chatgpt') {
      const id = chatgptId(); if (!id) return null;
      const r = await fetch(`/backend-api/conversation/${encodeURIComponent(id)}`, { credentials: 'include' });
      if (!r.ok) return null; const raw = await r.json(); const turns = parseChatGPTApi(raw);
      return { source: turns.length ? 'api' : 'api-raw', turns, raw };
    }
    if (HOST.id === 'perplexity') {
      const slug = perplexitySlug(); if (!slug) return null;
      const r = await fetch(`/rest/thread/${encodeURIComponent(slug)}`, { credentials: 'include' });
      if (!r.ok) return null; return { source: 'api-raw', turns: [], raw: await r.json() };
    }
  } catch (error) { log('export-api-failed', { host: HOST.id, message: String(error?.message || error) }); }
  return null;
}
async function captureExport() {
  const api = await apiCapture(); const dom = domTurns();
  if (api?.turns?.length) return { version: VER, platform: HOST.id, capturedAt: new Date().toISOString(), source: 'api', partial: false, turns: api.turns, raw: api.raw };
  if (api) return { version: VER, platform: HOST.id, capturedAt: new Date().toISOString(), source: 'api-raw+dom', partial: true, turns: dom, raw: api.raw };
  return { version: VER, platform: HOST.id, capturedAt: new Date().toISOString(), source: 'dom', partial: true, turns: dom };
}
function markdown(cap) {
  const lines = ['# Ghost conversation export', '', `- Platform: ${cap.platform}`, `- Captured: ${cap.capturedAt}`, `- Source: ${cap.source}${cap.partial ? ' (partial)' : ''}`, ''];
  cap.turns.forEach((turn, i) => { lines.push(`## ${i + 1}. ${turn.role === 'user' ? 'User' : 'Assistant'}`, '', turn.text, ''); });
  return lines.join('\n');
}
function download(name, text, type) {
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name;
  document.documentElement.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}
async function doExport(kind) {
  S.detail = 'Capturing export...'; render(); const cap = await captureExport();
  if (!cap.turns.length && !cap.raw) { S.detail = 'Export found no conversation data.'; render(); return; }
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  if (kind === 'copy') {
    const text = markdown(cap); try { GM_setClipboard(text, 'text'); } catch (_) { await navigator.clipboard?.writeText(text); }
    S.detail = `Copied ${cap.turns.length} turns · ${cap.source}${cap.partial ? ' partial' : ''}`;
  } else if (kind === 'md') {
    download(`ghost-${HOST.id}-${stamp}.md`, markdown(cap), 'text/markdown;charset=utf-8'); S.detail = `Markdown exported · ${cap.source}${cap.partial ? ' partial' : ''}`;
  } else {
    download(`ghost-${HOST.id}-${stamp}.json`, JSON.stringify(cap, null, 2), 'application/json;charset=utf-8'); S.detail = `JSON exported · ${cap.source}${cap.partial ? ' partial' : ''}`;
  }
  render();
}

function report() {
  return {
    product: 'Ghost in the Loop', version: VER, platform: HOST.id, state: S.mode, round: S.round, maxRounds: S.max,
    sending: S.sending, uncertain: S.uncertain, driftCount: S.drift, haltAudit: S.haltAudit, repeatCount: S.repeatCount,
    capabilities: { input: !!composer(), send: !!localSendButton(), stop: generating(), assistant: !!assistantText() },
    lastError: S.lastError, relayRequested: S.relay || null, events: S.events.slice(-20), when: new Date().toISOString()
  };
}
function copyReport() {
  const text = JSON.stringify(report(), null, 2);
  try { GM_setClipboard(text, 'text'); } catch (_) { navigator.clipboard?.writeText(text); }
  S.detail = 'Diagnostic report copied.'; render();
}

const style = document.createElement('style');
style.textContent = `#gitl9{position:fixed;z-index:2147483646;top:70px;right:8px;width:min(270px,calc(100vw - 16px));background:#17161a;color:#eee;border:1px solid #45414b;border-radius:12px;box-shadow:0 8px 30px rgba(0,0,0,.4);font:12px/1.35 system-ui,sans-serif;padding:8px}#gitl9 *{box-sizing:border-box}#gitl9 .head{display:flex;align-items:center;justify-content:space-between;gap:6px}#gitl9 .brand{font-weight:750}#gitl9 .meta{font-size:10px;opacity:.65}#gitl9 .tabs{display:flex;gap:4px;margin:7px 0}#gitl9 button{border:1px solid #494550;background:#26242b;color:#eee;border-radius:8px;padding:7px 6px;font:inherit}#gitl9 button.on{background:#0c4434;border-color:#178063}#gitl9 button.stop{background:#46191d;border-color:#85333a}#gitl9 .tabs button{flex:1;padding:5px 3px}#gitl9 .status{background:#0f0e11;border-radius:8px;padding:7px;min-height:42px;margin:5px 0 7px;word-break:break-word}#gitl9 .row{display:flex;gap:5px}#gitl9 .row>*{flex:1;min-width:0}#gitl9 .grid{display:grid;grid-template-columns:1fr 1fr;gap:5px}#gitl9 label{display:flex;align-items:center;gap:5px;padding:5px;border:1px solid #35323a;border-radius:7px;background:#201e24}#gitl9 input[type="text"],#gitl9 input[type="number"]{width:100%;background:#0f0e11;color:#eee;border:1px solid #45414b;border-radius:7px;padding:6px}#gitl9 .pane{display:none}#gitl9 .pane.show{display:block}#gitl9 .tiny{font-size:10px;opacity:.7;margin-top:5px}@media(max-width:520px){#gitl9{top:58px;width:min(238px,calc(100vw - 12px));right:6px;padding:7px}#gitl9 button{padding:6px 4px}}`;
document.documentElement.appendChild(style);
const panel = document.createElement('div'); panel.id = 'gitl9'; (document.body || document.documentElement).appendChild(panel);
function esc(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function render() {
  panel.innerHTML = trustedHTML(`
    <div class="head"><span class="brand">👻 GHOST</span><span class="meta">${esc(HOST.id)} · ${VER}</span></div>
    <div class="tabs"><button data-tab="play" class="${S.tab==='play'?'on':''}">Play</button><button data-tab="aoa" class="${S.tab==='aoa'?'on':''}">AoA</button><button data-tab="export" class="${S.tab==='export'?'on':''}">Export</button></div>
    <div class="status"><b>${esc(S.mode)}</b> · round ${S.round} · NON-STOP<br>${esc(S.detail)}</div>
    <div class="pane ${S.tab==='play'?'show':''}" data-pane="play">
      <div class="row"><button class="on" data-a="play">▶ Non-stop</button><button class="stop" data-a="stop">■ Stop</button><button data-a="reload">↻ Page</button></div>
      <div class="row" style="margin-top:5px"><input data-max type="number" min="1" max="${HARD_MAX_ROUNDS}" value="${S.max}"><button data-a="report">Copy report</button></div>
      <div class="tiny">Safety: max ${S.max} rounds (hard cap ${HARD_MAX_ROUNDS}); HALT requires a second-pass completion audit; repeated output triggers recovery then pause.</div>
    </div>
    <div class="pane ${S.tab==='aoa'?'show':''}" data-pane="aoa">
      <div class="grid">${Object.entries(ACT).map(([k,v])=>`<label><input type="checkbox" data-act="${k}" ${ON[k]?'checked':''}>${esc(v[0])}</label>`).join('')}</div>
      <div class="tiny">Optional protocols stay external. Ghost points the AI to their canonical source; Play transport does not change.</div>
      <input data-custom type="text" placeholder="AoA path, e.g. personas/compass.md" value="${esc(custom)}" style="margin-top:6px">
    </div>
    <div class="pane ${S.tab==='export'?'show':''}" data-pane="export">
      <div class="row"><button data-a="copy">Copy MD</button><button data-a="md">Save MD</button><button data-a="json">Save JSON</button></div>
      <div class="tiny">API-first where supported; DOM fallback is explicitly marked partial.</div>
    </div>`);
  panel.querySelectorAll('[data-tab]').forEach(btn => btn.addEventListener('click', () => { S.tab = btn.dataset.tab; GM_setValue('v9.tab', S.tab); render(); }));
  panel.querySelector('[data-a="play"]')?.addEventListener('click', () => play().catch(e => fail('PLAY', String(e?.message || e))));
  panel.querySelector('[data-a="stop"]')?.addEventListener('click', stop);
  panel.querySelector('[data-a="reload"]')?.addEventListener('click', () => location.reload());
  panel.querySelector('[data-a="report"]')?.addEventListener('click', copyReport);
  panel.querySelector('[data-a="copy"]')?.addEventListener('click', () => doExport('copy'));
  panel.querySelector('[data-a="md"]')?.addEventListener('click', () => doExport('md'));
  panel.querySelector('[data-a="json"]')?.addEventListener('click', () => doExport('json'));
  panel.querySelector('[data-max]')?.addEventListener('change', e => { S.max = Math.max(1, Math.min(HARD_MAX_ROUNDS, Number(e.target.value) || DEFAULT_MAX_ROUNDS)); GM_setValue('v9.max', S.max); render(); });
  panel.querySelectorAll('[data-act]').forEach(box => box.addEventListener('change', () => { ON[box.dataset.act] = box.checked; GM_setValue(`v9.act.${box.dataset.act}`, box.checked); S.detail = `${ACT[box.dataset.act][0]} ${box.checked?'enabled':'disabled'} for the next injected prompt.`; render(); }));
  panel.querySelector('[data-custom]')?.addEventListener('change', e => { custom = String(e.target.value || '').trim(); GM_setValue('v9.custom', custom); S.detail = custom ? 'Custom AoA path saved.' : 'Custom AoA path cleared.'; render(); });
}

async function resumeNonStop() {
  if (!GM_getValue('v9.nonstop.active', false)) return;
  S.detail = 'Restoring non-stop loop...'; render();
  for (let i = 0; i < 180; i++) {
    if (composer() && !generating()) {
      try { await play(true); } catch (error) { fail('AUTO-RESUME', String(error?.message || error)); }
      return;
    }
    await sleep(1000);
  }
  S.detail = 'Non-stop remains armed; reload when the composer is available.'; render();
}
function wakeNonStop() {
  if (S.mode === 'RUNNING') tick().catch(error => fail('WAKE-TICK', String(error?.message || error)));
}
window.addEventListener('focus', wakeNonStop);
window.addEventListener('pageshow', wakeNonStop);
window.addEventListener('online', wakeNonStop);
document.addEventListener('visibilitychange', () => { if (!document.hidden) wakeNonStop(); });

render();
setTimeout(() => { resumeNonStop().catch(error => fail('AUTO-RESUME', String(error?.message || error))); }, 1200);
window.__GITL_V9__ = true;
try { delete window.__GITL_V9_BOOTING__; } catch (_) { window.__GITL_V9_BOOTING__ = 0; }
log('boot', { version: VER, host: HOST.id });
})();
