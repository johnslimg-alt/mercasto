import { CheckCircle, Crown, XCircle } from 'lucide-react';
import useModalFocusTrap from '../../hooks/useModalFocusTrap';

export default function PricingModal({ customCreditsAmount, handleClipPayment, handleCreditsPayment, handlePromotionProductPayment, lang, localizedText, priceTab, promotableAds, promotionTargetAdId, setCustomCreditsAmount, setPriceTab, setPromotionTargetAdId, setShowPricingModal, showPricingModal, t, user }) {
    const closeModal = () => setShowPricingModal(false);
    const { dialogRef, initialFocusRef, handleKeyDown } = useModalFocusTrap({ isOpen: showPricingModal, onClose: closeModal });
    if (!showPricingModal) return null;

    // Текущий активный план пользователя (если оплачен и не истёк)
    const planActive = user?.plan_code && (!user?.plan_expires_at || new Date(user.plan_expires_at) > new Date());
    const currentPlanCode = planActive ? user.plan_code : 'package_free';
    // Кнопка плана: если это текущий активный план — показываем "активен", иначе "Adquirir plan"
    const renderPlanBtn = (code, onBuy, buyClass, buyLabel = t.pm_buy_plan || 'Adquirir plan') => (
      currentPlanCode === code
        ? <button disabled className="py-2.5 w-full border border-[#84CC16] bg-[#84CC16]/10 text-[#65A30D] dark:text-[#84CC16] rounded-xl text-xs font-bold cursor-default flex items-center justify-center gap-1.5"><CheckCircle className="w-3.5 h-3.5"/> {t.current_plan || 'Plan activo'}</button>
        : <button onClick={onBuy} className={buyClass}>{buyLabel}</button>
    );

    return (
      <div className="fixed inset-0 bg-slate-900/60 z-[200] flex items-end md:items-center justify-center p-0 md:p-6 backdrop-blur-sm">
        <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="pricing-modal-title" onKeyDown={handleKeyDown} className="bg-slate-50 dark:bg-slate-950 w-full max-w-5xl md:rounded-3xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col animate-in slide-in-from-bottom-10 md:slide-in-from-bottom-0">
          <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10">
            <div className="p-5 flex justify-between items-center">
              <h3 id="pricing-modal-title" className="font-bold text-[22px] text-slate-900 dark:text-white flex items-center gap-2"><Crown className="w-6 h-6 text-[#84CC16]"/> {t.pricing_title || 'Planes y Promociones'}</h3>
              <button ref={initialFocusRef} type="button" aria-label={t.close_btn || t.close || 'Close'} onClick={closeModal} className="p-1 text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors"><XCircle size={26}/></button>
            </div>
            <div className="flex px-5 gap-6 border-t border-slate-100 dark:border-slate-800">
              <button onClick={() => setPriceTab('particular')} className={`py-4 font-semibold text-[14px] border-b-2 transition-colors ${priceTab === 'particular' ? 'border-[#84CC16] text-[#65A30D] dark:text-[#84CC16]' : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'}`}>{t.pm_tab_plans || 'Planes mensuales'}</button>
              <button onClick={() => setPriceTab('pro')} className={`py-4 font-semibold text-[14px] border-b-2 transition-colors ${priceTab === 'pro' ? 'border-[#84CC16] text-[#65A30D] dark:text-[#84CC16]' : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'}`}>{t.pm_tab_promos || 'Promociones únicas'}</button>
            </div>
          </div>
          <div className="p-4 md:p-6 overflow-y-auto">
            {priceTab === 'particular' ? (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  {/* Gratis */}
                  <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 flex flex-col shadow-sm">
                    <h4 className="font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider text-[11px] mb-1">{t.pm_plan_free || 'Gratis'}</h4>
                    <p className="text-2xl font-black text-slate-950 dark:text-white mb-3">$0 <span className="text-[12px] font-normal text-slate-400 dark:text-slate-500">{t.pm_per_month || '/mes'}</span></p>
                    <ul className="space-y-2 mb-6 flex-1 text-[13px] text-slate-600 dark:text-slate-300">
                      <li className="flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5 text-[#84CC16] shrink-0"/> {t.pm_feat_ads_3 || '3 anuncios activos'}</li>
                      <li className="flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5 text-[#84CC16] shrink-0"/> {t.pm_feat_contact_whatsapp || 'Contacto por Whatsapp/Telegram'}</li>
                    </ul>
                    {currentPlanCode === 'package_free'
                      ? <button disabled className="py-2.5 w-full border border-[#84CC16] bg-[#84CC16]/10 text-[#65A30D] dark:text-[#84CC16] rounded-xl text-xs font-bold cursor-default flex items-center justify-center gap-1.5"><CheckCircle className="w-3.5 h-3.5"/> {t.current_plan || 'Plan activo'}</button>
                      : <button disabled className="py-2.5 w-full border border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 rounded-xl text-xs font-bold cursor-default">{t.pm_plan_free || 'Gratis'}</button>}
                  </div>
                  {/* Impulso */}
                  <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 flex flex-col shadow-sm">
                    <h4 className="font-bold text-[#65A30D] dark:text-[#84CC16] uppercase tracking-wider text-[11px] mb-1">{t.pm_plan_impulso || 'Impulso'}</h4>
                    <p className="text-2xl font-black text-slate-950 dark:text-white mb-3">$99 <span className="text-[12px] font-normal text-slate-400 dark:text-slate-500">{t.pm_per_month || '/mes'}</span></p>
                    <ul className="space-y-2 mb-6 flex-1 text-[13px] text-slate-600 dark:text-slate-300">
                      <li className="flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5 text-[#84CC16] shrink-0"/> {t.pm_feat_ads_10 || '10 anuncios activos'}</li>
                      <li className="flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5 text-[#84CC16] shrink-0"/> {t.pm_feat_more_visibility || 'Más visibilidad'}</li>
                    </ul>
                    {renderPlanBtn('package_impulso', () => handleClipPayment(99, 'Plan Impulso', null, 'package_impulso'), "py-2.5 w-full bg-[#84CC16] text-white rounded-xl text-xs font-bold hover:bg-[#65A30D] transition-colors shadow-sm")}
                  </div>
                  {/* Negocio */}
                  <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 flex flex-col shadow-sm">
                    <h4 className="font-bold text-[#65A30D] dark:text-[#84CC16] uppercase tracking-wider text-[11px] mb-1">{t.pm_plan_negocio || 'Negocio'}</h4>
                    <p className="text-2xl font-black text-slate-950 dark:text-white mb-3">$249 <span className="text-[12px] font-normal text-slate-400 dark:text-slate-500">{t.pm_per_month || '/mes'}</span></p>
                    <ul className="space-y-2 mb-6 flex-1 text-[13px] text-slate-600 dark:text-slate-300">
                      <li className="flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5 text-[#84CC16] shrink-0"/> {t.pm_feat_ads_30 || '30 anuncios activos'}</li>
                      <li className="flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5 text-[#84CC16] shrink-0"/> {t.pm_feat_business_badge || 'Insignia de negocio'}</li>
                    </ul>
                    {renderPlanBtn('package_negocio', () => handleClipPayment(249, 'Plan Negocio', null, 'package_negocio'), "py-2.5 w-full bg-[#84CC16] text-white rounded-xl text-xs font-bold hover:bg-[#65A30D] transition-colors shadow-sm")}
                  </div>
                  {/* Pro */}
                  <div className="bg-slate-900 dark:bg-slate-900 rounded-2xl p-5 border border-slate-800 flex flex-col shadow-lg relative ring-2 ring-[#84CC16]">
                    <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-[#84CC16] text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">{t.pm_popular || 'POPULAR'}</div>
                    <h4 className="font-bold text-lime-400 uppercase tracking-wider text-[11px] mb-1">{t.pm_plan_pro || 'Pro'}</h4>
                    <p className="text-2xl font-black text-white mb-3">$599 <span className="text-[12px] font-normal text-slate-300 dark:text-slate-400">{t.pm_per_month || '/mes'}</span></p>
                    <ul className="space-y-2 mb-6 flex-1 text-[13px] text-slate-300 dark:text-slate-300">
                      <li className="flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5 text-[#84CC16] shrink-0"/> {t.pm_feat_ads_100 || '100 anuncios activos'}</li>
                      <li className="flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5 text-[#84CC16] shrink-0"/> {t.pm_feat_company_page || 'Página de empresa'}</li>
                      <li className="flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5 text-[#84CC16] shrink-0"/> {t.pm_feat_priority_support || 'Soporte preferente'}</li>
                    </ul>
                    {renderPlanBtn('package_pro', () => handleClipPayment(599, 'Plan Pro', null, 'package_pro'), "py-2.5 w-full bg-[#84CC16] text-white rounded-xl text-xs font-bold hover:bg-[#65A30D] transition-colors shadow-sm")}
                  </div>
                  {/* Agencia */}
                  <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 flex flex-col shadow-sm">
                    <h4 className="font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider text-[11px] mb-1">{t.pm_plan_agencia || 'Agencia'}</h4>
                    <p className="text-2xl font-black text-slate-950 dark:text-white mb-3"><span className="text-[12px] font-normal text-slate-400 dark:text-slate-500">{t.pm_from || 'Desde'}</span> $1,499 <span className="text-[12px] font-normal text-slate-400 dark:text-slate-500">{t.pm_per_month || '/mes'}</span></p>
                    <ul className="space-y-2 mb-6 flex-1 text-[13px] text-slate-600 dark:text-slate-300">
                      <li className="flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5 text-[#84CC16] shrink-0"/> {t.pm_feat_ads_300_500 || '300-500 anuncios'}</li>
                      <li className="flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5 text-[#84CC16] shrink-0"/> {t.pm_feat_bulk_upload || 'Carga masiva XML/CSV'}</li>
                      <li className="flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5 text-[#84CC16] shrink-0"/> {t.pm_feat_api_access || 'API acceso'}</li>
                    </ul>
                    {renderPlanBtn('package_agencia', () => handleClipPayment(1499, 'Plan Agencia', null, 'package_agencia'), "py-2.5 w-full bg-slate-900 dark:bg-slate-950 hover:bg-black dark:hover:bg-slate-800 text-white dark:text-slate-300 rounded-xl text-xs font-bold transition-colors shadow-sm")}
                  </div>
                </div>

                <div className="bg-slate-100 dark:bg-slate-900 rounded-2xl p-4 text-center border border-slate-200 dark:border-slate-800">
                  <p className="text-[14px] font-semibold text-slate-700 dark:text-slate-300">{t.pm_pay_note || 'Paga con tarjeta o efectivo en OXXO'}</p>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="max-w-4xl mx-auto bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm">
                  <div className="flex flex-col md:flex-row md:items-center gap-3 justify-between">
                    <div>
                      <p className="text-[13px] font-bold text-slate-900 dark:text-white">{t.pm_promote_ad_label || 'Anuncio a promocionar'}</p>
                      <p className="text-[12px] text-slate-500 dark:text-slate-400">{t.pm_promote_ad_hint || 'El paquete se aplicará solo al anuncio seleccionado.'}</p>
                    </div>
                    <select
                      value={promotionTargetAdId}
                      onChange={(e) => setPromotionTargetAdId(e.target.value)}
                      className="w-full md:w-[360px] px-3.5 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-[14px] outline-none focus:ring-2 focus:ring-[#84CC16]/30 focus:border-[#84CC16]"
                    >
                      <option value="">{t.pm_select_active_ad || 'Selecciona un anuncio activo...'}</option>
                      {promotableAds.map(ad => (
                        <option key={ad.id} value={ad.id}>{localizedText(ad.title, lang)}</option>
                      ))}
                    </select>
                  </div>
                  {promotableAds.length === 0 && (
                    <p className="mt-3 text-[12px] text-amber-600 dark:text-amber-300 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl px-3 py-2">
                      {t.pm_no_active_ads || 'No tienes anuncios activos. Publica o activa un anuncio antes de comprar promoción.'}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
                  {/* Subir anuncios */}
                  <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 flex flex-col shadow-sm">
                    <h4 className="font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[12px] mb-4">{t.pm_boost_section || 'Subir de posición'}</h4>
                    <div className="space-y-4 flex-1">
                      <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white text-[14px]">{t.pm_boost_1d_name || 'Subir 24 horas'}</p>
                          <p className="text-[12px] text-slate-500 dark:text-slate-400">{t.pm_boost_1d_desc || 'Reposiciona tu anuncio al inicio por 1 día'}</p>
                        </div>
                        <button onClick={() => handlePromotionProductPayment(19, t.pm_boost_1d_name || 'Subir 24 horas', 'boost_1_day')} className="px-3 py-2 bg-[#84CC16] hover:bg-[#65A30D] text-white rounded-xl text-[13px] font-bold shadow-sm transition-colors">$19</button>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white text-[14px]">{t.pm_boost_3d_name || 'Subir 3 días'}</p>
                          <p className="text-[12px] text-slate-500 dark:text-slate-400">{t.pm_boost_3d_desc || 'Reposiciona al inicio cada día por 3 días'}</p>
                        </div>
                        <button onClick={() => handlePromotionProductPayment(49, t.pm_boost_3d_name || 'Subir 3 días', 'boost_3_days')} className="px-3 py-2 bg-[#84CC16] hover:bg-[#65A30D] text-white rounded-xl text-[13px] font-bold shadow-sm transition-colors">$49</button>
                      </div>
                    </div>
                  </div>

                  {/* Resaltar / Destacar 7 días */}
                  <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-[#84CC16]/50 dark:border-slate-800 flex flex-col shadow-sm">
                    <h4 className="font-bold text-[#65A30D] dark:text-[#84CC16] uppercase tracking-wider text-[12px] mb-4">{t.pm_highlight_section || 'Destacar Anuncio'}</h4>
                    <div className="space-y-4 flex-1">
                      <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white text-[14px]">{t.pm_highlight_7d_name || 'Resaltar 7 días'}</p>
                          <p className="text-[12px] text-slate-500 dark:text-slate-400">{t.pm_highlight_7d_desc || 'Fondo llamativo en los resultados'}</p>
                        </div>
                        <button onClick={() => handlePromotionProductPayment(79, t.pm_highlight_7d_name || 'Resaltar 7 días', 'highlight_7_days')} className="px-3 py-2 bg-[#84CC16] hover:bg-[#65A30D] text-white rounded-xl text-[13px] font-bold shadow-sm transition-colors">$79</button>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white text-[14px]">{t.pm_featured_7d_name || 'Destacado 7 días'}</p>
                          <p className="text-[12px] text-slate-500 dark:text-slate-400">{t.pm_featured_7d_desc || 'Etiqueta dorada y mayor exposición'}</p>
                        </div>
                        <button onClick={() => handlePromotionProductPayment(149, t.pm_featured_7d_name || 'Destacado 7 días', 'featured_7_days')} className="px-3 py-2 bg-[#84CC16] hover:bg-[#65A30D] text-white rounded-xl text-[13px] font-bold shadow-sm transition-colors">$149</button>
                      </div>
                    </div>
                  </div>

                  {/* Destacar 30 días / Top categoría */}
                  <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 flex flex-col shadow-sm">
                    <h4 className="font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[12px] mb-4">{t.pm_premium_section || 'Promoción Premium'}</h4>
                    <div className="space-y-4 flex-1">
                      <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white text-[14px]">{t.pm_featured_30d_name || 'Destacado 30 días'}</p>
                          <p className="text-[12px] text-slate-500 dark:text-slate-400">{t.pm_featured_30d_desc || 'Súper exposición por un mes completo'}</p>
                        </div>
                        <button onClick={() => handlePromotionProductPayment(399, t.pm_featured_30d_name || 'Destacado 30 días', 'featured_30_days')} className="px-3 py-2 bg-[#84CC16] hover:bg-[#65A30D] text-white rounded-xl text-[13px] font-bold shadow-sm transition-colors">$399</button>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white text-[14px]">{t.pm_top_category_name || 'Top categoría 7 días'}</p>
                          <p className="text-[12px] text-slate-500 dark:text-slate-400">{t.pm_top_category_desc || 'Anuncio fijo al inicio de su categoría'}</p>
                        </div>
                        <button onClick={() => handlePromotionProductPayment(399, t.pm_top_category_name || 'Top categoría 7 días', 'top_category_7_days')} className="px-3 py-2 bg-[#84CC16] hover:bg-[#65A30D] text-white rounded-xl text-[13px] font-bold shadow-sm transition-colors">$399</button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="max-w-4xl mx-auto bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
                  <h4 className="font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[12px] mb-1">{t.pm_buy_credits_title || 'Comprar créditos'}</h4>
                  <p className="text-[12px] text-slate-500 dark:text-slate-400 mb-4">{t.pm_buy_credits_desc || '1 crédito = $1 MXN. Úsalos para promocionar cualquiera de tus anuncios desde tu saldo.'}</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                    {[100, 200, 300, 500].map(v => (
                      <button
                        key={v}
                        onClick={() => handleCreditsPayment(v, `credits_${v}`)}
                        className="p-3 bg-slate-50 dark:bg-slate-800 hover:bg-lime-50 dark:hover:bg-lime-500/10 border border-slate-200 dark:border-slate-700 hover:border-[#84CC16] rounded-xl text-center transition-colors"
                      >
                        <p className="font-bold text-slate-900 dark:text-white text-[16px]">{v}</p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">{t.pm_credits_unit || 'créditos'} · ${v}</p>
                      </button>
                    ))}
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                    <div className="flex-1">
                      <label className="text-[12px] font-semibold text-slate-600 dark:text-slate-300 mb-1 block">{t.pm_custom_amount || 'Monto personalizado'}</label>
                      <input
                        type="number"
                        min="50"
                        max="5000"
                        step="10"
                        placeholder="Ej. 250"
                        value={customCreditsAmount}
                        onChange={(e) => setCustomCreditsAmount(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-[14px] outline-none focus:ring-2 focus:ring-[#84CC16]/30 focus:border-[#84CC16]"
                      />
                      <p className="text-[11px] text-slate-400 mt-1">{t.pm_custom_amount_hint || 'Mínimo $50, máximo $5,000'}</p>
                    </div>
                    <button
                      onClick={() => handleCreditsPayment(customCreditsAmount, 'credits_custom')}
                      className="px-5 py-2.5 bg-[#84CC16] hover:bg-[#65A30D] text-white rounded-xl text-[13px] font-bold shadow-sm transition-colors whitespace-nowrap"
                    >
                      {t.pm_buy_credits_title || 'Comprar créditos'}
                    </button>
                  </div>
                </div>

                <div className="bg-slate-100 dark:bg-slate-900 rounded-2xl p-4 text-center border border-slate-200 dark:border-slate-800">
                  <p className="text-[14px] font-semibold text-slate-700 dark:text-slate-300">{t.pm_pay_note || 'Paga con tarjeta o efectivo en OXXO'}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
