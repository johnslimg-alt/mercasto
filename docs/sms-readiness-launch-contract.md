# SMS launch readiness contract

Mercasto `verify:quick` may pass while SMS remains intentionally not ready. Final public launch must use `verify:launch`, which runs the same smoke chain with `REQUIRE_SMS_READY=1`.

## Current status

- `verify:quick`: production health and runtime smoke gate.
- `verify:launch`: strict launch gate. Fails when SMS OTP provider is not configured.
- `scripts/sms-readiness-smoke.sh`: checks provider configuration presence from Laravel runtime config without printing secrets.

## Default provider candidate

Use Twilio Verify as the default implementation candidate unless a better Mexico-specific provider is selected during commercial setup.

Rationale:

- Twilio Verify supports user verification through SMS and additional channels such as WhatsApp, Voice, Email, TOTP, Push and Silent Network Auth.
- The Verify API is served over HTTPS.
- Twilio recommends API keys for production authentication.
- One Verification Service can send multiple verification tokens, so Mercasto should use a single production service SID instead of creating services per user.

## Required production configuration presence

Do not commit values. Only set them in production secrets/environment.

Minimum strict readiness variables expected by the current Laravel config contract:

- `TWILIO_ACCOUNT_SID` or equivalent account identifier mapped to `services.twilio.sid`.
- `TWILIO_AUTH_TOKEN` or API key secret mapped to `services.twilio.token`.
- `TWILIO_FROM` or equivalent sender/Verify service value mapped to `services.twilio.from`.

Preferred future contract for Twilio Verify:

- `TWILIO_VERIFY_SERVICE_SID`.
- `TWILIO_API_KEY`.
- `TWILIO_API_KEY_SECRET`.
- Optional channel policy: SMS first, WhatsApp fallback only after product/legal approval.

## Launch gate behavior

Expected before final launch:

```bash
cd /var/www/mercasto || exit 1
REQUIRE_SMS_READY=1 npm run smoke:sms-readiness
npm run verify:launch
```

Expected pass condition:

```text
sms_provider=ready
sms readiness smoke OK
```

Expected block condition:

```text
sms_provider=not_ready
SMS OTP provider is not configured.
```

## Security requirements

- Never print SMS provider secrets in logs.
- Never commit env values.
- Check only presence/non-placeholder values.
- Keep phone verification endpoints unavailable or non-launching while `sms_provider=not_ready`.
- Rate-limit OTP send/check endpoints before public launch.
- Add abuse controls before enabling SMS at scale: per-IP, per-phone, per-account, cooldowns, and max attempts.

## Implementation notes

Twilio Verify basic workflow:

1. Create one production Verification Service.
2. Send a verification token to a phone number through the chosen channel.
3. Check the submitted verification code against the Verification Service.
4. Mark the user phone as verified only after provider-confirmed verification status.

No business effect should rely only on frontend success state.

## Open launch blockers

- Select final provider and commercial plan for Mexico.
- Set production secrets in the server environment.
- Confirm Laravel config mapping names.
- Add endpoint-level rate limits for OTP send/check.
- Run `verify:launch` and keep the output in the launch record.
