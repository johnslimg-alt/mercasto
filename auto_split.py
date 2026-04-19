import re
import os

with open('src/App.jsx', 'r') as f:
    app_lines = f.readlines()

def extract_comp(name):
    start = -1
    end = -1
    braces = 0
    for i, line in enumerate(app_lines):
        if f'const {name} = () => {{' in line:
            start = i
            braces = 1
            continue
        if start != -1:
            braces += line.count('{')
            braces -= line.count('}')
            if braces == 0:
                end = i
                break
    return start, end, "".join(app_lines[start:end+1])

# 1. Identify all defined variables/functions in App top level
# (Rough regex for const/let/var and function)
declared = set()
for line in app_lines[:2500]: # avoid scanning inside render blocks
    m_state = re.match(r'\s*const \[(\w+),\s*(\w+)\]\s*=\s*useState', line)
    if m_state:
        declared.add(m_state.group(1))
        declared.add(m_state.group(2))
    m_func = re.match(r'\s*const (\w+)\s*=\s*(useCallback|useMemo|\(\{)', line)
    if m_func: declared.add(m_func.group(1))
    m_func2 = re.match(r'\s*const (\w+)\s*=\s*.*?=>', line)
    if m_func2: declared.add(m_func2.group(1))
    m_func3 = re.match(r'\s*function (\w+)\(', line)
    if m_func3: declared.add(m_func3.group(1))

# Manually add some known ones
declared.update(['t', 'lang', 'userRole', 'adminUsers', 'adminUserSearch', 'setAdminUserSearch', 'adminTab', 'setAdminTab', 'IconMap', 'getImageUrl', 'getImageUrls', 'API_URL'])

def get_used_props(code):
    words = set(re.findall(r'\b[a-zA-Z_]\w*\b', code))
    return sorted(list(words.intersection(declared)))

comps = {
    'AdminScreen': 'renderAdminScreen',
    'HomeScreen': 'renderHomeScreen',
    'PostScreen': 'renderPostScreen',
    'UserDashboard': 'renderUserDashboard'
}

os.makedirs('src/components/screens', exist_ok=True)

app_new_lines = []
skip_until = -1

for i, line in enumerate(app_lines):
    if i < skip_until: continue
    
    matched_comp = None
    for comp_name, render_func in comps.items():
        if f'const {render_func} = () => {{' in line:
            matched_comp = comp_name
            start, end, code = extract_comp(render_func)
            props = get_used_props(code)
            
            # create component file
            with open(f'src/components/screens/{comp_name}.jsx', 'w') as f:
                f.write(f"import React from 'react';\n")
                f.write("import { Shield, Pencil, PlusCircle, Activity, Heart, MapPin, Search, ChevronLeft, ChevronRight, CheckCircle, XCircle, Trash2, Camera, User, BadgeCheck, ShieldCheck } from 'lucide-react';\n\n")
                f.write(f"export default function {comp_name}({{ {', '.join(props)} }}) {{\n")
                # extract body of render function
                body = "\n".join(app_lines[start+1:end])
                f.write(body + "\n}\n")
            
            print(f"Created {comp_name}.jsx with {len(props)} props")
            
            # replace in App.jsx
            app_new_lines.append(f"  const {render_func} = () => <{comp_name} " + " ".join([f"{p}={{{p}}}" for p in props]) + " />;\n")
            skip_until = end + 1
            break
            
    if not matched_comp:
        app_new_lines.append(line)

# Add imports for lazy
imports = [f"const {c} = React.lazy(() => import('./components/screens/{c}'));\n" for c in comps.keys()]

# Insert imports at the top
for i, line in enumerate(app_new_lines):
    if line.startswith('export default function App()'):
        app_new_lines.insert(i-1, "\n".join(imports))
        break

# Write back App.jsx
with open('src/App.jsx', 'w') as f:
    f.writelines(app_new_lines)

