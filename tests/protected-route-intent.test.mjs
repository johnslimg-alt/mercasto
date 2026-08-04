import assert from 'node:assert/strict';
import test from 'node:test';
import { protectedIntentKind } from '../src/utils/protectedIntent.js';

test('protected conversion routes classify publish and exact contact intents', () => {
  assert.equal(protectedIntentKind('/post', ''), 'seller_post');
  assert.equal(protectedIntentKind('/post/', '?category=autos'), 'seller_post');
  assert.equal(
    protectedIntentKind('/mensajes', '?ad_id=42&seller_id=202&title=Bicicleta'),
    'contact_message',
  );
  assert.equal(protectedIntentKind('/mensajes', ''), 'messages_inbox');
});

test('unrelated and incomplete routes do not become contact conversion intents', () => {
  assert.equal(protectedIntentKind('/profile', ''), null);
  assert.equal(protectedIntentKind('/mensajes/77', ''), null);
  assert.equal(protectedIntentKind('/mensajes', '?ad_id=42'), 'messages_inbox');
});
