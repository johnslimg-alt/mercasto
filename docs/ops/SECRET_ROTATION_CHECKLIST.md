# Mercasto Secret Rotation Checklist

Purpose: document safe handling and rotation of deploy secrets after emergency recovery.

## Why this exists

Any private key or token that was pasted into a chat, ticket, document, screenshot, or log should be treated as exposed.

Do not reuse exposed credentials for production deploys.

## Secrets in scope

Review and rotate credentials used for:

- GitHub Actions deploy access;
- VPS login access;
- GitHub deploy keys;
- API provider keys;
- Sentry tokens;
- Pusher/Reverb credentials;
- database passwords if they were ever pasted into a shared place;
- object storage credentials if added later.

## Immediate rule

Do not paste private keys into chats or issues.

Use GitHub repository secrets or the provider's secure secret store.

## Recommended safe process

1. Create a new deploy key or deploy user credential.
2. Add the new value to GitHub Actions secrets.
3. Run `Deploy Secret Presence Check` to verify required secrets exist without printing values.
4. Run a manual deploy test with the new credential.
5. Remove the old exposed credential from the server's authorized keys or provider console.
6. Confirm the old credential no longer works.
7. Update the deploy runbook with the active secret names, not the secret values.

## GitHub Actions secret names currently expected

The manual frontend deploy workflow expects:

- `SERVER_HOST`
- `SSH_KEY`

Use an IPv4 value for `SERVER_HOST` if IPv6 routing fails.

## Safe secret presence check

Use the manual workflow:

`Deploy Secret Presence Check`

It verifies:

- `SERVER_HOST` exists;
- `SSH_KEY` exists;
- `SERVER_HOST` is formatted as IPv4 during stabilization.

It does not print secret values, connect to the server, or deploy production.

## Do not store

Never commit or document actual values for:

- private SSH keys;
- database passwords;
- API keys;
- payment credentials;
- cloud provider tokens;
- session or app encryption keys.

## Verification

After rotation:

- `Deploy Secret Presence Check` passes;
- manual frontend deploy works;
- old exposed credential has been revoked;
- Actions logs do not print secret values;
- production site still opens on iOS Safari and Chrome;
- API category route returns JSON.

## Follow-up

Create an ops issue for each credential family that needs rotation. Close each issue only after the old credential is revoked and the new one is verified.
