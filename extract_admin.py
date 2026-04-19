import re

with open('src/App.jsx', 'r') as f:
    lines = f.readlines()

start_idx = -1
end_idx = -1
braces = 0

for i, line in enumerate(lines):
    if "const renderAdminScreen = () => {" in line:
        start_idx = i
        braces = 1
        continue
    
    if start_idx != -1:
        braces += line.count('{')
        braces -= line.count('}')
        if braces == 0:
            end_idx = i
            break

output = lines[start_idx:end_idx+1]
with open('src/AdminPanelJSX.txt', 'w') as out:
    out.write("".join(output))

print(f"Extracted AdminScreen lines {start_idx+1} to {end_idx+1}")
