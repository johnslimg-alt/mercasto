#!/usr/bin/env bash
set -euo pipefail

MIGRATION='backend/database/migrations/2026_09_09_194000_adopt_gamification_achievement_schema.php'
MODEL='backend/app/Models/Achievement.php'
SERVICE='backend/app/Services/GamificationService.php'
TEST='backend/tests/Feature/GamificationSchemaAdoptionTest.php'

for file in "$MIGRATION" "$MODEL" "$SERVICE" "$TEST"; do
  test -f "$file"
done

for token in slug name description rarity requirement_value is_active sort_order; do
  grep -qF "'$token'" "$MIGRATION"
done
grep -qF 'canonicalAchievements' "$MIGRATION"
python3 - <<'PYCODE'
from pathlib import Path
text = Path('backend/database/migrations/2026_09_09_194000_adopt_gamification_achievement_schema.php').read_text()
convert = text.index('ALTER TABLE achievements ALTER COLUMN rarity TYPE')
normalize = text.index("DB::table('achievements')->orderBy('id')->get(['id', 'rarity'])")
if convert >= normalize:
    raise SystemExit('rarity type conversion must precede canonical string normalization')
PYCODE
grep -qF "Achievement::where('is_active', true)" "$SERVICE"
grep -qF 'test_fresh_migrations_expose_the_runtime_achievement_schema' "$TEST"
grep -qF 'test_fresh_schema_runs_the_full_achievement_progress_loop' "$TEST"

echo 'gamification schema contract gate OK'
