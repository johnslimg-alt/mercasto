import re

with open('src/App.jsx', 'r') as f:
    app_code = f.read()

# Find renderAdminScreen block
start_str = "  const renderAdminScreen = () => {"
start_idx = app_code.find(start_str)

# Find the end of renderAdminScreen (matching braces)
brace_count = 0
in_func = False
end_idx = -1

for i in range(start_idx, len(app_code)):
    if app_code[i] == '{':
        brace_count += 1
        in_func = True
    elif app_code[i] == '}':
        brace_count -= 1
    
    if in_func and brace_count == 0:
        end_idx = i + 1
        break

admin_func_code = app_code[start_idx:end_idx]

# Replace renderAdminScreen in App.jsx
app_code = app_code[:start_idx] + "  // Extracted to AdminPanel.jsx\n  const renderAdminScreen = () => <React.Suspense fallback={<div className=\"p-8 text-center text-slate-500\">Cargando panel de admin...</div>}><AdminPanel {...adminProps} /></React.Suspense>;" + app_code[end_idx:]

with open('src/App.jsx', 'w') as f:
    f.write(app_code)

# Create AdminPanel.jsx
admin_jsx_content = """import React from 'react';
import { 
  Shield, Users, Activity, BarChart2, ShieldAlert,
  Search, CheckCircle2, ShieldBan, Trash2, Ban,
  PlusCircle, Edit2, Ticket, MessageSquare, AlertCircle,
  FileText, ChevronRight, XCircle, Zap, ShieldCheck
} from 'lucide-react';

export default function AdminPanel(props) {
  const {
      adminTab, setAdminTab, t,
      adminUserSearch, setAdminUserSearch, filteredAdminUsers,
      handleAdminChangeRole, handleAdminVerifyUser, handleAdminDeleteUser,
      adminPendingAds, loadingPendingAds, handleModerateAd, getImageUrls,
      adminReports, loadingReports, handleDeleteReport,
      adminUserReports, handleDeleteUserReport,
      adminCoupons, loadingCoupons, handleDeleteCoupon, handleCreateCoupon,
      couponForm, setCouponForm,
      editingCatId, setEditingCatId, handleSaveCategory, adminCatForm, setAdminCatForm, IconMap, adminLoading, cancelCatEdit, categoriesData, lang, handleEditCategory,
      adminReportTab, setAdminReportTab
  } = props;

""" + admin_func_code.replace("const renderAdminScreen = () => {", "").rstrip("}").strip() + """
}
"""

with open('src/components/AdminPanel.jsx', 'w') as f:
    f.write(admin_jsx_content)

print("Extraction script complete.")
