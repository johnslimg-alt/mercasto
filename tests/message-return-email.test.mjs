import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const read = path => fs.readFileSync(path, 'utf8');
const mailLocale = read('backend/app/Support/MailLocale.php');
const mailCopy = read('backend/app/Support/MailTranslations.php');
const mailClass = read('backend/app/Mail/NewMessageMail.php');
const mailView = read('backend/resources/views/emails/new_message.blade.php');
const chat = read('backend/app/Http/Controllers/Api/ChatController.php');
const profile = read('backend/app/Http/Controllers/Api/ProfileController.php');
const app = read('src/App.jsx');
const dashboard = read('src/components/screens/UserDashboard.jsx');

const active = ['es', 'en', 'pt', 'fr', 'zh', 'ko', 'de', 'it', 'ar', 'ru', 'ja'];

test('mail locale contract matches the 11 active languages and archives he/yi', () => {
  for (const lang of active) assert.match(mailLocale, new RegExp(`'${lang}'`));
  assert.match(mailLocale, /in_array\(\$primary, \['he', 'yi'\], true\)/);
  assert.doesNotMatch(mailCopy, /^\s*'he' =>/m);
  assert.doesNotMatch(mailCopy, /^\s*'yi' =>/m);
  assert.equal((mailCopy.match(/'message_subject'\s*=>/g) || []).length, 11);
});

test('new-message email is generic and links only to the target conversation', () => {
  assert.match(mailClass, /public int \$conversationId/);
  assert.match(mailView, /\/mensajes\?conversation=\{\{ \$conversationId \}\}/);
  for (const blocked of ['messageBody', 'buyerName', 'senderName', 'adTitle', '$message->', '$buyer', '$sender']) {
    assert.equal(mailView.includes(blocked), false, `mail view leaked ${blocked}`);
  }
});

test('chat queues email only when a new unread cycle begins and respects preferences', () => {
  assert.match(chat, /if \(! \$existingId\) \{\s*\$this->queueNewMessageEmail/);
  assert.match(chat, /\$preferences\['email_alerts'\] \?\? true/);
  assert.match(chat, /\$preferences\['email_new_message'\] \?\? true/);
  assert.match(chat, /Mail::to\(\$receiver->email\)->queue\(new NewMessageMail\(\$conversationId, \$locale\)\)/);
});

test('notification preferences persist locale and expose a dedicated new-message email toggle', () => {
  assert.match(profile, /'locale' => 'nullable\|string\|max:16'/);
  assert.match(profile, /MailLocale::normalize/);
  assert.match(app, /body: JSON\.stringify\(\{ \.\.\.notificationsForm, locale: lang \}\)/);
  assert.match(app, /syncNotificationLocale/);
  assert.match(dashboard, /data-testid="email-new-message-toggle"/);
  assert.ok(dashboard.includes('disabled={!notificationsForm.email_alerts}'));
});
test('frontend exposes the dedicated new-message email label in every active language', () => {
  for (const lang of active) {
    const source = read(`src/constants/translations/${lang}.js`);
    assert.match(source, /"email_new_message"\s*:/, `missing email_new_message in ${lang}`);
  }
});

