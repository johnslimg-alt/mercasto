export const listingQualityValidationTranslations = {
  es: {
    listing_quality_title_missing_letters: 'El título debe incluir al menos una letra.',
    listing_quality_description_missing_letters: 'La descripción debe incluir al menos una letra.',
  },
  en: {
    listing_quality_title_missing_letters: 'The title must include at least one letter.',
    listing_quality_description_missing_letters: 'The description must include at least one letter.',
  },
  pt: {
    listing_quality_title_missing_letters: 'O título deve incluir pelo menos uma letra.',
    listing_quality_description_missing_letters: 'A descrição deve incluir pelo menos uma letra.',
  },
  fr: {
    listing_quality_title_missing_letters: 'Le titre doit contenir au moins une lettre.',
    listing_quality_description_missing_letters: 'La description doit contenir au moins une lettre.',
  },
  zh: {
    listing_quality_title_missing_letters: '标题必须至少包含一个文字字符。',
    listing_quality_description_missing_letters: '描述必须至少包含一个文字字符。',
  },
  ko: {
    listing_quality_title_missing_letters: '제목에는 최소 한 개의 문자가 포함되어야 합니다.',
    listing_quality_description_missing_letters: '설명에는 최소 한 개의 문자가 포함되어야 합니다.',
  },
  de: {
    listing_quality_title_missing_letters: 'Der Titel muss mindestens einen Buchstaben enthalten.',
    listing_quality_description_missing_letters: 'Die Beschreibung muss mindestens einen Buchstaben enthalten.',
  },
  it: {
    listing_quality_title_missing_letters: 'Il titolo deve contenere almeno una lettera.',
    listing_quality_description_missing_letters: 'La descrizione deve contenere almeno una lettera.',
  },
  ar: {
    listing_quality_title_missing_letters: 'يجب أن يحتوي العنوان على حرف واحد على الأقل.',
    listing_quality_description_missing_letters: 'يجب أن يحتوي الوصف على حرف واحد على الأقل.',
  },
  ru: {
    listing_quality_title_missing_letters: 'В заголовке должна быть хотя бы одна буква.',
    listing_quality_description_missing_letters: 'В описании должна быть хотя бы одна буква.',
  },
  ja: {
    listing_quality_title_missing_letters: 'タイトルには少なくとも1つの文字を含めてください。',
    listing_quality_description_missing_letters: '説明には少なくとも1つの文字を含めてください。',
  },
};

export function mergeListingQualityValidationTranslations(language, translations) {
  return {
    ...translations,
    ...(listingQualityValidationTranslations[language] || listingQualityValidationTranslations.es),
  };
}
