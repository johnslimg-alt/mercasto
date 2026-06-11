import re
import urllib.request
import urllib.parse
import json
import time

def translate_text(text, target_lang):
    if not text.strip():
        return text
    # Keep numbers and placeholders
    if re.match(r'^\d+$', text.strip()):
        return text
    
    # Retry logic
    for attempt in range(3):
        try:
            url = "https://translate.googleapis.com/translate_a/single?client=gtx&sl=ru&tl=" + target_lang + "&dt=t&q=" + urllib.parse.quote(text)
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req, timeout=10) as response:
                data = json.loads(response.read().decode('utf-8'))
                res = "".join([part[0] for part in data[0] if part[0]])
                return res
        except Exception as e:
            print(f"Error translating '{text}' to {target_lang} (attempt {attempt+1}): {e}")
            time.sleep(1)
    return text # Fallback

# Read mockData.js
filepath = '/Users/ivan/mercasto/src/constants/mockData.js'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Extract the existing translations block
# es, en, pt are fully translated, let's parse them
# ru is fully translated, we will use it as the source for other languages
pattern = re.compile(r'^\s{2}([a-z]{2}):\s*\{([^}]+)\}', re.MULTILINE | re.DOTALL)
matches = pattern.findall(content)

# Build dictionaries for es, en, pt
blocks = {}
for lang, block in matches:
    blocks[lang] = {}
    for line in block.split('\n'):
        line = line.strip()
        if not line or line.startswith('//'):
            continue
        # Support both single and double quotes
        key_val = re.match(r'^([a-zA-Z0-9_]+)\s*:\s*[\'"](.*)[\'"]\s*,?$', line)
        if key_val:
            key, val = key_val.groups()
            # Unescape quotes if needed
            val = val.replace("\\'", "'").replace('\\"', '"')
            blocks[lang][key] = val

print("Parsed languages:", list(blocks.keys()))
print("Total keys in 'es':", len(blocks['es']))
print("Total keys in 'ru':", len(blocks['ru']))

# Source language is Russian
ru_dict = blocks['ru']

# Target languages to generate/translate
targets = {
    'zh': 'zh-CN',
    'ko': 'ko',
    'de': 'de',
    'it': 'it',
    'ar': 'ar',
    'he': 'he',
    'yi': 'yi',
    'ja': 'ja',
    'fr': 'fr'
}

# New translations to add
new_keys = {
    'verified_marketplace': {
        'es': 'Compra con vendedores verificados y anuncios moderados',
        'en': 'Buy from verified sellers with moderated listings',
        'pt': 'Compre de vendedores verificados com anúncios moderados',
        'ru': 'Покупайте у проверенных продавцов с модерацией объявлений'
    },
    'marketplace_verticals': {
        'es': 'Sitios principales de Mercasto',
        'en': 'Mercasto Main Verticals',
        'pt': 'Sitios principais do Mercasto',
        'ru': 'Основные разделы Mercasto'
    },
    'stores': {
        'es': 'Tiendas',
        'en': 'Stores',
        'pt': 'Lojas',
        'ru': 'Магазины'
    }
}

# Generate translations for new keys in targets
for key, values in new_keys.items():
    ru_val = values['ru']
    for lang, gt_code in targets.items():
        if lang not in values:
            print(f"Translating new key '{key}' to '{lang}'...")
            values[lang] = translate_text(ru_val, gt_code)

# Add new keys to existing dictionaries
for key, values in new_keys.items():
    for lang in ['es', 'en', 'pt', 'ru']:
        blocks[lang][key] = values[lang]

# Now translate all other keys for targets
final_translations = {
    'es': blocks['es'],
    'en': blocks['en'],
    'pt': blocks['pt'],
    'ru': blocks['ru']
}

for lang, gt_code in targets.items():
    print(f"\n=== Translating to {lang.upper()} ===")
    final_translations[lang] = {}
    
    # Copy and clean existing keys, or translate from Russian
    for key, ru_val in ru_dict.items():
        # Add new key override if defined
        if key in new_keys:
            final_translations[lang][key] = new_keys[key][lang]
            continue
            
        # If the key was already translated (not a Russian placeholder), keep it!
        # Otherwise, translate it from Russian.
        existing_val = blocks.get(lang, {}).get(key, '')
        
        # Check if existing value has Cyrillic. If not, and it exists, keep it!
        cyrillic_pattern = re.compile(r'[а-яА-ЯёЁ]')
        if existing_val and not cyrillic_pattern.search(existing_val):
            final_translations[lang][key] = existing_val
        else:
            print(f"[{lang}] Translating '{key}': '{ru_val}'")
            translated = translate_text(ru_val, gt_code)
            final_translations[lang][key] = translated
            # Sleep briefly to avoid getting blocked
            time.sleep(0.05)

# Format the translations object as JS code
js_lines = ["export const translations = {"]
for i, lang in enumerate(['es', 'en', 'pt', 'ru', 'zh', 'ko', 'de', 'it', 'ar', 'he', 'yi', 'ja', 'fr']):
    js_lines.append(f"  {lang}: {{")
    lang_keys = sorted(final_translations[lang].keys())
    for k in lang_keys:
        val = final_translations[lang][k]
        # Escape single quotes
        escaped_val = val.replace("'", "\\'")
        js_lines.append(f"    {k}: '{escaped_val}',")
    # Remove last comma for cleaner output
    if js_lines[-1].endswith(','):
        js_lines[-1] = js_lines[-1][:-1]
    
    if i < 12:
        js_lines.append("  },")
    else:
        js_lines.append("  }")
js_lines.append("};")

new_translations_js = "\n".join(js_lines)

# Replace the translations block in mockData.js
# The translations block starts at "export const translations = {" and ends with "};" at line 4697
# Let's search and replace using regex
translations_regex = re.compile(r'export const translations = \{.*?\n\};', re.DOTALL)
updated_content = translations_regex.sub(new_translations_js, content)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(updated_content)

print("\nSuccessfully updated mockData.js with complete translations!")
