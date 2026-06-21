/**
 * patch-translations2.cjs
 * Second pass: adds remaining missing keys to es, en, pt
 */

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/constants/mockData.js');
let content = fs.readFileSync(filePath, 'utf8');

// Keys still missing after first patch
const remainingEs = {
  address: 'Dirección Comercial',
};

const remainingEn = {
  address: 'Business Address',
  existing_cats: 'Existing Categories',
  interface: 'Interface',
  max_uses: 'Max. uses',
  name_es: 'Name in Spanish',
  no_reports: 'No reports',
  publish_review: 'Publish review',
  push_alerts: 'Push notifications',
  role: 'Role',
  select: 'Select...',
  show_qr: 'Show contact QR code',
  update_email: 'Update your email address...',
  update_password: 'Update your password...',
  verified_id: 'Identity verified',
  video_opt: 'Video (Optional)',
};

const remainingPt = {
  add_cat: 'Adicionar Categoria',
  address: 'Endereço comercial',
  approve: 'Aprovar',
  cat_tab: 'Categorias',
  category_stats: 'Estatísticas de Categorias',
  conf_password: 'Confirmar nova senha',
  cover_photo: 'Foto de Capa',
  del_warning: 'Ao excluir sua conta, você perderá todos os dados...',
  download_pdf: 'Baixar PDF',
  drag_photos: 'Arraste suas fotos aqui ou',
  edit_ad_review_desc: 'Alterações importantes serão enviadas para revisão',
  error_loading_ad: 'Falha ao carregar o anúncio',
  existing_cats: 'Categorias Existentes',
  first_img_main_hint: 'A primeira foto será a principal do anúncio',
  interface: 'Interface',
  max_images_alert: 'Máximo de 10 fotos por anúncio',
  max_uses: 'Máx. usos',
  name_es: 'Nome em espanhol',
  no_reports: 'Sem denúncias',
  publish_review: 'Publicar avaliação',
  push_alerts: 'Notificações push',
  referral_error: 'Falha ao carregar o link de indicação.',
  referral_load_error: 'Falha ao carregar o programa de indicação',
  role: 'Função',
  save_changes_error: 'Erro ao salvar alterações',
  saving_word: 'Salvando',
  select: 'Selecionar...',
  select_category: 'Selecione a categoria',
  show_qr: 'Mostrar QR de contato',
  update_email: 'Atualize seu e-mail...',
  update_password: 'Atualize sua senha...',
  verified_id: 'Identidade verificada',
  video_opt: 'Vídeo (Opcional)',
};

function escVal(v) {
  return String(v).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function buildKeyLines(obj) {
  return Object.entries(obj)
    .map(([k, v]) => `    ${k}: '${escVal(v)}'`)
    .join(',\n');
}

function getExistingKeys(content, langCode) {
  const langStart = content.indexOf(`\n  ${langCode}: {`);
  if (langStart === -1) return new Set();
  const nextMatch = /\n  [a-z]{2}: \{/.exec(content.slice(langStart + 1));
  const blockEnd = nextMatch ? langStart + 1 + nextMatch.index : content.length;
  const block = content.slice(langStart, blockEnd);
  const keyPattern = /^\s{4}(\w+):/gm;
  const keys = new Set();
  let m;
  while ((m = keyPattern.exec(block)) !== null) {
    keys.add(m[1]);
  }
  return keys;
}

function patchLanguageBlock(content, langCode, missingObj) {
  const existingKeys = getExistingKeys(content, langCode);
  const filtered = {};
  for (const [k, v] of Object.entries(missingObj)) {
    if (!existingKeys.has(k)) {
      filtered[k] = v;
    }
  }

  if (Object.keys(filtered).length === 0) {
    console.log(`No new keys to add for '${langCode}'`);
    return content;
  }

  const langStart = content.indexOf(`\n  ${langCode}: {`);
  if (langStart === -1) { console.error(`Not found: '${langCode}'`); return content; }

  const closeIdx = content.indexOf('\n  },', langStart + 1);
  if (closeIdx === -1) { console.error(`No close for '${langCode}'`); return content; }

  const newLines = buildKeyLines(filtered);
  const insertion = `,\n${newLines}`;
  const result = content.slice(0, closeIdx) + insertion + content.slice(closeIdx);
  console.log(`Added ${Object.keys(filtered).length} keys to '${langCode}'`);
  return result;
}

content = patchLanguageBlock(content, 'es', remainingEs);
content = patchLanguageBlock(content, 'en', remainingEn);
content = patchLanguageBlock(content, 'pt', remainingPt);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Done! Second pass complete.');
