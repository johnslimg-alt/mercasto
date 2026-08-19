export const listingQualityPolicyCopy = {
  es: {
    listing_quality_policy_manual_review: 'Si continúas, este anuncio quedará pendiente de revisión manual antes de poder publicarse.',
    listing_quality_continue_hint: 'Puedes continuar si la información es correcta. Algunas advertencias requieren revisión manual antes de publicar.',
  },
  en: {
    listing_quality_policy_manual_review: 'If you continue, this listing will remain pending for manual review before it can be published.',
    listing_quality_continue_hint: 'You can continue if the information is correct. Some warnings require manual review before publication.',
  },
  pt: {
    listing_quality_policy_manual_review: 'Se continuar, este anúncio ficará pendente de revisão manual antes de poder ser publicado.',
    listing_quality_continue_hint: 'Você pode continuar se as informações estiverem corretas. Alguns avisos exigem revisão manual antes da publicação.',
  },
  fr: {
    listing_quality_policy_manual_review: 'Si vous continuez, cette annonce restera en attente d’une vérification manuelle avant de pouvoir être publiée.',
    listing_quality_continue_hint: 'Vous pouvez continuer si les informations sont correctes. Certains avertissements nécessitent une vérification manuelle avant publication.',
  },
  zh: {
    listing_quality_policy_manual_review: '如果继续，此广告将在发布前保持待人工审核状态。',
    listing_quality_continue_hint: '如果信息正确，您可以继续。部分警告需要在发布前进行人工审核。',
  },
  ko: {
    listing_quality_policy_manual_review: '계속하면 이 광고는 게시되기 전에 수동 검토 대기 상태로 유지됩니다.',
    listing_quality_continue_hint: '정보가 정확하면 계속할 수 있습니다. 일부 경고는 게시 전에 수동 검토가 필요합니다.',
  },
  de: {
    listing_quality_policy_manual_review: 'Wenn du fortfährst, bleibt diese Anzeige bis zur manuellen Prüfung vor der Veröffentlichung ausstehend.',
    listing_quality_continue_hint: 'Du kannst fortfahren, wenn die Angaben korrekt sind. Einige Hinweise erfordern vor der Veröffentlichung eine manuelle Prüfung.',
  },
  it: {
    listing_quality_policy_manual_review: 'Se continui, questo annuncio resterà in attesa di revisione manuale prima di poter essere pubblicato.',
    listing_quality_continue_hint: 'Puoi continuare se le informazioni sono corrette. Alcuni avvisi richiedono una revisione manuale prima della pubblicazione.',
  },
  ar: {
    listing_quality_policy_manual_review: 'إذا تابعت، فسيبقى هذا الإعلان قيد المراجعة اليدوية قبل أن يصبح قابلاً للنشر.',
    listing_quality_continue_hint: 'يمكنك المتابعة إذا كانت المعلومات صحيحة. تتطلب بعض التنبيهات مراجعة يدوية قبل النشر.',
  },
  ru: {
    listing_quality_policy_manual_review: 'Если продолжить, объявление останется на ручной проверке и будет опубликовано только после неё.',
    listing_quality_continue_hint: 'Можно продолжить, если данные верны. Некоторые предупреждения требуют ручной проверки перед публикацией.',
  },
  ja: {
    listing_quality_policy_manual_review: '続行すると、この広告は公開前の手動審査待ちになります。',
    listing_quality_continue_hint: '情報が正しければ続行できます。一部の警告では公開前に手動審査が必要です。',
  },
};

export function getListingQualityPolicyCopy(language = 'es') {
  const code = String(language || 'es').toLowerCase().split('-')[0];
  return listingQualityPolicyCopy[code] || listingQualityPolicyCopy.es;
}
