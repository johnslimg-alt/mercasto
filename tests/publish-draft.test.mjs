import assert from 'node:assert/strict';
import test from 'node:test';
import {
  PUBLISH_DRAFT_KEY,
  PUBLISH_DRAFT_TTL_MS,
  clearPublishDraft,
  readPublishDraft,
  writePublishDraft,
} from '../src/utils/publishDraft.js';

function memoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  };
}

const populatedDraft = {
  step: 3,
  form: {
    title: 'Bicicleta urbana',
    price: '3500',
    description: 'Lista para usar.',
    category: 'productos',
    state: 'Jalisco',
    city: 'Guadalajara',
    location: 'Guadalajara, Jalisco',
    latitude: '20.67',
    longitude: '-103.35',
    condition: 'usado',
    attributes: { negotiable: 'Acepto ofertas' },
  },
  contact: {
    contactMethods: ['whatsapp', 'telegram', 'invalid'],
    waMode: 'phone',
    phoneValue: '55 1234 5678',
    telegramValue: '@vendedor',
  },
};

test('publish draft restores only whitelisted serializable journey data', () => {
  const storage = memoryStorage();
  assert.equal(writePublishDraft({ ...populatedDraft, auth_token: 'secret', images: ['blob'] }, storage, 1000), true);
  const restored = readPublishDraft(storage, 2000);

  assert.equal(restored.step, 3);
  assert.equal(restored.form.title, 'Bicicleta urbana');
  assert.deepEqual(restored.contact.contactMethods, ['whatsapp', 'telegram']);
  assert.equal(restored.contact.telegramValue, 'vendedor');
  assert.equal('auth_token' in restored, false);
  assert.equal('images' in restored, false);
});

test('empty, expired, corrupt, and future drafts are discarded', () => {
  const storage = memoryStorage();
  assert.equal(writePublishDraft({ form: {} }, storage, 1000), false);
  assert.equal(storage.getItem(PUBLISH_DRAFT_KEY), null);

  writePublishDraft(populatedDraft, storage, 1000);
  assert.equal(readPublishDraft(storage, 1000 + PUBLISH_DRAFT_TTL_MS + 1), null);

  storage.setItem(PUBLISH_DRAFT_KEY, '{broken');
  assert.equal(readPublishDraft(storage, 2000), null);

  writePublishDraft(populatedDraft, storage, 100_000);
  assert.equal(readPublishDraft(storage, 1), null);
});

test('publish draft can be cleared after successful publication', () => {
  const storage = memoryStorage();
  writePublishDraft(populatedDraft, storage, 1000);
  clearPublishDraft(storage);
  assert.equal(storage.getItem(PUBLISH_DRAFT_KEY), null);
});
