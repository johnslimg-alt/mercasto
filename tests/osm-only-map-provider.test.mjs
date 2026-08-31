import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');

test('Mercasto uses OpenStreetMap only for map/geocoding runtime', () => {
  const controller = read('backend/app/Http/Controllers/Api/AdController.php');
  const services = read('backend/config/services.php');
  const readiness = read('scripts/env-readiness-smoke.sh');
  const headers = read('security_headers.conf');
  const map = read('src/components/common/MapV3.jsx');
  const preview = read('src/components/common/MercastoMapPreview.jsx');

  for (const source of [controller, services, readiness, headers]) {
    assert.doesNotMatch(source, /maps\.googleapis\.com|GOOGLE_MAPS_API_KEY|maps_api_key/);
  }
  assert.match(controller, /nominatim_url/);
  assert.match(controller, /countrycodes' => 'mx'/);
  assert.match(controller, /Cache::remember\('osm-geocode:/);
  assert.match(controller, /Cache::lock\('osm-nominatim-geocode-lock'/);
  assert.match(controller, /last-request-at/);
  assert.match(services, /nominatim\.openstreetmap\.org/);
  assert.match(map, /openstreetmap/i);
  assert.match(preview, /tile\.openstreetmap\.org/i);
  assert.doesNotMatch(preview, /cartocdn|mapbox|maptiler|maps\.google/i);
  assert.doesNotMatch(headers, /maps\.google\.com/);
});

test('legacy Google Maps key cleanup is scoped and confirmation-gated', () => {
  const script = read('scripts/remove-legacy-google-maps-key.sh');
  const workflow = read('.github/workflows/server-ops.yml');
  assert.match(script, /CONFIRM.*MERCASTO/);
  assert.match(script, /REPO_ROOT\/\.env/);
  assert.match(script, /REPO_ROOT\/backend\/\.env/);
  assert.doesNotMatch(script, /find \/root|find \/var\/www/);
  assert.match(script, /nginx -t/);
  assert.match(script, /nginx -s reload/);
  assert.match(script, /retry_cmd 12 5 check_public_url https:\/\/mercasto\.com\/api\/categories/);
  assert.match(script, /retry_cmd 12 5 check_public_url https:\/\/mercasto\.com\/api\/auth\/providers/);
  assert.match(script, /OSM_ONLY_MAP_PROVIDER=PASS/);
  assert.match(workflow, /remove_legacy_google_maps_key/);
});
