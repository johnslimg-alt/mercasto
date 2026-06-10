# Account launch gate

This document is the manual P0 launch gate for Mercasto account readiness. It stays framework-neutral because no browser E2E runner is currently present in the repository.

## Required checks

| ID | Check | Pass condition | Status | Evidence |
| --- | --- | --- | --- | --- |
| ACC-001 | Registration page | `/register` loads cleanly. |  |  |
| ACC-002 | Registration success | A new test user reaches the expected account flow. |  |  |
| ACC-003 | Registration validation | Invalid input shows a safe validation message. |  |  |
| ACC-004 | Login page | `/login` loads cleanly. |  |  |
| ACC-005 | Login success | A valid user reaches `/account` or `/account/listings`. |  |  |
| ACC-006 | Login rejection | Invalid input is rejected safely. |  |  |
| ACC-007 | Google sign-in | Works, or is clearly out of launch scope. |  |  |
| ACC-008 | Logout | User returns to guest state. |  |  |
| ACC-009 | Password recovery | Works, or is clearly out of launch scope. |  |  |
| ACC-010 | Two-step verification | Works, or is clearly out of launch scope. |  |  |
| ACC-011 | Account removal | Works safely, or is clearly out of launch scope. |  |  |
| ACC-012 | Guest `/account` access | Guest is redirected or blocked. |  |  |
| ACC-013 | Guest `/account/listings` access | Guest is redirected or blocked. |  |  |
| ACC-014 | Seller account isolation | Seller sees only own listings and account data. |  |  |
| ACC-015 | Cross-seller action attempt | Server denies the action safely. |  |  |

## Launch blockers

Production launch is blocked if registration, login, logout, protected account routing, seller account isolation, or safe account error handling fails.

If Google sign-in, password recovery, two-step verification, or account removal appears in the UI, the matching flow must pass. If it is not part of launch scope, record that explicitly before launch.

## Automation migration

When a browser E2E runner is introduced, convert this gate into the first account E2E suite: registration, login, protected account route as guest, logout, and seller account isolation.
