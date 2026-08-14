export const RECOMMENDATION_LANGUAGES = Object.freeze(['es','en','pt','fr','zh','ko','de','it','ar','ru','ja']);

const COPY = Object.freeze({
  es: { forYou: 'Para ti', personalized: 'Recomendaciones basadas en tus intereses', popularNearby: 'Los anuncios más populares en tu zona', previous: 'Anterior', next: 'Siguiente' },
  en: { forYou: 'For you', personalized: 'Recommendations based on your interests', popularNearby: 'The most popular listings in your area', previous: 'Previous', next: 'Next' },
  pt: { forYou: 'Para você', personalized: 'Recomendações baseadas nos seus interesses', popularNearby: 'Os anúncios mais populares na sua região', previous: 'Anterior', next: 'Próximo' },
  fr: { forYou: 'Pour vous', personalized: 'Recommandations basées sur vos centres d’intérêt', popularNearby: 'Les annonces les plus populaires près de chez vous', previous: 'Précédent', next: 'Suivant' },
  zh: { forYou: '为你推荐', personalized: '根据你的兴趣提供的推荐', popularNearby: '你所在地区最热门的广告', previous: '上一个', next: '下一个' },
  ko: { forYou: '추천', personalized: '관심사를 기반으로 한 추천', popularNearby: '내 지역에서 가장 인기 있는 광고', previous: '이전', next: '다음' },
  de: { forYou: 'Für dich', personalized: 'Empfehlungen basierend auf deinen Interessen', popularNearby: 'Die beliebtesten Anzeigen in deiner Nähe', previous: 'Zurück', next: 'Weiter' },
  it: { forYou: 'Per te', personalized: 'Consigli basati sui tuoi interessi', popularNearby: 'Gli annunci più popolari nella tua zona', previous: 'Precedente', next: 'Successivo' },
  ar: { forYou: 'لك', personalized: 'توصيات مبنية على اهتماماتك', popularNearby: 'أكثر الإعلانات رواجًا في منطقتك', previous: 'السابق', next: 'التالي' },
  ru: { forYou: 'Для вас', personalized: 'Рекомендации на основе ваших интересов', popularNearby: 'Самые популярные объявления рядом с вами', previous: 'Назад', next: 'Вперёд' },
  ja: { forYou: 'あなたへのおすすめ', personalized: '興味に基づくおすすめ', popularNearby: 'お住まいの地域で人気の広告', previous: '前へ', next: '次へ' },
});

export function getRecommendationCopy(language = 'es') {
  const lang = String(language || 'es').toLowerCase().split('-')[0];
  return COPY[lang] || COPY.es;
}

export { COPY as RECOMMENDATION_COPY };
