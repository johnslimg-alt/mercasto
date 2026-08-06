import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const report = readFileSync('docs/ops/POSTGRES_PGVECTOR_AUDIT_2026-08-06.md', 'utf8');
const runbook = readFileSync('docs/runbooks/POSTGRES_BACKUP_AUDIT.md', 'utf8');

assert(report.includes('Audit mode: read-only production review.'));
assert(report.includes('did not execute migrations, `ANALYZE`, `VACUUM`, DDL'));
assert(report.includes('Broad paid/unrestricted scale: database NO-GO until true off-host backup #500 is complete.'));
assert(report.includes('`real_estate_developments`'));
assert(report.includes('144,593'));
assert(report.includes('pg_stat_statements'));

for (const issue of ['#500', '#501', '#502', '#504', '#505']) {
  assert(report.includes(issue), `DBA report must reference ${issue}`);
}

assert(runbook.includes("category = 'motor'"));
assert(!runbook.includes("category = 'autos'"));
assert(!runbook.includes("'[0,0,0]'::vector"));
assert(runbook.includes('BEGIN READ ONLY'));
assert(runbook.includes('findmnt -T postgres-backups'));
assert(runbook.includes('$DISPOSABLE_DATABASE_URL'));
assert(runbook.includes('Never create/drop the audit target inside the live production database cluster'));

console.log('DBA readiness contract OK');
