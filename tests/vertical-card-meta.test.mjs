import assert from 'node:assert/strict';
import test from 'node:test';
import { getVerticalCardMeta } from '../src/utils/verticalCardMeta.js';

test('autos cards expose useful structured attributes', () => {
  const meta = getVerticalCardMeta({
    category: 'motor',
    attributes: { marca: 'Toyota', modelo: 'RAV4', year: 2021, km: '65000', combustible: 'Híbrido' },
  }, 'autos');

  assert.deepEqual(meta.primary, ['Toyota', 'RAV4', '2021']);
  assert.deepEqual(meta.secondary, ['65,000 km', 'Híbrido']);
});

test('services cards expose provider/service attributes from JSON payloads', () => {
  const meta = getVerticalCardMeta({
    attributes: JSON.stringify({ tipo: 'Limpieza', modalidad: 'A domicilio', experiencia_servicio: '4-7 años', tipo_cobro: 'Por visita' }),
  }, 'services');

  assert.deepEqual(meta.primary, ['Limpieza', 'A domicilio']);
  assert.deepEqual(meta.secondary, ['4-7 años', 'Por visita']);
});

test('legacy ads without structured attributes keep a safe empty fallback', () => {
  assert.deepEqual(getVerticalCardMeta({ attributes: '{bad json' }, 'autos'), { primary: [], secondary: [] });
  assert.deepEqual(getVerticalCardMeta({}, 'services'), { primary: [], secondary: [] });
});
