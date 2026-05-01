# Mercasto P1 Rollback Decision Tree

## Purpose
Operational decision tree for rollback or hotfix after a Mercasto production change.

## Immediate rollback triggers
- Homepage returns 500 or blank screen.
- Login/register/account is broken.
- Seller can edit/delete another users listing.
- Paused/deleted listings are publicly visible.
- Dangerous uploads can execute.
- Payment success redirect activates paid features without verified server confirmation.
- Production exposes stack traces, SQL errors, secrets, or config.

## Preferred rollback method
For a bad commit already pushed to main, prefer git revert so history stays linear.

```bash
cd /var/www/mercasto
git log --oneline -5
git revert <BAD_COMMIT>
git push origin main
```

## Completion criteria
Rollback is complete only when core pages, login, seller account, public visibility, uploads, payments, and P1 smoke checks pass.
