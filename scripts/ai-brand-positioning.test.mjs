import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import test from 'node:test';

const languages = ['es', 'en', 'pt', 'fr', 'zh', 'ko', 'de', 'it', 'ar', 'he', 'yi', 'ru', 'ja'];
const expectedTaglines = {"es": "La plataforma de clasificados más moderna e inteligente con AI", "en": "The most modern and intelligent AI-powered classifieds platform", "pt": "A plataforma de classificados mais moderna e inteligente com AI", "fr": "La plateforme de petites annonces la plus moderne et intelligente avec IA", "de": "Die modernste und intelligenteste KI-gestützte Kleinanzeigenplattform", "it": "La piattaforma di annunci più moderna e intelligente con AI", "ru": "Самая современная и умная доска объявлений с AI", "zh": "最现代、最智能的 AI 分类信息平台", "ja": "最も先進的でスマートなAIクラシファイドプラットフォーム", "ko": "가장 현대적이고 스마트한 AI 기반 분류 광고 플랫폼", "ar": "أحدث وأذكى منصة إعلانات مبوبة مدعومة بالذكاء الاصطناعي", "he": "פלטפורמת המודעות המסווגות המתקדמת והחכמה ביותר עם AI", "yi": "די מאָדערנסטע און קלוגסטע קלאַסיפֿיצירטע מודעות־פּלאַטפֿאָרמע מיט AI"};
const source = (path) => readFileSync(path, 'utf8');
const canonical = { es: 'La plataforma de clasificados más moderna e inteligente con AI', en: 'The most modern and intelligent AI-powered classifieds platform', ru: 'Самая современная и умная доска объявлений с AI' };
const canonicalShort = { es: 'Clasificados con IA', en: 'AI-powered classifieds', ru: 'Объявления с AI' };

test('product-owner decision approves the intelligent AI positioning', () => {
  const decision = source('docs/product/AI_BRAND_POSITIONING_DECISION_2026-08-06.md');
  assert.match(decision, /Status:\*\* APPROVED BY PRODUCT OWNER/);
  assert.match(decision, /Самая современная и умная доска объявлений с AI/);
  assert.match(decision, /La plataforma de clasificados más moderna e inteligente con AI/);
  assert.match(decision, /The most modern and intelligent AI-powered classifieds platform/);
  assert.match(decision, /supersedes the shorter canonical wording documented in PR #496 and the revert rationale in PR #498/);
  assert.match(decision, /Do not automatically remove `intelligent`, `умная`, `inteligente`/);
});

test('every supported language carries the AI brand contract', async () => {
  for (const language of languages) {
    const module = await import(pathToFileURL(`src/constants/translations/${language}.js`));
    const dictionary = module.default;
    assert.ok(dictionary.ai_brand_short, `${language}: short brand line`);
    assert.ok(dictionary.ai_brand_tagline, `${language}: brand tagline`);
    assert.equal(dictionary.ai_brand_tagline, expectedTaglines[language], `${language}: exact modern + intelligent tagline`);
    assert.ok(dictionary.ai_brand_description, `${language}: brand description`);
    if (canonical[language]) assert.equal(dictionary.ai_brand_tagline, canonical[language], `${language}: exact canonical tagline`);
    if (canonicalShort[language]) assert.equal(dictionary.ai_brand_short, canonicalShort[language], `${language}: exact short tagline`);
    assert.equal(dictionary.heroTag, dictionary.ai_brand_short, `${language}: hero tag`);
    assert.equal(dictionary.heroTitle, dictionary.ai_brand_tagline, `${language}: hero title`);
    assert.equal(dictionary.onboarding_welcome_subtitle, dictionary.ai_brand_tagline, `${language}: onboarding`);
    assert.match(dictionary.footer_desc, new RegExp(dictionary.ai_brand_tagline.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
});

test('shared application surfaces render the AI positioning', () => {
  const app = source('src/App.jsx');
  assert.match(app, /data-testid="global-ai-brand-strip"/);
  assert.match(app, /tagline=\{t\.ai_brand_short/);
  assert.match(app, /tagline=\{t\.ai_brand_tagline\}/);
  assert.match(app, /auth-modal-ai-brand-message/);
  assert.match(app, /Mercasto \| \$\{t\.ai_brand_tagline/);

  assert.match(source('src/components/screens/PostScreen.jsx'), /publish-ai-brand-message/);
  assert.match(source('src/components/screens/UserDashboard.jsx'), /dashboard-ai-brand-message/);
  assert.match(source('src/components/screens/SellerLandingScreen.jsx'), /t\.ai_brand_tagline/);
});

test('public metadata and official source copy use the AI positioning', () => {
  const index = source('index.html');
  const geo = source('src/content/geoSourcePages.js');
  const manifest = source('public/manifest.json');
  const faq = source('src/components/seo/FAQSchema.jsx');
  const refunds = source('public/reembolsos/index.html');
  const moderation = source('public/moderacion/index.html');
  assert.match(index, /La plataforma de clasificados más moderna e inteligente con AI/);
  assert.match(index, /moderación inteligente/);
  assert.match(geo, /plataforma de clasificados más moderna e inteligente con AI/);
  assert.match(geo, /publicación asistida por AI/);
  assert.match(manifest, /clasificados más moderna e inteligente con AI/);
  assert.match(faq, /¿Cómo usa Mercasto la AI\?/);
  assert.match(faq, /most modern and intelligent AI-powered classifieds platform/);
  assert.match(refunds, /plataforma de clasificados más moderna e inteligente con AI/);
  assert.match(moderation, /plataforma de clasificados más moderna e inteligente con AI/);
});
