# Mercasto Security Access Rotation Runbook

Owner: Security Lead Agent + DevOps Lead Agent

Purpose: safely replace any exposed deploy credential and verify access without storing secrets in the repository.

## Rule

Never commit private keys, tokens, `.env` files, database passwords, webhook secrets, or API keys to GitHub.

If a private key, token, or password was pasted into any chat, issue, PR, log, screenshot, or documentation, treat it as compromised and rotate it.

## Rotation sequence

### 1. Inventory access points

Check where deployment credentials may exist:

- VPS root user authorized keys
- deploy user authorized keys
- GitHub Actions secrets
- local developer machines
- CI/CD scripts
- external automation tools
- server backup scripts

### 2. Create a new key

Generate a new deploy key outside the repository.

Recommended pattern:

```bash
ssh-keygen -t ed25519 -C "mercasto-deploy-$(date +%Y%m%d)" -f ~/.ssh/mercasto_deploy_new
```

Store the private key only in the intended secret manager or local secure storage.

### 3. Install the new public key

Append only the new public key to the intended user on the server.

```bash
mkdir -p ~/.ssh
chmod 700 ~/.ssh
cat mercasto_deploy_new.pub >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

### 4. Verify new access

From the machine or automation runner that will deploy:

```bash
ssh -i ~/.ssh/mercasto_deploy_new user@server 'hostname && whoami && date'
```

### 5. Remove the old public key

Open `authorized_keys` and remove the public key line that matches the old exposed key.

```bash
nano ~/.ssh/authorized_keys
```

Then verify permissions:

```bash
chmod 700 ~/.ssh
chmod 600 ~/.ssh/authorized_keys
```

### 6. Replace GitHub Actions secret

Replace the deploy private key secret in GitHub Actions settings. Do not paste the key into issues, PRs, or commits.

### 7. Verify old key is revoked

Try connecting with the old key. Expected result: permission denied.

```bash
ssh -i old_key user@server 'echo should-not-work'
```

### 8. Review SSH login history

```bash
last -a | head -50
journalctl -u ssh --since "14 days ago" --no-pager || true
grep -i "accepted\|failed" /var/log/auth.log | tail -300 || true
```

Look for:

- unknown IP addresses;
- unexpected root logins;
- logins outside expected deployment windows;
- repeated failed attempts;
- new users or unexpected sudo activity.

### 9. Check server users and keys

```bash
cat /etc/passwd | cut -d: -f1
find /root /home -name authorized_keys -type f -print
```

### 10. Document the result

Post a summary in the security issue without secrets:

```markdown
# Access Rotation Result

Date:
Operator:

## Rotated
- [ ] VPS authorized_keys
- [ ] GitHub Actions deploy secret
- [ ] Local deployment key

## Verified
- [ ] New key works
- [ ] Old key fails
- [ ] Login history reviewed
- [ ] No unknown access found / findings listed

## Follow-up
-
```

## Production guardrail

Do not deploy new runtime changes until credential rotation is complete if any active deploy key was exposed.
