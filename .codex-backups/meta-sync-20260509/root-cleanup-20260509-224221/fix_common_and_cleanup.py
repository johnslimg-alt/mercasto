import re
import os

# 1. Fix the common components syntax error "export default const ..."
common_dir = 'src/components/common'
for filename in os.listdir(common_dir):
    if not filename.endswith('.jsx'): continue
    path = os.path.join(common_dir, filename)
    with open(path, 'r') as f:
        content = f.read()
    
    # Replace "export default const Name =" with "const Name =" and add "export default Name;"
    match = re.search(r'export default const (\w+) =', content)
    if match:
        name = match.group(1)
        content = content.replace(f'export default const {name} =', f'const {name} =')
        content += f'\nexport default {name};'
        
        with open(path, 'w') as f:
            f.write(content)

# 2. Cleanup App.jsx massive block deletions
with open('src/App.jsx', 'r') as f:
    app_lines = f.readlines()

# Identify ranges for cleanup (rough estimates based on previous scans)
# We want to remove mexicoLocations, subcategoriesMap, mockAds, translations, spotlightRealEstate, jobsBoard, servicesMarketplace, automotiveDeals, recentlyViewed
# And ChartTooltip, AdSenseBanner, Loader2 (if it was defined)

vars_to_remove = ['mexicoLocations', 'subcategoriesMap', 'mockAds', 'translations', 'spotlightRealEstate', 'jobsBoard', 'servicesMarketplace', 'automotiveDeals', 'recentlyViewed', 'ChartTooltip', 'AdSenseBanner']

new_app_lines = []
skip_until = -1
for i, line in enumerate(app_lines):
    if i < skip_until: continue
    
    matched = False
    for var in vars_to_remove:
        if line.startswith(f'const {var} ='):
            # Find end of definition
            braces = 0
            found_first = False
            for j in range(i, len(app_lines)):
                l = app_lines[j]
                braces += l.count('{')
                braces -= l.count('}')
                if '{' in l: found_first = True
                if (found_first and braces <= 0) or (not found_first and ';' in l):
                    skip_until = j + 1
                    matched = True
                    break
            if matched: break
    
    if not matched:
        new_app_lines.append(line)

# Remove the old renderX function bodies (they were replaced by the automated script already but lets make sure)
# The automated script replaced them with <Comp ... />.

# 3. Add imports to App.jsx header
imports = [
    "import { mexicoLocations, subcategoriesMap, mockAds, translations, spotlightRealEstate, jobsBoard, servicesMarketplace, automotiveDeals, recentlyViewed } from './constants/mockData';",
    "import ChartTooltip from './components/common/ChartTooltip';",
    "import AdSenseBanner from './components/common/AdSenseBanner';",
    # Loader2 is from lucide-react, so no need for extra import if its already there
]

# Insert after first import
new_app_lines.insert(1, "\n".join(imports) + "\n")

with open('src/App.jsx', 'w') as f:
    f.writelines(new_app_lines)

print("Cleanup and import sync complete.")
