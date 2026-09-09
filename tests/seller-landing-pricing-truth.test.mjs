import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const seller = fs.readFileSync('src/components/screens/SellerLandingScreen.jsx', 'utf8');
const publicSeo = fs.readFileSync('backend/config/public_seo.php', 'utf8');
const adController = fs.readFileSync('backend/app/Http/Controllers/Api/AdController.php', 'utf8');
const pricingSource = fs.readFileSync('backend/config/seo_source_pages.php', 'utf8');

const count = (pattern) => (seller.match(pattern) || []).length;

test('seller acquisition copy matches the current free-plan and renewal contract', () => {
  assert.match(adController, /private function monthlyAdLimit[\s\S]*?return 3;/);
  assert.match(pricingSource, /renovación por 49 MXN/);
  assert.equal(count(/faq_a1:/g), 11, 'all 11 active seller locales must explain pricing');
  assert.equal(count(/\$49 MXN/g), 11, 'every seller locale must disclose the 49 MXN renewal in its pricing FAQ');
  assert.match(seller, /Plan gratis: hasta 3 anuncios al mes/);
  assert.match(seller, /Free plan: up to 3 listings per month/);
  assert.match(publicSeo, /hasta 3 anuncios al mes/);
  assert.match(publicSeo, /Renovación y promociones son opcionales y de pago/);
});

test('seller acquisition copy does not return to unlimited or all-free claims', () => {
  const banned = [
    'Clasificados 100% Gratis', '100% Free Classifieds', '100% Gratuitos',
    '100% gratuites', '100% kostenlose', 'gratuiti al 100%', '100% бесплатные',
    '100% 免费', '100%無料', '100% 무료', 'مجانية 100%',
    'No hay límites restrictivos', 'There are no restrictive limits',
    'Für private Verkäufer gibt es keine einschränkenden Limits',
    'Для частных продавцов нет жестких ограничений', '個人出品者に対する制限はありません',
  ];
  for (const phrase of banned) assert.equal(seller.includes(phrase), false, `stale seller pricing claim: ${phrase}`);
  assert.equal(seller.includes('Su Messico, gli acquirenti'), false, 'Italian seller copy must name Mercasto, not Mexico, as the platform');
  assert.equal(seller.includes('在 Mercasto， we'), false, 'Chinese seller copy must not contain mixed English text');
});
