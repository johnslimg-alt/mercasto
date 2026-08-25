from pathlib import Path

operator_path = Path('scripts/server-operator.sh')
operator = operator_path.read_text()
old = """    if is_production_checkout; then
      sudo -n git fetch origin
      sudo -n git reset --hard origin/main
      sudo -n git clean -fd -e runners/data1 -e runners/data2 -e runners/data3 -e runners/.env
    else
      git fetch origin main --prune
      git reset --hard origin/main
      git clean -fd -e runners/data1 -e runners/data2 -e runners/data3 -e runners/.env
    fi
"""
new = """    if is_production_checkout; then
      sudo -n git fetch origin
      sudo -n git reset --hard origin/main
      sudo -n git switch -C main origin/main
      sudo -n git clean -fd -e runners/data1 -e runners/data2 -e runners/data3 -e runners/.env
    else
      git fetch origin main --prune
      git reset --hard origin/main
      git switch -C main origin/main
      git clean -fd -e runners/data1 -e runners/data2 -e runners/data3 -e runners/.env
    fi
"""
if operator.count(old) != 1:
    raise SystemExit(f'expected exactly one deploy sync block, found {operator.count(old)}')
operator_path.write_text(operator.replace(old, new, 1))

test_path = Path('scripts/server-operator-deploy-cache.test.mjs')
test_text = test_path.read_text()
old_assert = "  assert.match(deploy, /sudo -n git reset --hard origin\\/main/);\n  assert.match(deploy, /sudo -n git clean -fd -e runners\\/data1 -e runners\\/data2 -e runners\\/data3 -e runners\\/\\.env/);\n"
new_assert = "  assert.match(deploy, /sudo -n git reset --hard origin\\/main/);\n  assert.match(deploy, /sudo -n git switch -C main origin\\/main/);\n  assert.match(deploy, /sudo -n git clean -fd -e runners\\/data1 -e runners\\/data2 -e runners\\/data3 -e runners\\/\\.env/);\n"
if test_text.count(old_assert) != 1:
    raise SystemExit('production sudo assertion anchor changed')
test_text = test_text.replace(old_assert, new_assert, 1)

old_tail = "  assert.match(deploy, /else\\n\\s+git fetch origin main --prune/);\n  assert.doesNotMatch(operator, /chown\\s+-R|chmod\\s+-R/);\n});\n\ntest('deploy refreshes Laravel caches after migrations and before verification', () => {"
new_tail = "  assert.match(deploy, /else\\n\\s+git fetch origin main --prune/);\n  assert.match(deploy, /else[\\s\\S]*git reset --hard origin\\/main[\\s\\S]*git switch -C main origin\\/main/);\n  assert.doesNotMatch(operator, /chown\\s+-R|chmod\\s+-R/);\n});\n\ntest('deploy restores branch main after hard reset and before cleanup', () => {\n  const deploy = deployMainBlock();\n  const productionReset = deploy.indexOf('sudo -n git reset --hard origin/main');\n  const productionSwitch = deploy.indexOf('sudo -n git switch -C main origin/main');\n  const productionClean = deploy.indexOf('sudo -n git clean -fd');\n  assert.ok(\n    productionReset >= 0 && productionReset < productionSwitch && productionSwitch < productionClean,\n    'root-owned production checkout must hard-reset, restore branch main, then clean',\n  );\n\n  const localReset = deploy.indexOf('git reset --hard origin/main', productionClean);\n  const localSwitch = deploy.indexOf('git switch -C main origin/main', localReset);\n  const localClean = deploy.indexOf('git clean -fd', localSwitch);\n  assert.ok(\n    localReset >= 0 && localReset < localSwitch && localSwitch < localClean,\n    'non-production checkout must hard-reset, restore branch main, then clean',\n  );\n});\n\ntest('deploy refreshes Laravel caches after migrations and before verification', () => {"
if test_text.count(old_tail) != 1:
    raise SystemExit('deploy contract insertion anchor changed')
test_path.write_text(test_text.replace(old_tail, new_tail, 1))
