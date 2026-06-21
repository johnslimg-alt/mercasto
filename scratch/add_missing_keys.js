import fs from 'fs';
import path from 'path';

const filePath = path.resolve('./scratch/cleaned_translations.json');
const cleaned = JSON.parse(fs.readFileSync(filePath, 'utf8'));

const missingData = {
  ru: { category: 'Категория', price: 'Цена' },
  zh: { category: '类别', price: '价格' },
  ko: { category: '카테고리', price: '가격' },
  de: { category: 'Kategorie', price: 'Preis' },
  it: { category: 'Categoria', price: 'Prezzo' },
  ar: { category: 'الفئة', price: 'السعر' },
  he: { category: 'קטגוריה', price: 'מחיר' },
  yi: { category: 'קאַטעגאָריע', price: 'פּרייַז' },
  ja: { category: 'カテゴリ', price: '価格' },
  fr: { category: 'Catégorie', price: 'Prix' },
};

for (const [lang, keys] of Object.entries(missingData)) {
  if (cleaned[lang]) {
    cleaned[lang].category = keys.category;
    cleaned[lang].price = keys.price;
  }
}

fs.writeFileSync(filePath, JSON.stringify(cleaned, null, 2), 'utf8');
console.log("Added missing keys to cleaned_translations.json");
