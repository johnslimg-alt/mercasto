import re
import os

screens_dir = 'src/components/screens'
for filename in os.listdir(screens_dir):
    if not filename.endswith('.jsx'): continue
    path = os.path.join(screens_dir, filename)
    with open(path, 'r') as f:
        content = f.read()
    
    # Remove Loader2 from props list if it exists (it's in the lucide-react import now)
    content = re.sub(r'(export default function \w+\(\{ )(.*?) \}\)', lambda m: m.group(1) + ", ".join([p for p in re.split(r',\s*', m.group(2)) if p != 'Loader2']) + ' })', content)
    
    with open(path, 'w') as f:
        f.write(content)
