import re
import os

with open('src/App.jsx', 'r') as f:
    content = f.read()

data_vars = ['mexicoLocations', 'subcategoriesMap', 'mockAds', 'translations', 'spotlightRealEstate', 'jobsBoard', 'servicesMarketplace', 'automotiveDeals', 'recentlyViewed']

extracted = {}
for var in data_vars:
    # Try to find the const definition
    match = re.search(f'const {var} = (\[.*?\]|\{{.*?\}});', content, re.DOTALL)
    if match:
        extracted[var] = match.group(0)

os.makedirs('src/constants', exist_ok=True)
with open('src/constants/mockData.js', 'w') as f:
    for var, code in extracted.items():
        f.write(f"export {code}\n\n")

print(f"Extracted {len(extracted)} variables to src/constants/mockData.js")
