export const PUSH_NOTIFICATION_LANGUAGES = Object.freeze(['es', 'en', 'pt', 'fr', 'zh', 'ko', 'de', 'it', 'ar', 'ru', 'ja']);

const COPY = Object.freeze({
  es: {
    notReady: 'Las notificaciones aún no están listas.', permissionDenied: 'Permiso de notificaciones denegado.', unsupported: 'Tu navegador no admite notificaciones push.',
    enabled: 'Notificaciones activadas.', saveError: 'No se pudo guardar la suscripción.', enableError: 'No se pudieron activar las notificaciones.',
    disabled: 'Notificaciones desactivadas.', disableError: 'No se pudieron desactivar las notificaciones.', testSent: 'Notificación de prueba enviada ({count}).', testError: 'No se pudo enviar la notificación de prueba.',
    blockedTitle: 'Notificaciones bloqueadas', blockedDesc: 'Permite las notificaciones en la configuración de tu navegador.',
    enabledTitle: 'Notificaciones activadas', enabledDesc: 'Recibirás alertas de nuevos mensajes y actualizaciones.', sendTest: 'Enviar prueba',
    enableTitle: 'Activa las notificaciones', enableDesc: 'Recibe alertas de nuevos mensajes, ofertas y actualizaciones importantes.', enabling: 'Activando...'
  },
  en: {
    notReady: 'Notifications are not ready yet.', permissionDenied: 'Notification permission was denied.', unsupported: 'Your browser does not support push notifications.',
    enabled: 'Notifications enabled.', saveError: 'The subscription could not be saved.', enableError: 'Notifications could not be enabled.',
    disabled: 'Notifications disabled.', disableError: 'Notifications could not be disabled.', testSent: 'Test notification sent ({count}).', testError: 'The test notification could not be sent.',
    blockedTitle: 'Notifications blocked', blockedDesc: 'Allow notifications in your browser settings.',
    enabledTitle: 'Notifications enabled', enabledDesc: 'You will receive alerts about new messages and updates.', sendTest: 'Send test',
    enableTitle: 'Enable notifications', enableDesc: 'Receive alerts about new messages, offers, and important updates.', enabling: 'Enabling...'
  },
  pt: {
    notReady: 'As notificações ainda não estão prontas.', permissionDenied: 'A permissão para notificações foi negada.', unsupported: 'Seu navegador não oferece suporte a notificações push.',
    enabled: 'Notificações ativadas.', saveError: 'Não foi possível salvar a assinatura.', enableError: 'Não foi possível ativar as notificações.',
    disabled: 'Notificações desativadas.', disableError: 'Não foi possível desativar as notificações.', testSent: 'Notificação de teste enviada ({count}).', testError: 'Não foi possível enviar a notificação de teste.',
    blockedTitle: 'Notificações bloqueadas', blockedDesc: 'Permita notificações nas configurações do navegador.',
    enabledTitle: 'Notificações ativadas', enabledDesc: 'Você receberá alertas sobre novas mensagens e atualizações.', sendTest: 'Enviar teste',
    enableTitle: 'Ative as notificações', enableDesc: 'Receba alertas sobre novas mensagens, ofertas e atualizações importantes.', enabling: 'Ativando...'
  },
  fr: {
    notReady: 'Les notifications ne sont pas encore prêtes.', permissionDenied: 'L’autorisation des notifications a été refusée.', unsupported: 'Votre navigateur ne prend pas en charge les notifications push.',
    enabled: 'Notifications activées.', saveError: 'Impossible d’enregistrer l’abonnement.', enableError: 'Impossible d’activer les notifications.',
    disabled: 'Notifications désactivées.', disableError: 'Impossible de désactiver les notifications.', testSent: 'Notification de test envoyée ({count}).', testError: 'Impossible d’envoyer la notification de test.',
    blockedTitle: 'Notifications bloquées', blockedDesc: 'Autorisez les notifications dans les paramètres de votre navigateur.',
    enabledTitle: 'Notifications activées', enabledDesc: 'Vous recevrez des alertes pour les nouveaux messages et les mises à jour.', sendTest: 'Envoyer un test',
    enableTitle: 'Activez les notifications', enableDesc: 'Recevez des alertes pour les nouveaux messages, les offres et les mises à jour importantes.', enabling: 'Activation...'
  },
  zh: {
    notReady: '通知功能尚未准备就绪。', permissionDenied: '通知权限已被拒绝。', unsupported: '你的浏览器不支持推送通知。',
    enabled: '通知已开启。', saveError: '无法保存推送订阅。', enableError: '无法开启通知。',
    disabled: '通知已关闭。', disableError: '无法关闭通知。', testSent: '测试通知已发送（{count}）。', testError: '无法发送测试通知。',
    blockedTitle: '通知已被阻止', blockedDesc: '请在浏览器设置中允许通知。',
    enabledTitle: '通知已开启', enabledDesc: '你将收到新消息和更新提醒。', sendTest: '发送测试',
    enableTitle: '开启通知', enableDesc: '接收新消息、优惠和重要更新提醒。', enabling: '正在开启...'
  },
  ko: {
    notReady: '알림 기능이 아직 준비되지 않았습니다.', permissionDenied: '알림 권한이 거부되었습니다.', unsupported: '이 브라우저는 푸시 알림을 지원하지 않습니다.',
    enabled: '알림이 활성화되었습니다.', saveError: '푸시 구독을 저장할 수 없습니다.', enableError: '알림을 활성화할 수 없습니다.',
    disabled: '알림이 비활성화되었습니다.', disableError: '알림을 비활성화할 수 없습니다.', testSent: '테스트 알림을 보냈습니다({count}).', testError: '테스트 알림을 보낼 수 없습니다.',
    blockedTitle: '알림이 차단됨', blockedDesc: '브라우저 설정에서 알림을 허용하세요.',
    enabledTitle: '알림 활성화됨', enabledDesc: '새 메시지와 업데이트 알림을 받습니다.', sendTest: '테스트 보내기',
    enableTitle: '알림 활성화', enableDesc: '새 메시지, 혜택 및 중요한 업데이트 알림을 받으세요.', enabling: '활성화 중...'
  },
  de: {
    notReady: 'Benachrichtigungen sind noch nicht bereit.', permissionDenied: 'Die Benachrichtigungsberechtigung wurde verweigert.', unsupported: 'Ihr Browser unterstützt keine Push-Benachrichtigungen.',
    enabled: 'Benachrichtigungen aktiviert.', saveError: 'Das Push-Abonnement konnte nicht gespeichert werden.', enableError: 'Benachrichtigungen konnten nicht aktiviert werden.',
    disabled: 'Benachrichtigungen deaktiviert.', disableError: 'Benachrichtigungen konnten nicht deaktiviert werden.', testSent: 'Testbenachrichtigung gesendet ({count}).', testError: 'Die Testbenachrichtigung konnte nicht gesendet werden.',
    blockedTitle: 'Benachrichtigungen blockiert', blockedDesc: 'Erlauben Sie Benachrichtigungen in den Browsereinstellungen.',
    enabledTitle: 'Benachrichtigungen aktiviert', enabledDesc: 'Sie erhalten Hinweise zu neuen Nachrichten und Aktualisierungen.', sendTest: 'Test senden',
    enableTitle: 'Benachrichtigungen aktivieren', enableDesc: 'Erhalten Sie Hinweise zu neuen Nachrichten, Angeboten und wichtigen Aktualisierungen.', enabling: 'Wird aktiviert...'
  },
  it: {
    notReady: 'Le notifiche non sono ancora pronte.', permissionDenied: 'Il permesso per le notifiche è stato negato.', unsupported: 'Il browser non supporta le notifiche push.',
    enabled: 'Notifiche attivate.', saveError: 'Impossibile salvare l’iscrizione push.', enableError: 'Impossibile attivare le notifiche.',
    disabled: 'Notifiche disattivate.', disableError: 'Impossibile disattivare le notifiche.', testSent: 'Notifica di prova inviata ({count}).', testError: 'Impossibile inviare la notifica di prova.',
    blockedTitle: 'Notifiche bloccate', blockedDesc: 'Consenti le notifiche nelle impostazioni del browser.',
    enabledTitle: 'Notifiche attivate', enabledDesc: 'Riceverai avvisi su nuovi messaggi e aggiornamenti.', sendTest: 'Invia prova',
    enableTitle: 'Attiva le notifiche', enableDesc: 'Ricevi avvisi su nuovi messaggi, offerte e aggiornamenti importanti.', enabling: 'Attivazione...'
  },
  ar: {
    notReady: 'الإشعارات غير جاهزة بعد.', permissionDenied: 'تم رفض إذن الإشعارات.', unsupported: 'متصفحك لا يدعم الإشعارات الفورية.',
    enabled: 'تم تفعيل الإشعارات.', saveError: 'تعذر حفظ اشتراك الإشعارات.', enableError: 'تعذر تفعيل الإشعارات.',
    disabled: 'تم تعطيل الإشعارات.', disableError: 'تعذر تعطيل الإشعارات.', testSent: 'تم إرسال إشعار تجريبي ({count}).', testError: 'تعذر إرسال الإشعار التجريبي.',
    blockedTitle: 'الإشعارات محظورة', blockedDesc: 'اسمح بالإشعارات من إعدادات المتصفح.',
    enabledTitle: 'الإشعارات مفعلة', enabledDesc: 'ستتلقى تنبيهات بالرسائل الجديدة والتحديثات.', sendTest: 'إرسال اختبار',
    enableTitle: 'تفعيل الإشعارات', enableDesc: 'تلقَّ تنبيهات بالرسائل الجديدة والعروض والتحديثات المهمة.', enabling: 'جارٍ التفعيل...'
  },
  ru: {
    notReady: 'Уведомления пока не готовы.', permissionDenied: 'Разрешение на уведомления отклонено.', unsupported: 'Ваш браузер не поддерживает push-уведомления.',
    enabled: 'Уведомления включены.', saveError: 'Не удалось сохранить push-подписку.', enableError: 'Не удалось включить уведомления.',
    disabled: 'Уведомления отключены.', disableError: 'Не удалось отключить уведомления.', testSent: 'Тестовое уведомление отправлено ({count}).', testError: 'Не удалось отправить тестовое уведомление.',
    blockedTitle: 'Уведомления заблокированы', blockedDesc: 'Разрешите уведомления в настройках браузера.',
    enabledTitle: 'Уведомления включены', enabledDesc: 'Вы будете получать уведомления о новых сообщениях и обновлениях.', sendTest: 'Отправить тест',
    enableTitle: 'Включить уведомления', enableDesc: 'Получайте уведомления о новых сообщениях, предложениях и важных обновлениях.', enabling: 'Включаем...'
  },
  ja: {
    notReady: '通知機能はまだ準備できていません。', permissionDenied: '通知の許可が拒否されました。', unsupported: 'このブラウザはプッシュ通知に対応していません。',
    enabled: '通知を有効にしました。', saveError: 'プッシュ購読を保存できませんでした。', enableError: '通知を有効にできませんでした。',
    disabled: '通知を無効にしました。', disableError: '通知を無効にできませんでした。', testSent: 'テスト通知を送信しました（{count}）。', testError: 'テスト通知を送信できませんでした。',
    blockedTitle: '通知がブロックされています', blockedDesc: 'ブラウザの設定で通知を許可してください。',
    enabledTitle: '通知が有効です', enabledDesc: '新しいメッセージや更新のお知らせを受け取ります。', sendTest: 'テスト送信',
    enableTitle: '通知を有効にする', enableDesc: '新しいメッセージ、オファー、重要な更新のお知らせを受け取ります。', enabling: '有効化中...'
  },
});

export function getPushNotificationCopy(language = 'es') {
  const lang = String(language || 'es').toLowerCase().split('-')[0];
  return COPY[lang] || COPY.es;
}

export { COPY as PUSH_NOTIFICATION_COPY };
