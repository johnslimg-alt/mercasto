const REPORT_LIFECYCLE_COPY = Object.freeze({
  es: { new: 'Pendiente', in_review: 'En revisión', resolved: 'Resuelto', dismissed: 'Descartado', start: 'Revisar', resolve: 'Resolver', dismiss: 'Descartar', note: 'Nota privada', notePlaceholder: 'Nota opcional para auditoría', error: 'No se pudo actualizar el reporte.' },
  en: { new: 'New', in_review: 'In review', resolved: 'Resolved', dismissed: 'Dismissed', start: 'Start review', resolve: 'Resolve', dismiss: 'Dismiss', note: 'Private note', notePlaceholder: 'Optional audit note', error: 'Could not update the report.' },
  pt: { new: 'Novo', in_review: 'Em revisão', resolved: 'Resolvido', dismissed: 'Descartado', start: 'Iniciar revisão', resolve: 'Resolver', dismiss: 'Descartar', note: 'Nota privada', notePlaceholder: 'Nota opcional de auditoria', error: 'Não foi possível atualizar a denúncia.' },
  fr: { new: 'Nouveau', in_review: 'En examen', resolved: 'Résolu', dismissed: 'Rejeté', start: 'Commencer l’examen', resolve: 'Résoudre', dismiss: 'Rejeter', note: 'Note privée', notePlaceholder: 'Note d’audit facultative', error: 'Impossible de mettre à jour le signalement.' },
  zh: { new: '新建', in_review: '审核中', resolved: '已解决', dismissed: '已驳回', start: '开始审核', resolve: '解决', dismiss: '驳回', note: '私密备注', notePlaceholder: '可选审核备注', error: '无法更新举报。' },
  ko: { new: '신규', in_review: '검토 중', resolved: '해결됨', dismissed: '기각됨', start: '검토 시작', resolve: '해결', dismiss: '기각', note: '비공개 메모', notePlaceholder: '선택적 감사 메모', error: '신고를 업데이트할 수 없습니다.' },
  de: { new: 'Neu', in_review: 'In Prüfung', resolved: 'Erledigt', dismissed: 'Verworfen', start: 'Prüfung starten', resolve: 'Erledigen', dismiss: 'Verwerfen', note: 'Private Notiz', notePlaceholder: 'Optionale Audit-Notiz', error: 'Meldung konnte nicht aktualisiert werden.' },
  it: { new: 'Nuova', in_review: 'In revisione', resolved: 'Risolta', dismissed: 'Archiviata', start: 'Avvia revisione', resolve: 'Risolvi', dismiss: 'Archivia', note: 'Nota privata', notePlaceholder: 'Nota di audit facoltativa', error: 'Impossibile aggiornare la segnalazione.' },
  ar: { new: 'جديد', in_review: 'قيد المراجعة', resolved: 'تم الحل', dismissed: 'مرفوض', start: 'بدء المراجعة', resolve: 'حل', dismiss: 'رفض', note: 'ملاحظة خاصة', notePlaceholder: 'ملاحظة تدقيق اختيارية', error: 'تعذر تحديث البلاغ.' },
  ru: { new: 'Новая', in_review: 'На проверке', resolved: 'Решена', dismissed: 'Отклонена', start: 'Начать проверку', resolve: 'Решить', dismiss: 'Отклонить', note: 'Приватная заметка', notePlaceholder: 'Необязательная заметка для аудита', error: 'Не удалось обновить жалобу.' },
  ja: { new: '新規', in_review: '確認中', resolved: '解決済み', dismissed: '却下', start: '確認を開始', resolve: '解決', dismiss: '却下', note: '非公開メモ', notePlaceholder: '任意の監査メモ', error: '報告を更新できませんでした。' },
});

export function getReportLifecycleCopy(lang = 'es') {
  return REPORT_LIFECYCLE_COPY[lang] || REPORT_LIFECYCLE_COPY.es;
}

export function formatReportReference(kind, id) {
  const prefix = kind === 'user' ? 'RPT-U' : 'RPT-A';
  return `${prefix}-${String(id).padStart(8, '0')}`;
}
