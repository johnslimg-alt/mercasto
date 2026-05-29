# Live server gate SSH auth troubleshooting

This runbook supports issue #282. It is intentionally evidence-focused and must not include private keys, tokens, passwords, or repository secret values.

## Current symptom

The GitHub Actions live server gate reaches the production host, but SSH authentication fails before `/var/www/mercasto` checks can run:

```text
Permission denied (publickey,password).
```

This means `verify_quick` has not yet produced production application smoke evidence.

## Safe evidence to compare

Diagnostic PR #288 captured the public fingerprint derived from the Actions private key:

```text
SHA256:I+KFS74lO3ohSI5X3uAXHLlxk7TZyqO1ujLUOheZUPM
```

A public fingerprint is safe to record. Private key contents are not safe to print, paste, commit, or attach.

## Trusted-shell checks

Run these only on the production server or another trusted admin shell.

### 1. Compare the server public key fingerprint

```bash
ssh-keygen -lf /root/.ssh/mercasto_actions_live_gate_ed25519.pub
```

Expected fingerprint:

```text
SHA256:I+KFS74lO3ohSI5X3uAXHLlxk7TZyqO1ujLUOheZUPM
```

If the fingerprint differs, the repository Actions private key does not match the server public key that is expected for the live gate.

### 2. Verify the public key is authorized for root

```bash
grep -F "$(cat /root/.ssh/mercasto_actions_live_gate_ed25519.pub)" /root/.ssh/authorized_keys >/dev/null \
  && echo "authorized_keys has live gate public key"
```

If the key is missing, append only the `.pub` file content. Do not paste private key material into shell history, logs, issues, or chat.

```bash
cat /root/.ssh/mercasto_actions_live_gate_ed25519.pub >> /root/.ssh/authorized_keys
chmod 700 /root/.ssh
chmod 600 /root/.ssh/authorized_keys
```

### 3. Verify sshd policy

```bash
sshd -T | grep -E 'permitrootlogin|pubkeyauthentication|authorizedkeysfile|passwordauthentication'
```

The live gate requires root public-key login to be allowed by the effective sshd configuration and by the key listed in `authorized_keys`.

## Re-set repository secret from trusted shell

If the server-side public key is correct but Actions uses a different fingerprint, re-set the matching private key using stdin redirection only:

```bash
gh secret set MERCASTO_SSH_PRIVATE_KEY --repo johnslimg-alt/mercasto < /root/.ssh/mercasto_actions_live_gate_ed25519
```

Do not pass secret values as command-line arguments.

## Re-run evidence gate

After fixing SSH authorization, re-run the failed Production checks jobs or trigger a fresh same-repo PR run. The issue is not complete until the live gate captures real server output from `/var/www/mercasto` and `verify_quick` completes without secret disclosure.
