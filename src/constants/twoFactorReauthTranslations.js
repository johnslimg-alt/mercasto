const resources = {
  es: {
    twofa_reauth_title: 'Confirma tu identidad',
    twofa_reauth_desc: 'Introduce tu contraseña o un código actual de autenticación / recuperación.',
    twofa_reauth_code: 'Código de autenticación o recuperación',
    twofa_reauth_invalid: 'Verifica tu identidad para continuar.',
    twofa_disable_confirm_action: 'Confirmar desactivación',
  },
  en: {
    twofa_reauth_title: 'Confirm your identity',
    twofa_reauth_desc: 'Enter your password or a current authenticator / recovery code.',
    twofa_reauth_code: 'Authenticator or recovery code',
    twofa_reauth_invalid: 'Verify your identity to continue.',
    twofa_disable_confirm_action: 'Confirm disable',
  },
  pt: {
    twofa_reauth_title: 'Confirme sua identidade',
    twofa_reauth_desc: 'Digite sua senha ou um código atual do autenticador / recuperação.',
    twofa_reauth_code: 'Código do autenticador ou de recuperação',
    twofa_reauth_invalid: 'Verifique sua identidade para continuar.',
    twofa_disable_confirm_action: 'Confirmar desativação',
  },
  fr: {
    twofa_reauth_title: 'Confirmez votre identité',
    twofa_reauth_desc: 'Saisissez votre mot de passe ou un code actuel d’authentification / récupération.',
    twofa_reauth_code: 'Code d’authentification ou de récupération',
    twofa_reauth_invalid: 'Vérifiez votre identité pour continuer.',
    twofa_disable_confirm_action: 'Confirmer la désactivation',
  },
  de: {
    twofa_reauth_title: 'Identität bestätigen',
    twofa_reauth_desc: 'Gib dein Passwort oder einen aktuellen Authenticator- / Wiederherstellungscode ein.',
    twofa_reauth_code: 'Authenticator- oder Wiederherstellungscode',
    twofa_reauth_invalid: 'Bestätige deine Identität, um fortzufahren.',
    twofa_disable_confirm_action: 'Deaktivierung bestätigen',
  },
  it: {
    twofa_reauth_title: 'Conferma la tua identità',
    twofa_reauth_desc: 'Inserisci la password o un codice attuale dell’autenticatore / di recupero.',
    twofa_reauth_code: 'Codice autenticatore o di recupero',
    twofa_reauth_invalid: 'Verifica la tua identità per continuare.',
    twofa_disable_confirm_action: 'Conferma disattivazione',
  },
  zh: {
    twofa_reauth_title: '确认你的身份',
    twofa_reauth_desc: '输入密码，或当前的验证器 / 恢复代码。',
    twofa_reauth_code: '验证器或恢复代码',
    twofa_reauth_invalid: '请验证身份后继续。',
    twofa_disable_confirm_action: '确认停用',
  },
  ko: {
    twofa_reauth_title: '본인 확인',
    twofa_reauth_desc: '비밀번호 또는 현재 인증 앱 / 복구 코드를 입력하세요.',
    twofa_reauth_code: '인증 앱 또는 복구 코드',
    twofa_reauth_invalid: '계속하려면 본인 확인이 필요합니다.',
    twofa_disable_confirm_action: '비활성화 확인',
  },
  ja: {
    twofa_reauth_title: '本人確認',
    twofa_reauth_desc: 'パスワード、または現在の認証コード / リカバリーコードを入力してください。',
    twofa_reauth_code: '認証コードまたはリカバリーコード',
    twofa_reauth_invalid: '続行するには本人確認が必要です。',
    twofa_disable_confirm_action: '無効化を確認',
  },
  ar: {
    twofa_reauth_title: 'تأكيد هويتك',
    twofa_reauth_desc: 'أدخل كلمة المرور أو رمز المصادقة / الاسترداد الحالي.',
    twofa_reauth_code: 'رمز المصادقة أو الاسترداد',
    twofa_reauth_invalid: 'تحقق من هويتك للمتابعة.',
    twofa_disable_confirm_action: 'تأكيد التعطيل',
  },
  ru: {
    twofa_reauth_title: 'Подтвердите личность',
    twofa_reauth_desc: 'Введите пароль или текущий код аутентификатора / восстановления.',
    twofa_reauth_code: 'Код аутентификатора или восстановления',
    twofa_reauth_invalid: 'Подтвердите личность, чтобы продолжить.',
    twofa_disable_confirm_action: 'Подтвердить отключение',
  },
};

export function getTwoFactorReauthTranslations(language = 'es') {
  return resources[language] || resources.es;
}

export const twoFactorReauthLanguages = Object.freeze(Object.keys(resources));
