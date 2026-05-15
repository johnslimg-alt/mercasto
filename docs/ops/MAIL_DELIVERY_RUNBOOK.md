# Mail Delivery Runbook

Last verified: 2026-05-15.

## Current Production State

- `APP_DEBUG=false`.
- `MAIL_MAILER=array`.
- The previous `MAIL_MAILER=log` setting was disabled because it wrote full email bodies to `storage/logs/laravel.log`.
- The pre-change log was backed up on the server before truncation.

## Why This Matters

`log` mail transport does not send user emails. In production it is also unsafe because password reset, verification, welcome, and notification email content can be written to Laravel logs.

`array` mail transport also does not send user emails, but it avoids leaking email content into logs while real SMTP or API credentials are not configured.

## Required Fix Before Real Email Traffic

Set one real transactional provider in `backend/.env` without exposing secrets in chat or Git:

```env
MAIL_MAILER=smtp
MAIL_HOST=<provider-host>
MAIL_PORT=587
MAIL_USERNAME=<provider-username>
MAIL_PASSWORD=<provider-password>
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS=noreply@mercasto.com
MAIL_FROM_NAME=Mercasto
```

After updating secrets on the server:

```bash
cd /var/www/mercasto
docker exec mercasto_backend_container php artisan optimize:clear
docker exec mercasto_backend_container php artisan config:cache
```

## Verification

```bash
docker exec mercasto_backend_container php artisan tinker --execute='echo config("mail.default").PHP_EOL;'
curl -fsSL https://mercasto.com/api/categories | head -c 200
```

Do not switch back to `MAIL_MAILER=log` in production.
