import React from 'react';
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


}
