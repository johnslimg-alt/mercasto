const SUPPORTED = new Set(['es','en','pt','fr','zh','ko','de','it','ar','ru','ja']);
export function getCurrentSiteLanguage(explicit) {
  const raw=explicit || (typeof localStorage!=='undefined' && (localStorage.getItem('lang')||localStorage.getItem('mercasto_language'))) || 'es';
  const code=String(raw).toLowerCase().split(/[-_]/)[0];
  return SUPPORTED.has(code)?code:'es';
}
const MESSAGES={
 es:t=>`Hola, me interesa tu anuncio "${t}" en Mercasto.`, en:t=>`Hi, I'm interested in your listing "${t}" on Mercasto.`,
 pt:t=>`Olá, tenho interesse no seu anúncio "${t}" no Mercasto.`, fr:t=>`Bonjour, votre annonce "${t}" sur Mercasto m'intéresse.`,
 zh:t=>`你好，我对你在 Mercasto 上的广告“${t}”感兴趣。`, ko:t=>`안녕하세요, Mercasto의 "${t}" 광고에 관심이 있습니다.`,
 de:t=>`Hallo, ich interessiere mich für deine Anzeige "${t}" auf Mercasto.`, it:t=>`Ciao, mi interessa il tuo annuncio "${t}" su Mercasto.`,
 ar:t=>`مرحبًا، أنا مهتم بإعلانك "${t}" على Mercasto.`, ru:t=>`Здравствуйте, меня заинтересовало ваше объявление «${t}» на Mercasto.`,
 ja:t=>`こんにちは、Mercastoの「${t}」という広告に興味があります。`};
export function whatsappInterestMessage(title='',explicit){const lang=getCurrentSiteLanguage(explicit);return (MESSAGES[lang]||MESSAGES.es)(String(title||''));}
