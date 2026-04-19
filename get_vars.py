import re
import builtins

with open('src/AdminPanelJSX.txt', 'r') as f:
    code = f.read()

# very basic word extraction
words = re.findall(r'\b[a-zA-Z_]\w*\b', code)
unique_words = set(words)
print(sorted(list(unique_words)))
