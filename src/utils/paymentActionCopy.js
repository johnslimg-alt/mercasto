import { normalizeLanguage } from './translations.js';

const PAYMENT_ACTION_COPY = Object.freeze({
  es: {
    payWithBalance: 'Pagar {amount} con tu saldo? (Saldo actual: {balance})\n\nCancelar para pagar con tarjeta/OXXO en su lugar.',
    balancePaid: 'Pago realizado con tu saldo!',
    selectActiveAd: 'Selecciona un anuncio activo para promocionar.',
    invalidCreditsAmount: 'Ingresa un monto entre {min} y {max}.',
    promotionConfirm: 'Deseas usar {credits} créditos de tu saldo para "{type}" este anuncio? (Saldo actual: {balance})',
    promotionSuccess: 'Anuncio promocionado con éxito!',
    promotionError: 'No se pudo promocionar el anuncio.',
    choosePackage: 'Elige un paquete para promocionar este anuncio.',
  },
  en: {
    payWithBalance: 'Pay {amount} from your balance? (Current balance: {balance})\n\nCancel to pay by card/OXXO instead.',
    balancePaid: 'Payment completed from your balance!',
    selectActiveAd: 'Select an active listing to promote.',
    invalidCreditsAmount: 'Enter an amount between {min} and {max}.',
    promotionConfirm: 'Use {credits} credits from your balance to apply "{type}" to this listing? (Current balance: {balance})',
    promotionSuccess: 'Listing promoted successfully!',
    promotionError: 'The listing could not be promoted.',
    choosePackage: 'Choose a package to promote this listing.',
  },
  pt: {
    payWithBalance: 'Pagar {amount} com seu saldo? (Saldo atual: {balance})\n\nCancele para pagar com cartão/OXXO.',
    balancePaid: 'Pagamento concluído com seu saldo!',
    selectActiveAd: 'Selecione um anúncio ativo para promover.',
    invalidCreditsAmount: 'Informe um valor entre {min} e {max}.',
    promotionConfirm: 'Usar {credits} créditos do seu saldo para aplicar "{type}" a este anúncio? (Saldo atual: {balance})',
    promotionSuccess: 'Anúncio promovido com sucesso!',
    promotionError: 'Não foi possível promover o anúncio.',
    choosePackage: 'Escolha um pacote para promover este anúncio.',
  },
  fr: {
    payWithBalance: 'Payer {amount} avec votre solde? (Solde actuel : {balance})\n\nAnnulez pour payer par carte/OXXO.',
    balancePaid: 'Paiement effectué avec votre solde!',
    selectActiveAd: 'Sélectionnez une annonce active à promouvoir.',
    invalidCreditsAmount: 'Saisissez un montant entre {min} et {max}.',
    promotionConfirm: 'Utiliser {credits} crédits de votre solde pour appliquer « {type} » à cette annonce? (Solde actuel : {balance})',
    promotionSuccess: 'Annonce promue avec succès!',
    promotionError: 'Impossible de promouvoir l’annonce.',
    choosePackage: 'Choisissez un forfait pour promouvoir cette annonce.',
  },
  zh: {
    payWithBalance: '使用余额支付 {amount}?（当前余额：{balance}）\n\n取消可改用银行卡/OXXO 支付。',
    balancePaid: '已使用余额完成支付!',
    selectActiveAd: '请选择一个有效广告进行推广。',
    invalidCreditsAmount: '请输入 {min} 到 {max} 之间的金额。',
    promotionConfirm: '使用余额中的 {credits} 积分为此广告应用“{type}”?（当前余额：{balance}）',
    promotionSuccess: '广告推广成功!',
    promotionError: '无法推广该广告。',
    choosePackage: '请选择一个套餐来推广此广告。',
  },
  ko: {
    payWithBalance: '잔액으로 {amount}을(를) 결제할까요? (현재 잔액: {balance})\n\n취소하면 카드/OXXO로 결제할 수 있습니다.',
    balancePaid: '잔액으로 결제가 완료되었습니다!',
    selectActiveAd: '홍보할 활성 광고를 선택하세요.',
    invalidCreditsAmount: '{min}에서 {max} 사이의 금액을 입력하세요.',
    promotionConfirm: '잔액의 {credits} 크레딧을 사용해 이 광고에 "{type}"을(를) 적용할까요? (현재 잔액: {balance})',
    promotionSuccess: '광고가 성공적으로 홍보되었습니다!',
    promotionError: '광고를 홍보할 수 없습니다.',
    choosePackage: '이 광고를 홍보할 패키지를 선택하세요.',
  },
  de: {
    payWithBalance: '{amount} mit deinem Guthaben bezahlen? (Aktuelles Guthaben: {balance})\n\nAbbrechen, um stattdessen per Karte/OXXO zu zahlen.',
    balancePaid: 'Zahlung mit deinem Guthaben abgeschlossen!',
    selectActiveAd: 'Wähle eine aktive Anzeige zum Bewerben aus.',
    invalidCreditsAmount: 'Gib einen Betrag zwischen {min} und {max} ein.',
    promotionConfirm: '{credits} Guthabenpunkte verwenden, um „{type}“ auf diese Anzeige anzuwenden? (Aktuelles Guthaben: {balance})',
    promotionSuccess: 'Anzeige erfolgreich beworben!',
    promotionError: 'Die Anzeige konnte nicht beworben werden.',
    choosePackage: 'Wähle ein Paket, um diese Anzeige zu bewerben.',
  },
  it: {
    payWithBalance: 'Pagare {amount} con il saldo? (Saldo attuale: {balance})\n\nAnnulla per pagare invece con carta/OXXO.',
    balancePaid: 'Pagamento completato con il saldo!',
    selectActiveAd: 'Seleziona un annuncio attivo da promuovere.',
    invalidCreditsAmount: 'Inserisci un importo tra {min} e {max}.',
    promotionConfirm: 'Usare {credits} crediti del saldo per applicare “{type}” a questo annuncio? (Saldo attuale: {balance})',
    promotionSuccess: 'Annuncio promosso con successo!',
    promotionError: 'Non è stato possibile promuovere l’annuncio.',
    choosePackage: 'Scegli un pacchetto per promuovere questo annuncio.',
  },
  ar: {
    payWithBalance: 'الدفع بقيمة {amount} من رصيدك? (الرصيد الحالي: {balance})\n\nألغِ للدفع بالبطاقة/OXXO بدلاً من ذلك.',
    balancePaid: 'تم الدفع من رصيدك بنجاح!',
    selectActiveAd: 'اختر إعلانًا نشطًا للترويج.',
    invalidCreditsAmount: 'أدخل مبلغًا بين {min} و{max}.',
    promotionConfirm: 'استخدام {credits} رصيدًا لتطبيق "{type}" على هذا الإعلان? (الرصيد الحالي: {balance})',
    promotionSuccess: 'تم ترويج الإعلان بنجاح!',
    promotionError: 'تعذر ترويج الإعلان.',
    choosePackage: 'اختر باقة لترويج هذا الإعلان.',
  },
  ru: {
    payWithBalance: 'Оплатить {amount} с баланса? (Текущий баланс: {balance})\n\nНажмите «Отмена», чтобы вместо этого оплатить картой или через OXXO.',
    balancePaid: 'Оплата с баланса выполнена!',
    selectActiveAd: 'Выберите активное объявление для продвижения.',
    invalidCreditsAmount: 'Введите сумму от {min} до {max}.',
    promotionConfirm: 'Использовать {credits} кредитов с баланса для «{type}» этого объявления? (Текущий баланс: {balance})',
    promotionSuccess: 'Объявление успешно продвинуто!',
    promotionError: 'Не удалось продвинуть объявление.',
    choosePackage: 'Выберите пакет для продвижения этого объявления.',
  },
  ja: {
    payWithBalance: '残高から {amount} を支払いますか?（現在の残高: {balance}）\n\nキャンセルすると、カード/OXXOで支払えます。',
    balancePaid: '残高からの支払いが完了しました!',
    selectActiveAd: 'プロモーションする有効な広告を選択してください。',
    invalidCreditsAmount: '{min}〜{max}の金額を入力してください。',
    promotionConfirm: '残高から {credits} クレジットを使って、この広告に「{type}」を適用しますか?（現在の残高: {balance}）',
    promotionSuccess: '広告のプロモーションが完了しました!',
    promotionError: '広告をプロモーションできませんでした。',
    choosePackage: 'この広告をプロモーションするパッケージを選択してください。',
  },
});

export const PAYMENT_ACTION_LANGUAGES = Object.freeze(Object.keys(PAYMENT_ACTION_COPY));

export function getPaymentActionCopy(language = 'es') {
  return PAYMENT_ACTION_COPY[normalizeLanguage(language)] || PAYMENT_ACTION_COPY.es;
}

export function formatPaymentActionCopy(language, key, values = {}) {
  const template = getPaymentActionCopy(language)[key] || '';
  return template.replace(/\{([a-zA-Z0-9_]+)\}/g, (match, token) => (
    Object.prototype.hasOwnProperty.call(values, token) ? String(values[token]) : match
  ));
}
