import { normalizeLanguage } from './translations.js';

const COPY = Object.freeze({
  es: {
    referenceLabel: 'Referencia',
    statusLabel: 'Estado',
    followUp: 'Guarda esta referencia. La respuesta llegará al correo que indicaste.',
    statuses: { received: 'Recibido', in_review: 'En revisión', waiting_user: 'Esperando tu respuesta', resolved: 'Resuelto' },
  },
  en: {
    referenceLabel: 'Reference',
    statusLabel: 'Status',
    followUp: 'Keep this reference. We will reply to the email address you provided.',
    statuses: { received: 'Received', in_review: 'In review', waiting_user: 'Waiting for your reply', resolved: 'Resolved' },
  },
  pt: {
    referenceLabel: 'Referência',
    statusLabel: 'Status',
    followUp: 'Guarde esta referência. A resposta chegará ao e-mail informado.',
    statuses: { received: 'Recebido', in_review: 'Em análise', waiting_user: 'Aguardando sua resposta', resolved: 'Resolvido' },
  },
  fr: {
    referenceLabel: 'Référence',
    statusLabel: 'Statut',
    followUp: 'Conservez cette référence. La réponse sera envoyée à l’adresse e-mail indiquée.',
    statuses: { received: 'Reçu', in_review: 'En cours d’examen', waiting_user: 'En attente de votre réponse', resolved: 'Résolu' },
  },
  zh: {
    referenceLabel: '参考编号',
    statusLabel: '状态',
    followUp: '请保存此参考编号。我们会回复到你提供的电子邮箱。',
    statuses: { received: '已收到', in_review: '审核中', waiting_user: '等待你的回复', resolved: '已解决' },
  },
  ko: {
    referenceLabel: '문의 번호',
    statusLabel: '상태',
    followUp: '이 문의 번호를 보관하세요. 입력한 이메일로 답변을 보내드립니다.',
    statuses: { received: '접수됨', in_review: '검토 중', waiting_user: '답변 대기 중', resolved: '해결됨' },
  },
  de: {
    referenceLabel: 'Referenz',
    statusLabel: 'Status',
    followUp: 'Bewahre diese Referenz auf. Wir antworten an die angegebene E-Mail-Adresse.',
    statuses: { received: 'Eingegangen', in_review: 'In Prüfung', waiting_user: 'Warten auf deine Antwort', resolved: 'Gelöst' },
  },
  it: {
    referenceLabel: 'Riferimento',
    statusLabel: 'Stato',
    followUp: 'Conserva questo riferimento. Risponderemo all’indirizzo e-mail indicato.',
    statuses: { received: 'Ricevuto', in_review: 'In revisione', waiting_user: 'In attesa della tua risposta', resolved: 'Risolto' },
  },
  ar: {
    referenceLabel: 'المرجع',
    statusLabel: 'الحالة',
    followUp: 'احتفظ بهذا المرجع. سنرسل الرد إلى البريد الإلكتروني الذي أدخلته.',
    statuses: { received: 'تم الاستلام', in_review: 'قيد المراجعة', waiting_user: 'بانتظار ردك', resolved: 'تم الحل' },
  },
  ru: {
    referenceLabel: 'Номер обращения',
    statusLabel: 'Статус',
    followUp: 'Сохраните этот номер. Ответ придёт на указанный вами email.',
    statuses: { received: 'Получено', in_review: 'На рассмотрении', waiting_user: 'Ожидаем ваш ответ', resolved: 'Решено' },
  },
  ja: {
    referenceLabel: '受付番号',
    statusLabel: 'ステータス',
    followUp: 'この受付番号を保存してください。入力したメールアドレスに返信します。',
    statuses: { received: '受付済み', in_review: '確認中', waiting_user: '返信待ち', resolved: '解決済み' },
  },
});

export function getSupportRequestAcknowledgementCopy(lang = 'es') {
  const normalized = normalizeLanguage(lang);
  return COPY[normalized] || COPY.es;
}

export function getSupportRequestStatusLabel(lang, status) {
  const copy = getSupportRequestAcknowledgementCopy(lang);
  return copy.statuses[status] || copy.statuses.received;
}

export const SUPPORT_ACK_LANGUAGES = Object.freeze(Object.keys(COPY));
