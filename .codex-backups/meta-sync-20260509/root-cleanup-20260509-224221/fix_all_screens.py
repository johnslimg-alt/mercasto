import re
import os

screens_dir = 'src/components/screens'
for filename in os.listdir(screens_dir):
    if not filename.endswith('.jsx'): continue
    path = os.path.join(screens_dir, filename)
    with open(path, 'r') as f:
        lines = f.readlines()
    
    # Update Lucide imports with all potentially used icons
    all_icons = "Shield, Pencil, PlusCircle, Activity, Heart, MapPin, Search, ChevronLeft, ChevronRight, CheckCircle, XCircle, Trash2, Camera, User, BadgeCheck, ShieldCheck, Building2, Zap, Ticket, Crown, Store, UploadCloud, LogOut, Settings, BarChart3, QrCode, Download, Loader2, Settings2, Globe, Sparkles, Play, Video, Phone, AlertTriangle, ArrowRight, ExternalLink, MessageCircle, Share2, Star, ZapIcon, Info, HelpCircle, Menu, X, Bel, Bell"
    # Actually just add Loader2 to whatever is there or replace with a comprehensive list
    for i, line in enumerate(lines):
        if 'from \'lucide-react\'' in line:
            lines[i] = f"import {{ {all_icons} }} from 'lucide-react';\n"
            break
    
    # Special case for PieChartIcon in UserDashboard if I used that alias earlier
    if filename == 'UserDashboard.jsx':
        lines[i] = f"import {{ {all_icons}, PieChart as PieChartIcon }} from 'lucide-react';\n"

    # Add missing props detected earlier or just pass Loader2
    props_match = re.search(r'export default function \w+\(\{ (.*?) \}\)', lines[3])
    if props_match:
        all_props = set(re.split(r',\s*', props_match.group(1)))
        if 'Loader2' not in all_props:
            all_props.add('Loader2')
        # ... could add more here if needed ...
        lines[3] = f'export default function {filename[:-4]}({{ {", ".join(sorted(list(all_props)))} }}) {{\n'

    with open(path, 'w') as f:
        f.writelines(lines)
