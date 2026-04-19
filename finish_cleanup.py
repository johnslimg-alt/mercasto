import re

with open('src/App.jsx', 'r') as f:
    content = f.read()

# Define the pattern to find the messy dangling section
# It's between "// --- ДАННЫЕ И ПЕРЕВОДЫ ---" and "const AdminScreen ="
start_marker = "// --- ДАННЫЕ И ПЕРЕВОДЫ ---"
end_marker = "const AdminScreen ="

start_idx = content.find(start_marker)
end_idx = content.find(end_marker)

if start_idx != -1 and end_idx != -1:
    new_content = content[:start_idx + len(start_marker)] + "\n\n" + content[end_idx:]
    with open('src/App.jsx', 'w') as f:
        f.write(new_content)
    print("Cleaned up dangling data in App.jsx")
else:
    print("Markers not found")
