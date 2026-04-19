import React from 'react';
import { ChevronLeft, MapPin, Star, CheckCircle, TrendingUp, AlertTriangle, QrCode, User, Loader2 } from 'lucide-react';

export default function StorefrontScreen({
  company, t, getImageUrl, companyRatingStats, companyAds, companyReviews,
  loadingCompanyAds, submittingReview, setShowUserReportModal, setQrModalData,
  setViewedCompany, renderAdCard, handleReviewSubmit, reviewForm, setReviewForm,
  user, handleViewCompany
}) {
  if (!company) return null;

  return (
  <div className="bg-[var(--paper)] min-h-screen pb-24 md:pb-12 w-full">
    <div className="sticky top-0 bg-white/90 backdrop-blur-xl z-40 border-b border-slate-200 px-4 py-3 flex items-center shadow-sm h-[60px]">
       <button onClick={() => { setViewedCompany(null); window.history.replaceState({}, '', '/'); }} className="btn-sm flex items-center gap-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 bg-transparent">
         <ChevronLeft className="w-4 h-4" /> {t.back}
       </button>
    </div>

    <div className="max-w-[1000px] mx-auto md:py-8 pt-4 px-4">
      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm mb-8">
        <div className="h-32 md:h-48 bg-slate-200 relative">
           <img src="https://images.unsplash.com/photo-1524661135-423995f22d0b?w=1200&h=400&fit=crop" loading="lazy" className="w-full h-full object-cover opacity-90 mix-blend-multiply" alt="Cover" />
        </div>
        <div className="p-6 md:p-8 flex flex-col md:flex-row gap-6 items-start md:items-center relative">
           <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-[#0F172A] text-white flex items-center justify-center font-bold text-3xl shadow-lg border-4 border-white -mt-14 md:-mt-16 z-10 relative shrink-0">
             {company.avatar_url ? <img src={getImageUrl(company.avatar_url)} className="w-full h-full rounded-xl object-cover"/> : (company.name ? company.name[0].toUpperCase() : <User size={32}/>)}
           </div>
           <div className="flex-1 pt-2 md:pt-0">
             <h1 className="text-[24px] font-bold text-slate-900 flex items-center gap-2">
               {company.name || 'Vendedor'} 
               {company.is_verified && <CheckCircle className="w-5 h-5 text-[#84CC16]" />}
               {company.role === 'business' && <span className="badge bg-slate-900 text-white ml-1">PRO</span>}
             </h1>
             <p className="text-[14px] text-slate-500 mt-1 flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> México</p>
             <div className="flex items-center gap-1 mt-2">
               <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
               <span className="font-bold text-slate-900 text-[14px]">{companyRatingStats.average}</span>
               <span className="text-slate-500 text-[13px]">({companyRatingStats.total} reseñas)</span>
             </div>
             
             <div className="flex flex-wrap gap-2 mt-4">
               {company.is_verified && (
                 <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border bg-emerald-50 border-emerald-100 text-emerald-700 text-[12px] font-semibold">
                   <CheckCircle className="w-3.5 h-3.5"/> {t.verified_id}
                 </div>
               )}
               {companyAds.length >= 10 && (
                 <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border bg-blue-50 border-blue-100 text-blue-700 text-[12px] font-semibold">
                   <TrendingUp className="w-3.5 h-3.5"/> +10 {t.active_ads}
                 </div>
               )}
               {companyRatingStats.average >= 4.5 && companyRatingStats.total >= 5 && (
                 <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border bg-amber-50 border-amber-100 text-amber-700 text-[12px] font-semibold">
                   <Star className="w-3.5 h-3.5 fill-amber-500"/> {t.high_rep}
                 </div>
               )}
             </div>
             <button onClick={() => setShowUserReportModal(true)} className="mt-4 text-[12px] text-slate-400 hover:text-red-500 flex items-center gap-1.5 underline underline-offset-4 font-medium transition-colors w-fit">
               <AlertTriangle size={14} /> {t.report_seller}
             </button>
           </div>
           <div className="w-full md:w-auto">
             <button 
               onClick={() => setQrModalData(company.phone_number ? `https://wa.me/${company.phone_number.replace(/\D/g, '')}` : 'tel:+521234567890')}
               className="btn-md w-full border border-slate-300 text-slate-700 hover:bg-slate-50 flex items-center justify-center gap-2 shadow-sm"
             >
               <QrCode className="w-4 h-4" /> {t.scan_qr}
             </button>
           </div>
        </div>
      </div>

      <h3 className="text-[18px] font-bold text-slate-900 mb-5">{t.active_ads} ({companyAds.length})</h3>
      {loadingCompanyAds ? (
        <div className="flex justify-center py-10"><Loader2 className="w-8 h-8 text-[#84CC16] animate-spin" /></div>
      ) : companyAds.length === 0 ? (
        <div className="p-10 text-center text-slate-400 font-bold uppercase tracking-widest text-[12px] bg-white rounded-3xl border border-slate-200">{t.noAds}</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {companyAds.map(ad => renderAdCard(ad))}
        </div>
      )}

      <div className="mt-12 bg-white rounded-3xl border border-slate-200 p-6 md:p-8 shadow-sm">
        <h3 className="text-[18px] font-bold text-slate-900 mb-6 flex items-center gap-2">
          <Star className="w-5 h-5 text-amber-400 fill-amber-400"/> {t.client_reviews} ({companyRatingStats.total})
        </h3>
        
        {user && user.id !== company.id && (
          <form onSubmit={handleReviewSubmit} className="mb-8 p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <h4 className="text-[14px] font-semibold text-slate-800 mb-3">{t.leave_review}</h4>
            <div className="flex items-center gap-2 mb-3">
              {[1, 2, 3, 4, 5].map(star => (
                <button type="button" key={star} onClick={() => setReviewForm({...reviewForm, rating: star})} className="focus:outline-none">
                  <Star className={`w-6 h-6 ${star <= reviewForm.rating ? 'text-amber-400 fill-amber-400' : 'text-slate-300'}`} />
                </button>
              ))}
            </div>
            <textarea value={reviewForm.comment} onChange={e => setReviewForm({...reviewForm, comment: e.target.value})} placeholder="¿Cómo fue tu experiencia con este vendedor?" className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-[#84CC16]/30 text-[14px] mb-3 min-h-[80px]"></textarea>
            <button type="submit" disabled={submittingReview} className="btn-sm bg-[#0F172A] text-white hover:bg-black flex items-center gap-2">
              {submittingReview ? <Loader2 className="w-4 h-4 animate-spin"/> : t.publish_review}
            </button>
          </form>
        )}

        <div className="space-y-4">
          {companyReviews.length === 0 ? (
            <p className="text-slate-500 text-[13px]">{t.no_reviews}</p>
          ) : (
            companyReviews.map((rev, idx) => (
              <div key={idx} className="p-4 border border-slate-100 rounded-2xl">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-slate-200 overflow-hidden">
                      {rev.reviewer_avatar ? <img src={getImageUrl(rev.reviewer_avatar)} className="w-full h-full object-cover"/> : <User className="w-5 h-5 m-1.5 text-slate-400"/>}
                    </div>
                    <div>
                      <p className="text-[13px] font-semibold text-slate-900">{rev.reviewer_name}</p>
                      <div className="flex items-center gap-0.5">
                        {[...Array(5)].map((_, i) => <Star key={i} className={`w-3 h-3 ${i < rev.rating ? 'text-amber-400 fill-amber-400' : 'text-slate-200'}`} />)}
                      </div>
                    </div>
                  </div>
                  <span className="text-[11px] text-slate-400">{new Date(rev.created_at).toLocaleDateString()}</span>
                </div>
                {rev.comment && <p className="text-[13px] text-slate-600 mt-2">{rev.comment}</p>}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  </div>
  );
}