export const listingPolicyReviewTranslations = {
  es: {
    listing_quality_policy_manual_review: 'Puedes continuar, pero este anuncio quedará pendiente de revisión humana antes de publicarse.',
    listing_quality_continue_hint: 'Puedes continuar. Estas recomendaciones no bloquean el envío, pero algunos controles pueden dejar el anuncio pendiente de revisión humana antes de publicarse.',
  },
  en: {
    listing_quality_policy_manual_review: 'You can continue, but this listing will remain pending human review before it can be published.',
    listing_quality_continue_hint: 'You can continue. These recommendations do not block submission, but some checks may leave the listing pending human review before publication.',
  },
  pt: {
    listing_quality_policy_manual_review: 'Você pode continuar, mas este anúncio ficará pendente de análise humana antes da publicação.',
    listing_quality_continue_hint: 'Você pode continuar. Estas recomendações não bloqueiam o envio, mas algumas verificações podem deixar o anúncio pendente de análise humana antes da publicação.',
  },
  fr: {
    listing_quality_policy_manual_review: 'Vous pouvez continuer, mais cette annonce restera en attente d’un examen humain avant sa publication.',
    listing_quality_continue_hint: 'Vous pouvez continuer. Ces recommandations ne bloquent pas l’envoi, mais certains contrôles peuvent laisser l’annonce en attente d’un examen humain avant publication.',
  },
  zh: {
    listing_quality_policy_manual_review: '您可以继续，但该广告在发布前将保持等待人工审核状态。',
    listing_quality_continue_hint: '您可以继续。这些建议不会阻止提交，但某些检查可能会使广告在发布前进入人工审核等待状态。',
  },
  ko: {
    listing_quality_policy_manual_review: '계속할 수 있지만 이 광고는 게시되기 전에 사람의 검토 대기 상태로 유지됩니다.',
    listing_quality_continue_hint: '계속할 수 있습니다. 이 권장 사항은 제출을 막지 않지만 일부 검사는 게시 전에 광고를 사람의 검토 대기 상태로 둘 수 있습니다.',
  },
  de: {
    listing_quality_policy_manual_review: 'Du kannst fortfahren, aber diese Anzeige bleibt vor der Veröffentlichung zur manuellen Prüfung ausstehend.',
    listing_quality_continue_hint: 'Du kannst fortfahren. Diese Empfehlungen blockieren das Absenden nicht, aber einige Prüfungen können die Anzeige vor der Veröffentlichung in die manuelle Prüfung geben.',
  },
  it: {
    listing_quality_policy_manual_review: 'Puoi continuare, ma questo annuncio resterà in attesa di revisione umana prima della pubblicazione.',
    listing_quality_continue_hint: 'Puoi continuare. Questi suggerimenti non bloccano l’invio, ma alcuni controlli possono lasciare l’annuncio in attesa di revisione umana prima della pubblicazione.',
  },
  ar: {
    listing_quality_policy_manual_review: 'يمكنك المتابعة، لكن سيظل هذا الإعلان قيد المراجعة البشرية قبل نشره.',
    listing_quality_continue_hint: 'يمكنك المتابعة. لا تمنع هذه التوصيات الإرسال، لكن بعض الفحوصات قد تضع الإعلان في انتظار مراجعة بشرية قبل النشر.',
  },
  ru: {
    listing_quality_policy_manual_review: 'Можно продолжить, но перед публикацией объявление останется на ручной проверке.',
    listing_quality_continue_hint: 'Можно продолжить. Эти рекомендации не блокируют отправку, но некоторые проверки могут оставить объявление на ручной проверке перед публикацией.',
  },
  ja: {
    listing_quality_policy_manual_review: '続行できますが、この広告は公開前に人による確認待ちになります。',
    listing_quality_continue_hint: '続行できます。これらの推奨事項は送信を妨げませんが、一部の確認により広告が公開前の人による確認待ちになる場合があります。',
  },
};

export function getListingPolicyReviewTranslations(lang = 'es') {
  return listingPolicyReviewTranslations[lang] || listingPolicyReviewTranslations.es;
}
