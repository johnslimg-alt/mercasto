import os
import re

screens_dir = 'src/components/screens'
for filename in os.listdir(screens_dir):
    if not filename.endswith('.jsx'): continue
    path = os.path.join(screens_dir, filename)
    with open(path, 'r') as f:
        content = f.read()
    
    # Remove 'Bel, ' before 'Bell'
    content = content.replace('Bel, Bell', 'Bell')
    # Maybe ZapIcon is also wrong? Lucide usually has Zap
    content = content.replace('ZapIcon', 'Zap')
    
    with os.fdopen(os.open(path, os.O_WRONLY | os.O_TRUNC), 'w') as f:
        f.write(content)

