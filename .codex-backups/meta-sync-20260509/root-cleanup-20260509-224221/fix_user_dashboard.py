import re

path = 'src/components/screens/UserDashboard.jsx'
with open(path, 'r') as f:
    lines = f.readlines()

# Fix duplicates in props vs body
# Variables that are redefined inside: activeAds, inactiveAds, totalContactClicks, totalViews, conversionRate, categoryStats
to_remove_from_props = {'activeAds', 'inactiveAds', 'totalContactClicks', 'totalViews', 'conversionRate', 'categoryStats'}

props_match = re.search(r'export default function \w+\(\{ (.*?) \}\)', lines[3])
if props_match:
    all_props = set(re.split(r',\s*', props_match.group(1)))
    new_props = sorted(list(all_props - to_remove_from_props))
    lines[3] = f'export default function UserDashboard({{ {", ".join(new_props)} }}) {{\n'

# Fix imports
lines[1] = "import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell } from 'recharts';\n"
lines[0] = "import React from 'react';\n"
lines[2] = "import { Shield, Pencil, PlusCircle, Activity, Heart, MapPin, Search, ChevronLeft, ChevronRight, CheckCircle, XCircle, Trash2, Camera, User, BadgeCheck, ShieldCheck, Building2, Zap, Ticket, Crown, Store, UploadCloud, LogOut, Settings, BarChart3, QrCode, PieChart as PieChartIcon, Download, Loader2, Settings2, Globe, Sparkles, Play, Video, Phone, AlertTriangle } from 'lucide-react';\n"

with open(path, 'w') as f:
    f.writelines(lines)
