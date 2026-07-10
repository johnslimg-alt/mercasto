import React, { useState, useEffect, useCallback } from 'react';
import { Building2, FileCheck2, Loader2, ShieldCheck, ShieldAlert, ShieldQuestion, ExternalLink, UploadCloud } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_BASE_URL || 'https://mercasto.com/api';

const localTranslations = {
  es: {
    title: 'Registro de empresa (RFC)',
    desc: 'Captura tu RFC y sube tu Constancia de Situación Fiscal (CSF) del SAT. Una IA compara ambos datos como primer filtro; el SAT no ofrece una API pública para verificación automática en tiempo real, así que cualquier caso dudoso pasa a revisión manual de un administrador.',
    rfc_label: 'RFC',
    rfc_placeholder: 'XAXX010101000',
    save_rfc: 'Guardar RFC',
    csf_label: 'Constancia de Situación Fiscal (PDF)',
    csf_upload: 'Subir CSF',
    csf_hint: 'Descárgala desde el portal del SAT. Máximo 5 MB, formato PDF.',
    status_pending: 'Pendiente de verificación',
    status_ai_verified: 'Verificado por IA',
    status_ai_flagged: 'En revisión manual',
    status_admin_verified: 'Verificado por Mercasto',
    status_rejected: 'Rechazado',
    ai_notes_label: 'Notas de la verificación',
    sat_link: 'Verificar mi RFC directamente en el SAT',
    rfc_required: 'Captura tu RFC antes de subir la CSF.',
    save_success: 'RFC guardado',
    save_error: 'Error al guardar el RFC',
    upload_success: 'Documento recibido y analizado',
    upload_error: 'Error al subir el documento',
    checked_at: 'Última revisión:',
    loading: 'Cargando...',
  },
  en: {
    title: 'Company registration (Tax ID)',
    desc: "Enter your RFC and upload your Constancia de Situación Fiscal (CSF) from Mexico's SAT. An AI cross-checks both as a first filter; SAT has no public API for real-time automated verification, so any doubtful case goes to manual admin review.",
    rfc_label: 'RFC (Tax ID)',
    rfc_placeholder: 'XAXX010101000',
    save_rfc: 'Save RFC',
    csf_label: 'Tax Status Certificate (PDF)',
    csf_upload: 'Upload CSF',
    csf_hint: 'Download it from the SAT portal. Max 5 MB, PDF only.',
    status_pending: 'Pending verification',
    status_ai_verified: 'AI verified',
    status_ai_flagged: 'Under manual review',
    status_admin_verified: 'Verified by Mercasto',
    status_rejected: 'Rejected',
    ai_notes_label: 'Verification notes',
    sat_link: 'Verify my RFC directly with SAT',
    rfc_required: 'Enter your RFC before uploading the CSF.',
    save_success: 'RFC saved',
    save_error: 'Error saving RFC',
    upload_success: 'Document received and analyzed',
    upload_error: 'Error uploading document',
    checked_at: 'Last reviewed:',
    loading: 'Loading...',
  },
  pt: {
    title: 'Registro de empresa (RFC)',
    desc: 'Digite seu RFC e envie sua Constancia de Situación Fiscal (CSF) do SAT. Uma IA compara os dois como primeiro filtro; o SAT não oferece API pública para verificação automática em tempo real, então qualquer caso duvidoso vai para revisão manual de um administrador.',
    rfc_label: 'RFC',
    rfc_placeholder: 'XAXX010101000',
    save_rfc: 'Salvar RFC',
    csf_label: 'Constancia de Situación Fiscal (PDF)',
    csf_upload: 'Enviar CSF',
    csf_hint: 'Baixe no portal do SAT. Máximo 5 MB, formato PDF.',
    status_pending: 'Pendente de verificação',
    status_ai_verified: 'Verificado por IA',
    status_ai_flagged: 'Em revisão manual',
    status_admin_verified: 'Verificado pela Mercasto',
    status_rejected: 'Rejeitado',
    ai_notes_label: 'Notas da verificação',
    sat_link: 'Verificar meu RFC diretamente no SAT',
    rfc_required: 'Digite seu RFC antes de enviar a CSF.',
    save_success: 'RFC salvo',
    save_error: 'Erro ao salvar o RFC',
    upload_success: 'Documento recebido e analisado',
    upload_error: 'Erro ao enviar o documento',
    checked_at: 'Última revisão:',
    loading: 'Carregando...',
  },
  ru: {
    title: 'Регистрация компании (RFC)',
    desc: 'Введите RFC и загрузите Constancia de Situación Fiscal (CSF) из налоговой службы Мексики (SAT). ИИ сверяет оба документа как первичный фильтр; у SAT нет открытого API для автоматической проверки в реальном времени, поэтому спорные случаи передаются администратору.',
    rfc_label: 'RFC',
    rfc_placeholder: 'XAXX010101000',
    save_rfc: 'Сохранить RFC',
    csf_label: 'Constancia de Situación Fiscal (PDF)',
    csf_upload: 'Загрузить CSF',
    csf_hint: 'Скачайте на портале SAT. Максимум 5 МБ, формат PDF.',
    status_pending: 'Ожидает проверки',
    status_ai_verified: 'Проверено ИИ',
    status_ai_flagged: 'На ручной проверке',
    status_admin_verified: 'Подтверждено Mercasto',
    status_rejected: 'Отклонено',
    ai_notes_label: 'Примечания проверки',
    sat_link: 'Проверить RFC напрямую на сайте SAT',
    rfc_required: 'Сначала укажите RFC, затем загрузите CSF.',
    save_success: 'RFC сохранён',
    save_error: 'Ошибка сохранения RFC',
    upload_success: 'Документ получен и проанализирован',
    upload_error: 'Ошибка загрузки документа',
    checked_at: 'Последняя проверка:',
    loading: 'Загрузка...',
  },
  zh: {
    title: '公司注册（RFC税号）',
    desc: '输入您的RFC并上传SAT的税务状况证明（CSF）。AI会先对两者进行交叉核对；SAT没有公开的实时自动验证API，任何存疑的情况都会转交管理员人工审核。',
    rfc_label: 'RFC税号',
    rfc_placeholder: 'XAXX010101000',
    save_rfc: '保存RFC',
    csf_label: '税务状况证明（PDF）',
    csf_upload: '上传CSF',
    csf_hint: '请从SAT官网下载。最大5MB，仅限PDF格式。',
    status_pending: '待验证',
    status_ai_verified: 'AI已验证',
    status_ai_flagged: '人工审核中',
    status_admin_verified: 'Mercasto已验证',
    status_rejected: '已拒绝',
    ai_notes_label: '验证备注',
    sat_link: '直接在SAT网站验证我的RFC',
    rfc_required: '请先填写RFC再上传CSF。',
    save_success: 'RFC已保存',
    save_error: '保存RFC出错',
    upload_success: '文件已收到并分析',
    upload_error: '上传文件出错',
    checked_at: '最近审核：',
    loading: '加载中...',
  },
  ko: {
    title: '회사 등록 (RFC)',
    desc: 'RFC를 입력하고 SAT의 재정 상태 증명서(CSF)를 업로드하세요. AI가 1차 필터로 두 정보를 대조하며, SAT는 실시간 자동 검증용 공개 API를 제공하지 않으므로 의심스러운 경우는 관리자의 수동 검토로 넘어갑니다.',
    rfc_label: 'RFC',
    rfc_placeholder: 'XAXX010101000',
    save_rfc: 'RFC 저장',
    csf_label: '재정 상태 증명서 (PDF)',
    csf_upload: 'CSF 업로드',
    csf_hint: 'SAT 포털에서 다운로드하세요. 최대 5MB, PDF만 가능.',
    status_pending: '검증 대기 중',
    status_ai_verified: 'AI 검증됨',
    status_ai_flagged: '수동 검토 중',
    status_admin_verified: 'Mercasto 인증됨',
    status_rejected: '거부됨',
    ai_notes_label: '검증 메모',
    sat_link: 'SAT에서 직접 RFC 확인하기',
    rfc_required: 'CSF를 업로드하기 전에 RFC를 입력하세요.',
    save_success: 'RFC 저장됨',
    save_error: 'RFC 저장 오류',
    upload_success: '문서가 수신되어 분석되었습니다',
    upload_error: '문서 업로드 오류',
    checked_at: '마지막 검토:',
    loading: '로딩 중...',
  },
  de: {
    title: 'Firmenregistrierung (RFC)',
    desc: 'Geben Sie Ihre RFC ein und laden Sie Ihre Constancia de Situación Fiscal (CSF) des SAT hoch. Eine KI gleicht beides als ersten Filter ab; das SAT bietet keine öffentliche API zur automatischen Echtzeitprüfung, daher werden Zweifelsfälle manuell von einem Administrator geprüft.',
    rfc_label: 'RFC',
    rfc_placeholder: 'XAXX010101000',
    save_rfc: 'RFC speichern',
    csf_label: 'Steuerstatusbescheinigung (PDF)',
    csf_upload: 'CSF hochladen',
    csf_hint: 'Im SAT-Portal herunterladen. Maximal 5 MB, nur PDF.',
    status_pending: 'Prüfung ausstehend',
    status_ai_verified: 'KI-verifiziert',
    status_ai_flagged: 'In manueller Prüfung',
    status_admin_verified: 'Von Mercasto verifiziert',
    status_rejected: 'Abgelehnt',
    ai_notes_label: 'Prüfhinweise',
    sat_link: 'Meine RFC direkt beim SAT prüfen',
    rfc_required: 'Geben Sie Ihre RFC ein, bevor Sie die CSF hochladen.',
    save_success: 'RFC gespeichert',
    save_error: 'Fehler beim Speichern der RFC',
    upload_success: 'Dokument empfangen und analysiert',
    upload_error: 'Fehler beim Hochladen des Dokuments',
    checked_at: 'Letzte Prüfung:',
    loading: 'Wird geladen...',
  },
  it: {
    title: "Registrazione dell'azienda (RFC)",
    desc: "Inserisci il tuo RFC e carica la tua Constancia de Situación Fiscal (CSF) del SAT. Un'IA confronta entrambi come primo filtro; il SAT non offre un'API pubblica per la verifica automatica in tempo reale, quindi ogni caso dubbio passa alla revisione manuale di un amministratore.",
    rfc_label: 'RFC',
    rfc_placeholder: 'XAXX010101000',
    save_rfc: 'Salva RFC',
    csf_label: 'Certificato di Stato Fiscale (PDF)',
    csf_upload: 'Carica CSF',
    csf_hint: 'Scaricalo dal portale SAT. Massimo 5 MB, solo PDF.',
    status_pending: 'In attesa di verifica',
    status_ai_verified: 'Verificato dall\'IA',
    status_ai_flagged: 'In revisione manuale',
    status_admin_verified: 'Verificato da Mercasto',
    status_rejected: 'Rifiutato',
    ai_notes_label: 'Note di verifica',
    sat_link: 'Verifica il mio RFC direttamente sul SAT',
    rfc_required: "Inserisci il tuo RFC prima di caricare la CSF.",
    save_success: 'RFC salvato',
    save_error: 'Errore nel salvataggio dell\'RFC',
    upload_success: 'Documento ricevuto e analizzato',
    upload_error: 'Errore nel caricamento del documento',
    checked_at: 'Ultima revisione:',
    loading: 'Caricamento...',
  },
  ar: {
    title: 'تسجيل الشركة (RFC)',
    desc: 'أدخل رقم RFC الخاص بك وارفع شهادة الوضع الضريبي (CSF) الصادرة عن SAT. يقارن الذكاء الاصطناعي البيانات كفلتر أولي؛ لا تقدم SAT واجهة برمجية عامة للتحقق التلقائي الفوري، لذا تُحال أي حالة مشكوك فيها لمراجعة يدوية من قِبل المسؤول.',
    rfc_label: 'RFC',
    rfc_placeholder: 'XAXX010101000',
    save_rfc: 'حفظ RFC',
    csf_label: 'شهادة الوضع الضريبي (PDF)',
    csf_upload: 'رفع CSF',
    csf_hint: 'حمّلها من بوابة SAT. الحد الأقصى 5 ميجابايت، صيغة PDF فقط.',
    status_pending: 'قيد التحقق',
    status_ai_verified: 'تم التحقق بالذكاء الاصطناعي',
    status_ai_flagged: 'قيد المراجعة اليدوية',
    status_admin_verified: 'تم التحقق من قِبل Mercasto',
    status_rejected: 'مرفوض',
    ai_notes_label: 'ملاحظات التحقق',
    sat_link: 'تحقق من RFC مباشرة عبر SAT',
    rfc_required: 'أدخل رقم RFC قبل رفع CSF.',
    save_success: 'تم حفظ RFC',
    save_error: 'خطأ في حفظ RFC',
    upload_success: 'تم استلام المستند وتحليله',
    upload_error: 'خطأ في رفع المستند',
    checked_at: 'آخر مراجعة:',
    loading: 'جارٍ التحميل...',
  },
  he: {
    title: 'רישום חברה (RFC)',
    desc: 'הזן את ה-RFC שלך והעלה את תעודת המצב הפיסקלי (CSF) מרשות המסים SAT. בינה מלאכותית משווה בין השניים כסינון ראשוני; ל-SAT אין API ציבורי לאימות אוטומטי בזמן אמת, לכן כל מקרה מסופק עובר לבדיקה ידנית של מנהל.',
    rfc_label: 'RFC',
    rfc_placeholder: 'XAXX010101000',
    save_rfc: 'שמור RFC',
    csf_label: 'תעודת מצב פיסקלי (PDF)',
    csf_upload: 'העלה CSF',
    csf_hint: 'הורד מפורטל SAT. מקסימום 5MB, PDF בלבד.',
    status_pending: 'ממתין לאימות',
    status_ai_verified: 'אומת על ידי בינה מלאכותית',
    status_ai_flagged: 'בבדיקה ידנית',
    status_admin_verified: 'מאומת על ידי Mercasto',
    status_rejected: 'נדחה',
    ai_notes_label: 'הערות אימות',
    sat_link: 'אמת את ה-RFC שלי ישירות מול SAT',
    rfc_required: 'הזן את ה-RFC שלך לפני העלאת ה-CSF.',
    save_success: 'RFC נשמר',
    save_error: 'שגיאה בשמירת RFC',
    upload_success: 'המסמך התקבל ונותח',
    upload_error: 'שגיאה בהעלאת המסמך',
    checked_at: 'בדיקה אחרונה:',
    loading: 'טוען...',
  },
  yi: {
    title: 'פירמע רעגיסטראציע (RFC)',
    desc: 'גיט אריין דיין RFC און אַרויפֿלאָד דיין CSF פֿון SAT. אַ קי בעאַמט ביידע ווי אַ ערשטער פֿילטער; SAT האָט קיין עפֿנטלעך API פֿאַר אויטאָמאַטישע באַשטעטיקונג, אַזוי אַז יעדער ספֿקדיקער פֿאַל גייט צו מאַנועלער איבערקוק.',
    rfc_label: 'RFC',
    rfc_placeholder: 'XAXX010101000',
    save_rfc: 'היט אָפּ RFC',
    csf_label: 'CSF (PDF)',
    csf_upload: 'אַרויפֿלאָדן CSF',
    csf_hint: 'אראפלאָד עס פֿון SAT פּאָרטאַל. מאַקסימום 5MB, נאָר PDF.',
    status_pending: 'וואַרט אויף באַשטעטיקונג',
    status_ai_verified: 'באַשטעטיקט דורך KI',
    status_ai_flagged: 'מאַנועלער איבערקוק',
    status_admin_verified: 'באַשטעטיקט דורך Mercasto',
    status_rejected: 'אָפּגעווארפן',
    ai_notes_label: 'באַמערקונגען',
    sat_link: 'באַשטעטיקן מיין RFC דירעקט מיט SAT',
    rfc_required: 'גיט אריין דיין RFC איידער איר לאָדט אַרויף די CSF.',
    save_success: 'RFC אָפּגעהיט',
    save_error: 'טעות ביים אָפּהיטן RFC',
    upload_success: 'דאָקומענט באקומען און אַנאַליזירט',
    upload_error: 'טעות ביים אַרויפֿלאָדן',
    checked_at: 'לעצטע איבערקוק:',
    loading: 'לאָדט...',
  },
  ja: {
    title: '会社登録（RFC）',
    desc: 'RFCを入力し、SATの税務状況証明書（CSF）をアップロードしてください。AIが最初のフィルターとして両方を照合します。SATにはリアルタイム自動検証用の公開APIがないため、疑わしい場合は管理者による手動確認に回されます。',
    rfc_label: 'RFC',
    rfc_placeholder: 'XAXX010101000',
    save_rfc: 'RFCを保存',
    csf_label: '税務状況証明書（PDF）',
    csf_upload: 'CSFをアップロード',
    csf_hint: 'SATポータルからダウンロードしてください。最大5MB、PDF形式のみ。',
    status_pending: '確認待ち',
    status_ai_verified: 'AI確認済み',
    status_ai_flagged: '手動確認中',
    status_admin_verified: 'Mercasto確認済み',
    status_rejected: '却下',
    ai_notes_label: '確認メモ',
    sat_link: 'SATで直接RFCを確認する',
    rfc_required: 'CSFをアップロードする前にRFCを入力してください。',
    save_success: 'RFCを保存しました',
    save_error: 'RFCの保存エラー',
    upload_success: '書類を受信し分析しました',
    upload_error: '書類のアップロードエラー',
    checked_at: '最終確認:',
    loading: '読み込み中...',
  },
  fr: {
    title: "Enregistrement de l'entreprise (RFC)",
    desc: "Saisissez votre RFC et téléversez votre Constancia de Situación Fiscal (CSF) du SAT. Une IA compare les deux comme premier filtre ; le SAT ne propose pas d'API publique pour une vérification automatique en temps réel, donc tout cas douteux passe en révision manuelle par un administrateur.",
    rfc_label: 'RFC',
    rfc_placeholder: 'XAXX010101000',
    save_rfc: 'Enregistrer le RFC',
    csf_label: 'Attestation de Situation Fiscale (PDF)',
    csf_upload: 'Téléverser la CSF',
    csf_hint: 'Téléchargez-la depuis le portail du SAT. Maximum 5 Mo, PDF uniquement.',
    status_pending: 'En attente de vérification',
    status_ai_verified: 'Vérifié par IA',
    status_ai_flagged: 'En révision manuelle',
    status_admin_verified: 'Vérifié par Mercasto',
    status_rejected: 'Rejeté',
    ai_notes_label: 'Notes de vérification',
    sat_link: 'Vérifier mon RFC directement sur le SAT',
    rfc_required: 'Saisissez votre RFC avant de téléverser la CSF.',
    save_success: 'RFC enregistré',
    save_error: "Erreur lors de l'enregistrement du RFC",
    upload_success: 'Document reçu et analysé',
    upload_error: 'Erreur lors du téléversement du document',
    checked_at: 'Dernière révision :',
    loading: 'Chargement...',
  },
};

