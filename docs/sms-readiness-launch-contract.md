# SMS launch readiness contract

Mercasto supports two explicit launch modes for SMS: `enabled` or `disabled`. The current public-launch decision is **disabled/deferred** until a production provider and real Mexico-number delivery evidence are available. Phone authentication and phone verification controls must stay hidden while the public provider endpoint reports `sms: false`.

## Current status

- `verify:quick`: production health and runtime smoke gate.
- `verify:launch`: strict launch gate. Requires the committed SMS launch-mode contract.
- `scripts/sms-launch-mode-smoke.sh`: proves that enabled mode has a ready provider, or disabled mode has a disabled public provider plus hidden UI and fail-closed endpoints.
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

Expected for the current deferred launch:

```bash
cd /var/www/mercasto || exit 1
SMS_LAUNCH_MODE=disabled npm run smoke:sms-launch-mode
npm run verify:launch
```

Expected pass condition:

```text
sms_launch_mode=disabled
public_sms_provider_enabled=false
SMS launch mode smoke OK
```

Enabling SMS later requires changing the committed mode, setting production secrets, proving `sms: true`, running the strict provider readiness smoke and completing real-device delivery tests before exposing the controls.

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

## Deferred follow-up before enabling SMS

- Select final provider and commercial plan for Mexico.
- Set production secrets in the server environment.
- Confirm Laravel config mapping names.
- Keep endpoint-level rate limits, cooldowns and max-attempt controls.
- Test delivery and verification on a real Mexico phone number.
- Change the committed launch mode to `enabled` only after those checks pass.
