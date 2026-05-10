import re
import os

screens_dir = 'src/components/screens'
for filename in os.listdir(screens_dir):
    if not filename.endswith('.jsx'): continue
    path = os.path.join(screens_dir, filename)
    with open(path, 'r') as f:
        content = f.read()

    # Add import for mock data
    mock_data_vars = "mexicoLocations, subcategoriesMap, mockAds, translations, spotlightRealEstate, jobsBoard, servicesMarketplace, automotiveDeals, recentlyViewed"
    content = f"import {{ {mock_data_vars} }} from '../../constants/mockData';\n" + content
    
    # Add import for common components if used
    if 'AdSenseBanner' in content:
        content = "import AdSenseBanner from '../common/AdSenseBanner';\n" + content
    if 'ChartTooltip' in content:
        content = "import ChartTooltip from '../common/ChartTooltip';\n" + content
    
    # Remove these variables from props list to keep it clean and avoid confusion
    props_to_remove = set(re.split(r',\s*', mock_data_vars))
    props_to_remove.update(['AdSenseBanner', 'ChartTooltip'])
    
    content = re.sub(r'(export default function \w+\(\{ )(.*?) \}\)', lambda m: m.group(1) + ", ".join([p for p in re.split(r',\s*', m.group(2)) if p not in props_to_remove]) + ' })', content)

    with open(path, 'w') as f:
        f.write(content)

