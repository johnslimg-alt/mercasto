import re
import os

screens_dir = 'src/components/screens'
app_file = 'src/App.jsx'

with open(app_file, 'r') as f:
    app_content = f.read()

# Get all declarations in App.jsx (global scope of component)
declared = set(re.findall(r'\b(?:const|let|var|function) (\w+)\b', app_content))
# Add state setters manually or with regex
declared.update(re.findall(r'const \[\w+,\s*(\w+)\] = useState', app_content))

for filename in os.listdir(screens_dir):
    if not filename.endswith('.jsx'): continue
    path = os.path.join(screens_dir, filename)
    with open(path, 'r') as f:
        content = f.read()
    
    # Find the props list
    match = re.search(r'export default function \w+\(\{ (.*?) \}\)', content)
    if not match: continue
    props = set(re.split(r',\s*', match.group(1)))
    
    # Find all words used in the code
    words = set(re.findall(r'\b[a-zA-Z_]\w*\b', content))
    
    # Words used but not in props and not declared in screen file and not standard JS
    # This is a bit rough but will help
    internal_declared = props.copy()
    internal_declared.update(['React', 'export', 'default', 'function', 'import', 'return', 'if', 'else', 'const', 'let', 'var', 'for', 'while', 'switch', 'case', 'break', 'continue', 'true', 'false', 'null', 'undefined', 'Math', 'Object', 'Array', 'JSON', 'console', 'window', 'localStorage', 'fetch', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'encodeURIComponent', 'decodeURIComponent', 'alert', 'confirm', 'prompt', 'Number', 'String', 'Boolean', 'Date', 'Map', 'Set', 'Error', 'Promise', 'Event', 'FormData'])
    
    # Lucide icons imports
    icons = set(re.findall(r'(\b[A-Z]\w+\b)', content)) # Rough icon check
    internal_declared.update(icons)
    
    # Variables declared inside the component body
    # This is hard with regex but let's try finding const/let/var inside
    body_match = re.search(r'\{.*?\n(.*)\n\}', content, re.DOTALL)
    if body_match:
        internal_declared.update(re.findall(r'\b(?:const|let|var) (\w+)\b', body_match.group(1)))
    
    missing = []
    for word in words:
        if word in declared and word not in internal_declared:
            missing.append(word)
    
    if missing:
        print(f"{filename} missing props: {sorted(missing)}")

