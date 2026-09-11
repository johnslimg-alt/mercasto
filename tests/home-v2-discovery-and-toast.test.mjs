import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const v2 = fs.readFileSync('src/components/screens/HomeScreenV2.jsx', 'utf8');
const app = fs.readFileSync('src/App.jsx', 'utf8');
const discovery = fs.readFileSync('src/components/home/HomeDiscoverySections.jsx', 'utf8');

const renderHomeV2Block = app.slice(
  app.indexOf('const renderHomeV2Screen'),
  app.indexOf('const renderCatalogScreen'),
);

test('Home V2 keeps the home toast feedback contract', () => {
  assert.match(v2, /data-testid="home-toast"/, 'toast testid missing');
  assert.match(v2, /role="status"/, 'toast must be a status region');
  assert.match(v2, /aria-live="polite"/, 'toast must be announced politely');
  assert.ok(v2.includes('showHomeToast'), 'no way to raise the toast');
  // The toast needs real triggers, otherwise it is decoration.
  assert.match(v2, /data-testid="home-upload-cv"[\s\S]{0,220}showHomeToast/, 'upload CV must raise the toast');
  assert.match(v2, /data-testid="home-create-job-alert"[\s\S]{0,220}showHomeToast/, 'job alert must raise the toast');
});

test('Home V2 keeps the publish entry point', () => {
  assert.match(v2, /setCurrentTab\?\.\('post'\)/, 'publish CTA must switch to the post tab');
  assert.ok(v2.includes('publishAd'), 'publish handler missing');
  assert.ok(renderHomeV2Block.includes('setCurrentTab={setCurrentTab}'), 'App.jsx does not forward setCurrentTab');
});

test('Home V2 renders the discovery sections in the V2 skin', () => {
  assert.match(v2, /import \{ PopularSearchesSection, CitiesSection, NewsletterSection \} from '\.\.\/home\/HomeDiscoverySections'/);
  for (const section of ['PopularSearchesSection', 'CitiesSection', 'NewsletterSection']) {
    assert.match(v2, new RegExp(`<${section}[\\s\\S]{0,200}variant="v2"`), `${section} must render in the V2 skin`);
  }
  assert.ok(renderHomeV2Block.includes('setSelectedState={setSelectedState}'), 'App.jsx does not forward setSelectedState');
  assert.ok(renderHomeV2Block.includes('setSearchLocation={setSearchLocation}'), 'App.jsx does not forward setSearchLocation');
});

test('the V2 city grid carries no fabricated counts', () => {
  const v2Branch = discovery.slice(
    discovery.indexOf("variant === 'v2'", discovery.indexOf('export function CitiesSection')),
    discovery.indexOf('<section className="col-span-12">', discovery.indexOf('export function CitiesSection')),
  );
  assert.ok(v2Branch.length > 0, 'CitiesSection v2 branch not found');
  assert.match(v2Branch, /className=\{'v2-city'/, 'city grid must use V2 classes');
  assert.doesNotMatch(v2Branch, /city\.count/, 'invented city counters must not reach V2');
});
