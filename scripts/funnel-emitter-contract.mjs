#!/usr/bin/env node
// Single source of truth for the "email registration is emitted exactly once"
// contract: the email/password sign_up comes from the registration fetch
// interceptor in src/utils/metaCapiBridge.js, so no caller may emit a second
// `events.registered({ method: 'email' })`.
//
// Why this is a module and not a regex in two places:
//  - The first version of this guard matched only the single-quoted, single-spaced
//    spelling (`method: 'email'`). A semantically identical
//    `events.registered({ method: "email" })` escaped it, in both the unit
//    contract and the shell gate, so the guard did not enforce the invariant it
//    stated.
//  - The matcher therefore parses the call's argument list and compares a
//    normalized form (quote style, whitespace and key quoting are irrelevant),
//    and both the test and the gate use this one implementation so they cannot
//    drift apart again.
//
// Usage: node scripts/funnel-emitter-contract.mjs <file> [...]
//   exit 0 — no duplicate email emitter
//   exit 1 — a duplicate email emitter was found
//   exit 2 — usage error or unreadable input (fail closed)

import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

export const REGISTRATION_CALL = 'events.registered';

/**
 * After {@link normalizeSource}, `method` and its value are compared with any
 * quote style, any whitespace and optional key quoting. The boundaries reject
 * `contact_method: 'email'`, `submethod: 'email'` and `methodology: 'email'`.
 */
export const EMAIL_METHOD_PATTERN = /(?:^|[^A-Za-z0-9_$])'?\s*method\s*'?\s*:\s*'?\s*email\s*'?(?![A-Za-z0-9_$])/i;

/** Canonical quotes and collapsed whitespace, so equivalent spellings compare equal. */
export function normalizeSource(source) {
  return String(source ?? '')
    .replace(/[`"']/g, "'")
    .replace(/\s+/g, ' ');
}

/**
 * Extracts the argument text of every `<callName>( ... )` invocation, using
 * balanced parentheses so a matched window can never bleed into the next
 * statement and produce a false positive.
 *
 * @returns {Array<{index: number, args: string}>}
 */
export function extractCallArguments(source, callName = REGISTRATION_CALL) {
  const text = String(source ?? '');
  const calls = [];
  let from = 0;

  for (;;) {
    const start = text.indexOf(callName, from);
    if (start === -1) break;

    let open = start + callName.length;
    while (open < text.length && /\s/.test(text[open])) open += 1; // allow `events.registered (`
    if (text[open] !== '(') {
      from = start + callName.length;
      continue;
    }

    let depth = 0;
    let end = -1;
    for (let i = open; i < text.length; i += 1) {
      if (text[i] === '(') depth += 1;
      else if (text[i] === ')') {
        depth -= 1;
        if (depth === 0) {
          end = i;
          break;
        }
      }
    }
    if (end === -1) break; // unbalanced tail: nothing more can be parsed

    calls.push({ index: start, args: text.slice(open + 1, end) });
    from = end + 1;
  }

  return calls;
}

/**
 * @returns {Array<{index: number, excerpt: string}>} duplicate email emitters
 */
export function findEmailRegistrationEmitters(source, callName = REGISTRATION_CALL) {
  return extractCallArguments(source, callName)
    .filter(({ args }) => EMAIL_METHOD_PATTERN.test(normalizeSource(args)))
    .map(({ index, args }) => ({ index, excerpt: normalizeSource(args).trim().slice(0, 160) }));
}

/** Total number of registration call sites (the single emitter in App.jsx counts). */
export function countRegistrationEmitters(source, callName = REGISTRATION_CALL) {
  return extractCallArguments(source, callName).length;
}

function main(argv) {
  const files = argv.slice(2);
  if (files.length === 0) {
    console.error('usage: node scripts/funnel-emitter-contract.mjs <file> [...]');
    return 2;
  }

  let offenders = 0;
  for (const file of files) {
    let source;
    try {
      source = readFileSync(file, 'utf8');
    } catch (error) {
      // Fail closed: an unreadable asserted file must never read as "no match".
      console.error(`funnel emitter contract: cannot read ${file}: ${error.message}`);
      return 2;
    }

    for (const { index, excerpt } of findEmailRegistrationEmitters(source)) {
      offenders += 1;
      console.error(`funnel emitter contract: ${file}: duplicate email registration emitter at offset ${index}: ${excerpt}`);
    }
  }

  if (offenders > 0) {
    console.error('Email registration is already emitted by the registration fetch interceptor and must not be duplicated.');
    return 1;
  }

  console.log(`funnel emitter contract: no duplicate email registration emitter in ${files.join(', ')}`);
  return 0;
}

const invokedDirectly = process.argv[1]
  && import.meta.url === pathToFileURL(process.argv[1]).href;

if (invokedDirectly) {
  process.exitCode = main(process.argv);
}
