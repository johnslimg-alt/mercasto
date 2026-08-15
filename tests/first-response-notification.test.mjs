import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const chat = fs.readFileSync('backend/app/Http/Controllers/Api/ChatController.php', 'utf8');
const listener = fs.readFileSync('backend/app/Listeners/DispatchNativePushFromNotification.php', 'utf8');
const app = fs.readFileSync('src/App.jsx', 'utf8');
const sw = fs.readFileSync('public/sw.js', 'utf8');
const chatScreen = fs.readFileSync('src/components/screens/ChatScreen.jsx', 'utf8');
const notificationsScreen = fs.readFileSync('src/components/screens/NotificationsScreen.jsx', 'utf8');

test('message delivery creates one actionable unread notification per conversation', () => {
  assert.match(chat, /where\('type', 'message'\)/);
  assert.match(chat, /where\('link', \$link\)/);
  assert.match(chat, /replaces_unread/);
  assert.match(chat, /new NewNotification\(\$receiverId, \$notification\)/);
  assert.match(chat, /return '\/mensajes\?conversation=' \. \$conversationId/);
});

test('opening a conversation clears its message notification', () => {
  assert.match(chat, /where\('link', \$this->conversationLink\(\(int\) \$conversation->id\)\)/);
  assert.match(chat, /update\(\['is_read' => true, 'updated_at' => now\(\)\]\)/);
});

test('in-app notification fans out to native and browser push with a deep link', () => {
  assert.match(listener, /SendMobilePushNotification::dispatch/);
  assert.match(listener, /SendHuaweiPushNotification::dispatch/);
  assert.match(listener, /SendWebPushNotification::dispatch/);
  assert.match(listener, /\$data\['url'\] = \(string\) \$notification\['link'\]/);
});

test('mobile notification entry opens the notifications route', () => {
  assert.match(app, /user \? navigate\('\/notificaciones'\)/);
  assert.doesNotMatch(app, /setDashboardTab\('notifications'\)/);
  assert.match(app, /!incoming\.replaces_unread/);
});


test('read actions synchronize the global unread indicator immediately', () => {
  assert.match(app, /mercasto:notifications-changed/);
  assert.match(app, /\{unreadCount > 0 && <span/);
  assert.match(chatScreen, /window\.dispatchEvent\(new Event\('mercasto:notifications-changed'\)\)/);
  assert.match(notificationsScreen, /window\.dispatchEvent\(new Event\('mercasto:notifications-changed'\)\)/);
});

test('service worker keeps notification deep links on the Mercasto origin', () => {
  assert.match(sw, /new URL\(requested, self\.location\.origin\)/);
  assert.match(sw, /resolved\.origin === self\.location\.origin/);
  assert.match(sw, /self\.clients\.openWindow\(target\)/);
});
