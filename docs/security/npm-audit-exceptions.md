# npm audit exceptions

Mercasto treats `npm audit` findings as a policy gate rather than running `npm audit fix --force` blindly.

## React Router exact pin

Mercasto is a browser-only React SPA built with Vite and declarative `Routes`; it does not import React Router server, RSC, server-action, static-handler, or server-renderer APIs.

`react-router-dom` is pinned to `7.18.3`. The 7.18.3 update was reviewed after the previous 7.18.2 security pin: the current npm audit policy reports no React Router advisory for this runtime, and the source guard still fails if RSC/server APIs appear. Keeping an exact pin ensures future router upgrades require an explicit security review instead of silently floating through a semver range.

## GHSA-4x5r-pxfx-6jf8 — Babel 7

The remaining low-severity finding is in transitive Babel 7 build tooling used by Sentry and ESLint plugins. Exploitation requires processing attacker-controlled source files or source maps on the build host. Mercasto CI builds only reviewed repository sources and does not compile user uploads.

There is no compatible patched Babel 7 release in the registry. The policy allows only this exact advisory and will fail on any additional Babel advisory. Remove the exception when upstream dependencies support a patched line.

## Patched transitive dependency

`brace-expansion` is forced to `5.0.9`, which closes the reported exponential expansion and memory-exhaustion advisories.
