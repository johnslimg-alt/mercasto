import urllib.request
import urllib.parse
import json

def translate_text(text, target_lang):
    try:
        url = "https://translate.googleapis.com/translate_a/single?client=gtx&sl=ru&tl=" + target_lang + "&dt=t&q=" + urllib.parse.quote(text)
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read().decode('utf-8'))
            return "".join([part[0] for part in data[0] if part[0]])
    except Exception as e:
        return f"Error: {str(e)}"

print("RU to ZH (Chinese):", translate_text("Новые Объявления", "zh-CN"))
print("RU to JA (Japanese):", translate_text("Новые Объявления", "ja"))
print("RU to FR (French):", translate_text("Новые Объявления", "fr"))
print("RU to DE (German):", translate_text("Новые Объявления", "de"))
