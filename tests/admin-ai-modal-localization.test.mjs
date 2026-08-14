import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { SUPPORTED_LANGUAGES } from '../src/utils/translations.js';
import { ADMIN_AI_LANGUAGES, getAdminAiCopy } from '../src/utils/adminAiCopy.js';

const AGENTS = ['postgresql', 'react', 'ceo', 'lawyer', 'notary', 'advocate', 'marketing', 'seo', 'ceo_ui', 'ceo_ux', 'ui'];

test('admin AI copy covers exactly the 11 active languages', () => {
  assert.deepEqual([...ADMIN_AI_LANGUAGES].sort(), [...SUPPORTED_LANGUAGES].sort());
  assert.equal(ADMIN_AI_LANGUAGES.includes('he'), false);
  assert.equal(ADMIN_AI_LANGUAGES.includes('yi'), false);
  for (const lang of ADMIN_AI_LANGUAGES) {
    const copy = getAdminAiCopy(lang);
    for (const key of ['title', 'subtitle', 'processing', 'ready', 'execute']) {
      assert.ok(String(copy[key] || '').trim(), `${lang}.${key}`);
    }
    assert.match(copy.subtitle, /Mercasto/, `${lang}.subtitle brand`);
    for (const agent of AGENTS) {
      assert.ok(String(copy.labels[agent] || '').trim(), `${lang}.labels.${agent}`);
      assert.ok(String(copy.prompts[agent] || '').trim(), `${lang}.prompts.${agent}`);
    }
    assert.equal(JSON.stringify(copy).includes('ZXQ'), false, `${lang}: no translation placeholders`);
  }
});

test('non-Spanish admin AI chrome is localized', () => {
  const es = getAdminAiCopy('es');
  for (const lang of ADMIN_AI_LANGUAGES.filter(code => code !== 'es')) {
    const copy = getAdminAiCopy(lang);
    for (const key of ['title', 'processing', 'ready', 'execute']) {
      assert.notEqual(copy[key], es[key], `${lang}.${key}`);
    }
  }
});

test('Mexico Spanish admin AI copy follows closing-only punctuation', () => {
  const serialized = JSON.stringify(getAdminAiCopy('es'));
  assert.equal(serialized.includes(String.fromCharCode(0xbf)), false);
  assert.equal(serialized.includes(String.fromCharCode(0xa1)), false);
});

test('AI Command Center is lazy-loaded and former Spanish UI literals leave App', () => {
  const app = fs.readFileSync('src/App.jsx', 'utf8');
  const modal = fs.readFileSync('src/components/admin/AiCommandModal.jsx', 'utf8');
  assert.match(app, /React\.lazy\(\(\) => import\('\.\/components\/admin\/AiCommandModal'\)\)/);
  assert.match(app, /showAiModal && user\?\.role === 'admin'/);
  assert.match(modal, /getAdminAiCopy\(lang\)/);
  assert.match(modal, /copy\.prompts\[aiAgentType\]/);
  assert.match(modal, /copy\.execute/);

  for (const formerLiteral of [
    'Centro de Comando IA', 'Agentes autónomos Mercasto', 'El agente analiza tu solicitud...',
    'Listo para ayudar. Escribe tu solicitud abajo.', "'Ejecutar'", 'Ej: Cuántos anuncios activos tenemos ahora?',
    'Error del sistema: token de autorización no encontrado', 'Error de red:',
  ]) assert.equal(app.includes(formerLiteral), false, formerLiteral);
});

test('AI endpoint and payload contracts stay unchanged', () => {
  const app = fs.readFileSync('src/App.jsx', 'utf8');
  for (const [agent, endpoint] of Object.entries({
    postgresql: '/agents/postgresql', react: '/agents/react', ceo: '/agents/ceo',
    lawyer: '/agents/lawyer', notary: '/agents/notary', advocate: '/agents/advocate',
    marketing: '/agents/marketing', seo: '/agents/seo', ceo_ui: '/agents/ceo-ui',
    ceo_ux: '/agents/ceo-ux', ui: '/agents/ui',
  })) assert.ok(app.includes(`${agent}: '${endpoint}'`), `${agent} endpoint`);

  assert.match(app, /aiAgentType === 'react' \? \{ prompt: aiPrompt \} : \{ query: aiPrompt \}/);
  assert.match(app, /method: 'POST'/);
  assert.match(app, /'Authorization': `Bearer \$\{token\}`/);
  assert.match(app, /setAiResult\(\{ error: t\.shell_login_continue \}\)/);
  assert.match(app, /setAiResult\(\{ error: t\.connection_error \}\)/);
});