function normalizeLang(lang) {
  return localTranslations[lang] ? lang : 'es';
}

const STATUS_STYLE = {
  pending: { icon: ShieldQuestion, cls: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300' },
  ai_verified: { icon: ShieldCheck, cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' },
  ai_flagged: { icon: ShieldAlert, cls: 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400' },
  admin_verified: { icon: ShieldCheck, cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' },
  rejected: { icon: ShieldAlert, cls: 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400' },
};

export default function CompanyRfcScreen({ lang, token }) {
  const tr = localTranslations[normalizeLang(lang)];
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [rfc, setRfc] = useState('');
  const [savingRfc, setSavingRfc] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState(null);

  const loadProfile = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/user/business-profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
        setRfc(data.business_rfc || '');
      }
    } catch (e) {
      console.error('Error loading business profile', e);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { loadProfile(); }, [loadProfile]);

  const showToast = (type, text) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 4000);
  };

  const saveRfc = async () => {
    setSavingRfc(true);
    try {
      const res = await fetch(`${API_URL}/user/business-profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ business_rfc: rfc }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast('success', tr.save_success);
        setProfile(data);
      } else {
        showToast('error', data.message || tr.save_error);
      }
    } catch (e) {
      showToast('error', tr.save_error);
    } finally {
      setSavingRfc(false);
    }
  };

  const uploadCsf = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!rfc) {
      showToast('error', tr.rfc_required);
      e.target.value = '';
      return;
    }
    setUploading(true);
    const formData = new FormData();
    formData.append('csf', file);
    try {
      const res = await fetch(`${API_URL}/user/business-profile/csf`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        showToast('success', tr.upload_success);
        loadProfile();
      } else {
        showToast('error', data.message || tr.upload_error);
      }
    } catch (err) {
      showToast('error', tr.upload_error);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-400 text-sm">{tr.loading}</div>;
  }

  const status = profile?.business_rfc_status || 'pending';
  const StatusIcon = STATUS_STYLE[status]?.icon || ShieldQuestion;

  return (
    <div className="space-y-6">
      {toast && (
        <div className={`fixed top-5 right-5 z-50 px-5 py-3 rounded-2xl shadow-xl text-sm font-semibold ${toast.type === 'success' ? 'bg-[#84CC16] text-white' : 'bg-red-500 text-white'}`}>
          {toast.text}
        </div>
      )}

      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#84CC16]/10 flex items-center justify-center shrink-0">
          <Building2 className="w-5 h-5 text-[#65A30D]" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">{tr.title}</h2>
          <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">{tr.desc}</p>
        </div>
      </div>

      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[12px] font-bold ${STATUS_STYLE[status]?.cls}`}>
        <StatusIcon className="w-3.5 h-3.5" />
        {tr[`status_${status}`] || status}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">{tr.rfc_label}</label>
          <div className="flex gap-2">
            <input
              value={rfc}
              onChange={(e) => setRfc(e.target.value.toUpperCase())}
              maxLength={13}
              placeholder={tr.rfc_placeholder}
              className="flex-1 uppercase px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-[#84CC16]/30 focus:border-[#84CC16]"
            />
            <button
              onClick={saveRfc}
              disabled={savingRfc || !rfc}
              className="btn-sm bg-[#0F172A] hover:bg-black text-white disabled:opacity-50 shrink-0"
            >
              {savingRfc ? <Loader2 className="w-4 h-4 animate-spin" /> : tr.save_rfc}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">{tr.csf_label}</label>
          <label className={`flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-sm text-slate-600 dark:text-slate-300 cursor-pointer hover:border-[#84CC16] hover:text-[#65A30D] transition-colors ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
            {tr.csf_upload}
            <input type="file" accept=".pdf,application/pdf" onChange={uploadCsf} className="hidden" />
          </label>
          <p className="text-[11px] text-slate-400 mt-1">{tr.csf_hint}</p>
        </div>
      </div>

      {profile?.business_rfc_ai_notes && (
        <div className="max-w-2xl p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1.5"><FileCheck2 className="w-3.5 h-3.5" /> {tr.ai_notes_label}</p>
          <p className="text-sm text-slate-700 dark:text-slate-300">{profile.business_rfc_ai_notes}</p>
          {profile.business_rfc_checked_at && (
            <p className="text-[11px] text-slate-400 mt-2">{tr.checked_at} {new Date(profile.business_rfc_checked_at).toLocaleString()}</p>
          )}
        </div>
      )}

      <a
        href="https://www.sat.gob.mx/aplicacion/operacion/17419/verifica-tu-rfc"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#65A30D] hover:text-[#84CC16]"
      >
        {tr.sat_link} <ExternalLink className="w-3.5 h-3.5" />
      </a>
    </div>
  );
}
