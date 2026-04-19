import os
import re

screens_dir = 'src/components/screens'
for filename in os.listdir(screens_dir):
    if not filename.endswith('.jsx'): continue
    path = os.path.join(screens_dir, filename)
    with open(path, 'r') as f:
        content = f.read()
    
    # Target lucide-react import line
    match = re.search(r'import { (.*?) } from "lucide-react";', content)
    if not match:
        match = re.search(r'import { (.*?) } from \'lucide-react\';', content)
    
    if match:
        original_import = match.group(0)
        icons = match.group(1).split(', ')
        # Deduplicate and keep order
        unique_icons = []
        for icon in icons:
            icon = icon.strip()
            if icon not in unique_icons:
                unique_icons.append(icon)
        
        new_import = f'import {{ {", ".join(unique_icons)} }} from "lucide-react";'
        content = content.replace(original_import, new_import)
    
    with os.fdopen(os.open(path, os.O_WRONLY | os.O_TRUNC), 'w') as f:
        f.write(content)

