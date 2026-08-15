import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { SUPPORTED_LANGUAGES } from '../src/utils/translations.js';

const REQUIRED_KEYS = [
  'account_action_email_confirm_error',
  'account_action_login_to_confirm_email',
  'account_action_google_auth_error',
  'account_action_profile_load_error',
  'account_action_social_auth_error',
  'account_action_server_unexpected',
  'account_action_invalid_credentials',
  'account_action_request_error',
  'account_action_invalid_two_factor',
  'account_action_sms_sent',
  'account_action_sms_unavailable',
  'account_action_sms_invalid',
  'account_action_recovery_email_sent',
  'account_action_recovery_email_error',
  'account_action_password_reset_error',
  'account_action_email_request_error',
  'account_action_notifications_saved',
  'account_action_notifications_error',
  'account_action_delete_confirm',
  'account_action_delete_success',
];

async function translationsFor(lang) {
  return (await import(`../src/constants/translations/${lang}.js`)).default;
}

test('account action copy covers exactly the 11 active languages', async () => {
  assert.equal(SUPPORTED_LANGUAGES.includes('he'), false);
  assert.equal(SUPPORTED_LANGUAGES.includes('yi'), false);
  assert.equal(SUPPORTED_LANGUAGES.length, 11);

  for (const lang of SUPPORTED_LANGUAGES) {
    const t = await translationsFor(lang);
    for (const key of REQUIRED_KEYS) {
      assert.ok(String(t[key] || '').trim(), `${lang}.${key}`);
    }
  }
});

test('non-Spanish account actions have localized copies instead of Spanish fallback text', async () => {
  const spanish = await translationsFor('es');
  for (const lang of SUPPORTED_LANGUAGES.filter(language => language !== 'es')) {
    const t = await translationsFor(lang);
    for (const key of [
      'account_action_invalid_credentials',
      'account_action_invalid_two_factor',
              'account_action_notifications_saved',
      'account_action_delete_confirm',
    ]) {
      assert.notEqual(t[key], spanish[key], `${lang}.${key}`);
    }
  }
});

test('Mexico Spanish account actions follow closing-only punctuation policy', async () => {
  const t = await translationsFor('es');
  const serialized = JSON.stringify(Object.fromEntries(REQUIRED_KEYS.map(key => [key, t[key]])));
  assert.equal(serialized.includes(String.fromCharCode(0xbf)), false);
  assert.equal(serialized.includes(String.fromCharCode(0xa1)), false);
});

test('App localizes auth/account actions and does not expose former Spanish fallbacks', () => {
  const source = fs.readFileSync('src/App.jsx', 'utf8');
  assert.match(source, /t\.account_action_invalid_credentials/);
  assert.match(source, /localizeServerMessage\(lang, serverMessage, fallbackMessage\)/);
  assert.match(source, /t\.account_action_invalid_two_factor/);
  assert.match(source, /t\.email_verification_sent/);
  assert.match(source, /t\.account_action_notifications_saved/);
  assert.match(source, /window\.confirm\(t\.account_action_delete_confirm\)/);
  assert.equal(source.includes('getAccountActionCopy'), false);

  for (const formerFallback of [
    'Correo actualizado con éxito.',
    'Error al confirmar el correo.',
    'Debes iniciar sesión primero para confirmar tu correo.',
    'Error de autenticación con Google',
    'Error al cargar el perfil. Inicia sesión de nuevo.',
    'Error de autenticación social. Inténtalo de nuevo.',
    'Error de servidor: respuesta inesperada.',
    'Credenciales incorrectas',
    'Código 2FA inválido.',
    'SMS enviado',
    'Error al enviar SMS',
    'Código SMS inválido',
    'Error al actualizar el perfil',
    'Las contraseñas nuevas no coinciden.',
    'Contraseña actualizada exitosamente.',
    'Se ha enviado un enlace de confirmación a tu nuevo correo.',
    'Preferencias de notificación guardadas.',
    'Cuenta eliminada exitosamente.',
  ]) {
    assert.equal(source.includes(formerFallback), false, formerFallback);
  }
});

test('auth/account request payload contracts stay stable', () => {
  const source = fs.readFileSync('src/App.jsx', 'utf8');

  assert.match(source, /fetch\(`\$\{API_URL\}\$\{endpoint\}`,[\s\S]*?body: JSON\.stringify\(data\)/);
  assert.match(source, /fetch\(`\$\{API_URL\}\/login\/two-factor`,[\s\S]*?challenge_token: twoFactorChallengeToken,[\s\S]*?code: data\.code/);
  assert.match(source, /fetch\(`\$\{API_URL\}\/auth\/phone\/request`,[\s\S]*?body: JSON\.stringify\(\{ phone_number: phone \}\)/);
  assert.match(source, /fetch\(`\$\{API_URL\}\/auth\/phone\/verify`,[\s\S]*?phone_number: authPhone,[\s\S]*?code: formData\.get\('code'\),[\s\S]*?pendingPhoneRegistrationConsent/);
  assert.match(source, /fetch\(`\$\{API_URL\}\/user\/password`,[\s\S]*?current_password: passwordForm\.current_password,[\s\S]*?new_password: passwordForm\.new_password/);
  assert.match(source, /fetch\(`\$\{API_URL\}\/user\/email\/request`,[\s\S]*?body: JSON\.stringify\(emailForm\)/);
  assert.match(source, /fetch\(`\$\{API_URL\}\/user\/notifications`,[\s\S]*?body: JSON\.stringify\(\{ \.\.\.notificationsForm, locale: lang \}\)/);
  assert.match(source, /fetch\(`\$\{API_URL\}\/user`, \{[\s\S]*?method: 'DELETE'/);
});
