# Lockfile fidelity for server-resident gates (rule E5)

Status: active
Enforced by: `scripts/check-lockfile-fidelity.mjs`, called from `scripts/server-operator.sh`
Canonical rule: company verification doc `E5-environment-fidelity.md` (D-018, extended by D-027)

## The failure this prevents

`scripts/server-operator.sh` runs `npm` inside the long-lived host checkout
`/var/www/mercasto`. That command is the required check **"Live server gate
verify_quick"** on every pull request. The host `node_modules` had silently drifted
from `package-lock.json`:

| package | installed | locked |
| --- | --- | --- |
| react-router-dom | 7.18.2 | 7.18.3 |
| react-router | 7.18.2 | 7.18.3 |
| lucide-react | 1.35.0 | 1.43.0 |

24 of ~317 top-level packages were drifted. A build from that tree emitted
`vendor-react-CCnO2pY9.js`; CI and production emit `vendor-react-BYe4vt_Y.js`.

So a required check standing in front of every pull request was validating a
dependency set that **neither CI nor production builds from**. Green — and about
the wrong artifact. This is the same class of defect as a gate that asserts
unreachable source text: the check passes, and the thing it claims to guarantee
is not what was tested.

## Why `npm ls` is not sufficient

`npm ls` reports problems relative to the **specifiers in `package.json`**, not
against the lockfile. Measured on a tree drifted to exactly the versions above,
with `package.json` as it stands:

```
$ npm ls lucide-react --depth=0
mercasto@1.1.0
└── lucide-react@1.35.0
[exit: 0]        # locked version is 1.43.0; the specifier is ^1.8.0, so npm is happy
```

`react-router-dom` *is* caught, because its specifier is pinned exactly
(`"7.18.3"`). A drift check built on `npm ls` alone therefore detects an arbitrary
subset of drift — precisely the range-satisfying kind that occurred here would
pass. Lockfile fidelity must be compared against `package-lock.json` exactly.

## Rule

1. Every npm-running path in `scripts/server-operator.sh` calls
   `require_lockfile_fidelity` before its first `npm` command.
2. The check compares the **installed** tree against the **exact** versions in
   `package-lock.json` and fails loudly, naming each drifted package with its
   expected and installed version.
3. **"Cannot determine" is a failure.** A missing or unreadable lockfile, an
   unsupported lockfile version, an absent or empty `node_modules`, or a package
   whose version cannot be read all exit non-zero. A gate that cannot tell whether
   the tree is faithful must not report success.
4. The check is **read-only**. It never installs and never touches the network —
   it runs on the production host inside a read-only operation. Repairing the tree
   is a human decision or an explicit operation.
5. Results produced from an unfaithful tree are **not evidence**. The message says
   so, and names the single remediation: `cd /var/www/mercasto && npm ci`.

Platform-gated optional dependencies (`fsevents` is `os: ["darwin"]`; the
rolldown / lightningcss / `@tailwindcss/oxide` / `@sentry/cli` per-arch binaries)
are legitimately absent on a linux-x64 host; their absence is the expected result
of a correct `npm ci` and is not drift. An optional package that **is** installed
is still compared exactly, and any **non-optional** absence is a failure.

## Cost

~70 ms for 317 packages: it reads `package-lock.json` once and one
`package.json` per installed package. No network, no npm process, no install.
