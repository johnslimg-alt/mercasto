import re
import json

with open('/Users/ivan/mercasto/src/constants/mockData.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Match the translations object
# We can find all blocks like lang: { ... }
# Let's search for blocks:
pattern = re.compile(r'^\s{2}([a-z]{2}):\s*\{([^}]+)\}', re.MULTILINE | re.DOTALL)
matches = pattern.findall(content)

cyrillic_pattern = re.compile(r'[а-яА-ЯёЁ]')

results = {}
for lang, block in matches:
    if lang in ['es', 'ru']:
        continue
    results[lang] = []
    # Parse key-values from the block
    for line in block.split('\n'):
        line = line.strip()
        if not line or line.startswith('//'):
            continue
        key_val = re.match(r'^([a-zA-Z0-9_]+)\s*:\s*[\'"](.*)[\'"]\s*,?$', line)
        if key_val:
            key, val = key_val.groups()
            if cyrillic_pattern.search(val):
                results[lang].append((key, val))

for lang, items in results.items():
    print(f"Language: {lang}, untranslated keys count: {len(items)}")
    if items:
        print("Sample untranslated keys:")
        for k, v in items[:5]:
            print(f"  {k}: {v}")
