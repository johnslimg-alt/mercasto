import re

with open('src/App.jsx', 'r') as f:
    content = f.read()

def extract_comp(name):
    start = content.find(f'const {name} =')
    if start == -1: return None
    
    # Simple brace matching
    braces = 0
    found_first = False
    end = -1
    for i in range(start, len(content)):
        char = content[i]
        if char == '{':
            braces += 1
            found_first = True
        elif char == '}':
            braces -= 1
            if found_first and braces == 0:
                end = i + 1
                break
        elif char == ';' and not found_first:
             # handle arrow funcs with single line
             # this is a bit complex for regex, lets just find the next newline or semicolon
             if '=>' in content[start:i]:
                 end = i + 1
                 break
    
    return content[start:end]

common_comps = ['ChartTooltip', 'AdSenseBanner', 'Loader2', 'AdGrid', 'AdCard']
for comp in common_comps:
    code = extract_comp(comp)
    if code:
        with open(f'src/components/common/{comp}.jsx', 'w') as f:
            f.write("import React from 'react';\n")
            if 'Loader2' in code or 'AdSenseBanner' in code:
                f.write("import { Loader2 as Loader2Icon, Sparkles } from 'lucide-react';\n")
            f.write(f"export default {code}\n")

