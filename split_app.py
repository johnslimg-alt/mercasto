import re

with open('src/App.jsx', 'r') as f:
    lines = f.readlines()

# find all declarations
state_vars = []
funcs = []

for line in lines:
    m = re.match(r'\s*const \[(\w+), (\w+)\] = useState', line)
    if m:
        state_vars.append(m.group(1))
        state_vars.append(m.group(2))
    
    m2 = re.match(r'\s*const (\w+) = (useCallback|useMemo|\(\{)', line)
    m3 = re.match(r'\s*const (\w+) = .*?=>', line)
    m4 = re.match(r'\s*function (\w+)\(', line)
    if 'const ' in line and ' = (' in line and '=>' in line:
         # just extract the name
         m_name = re.search(r'const (\w+) =', line)
         if m_name: funcs.append(m_name.group(1))

# It's better to just extract the functions explicitly manually, or use a known list.
