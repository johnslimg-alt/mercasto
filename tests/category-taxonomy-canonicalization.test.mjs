import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const categorySeeder = fs.readFileSync('backend/database/seeders/MercastoCategoriesSeeder.php', 'utf8');
const attributeSeeder = fs.readFileSync('backend/database/seeders/CategoryAttributeSeeder.php', 'utf8');
const migration = fs.readFileSync(
  'backend/database/migrations/2026_09_25_235500_canonicalize_legacy_category_slugs.php',
  'utf8',
);

const aliases = {
  coches: 'motor',
  telefonos: 'electronica',
  telefonia: 'electronica',
  informatica: 'electronica',
  bebes: 'infantil',
  coleccionismo: 'ocio',
};

test('category seeder never recreates retired aliases', () => {
  for (const legacy of Object.keys(aliases)) {
    assert.equal(
      categorySeeder.includes(`'slug' => '${legacy}'`),
      false,
      `MercastoCategoriesSeeder must not recreate ${legacy}`,
    );
  }

  assert.match(categorySeeder, /'slug' => 'motor'/);
  assert.match(categorySeeder, /'slug' => 'electronica'/);
  assert.match(categorySeeder, /'slug' => 'infantil'/);
});

test('vehicle attribute seeding uses only the canonical motor category', () => {
  assert.equal(
    attributeSeeder.includes("'category_slug' => 'coches'"),
    false,
    'CategoryAttributeSeeder must not attach attributes to coches',
  );
  assert.match(attributeSeeder, /'motor'\s*=>\s*\[/);
});

test('canonicalization migration covers every retired alias and dependent surface', () => {
  for (const [legacy, canonical] of Object.entries(aliases)) {
    assert.ok(
      migration.includes(`'${legacy}' => '${canonical}'`),
      `missing migration mapping ${legacy} -> ${canonical}`,
    );
  }

  for (const table of ['ads', 'category_subscriptions', 'search_alerts', 'saved_searches', 'categories']) {
    assert.ok(migration.includes(`'${table}'`), `migration must cover ${table}`);
  }

  assert.match(migration, /whereExists\(/, 'subscription alias merge must de-duplicate before update');
  assert.match(migration, /valid_category_slugs/);
  assert.match(migration, /categories_all/);
});

test('canonicalization is intentionally one-way', () => {
  const down = migration.slice(migration.indexOf('public function down'));
  assert.equal(/insert|update|create/i.test(down), false);
});
