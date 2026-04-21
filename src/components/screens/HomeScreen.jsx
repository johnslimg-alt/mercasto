import AdSenseBanner from '../common/AdSenseBanner';
import { mexicoLocations, subcategoriesMap, mockAds, translations, spotlightRealEstate, jobsBoard, servicesMarketplace, automotiveDeals, recentlyViewed } from '../../constants/mockData';
import React from 'react';
import { Shield, Pencil, PlusCircle, Activity, Heart, MapPin, Search, ChevronLeft, ChevronRight, CheckCircle, XCircle, Trash2, Camera, User, BadgeCheck, ShieldCheck, Building2, Zap, Ticket, Crown, Store, UploadCloud, LogOut, Settings, BarChart3, QrCode, Download, Loader2, Settings2, Globe, Sparkles, Play, Video, Phone, AlertTriangle, ArrowRight, ExternalLink, MessageCircle, Share2, Star, Info, HelpCircle, Menu, X, Bell } from "lucide-react";
import SidebarFilters from '../common/SidebarFilters';

export default function HomeScreen({ IconMap, MercastoLogo, activeCat, categoriesData, form, hasMore, images, lang, lastAdElementRef, loadingAds, loadingMore, renderAdCard, searchQuery, selectedState, serverAds, setActiveCat, setCurrentTab, setSearchQuery, setSelectedState, setShowPricingModal, t, minPrice, setMinPrice, maxPrice, setMaxPrice, conditionFilter, setConditionFilter, dynamicFilters, setDynamicFilters }) {
    const [showMobileFilters, setShowMobileFilters] = React.useState(false);

    // Заглушка (Fallback) на случай, если база данных категорий пуста
    const defaultCats = [
      { slug: 'motor', name: { es: 'Motor' }, icon: 'Car' },
      { slug: 'inmobiliaria', name: { es: 'Inmuebles' }, icon: 'Home' },
      { slug: 'empleo', name: { es: 'Empleo' }, icon: 'Briefcase' },
      { slug: 'servicios', name: { es: 'Servicios' }, icon: 'Wrench' },
      { slug: 'informatica', name: { es: 'Informática' }, icon: 'Monitor' },
      { slug: 'telefonia', name: { es: 'Telefonía' }, icon: 'Smartphone' },
      { slug: 'hogar', name: { es: 'Hogar' }, icon: 'Sofa' },
      { slug: 'moda', name: { es: 'Moda' }, icon: 'Shirt' },
      { slug: 'bebes', name: { es: 'Bebés' }, icon: 'Baby' },
      { slug: 'mascotas', name: { es: 'Mascotas' }, icon: 'PawPrint' },
      { slug: 'ocio', name: { es: 'Ocio' }, icon: 'Bike' },
      { slug: 'boletos', name: { es: 'Boletos' }, icon: 'Ticket' }
    ];
    const displayCategories = categoriesData && categoriesData.length > 0 ? categoriesData : defaultCats;

    if (activeCat || searchQuery || selectedState) {

      return (

        <div className="max-w-[1440px] mx-auto px-4 lg:px-6 py-6 lg:py-8 min-h-screen flex flex-col lg:flex-row gap-6">
          
          {/* Кнопка фильтров для мобильных устройств */}
          <div className="md:hidden flex items-center justify-between mb-2">
             <h2 className="text-[18px] font-bold text-slate-900">{t.search_results || 'Resultados'} <span className="text-slate-400 text-[14px] font-normal ml-1">({serverAds.length})</span></h2>
             <button onClick={() => setShowMobileFilters(!showMobileFilters)} className={`btn-sm flex items-center gap-2 border transition-colors ${showMobileFilters ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-300'}`}>
               <Settings2 size={16} /> Filtros
             </button>
          </div>

          {/* Динамическая боковая панель (Адаптивная: скрывается на мобилках, открывается по кнопке) */}
          <aside className={`w-full lg:w-1/4 shrink-0 ${showMobileFilters ? 'block' : 'hidden md:block'}`}>
             <SidebarFilters activeCat={activeCat} minPrice={minPrice} setMinPrice={setMinPrice} maxPrice={maxPrice} setMaxPrice={setMaxPrice} conditionFilter={conditionFilter} setConditionFilter={setConditionFilter} dynamicFilters={dynamicFilters} setDynamicFilters={setDynamicFilters} t={t} lang={lang} />
          </aside>

          {/* Сетка результатов (товары) */}
          <div className="flex-1">
            <div className="hidden md:flex justify-between items-center mb-6">
              <h2 className="text-[22px] font-bold tracking-tight text-slate-900">{t.search_results || 'Resultados de búsqueda'} <span className="text-slate-400 text-[14px] font-normal ml-2">({serverAds.length})</span></h2>
            </div>

          {loadingAds ? (

            <div className="flex justify-center py-20"><Loader2 className="animate-spin text-[#84CC16]" size={40}/></div>

          ) : serverAds.length === 0 ? (

            <div className="py-20 text-center flex flex-col items-center">

              <Search size={48} className="text-slate-300 mb-4" />

              <span className="text-slate-400 font-bold uppercase tracking-widest">{t.noAds}</span>

            </div>

          ) : (

            <>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">

                {serverAds.map((ad, index) => (

                  <React.Fragment key={ad.id}>

                    {renderAdCard(ad)}

                    {/* Показываем рекламный баннер после каждого 7-го объявления */}

                    {(index + 1) % 7 === 0 && <AdSenseBanner key={`ad-banner-${ad.id}`} />}

                  </React.Fragment>

                ))}

              </div>

              <div ref={lastAdElementRef} />

              {loadingMore && <div className="flex justify-center py-10"><Loader2 className="animate-spin text-[#84CC16]" size={32}/></div>}

              {!loadingMore && !hasMore && serverAds.length > 0 && <div className="text-center text-slate-400 font-bold uppercase tracking-widest text-xs py-10 mt-6">Has llegado al final</div>}

            </>

          )}
          </div>

        </div>

      );

    }



    return (

      <div className="w-full">

        {/* 1. HERO STATS */}

        <div className="bg-white border-b border-slate-200">

          <div className="max-w-[1440px] mx-auto px-4 lg:px-6 py-3 flex flex-col md:flex-row md:items-center gap-3 justify-between">

            <div className="flex items-center flex-wrap gap-x-3 gap-y-1 text-[13px] text-slate-700">

              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#84CC16] animate-pulse"></span><strong className="text-[#0F172A] font-semibold">1,847,392</strong> {t.active_listings || 'anuncios activos'}</span>

              <span className="text-slate-300 hidden sm:block">•</span>

              <span><strong className="text-[#0F172A] font-semibold">247,103</strong> {t.users_online || 'usuarios en línea'}</span>

              <span className="text-slate-300 hidden sm:block">•</span>

              <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-slate-500" />{t.all_mexico || 'Todo México'}</span>

            </div>

            <div className="flex items-center gap-2">

              <button onClick={() => setCurrentTab('post')} className="btn-sm bg-slate-900 text-white hover:bg-black">{t.sell_fast || 'Vender rápido'}</button>

              <button onClick={() => setActiveCat('empleo')} className="btn-sm bg-white border border-slate-300 hover:bg-slate-50">{t.find_job || 'Buscar empleo'}</button>

              <button onClick={() => { setActiveCat('inmobiliaria'); setSearchQuery('renta'); }} className="btn-sm bg-white border border-slate-300 hover:bg-slate-50 hidden sm:inline-flex">{t.rent_apt || 'Rentar depa'}</button>

              <button onClick={() => setActiveCat('servicios')} className="btn-sm bg-white border border-slate-300 hover:bg-slate-50 hidden sm:inline-flex">{t.hire_service || 'Contratar servicio'}</button>

            </div>

          </div>

        </div>



        <main className="max-w-[1440px] mx-auto px-4 lg:px-6 py-6 lg:py-8">

          <div className="grid grid-cols-12 gap-6">

            

            {/* 2. FEATURED CATEGORIES */}

            <section className="col-span-12">

              <div className="flex items-center justify-between mb-4">

                <h2 className="text-[22px] font-bold tracking-tight">{t.browse_category || 'Explorar por categoría'}</h2>

                <div className="flex items-center gap-3">

                  <button className="text-[13px] font-medium text-slate-600 hover:text-slate-900 hidden sm:block">{t.sort_popular || 'Ordenar: Popular'}</button>

                  <a className="text-[13px] font-semibold text-[#65A30D] hover:underline cursor-pointer" onClick={() => setActiveCat('')}>{t.view_all_cat || 'Ver todas las categorías →'}</a>

                </div>

              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">

                {displayCategories.slice(0, 16).map(cat => {

                  const Icon = IconMap[cat.icon] || Star;

                  return (

                    <div key={cat.slug} onClick={() => setActiveCat(cat.slug)} className="flex flex-col items-center justify-center snap-start shrink-0 w-[80px] sm:w-[90px] cursor-pointer group">

                      <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center text-slate-500 group-hover:text-[#65A30D] group-hover:border-[#65A30D] group-hover:shadow-md transition-all mb-2">

                        <Icon size={24} className="sm:w-7 sm:h-7" />

                      </div>

                      <h3 className="font-medium text-[11px] sm:text-[12px] text-center text-slate-700 group-hover:text-[#65A30D] line-clamp-2 leading-tight px-1">
                        {cat.name?.[lang] || cat.name?.['es'] || cat.name}
                      </h3>

                    </div>

                  );

                })}

              </div>

            </section>



            {/* 3. TRENDING NOW */}

            <section className="col-span-12 mt-2">

              <div className="flex items-center justify-between mb-4">

                <div className="flex items-center gap-3">

                  <h2 className="text-[22px] font-bold tracking-tight">{t.trending_now || 'Tendencias'}</h2>

                  <span className="badge bg-red-500 text-white hidden sm:block">LIVE</span>

                </div>

                <div className="flex items-center gap-2">

                  <button onClick={() => alert('¡Búsqueda guardada!')} className="btn-sm border border-slate-300 bg-white hover:bg-slate-50 hidden sm:block">{t.save_search || 'Guardar búsqueda'}</button>

                  <button onClick={() => { setActiveCat(''); document.querySelector('.md\\:hidden button')?.click(); }} className="btn-sm border border-slate-300 bg-white hover:bg-slate-50">{t.filter || 'Filtros'}</button>

                  <a onClick={() => setActiveCat('')} className="text-[13px] font-semibold text-[#65A30D] hover:underline ml-1 cursor-pointer">{t.see_all || 'Ver todo →'}</a>

                </div>

              </div>

              <div className="relative -mx-4 lg:mx-0 px-4 lg:px-0">

                <div className="flex gap-4 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-2">

                  {(serverAds.length > 0 ? serverAds : mockAds).slice(0, 12).map(ad => (

                    <div key={ad.id} className="snap-start shrink-0 w-[260px]">

                      {renderAdCard(ad)}

                    </div>

                  ))}

                </div>

              </div>

            </section>



            {/* 4. DEALS OF THE DAY */}

            <section className="col-span-12">

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

                <div className="relative overflow-hidden rounded-3xl p-[1px] group">

                  <div className="absolute inset-0 bg-gradient-to-br from-[#84CC16] to-[#65A30D] opacity-90 group-hover:opacity-100 transition"></div>

                  <div className="relative bg-gradient-to-br from-[#84CC16] to-[#65A30D] rounded-[23px] p-6 text-white h-[190px] flex flex-col">

                    <span className="text-[11px] uppercase tracking-wider bg-white/20 w-fit px-2.5 py-1 rounded-full font-semibold">{t.deal_of_day || 'Oferta del día'}</span>

                    <h3 className="text-[26px] font-bold mt-3 leading-tight">{t.up_to_40 || 'Hasta 40% OFF'}</h3>

                    <p className="text-white/90 text-[14px]">{t.elec_phones || 'Electrónica y Celulares'}</p>

                    <div className="mt-auto flex items-center justify-between">

                      <button onClick={() => setActiveCat('telefonia')} className="btn-md bg-white text-[#0F172A] hover:bg-slate-100">{t.shop_now || 'Comprar ahora →'}</button>

                      <span className="text-[12px] font-medium bg-black/20 px-2 py-1 rounded-lg">{t.ends_in_8h || 'Termina en 8h'}</span>

                    </div>

                  </div>

                </div>

                <div className="card bg-white border border-slate-200 rounded-3xl p-6 h-[190px] flex flex-col relative overflow-hidden">

                  <div className="absolute -right-6 -top-6 w-32 h-32 bg-[#84CC16]/10 rounded-full blur-2xl"></div>

                  <span className="text-[11px] uppercase tracking-wider text-[#65A30D] font-semibold">{t.furniture || 'Muebles'}</span>

                  <h3 className="text-[22px] font-bold mt-2">{t.living_room_sets || 'Salas de estar'}</h3>

                  <p className="text-slate-600 text-[14px]">{t.from_price || 'Desde $4,999 MXN'}</p>

                  <button className="btn-md border border-slate-300 mt-auto w-fit hover:bg-slate-50" onClick={() => setActiveCat('hogar')}>{t.see_deals || 'Ver ofertas →'}</button>

                </div>

                <div className="card bg-slate-900 text-white rounded-3xl p-6 h-[190px] flex flex-col relative overflow-hidden">

                  <span className="text-[11px] uppercase tracking-wider text-[#84CC16] font-semibold">{t.automotive || 'Automotriz'}</span>

                  <h3 className="text-[22px] font-bold mt-2">{t.certified_cars || 'Autos Certificados'}</h3>

                  <p className="text-white/70 text-[14px]">{t.zero_comm || '0% comisión esta semana'}</p>

                  <button className="btn-md bg-[#84CC16] hover:bg-[#65A30D] text-white mt-auto w-fit" onClick={() => setActiveCat('motor')}>{t.browse_cars || 'Explorar 124k →'}</button>

                </div>

                <div className="card bg-white border-2 border-[#84CC16]/30 rounded-3xl p-6 h-[190px] flex flex-col">

                  <span className="text-[11px] uppercase tracking-wider text-[#65A30D] font-semibold">{t.for_sellers || 'Para vendedores'}</span>

                  <h3 className="text-[22px] font-bold mt-2">{t.boost_ad || 'Destaca tu anuncio'}</h3>

                  <p className="text-slate-600 text-[14px]">{t.boost_desc || '3x más vistas, mejor posición'}</p>

                  <button className="btn-md bg-[#0F172A] text-white hover:bg-black mt-auto w-fit" onClick={() => setCurrentTab('post')}>{t.promote_now || 'Promocionar ahora →'}</button>

                </div>

              </div>

            </section>



            {/* 5. REAL ESTATE SPOTLIGHT */}

            <section className="col-span-12 mt-2">

              <div className="flex items-end justify-between mb-4">

                <h2 className="text-[22px] font-bold tracking-tight">{t.re_spotlight || 'Inmuebles Destacados'}</h2>

                <div className="flex items-center gap-3">

                  <div className="hidden md:flex items-center gap-2">

                    <button onClick={() => { setActiveCat('inmobiliaria'); setSearchQuery('renta'); }} className="btn-sm border border-slate-300 bg-white hover:bg-slate-50">{t.rent || 'Rentar'}</button>

                    <button onClick={() => { setActiveCat('inmobiliaria'); setSearchQuery('venta'); }} className="btn-sm bg-slate-900 text-white">{t.buy || 'Comprar'}</button>

                    <button onClick={() => { setActiveCat('inmobiliaria'); setSearchQuery('comercial'); }} className="btn-sm border border-slate-300 bg-white hover:bg-slate-50">{t.commercial || 'Comercial'}</button>

                  </div>

                  <a onClick={() => setActiveCat('inmobiliaria')} className="text-[13px] font-semibold text-[#65A30D] hover:underline cursor-pointer">{t.view_props || 'Ver propiedades →'}</a>

                </div>

              </div>

              <div className="grid grid-cols-12 gap-4">

                <div className="col-span-12 xl:col-span-8">

                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">

                    {spotlightRealEstate.map((item, idx) => (

                      <article key={idx} className="card bg-white border border-slate-200 rounded-2xl overflow-hidden cursor-pointer" onClick={() => { setActiveCat('inmobiliaria'); setSearchQuery(item.specs); }}>

                        <div className="relative">

                          <img src={item.img} loading="lazy" className="w-full h-[160px] object-cover" alt=""/>

                          <span className={`badge absolute left-2 top-2 ${item.color} text-white`}>{item.type}</span>

                        </div>

                        <div className="p-3.5">

                          <div className="font-bold text-[18px]">{item.price}</div>

                          <div className="text-[13px] text-slate-600 line-clamp-1">{item.specs}</div>

                          <div className="flex items-center gap-2 mt-2 text-[11px]">

                            {item.badge && <span className={`badge ${item.badge.color}`}>{item.badge.label}</span>}

                            <span className="text-slate-500">{item.location}</span>

                          </div>

                        </div>

                      </article>

                    ))}

                  </div>

                </div>

                <div className="col-span-12 xl:col-span-4">

                  <div className="bg-white border border-slate-200 rounded-2xl h-full min-h-[360px] overflow-hidden relative">

                    <iframe width="100%" height="100%" frameBorder="0" scrolling="no" marginHeight="0" marginWidth="0" src={`https://maps.google.com/maps?q=${encodeURIComponent(selectedState || 'Puerto Vallarta')}&t=&z=13&ie=UTF8&iwloc=&output=embed`} style={{ border: 0, filter: 'grayscale(0.1) contrast(1.05)', position: 'absolute', top: 0, left: 0 }} className="opacity-40 pointer-events-none"></iframe>

                    <div className="absolute inset-0 bg-gradient-to-b from-white/50 to-transparent pointer-events-none"></div>

                    <div className="absolute inset-0 p-4">

                      <div className="flex items-center justify-between">

                        <h3 className="font-semibold">Map preview</h3>

                        <button onClick={() => setActiveCat('inmobiliaria')} className="btn-sm bg-white border border-slate-300 shadow-sm hover:bg-slate-50">Open map</button>

                      </div>

                      <div className="relative mt-6">

                        <div className="absolute left-[20%] top-[40%]"><div className="w-8 h-8 rounded-full bg-[#84CC16] text-white flex items-center justify-center text-[11px] font-bold shadow-lg ring-4 ring-[#84CC16]/30 animate-pulse cursor-pointer" onClick={() => { setActiveCat('inmobiliaria'); setSearchQuery('3.2M'); }}>$3.2M</div></div>

                        <div className="absolute left-[55%] top-[25%]"><div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-[11px] font-bold shadow-lg cursor-pointer" onClick={() => { setActiveCat('inmobiliaria'); setSearchQuery('1.8M'); }}>$1.8M</div></div>

                        <div className="absolute left-[70%] top-[60%]"><div className="w-8 h-8 rounded-full bg-[#84CC16] text-white flex items-center justify-center text-[11px] font-bold shadow-lg ring-4 ring-[#84CC16]/30 cursor-pointer" onClick={() => { setActiveCat('inmobiliaria'); setSearchQuery('4.9M'); }}>$4.9M</div></div>

                        <div className="absolute left-[35%] top-[70%]"><div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-[11px] font-bold shadow-lg cursor-pointer" onClick={() => { setActiveCat('inmobiliaria'); setSearchQuery('28k'); }}>$28k</div></div>

                      </div>

                      <div className="absolute bottom-4 left-4 right-4 bg-white/90 backdrop-blur rounded-xl p-3 border border-slate-200">

                        <div className="flex items-center justify-between text-[12px]"><span className="font-medium">247 properties in Puerto Vallarta</span><span onClick={() => setSelectedState('Puerto Vallarta')} className="text-[#65A30D] font-semibold cursor-pointer hover:underline">Filter →</span></div>

                      </div>

                    </div>

                  </div>

                </div>

              </div>

            </section>



            {/* 6. JOBS BOARD */}

            <section className="col-span-12">

              <div className="flex items-end justify-between mb-4 mt-2">

                <h2 className="text-[22px] font-bold tracking-tight">{t.jobs_board || 'Bolsa de trabajo'}</h2>

                <div className="flex items-center gap-2">

                  <button onClick={() => { setActiveCat('empleo'); setSearchQuery('Remoto'); }} className="btn-sm border border-slate-300 bg-white hover:bg-slate-50">{t.remote_only || 'Solo remoto'}</button>

                  <button onClick={() => { setActiveCat('empleo'); setSearchQuery('Tiempo Completo'); }} className="btn-sm border border-slate-300 bg-white hover:bg-slate-50">{t.full_time || 'Tiempo completo'}</button>

                  <a onClick={() => setActiveCat('empleo')} className="text-[13px] font-semibold text-[#65A30D] hover:underline ml-1 cursor-pointer">{t.see_all || 'Ver todo →'}</a>

                </div>

              </div>

              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">

                <div className="overflow-x-auto">

                  <table className="w-full text-[14px]">

                    <thead className="bg-slate-50 text-[12px] uppercase tracking-wide text-slate-500 border-b border-slate-200">

                      <tr><th className="text-left font-semibold px-4 py-3">{t.role || 'Puesto'}</th><th className="text-left font-semibold px-4 py-3 hidden md:table-cell">{t.company || 'Empresa'}</th><th className="text-left font-semibold px-4 py-3">{t.salary_mxn || 'Salario MXN'}</th><th className="text-left font-semibold px-4 py-3 hidden sm:table-cell">{t.location || 'Ubicación'}</th><th className="text-right font-semibold px-4 py-3">{t.action || 'Acción'}</th></tr>

                    </thead>

                    <tbody className="divide-y divide-slate-100">

                      {jobsBoard.map((job, idx) => (

                        <tr key={idx} className="hover:bg-slate-50 cursor-pointer" onClick={() => { setActiveCat('empleo'); setSearchQuery(job.role); }}>

                          <td className="px-4 py-3">

                            <div className="flex items-center gap-3">

                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold ${job.logo}`}>

                                {job.initial === 'MD' ? <div className="p-1"><MercastoLogo className="w-full h-full" /></div> : job.initial}

                              </div>

                              <div>

                                <div className="font-medium">{job.role}</div>

                                <div className="text-[12px] text-slate-500 md:hidden">{job.company} • {job.loc}</div>

                              </div>

                            </div>

                          </td>

                          <td className="px-4 py-3 hidden md:table-cell">{job.company}</td>

                          <td className="px-4 py-3 font-medium">{job.salary}</td>

                          <td className="px-4 py-3 hidden sm:table-cell">

                            {job.loc === 'Remote' ? <span className="badge bg-slate-900 text-white">Remote</span> : job.loc}

                          </td>

                          <td className="px-4 py-3 text-right">

                            <button onClick={() => setCurrentTab('post')} className={`btn-sm text-white ${idx === 0 ? 'bg-[#84CC16] hover:bg-[#65A30D]' : 'bg-slate-900 hover:bg-black'}`}>{t.apply || 'Aplicar'}</button>

                          </td>

                        </tr>

                      ))}

                    </tbody>

                  </table>

                </div>

                <div className="flex items-center justify-between p-3 bg-slate-50 border-t border-slate-200 text-[13px]">

                  <span className="text-slate-600">{t.showing_jobs || 'Mostrando empleos nuevos'}</span>

                  <div className="flex items-center gap-2">

                    <button onClick={() => alert('Sube tu CV desde el panel de usuario')} className="btn-sm border border-slate-300 bg-white hover:bg-slate-100">{t.upload_cv || 'Subir CV'}</button>

                    <button onClick={() => alert('¡Alerta de empleo creada con éxito!')} className="btn-sm bg-[#0F172A] text-white hover:bg-black">{t.create_job_alert || 'Crear alerta'}</button>

                  </div>

                </div>

              </div>

            </section>



            {/* 7. SERVICES MARKETPLACE */}

            <section className="col-span-12">

              <div className="flex items-end justify-between mb-4 mt-2">

                <h2 className="text-[22px] font-bold tracking-tight">{t.services_marketplace || 'Directorio de servicios'}</h2>

                <a onClick={() => setActiveCat('servicios')} className="text-[13px] font-semibold text-[#65A30D] hover:underline cursor-pointer">{t.browse_services || 'Ver todos →'}</a>

              </div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">

                {servicesMarketplace.map((srv, idx) => (

                  <div key={idx} className="card bg-white border border-slate-200 rounded-2xl p-4 cursor-pointer" onClick={() => { setActiveCat('servicios'); setSearchQuery(srv.title); }}>

                    <div className="flex items-start gap-3">

                      <img src={srv.img} loading="lazy" className="w-12 h-12 rounded-xl object-cover" alt=""/>

                      <div className="flex-1">

                        <h3 className="font-semibold text-[15px] leading-tight">{srv.title}</h3>

                        <div className="flex items-center gap-1 mt-1"><div className="flex text-amber-400 text-[13px]">★★★★★</div><span className="text-[12px] text-slate-600">{srv.stars}</span></div>

                      </div>

                      {srv.badge && <span className={`badge ${srv.badge.color}`}>{srv.badge.label}</span>}

                    </div>

                    <p className="text-[13px] text-slate-600 mt-3 line-clamp-2">{srv.desc}</p>

                    <div className="flex items-center justify-between mt-3">

                      <span className="text-[13px]"><span className="text-slate-500">{t.from || 'Desde'}</span> <strong>{srv.price}</strong></span>

                      <button onClick={() => setActiveCat('servicios')} className="btn-sm bg-[#84CC16] text-white hover:bg-[#65A30D]">{t.book_now || 'Reservar'}</button>

                    </div>

                  </div>

                ))}

              </div>

            </section>



            {/* 8. AUTOMOTIVE */}

            <section className="col-span-12">

              <div className="flex items-end justify-between mb-4 mt-2">

                <h2 className="text-[22px] font-bold tracking-tight">{t.automotive || 'Automotriz'}</h2>

                <div className="flex items-center gap-2">

                  <button onClick={() => { setActiveCat('motor'); setSearchQuery(''); }} className="btn-sm bg-slate-900 text-white">{t.all || 'Todos'}</button>

                  <button onClick={() => { setActiveCat('motor'); setSearchQuery('Nissan'); }} className="btn-sm border border-slate-300 bg-white hover:bg-slate-50">Nissan</button>

                  <button onClick={() => { setActiveCat('motor'); setSearchQuery('VW'); }} className="btn-sm border border-slate-300 bg-white hover:bg-slate-50">VW</button>

                  <button onClick={() => { setActiveCat('motor'); setSearchQuery('Toyota'); }} className="btn-sm border border-slate-300 bg-white hover:bg-slate-50">Toyota</button>

                  <button onClick={() => { setActiveCat('motor'); setSearchQuery('Honda'); }} className="btn-sm border border-slate-300 bg-white hover:bg-slate-50 hidden sm:inline-flex">Honda</button>

                  <span className="w-px h-5 bg-slate-300 mx-1 hidden sm:block"></span>

                  <button className="btn-sm border border-slate-300 bg-white hover:bg-slate-50 hidden sm:block">{t.year || 'Año'}</button>

                  <button className="btn-sm border border-slate-300 bg-white hover:bg-slate-50 hidden sm:block">{t.price || 'Precio'}</button>

                </div>

              </div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">

                {automotiveDeals.map((car, idx) => (

                  <article key={idx} className="card bg-white border border-slate-200 rounded-2xl overflow-hidden cursor-pointer" onClick={() => { setActiveCat('motor'); setSearchQuery(car.title); }}>

                    <img src={car.img} loading="lazy" className="w-full h-140px] object-cover" alt=""/>

                    <div className="p-3">

                      <div className="font-bold">{car.price}</div>

                      <div className="text-[13px] font-medium line-clamp-1">{car.title}</div>

                      <div className="text-[12px] text-slate-500 mt-1">{car.specs}</div>

                      <div className="mt-2 flex gap-1 min-h-[20px]">

                        {car.badge && <span className={`badge ${car.badge.color}`}>{car.badge.label}</span>}

                      </div>

                    </div>

                  </article>

                ))}

              </div>

            </section>



            {/* 9. RECENTLY VIEWED */}

            <section className="col-span-12">

              <div className="flex items-center justify-between mb-3 mt-2">

                <h2 className="text-[18px] font-bold">{t.recently_viewed || 'Vistos recientemente'}</h2>

                <button onClick={() => alert('Historial borrado')} className="text-[12px] text-slate-500 hover:text-slate-700">{t.clear_history || 'Borrar historial'}</button>

              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">

                {recentlyViewed.map((item, idx) => (

                  <div key={idx} className="bg-white border border-slate-200 rounded-xl p-2.5 flex gap-2.5 items-center hover:shadow-sm cursor-pointer" onClick={() => setSearchQuery(item.name)}>

                    <img src={item.img} loading="lazy" className="w-14 h-14 rounded-lg object-cover" alt=""/>

                    <div className="min-w-0">

                      <div className="text-[12px] font-medium line-clamp-1">{item.name}</div>

                      <div className="text-[13px] font-bold">{item.price}</div>

                    </div>

                  </div>

                ))}

              </div>

            </section>



            {/* 10. FOR BUSINESS */}

            <section className="col-span-12 mt-4">

              <div className="grid lg:grid-cols-3 gap-4">

                <div className="bg-white border border-slate-200 rounded-3xl p-6 card">

                  <div className="w-10 h-10 rounded-xl bg-[#84CC16]/15 flex items-center justify-center mb-3"><Zap className="w-5 h-5 text-[#65A30D]" /></div>

                  <h3 className="text-[18px] font-bold">{t.plan_free || 'Mercasto Starter'}</h3>

                  <p className="text-[14px] text-slate-600 mt-1">{t.starter_desc || 'Ideal para ventas ocasionales'}</p>

                  <ul className="mt-4 space-y-2 text-[13px] text-slate-700">

                    <li className="flex gap-2"><span className="text-[#84CC16]">✓</span> 3 {t.free_ad || 'anuncios'}</li>

                    <li className="flex gap-2"><span className="text-[#84CC16]">✓</span> {t.basic_stats || 'Estadísticas básicas'}</li>

                    <li className="flex gap-2"><span className="text-[#84CC16]">✓</span> {t.contacto_qr || 'Contacto vía QR'}</li>

                  </ul>

                  <button onClick={() => setShowPricingModal(true)} className="btn-md w-full mt-5 bg-[#0F172A] text-white hover:bg-black">Elegir plan</button>

                </div>

                <div className="bg-slate-900 text-white rounded-3xl p-6 card relative overflow-hidden ring-2 ring-[#84CC16]">

                  <span className="absolute top-4 right-4 badge bg-[#84CC16] text-white">POPULAR</span>

                  <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center mb-3"><ShieldCheck className="w-5 h-5 text-white" /></div>

                  <h3 className="text-[18px] font-bold">{t.plan_pro_basic || 'Mercasto PRO'}</h3>

                  <p className="text-[14px] text-white/70 mt-1">{t.pro_desc || 'Para vendedores recurrentes'}</p>

                  <ul className="mt-4 space-y-2 text-[13px] text-white/90">

                    <li className="flex gap-2"><span className="text-[#84CC16]">✓</span> {t.unlimited_ads || 'Anuncios ilimitados'}</li>

                    <li className="flex gap-2"><span className="text-[#84CC16]">✓</span> {t.boost_credits || 'Créditos mensuales'}</li>

                    <li className="flex gap-2"><span className="text-[#84CC16]">✓</span> {t.advanced_stats || 'Estadísticas PRO'}</li>

                    <li className="flex gap-2"><span className="text-[#84CC16]">✓</span> {t.verified_badge || 'Insignia Verificada'}</li>

                  </ul>

                  <button onClick={() => setShowPricingModal(true)} className="btn-md w-full mt-5 bg-[#84CC16] text-white hover:bg-[#65A30D]">See pricing</button>

                </div>

                <div className="bg-white border border-slate-200 rounded-3xl p-6 card">

                  <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center mb-3"><Building2 className="w-5 h-5 text-slate-700" /></div>

                  <h3 className="text-[18px] font-bold">{t.enterprise || 'Enterprise'}</h3>

                  <p className="text-[14px] text-slate-600 mt-1">{t.enterprise_desc || 'Inmobiliarias, agencias...'}</p>

                  <ul className="mt-4 space-y-2 text-[13px] text-slate-700">

                    <li className="flex gap-2"><span className="text-[#84CC16]">✓</span> {t.bulk_import || 'Importación masiva'}</li>

                    <li className="flex gap-2"><span className="text-[#84CC16]">✓</span> {t.account_manager || 'Soporte dedicado'}</li>

                    <li className="flex gap-2"><span className="text-[#84CC16]">✓</span> {t.storefront || 'Página de Tienda'}</li>

                  </ul>

                  <button onClick={() => alert('Contacto ventas: enterprise@mercasto.com')} className="btn-md w-full mt-5 border border-slate-300 hover:bg-slate-50">{t.contact_sales || 'Contactar ventas'}</button>

                </div>

              </div>

            </section>



            {/* 11. HOW IT WORKS */}

            <section className="col-span-12 mt-6">

              <div className="bg-white border border-slate-200 rounded-3xl p-6 lg:p-8">

                <h2 className="text-[22px] font-bold tracking-tight text-center">{t.how_it_works || 'Cómo funciona Mercasto'}</h2>

                <div className="grid md:grid-cols-4 gap-6 mt-8 relative">

                  <div className="absolute top-[22px] left-[12%] right-[12%] h-px bg-slate-200 hidden md:block"></div>

                  <div className="text-center relative">

                    <div className="w-11 h-11 mx-auto rounded-full bg-[#0F172A] text-white flex items-center justify-center font-bold shadow-lg">01</div>

                    <h4 className="font-semibold mt-3">{t.post_60s || 'Publica en 60s'}</h4>

                    <p className="text-[13px] text-slate-600 mt-1">{t.post_60s_desc || 'Fotos, precio, ubicación. La IA hace el resto.'}</p>

                  </div>

                  <div className="text-center relative">

                    <div className="w-11 h-11 mx-auto rounded-full bg-[#0F172A] text-white flex items-center justify-center font-bold shadow-lg">02</div>

                    <h4 className="font-semibold mt-3">{t.get_leads || 'Recibe contactos'}</h4>

                    <p className="text-[13px] text-slate-600 mt-1">{t.get_leads_desc || 'Llamadas, WhatsApp o escaneo QR seguro.'}</p>

                  </div>

                  <div className="text-center relative">

                    <div className="w-11 h-11 mx-auto rounded-full bg-[#0F172A] text-white flex items-center justify-center font-bold shadow-lg">03</div>

                    <h4 className="font-semibold mt-3">{t.meet_safely || 'Encuentros seguros'}</h4>

                    <p className="text-[13px] text-slate-600 mt-1">{t.meet_safely_desc || 'Perfiles verificados (KYC) para tu paz mental.'}</p>

                  </div>

                  <div className="text-center relative">

                    <div className="w-11 h-11 mx-auto rounded-full bg-[#84CC16] text-white flex items-center justify-center font-bold shadow-lg">04</div>

                    <h4 className="font-semibold mt-3">{t.sell_faster || 'Vende rápido'}</h4>

                    <p className="text-[13px] text-slate-600 mt-1">{t.sell_faster_desc || 'Destaca tu anuncio y cierra el trato hoy.'}</p>

                  </div>

                </div>

              </div>

            </section>



            {/* 12. SAFETY CENTER */}

            <section className="col-span-12 mt-6">

              <div className="grid md:grid-cols-3 gap-4">

                <div className="bg-white border border-slate-200 rounded-2xl p-5 card">

                  <div className="w-9 h-9 rounded-lg bg-red-100 flex items-center justify-center"><Shield className="w-5 h-5 text-red-600" /></div>

                  <h4 className="font-semibold mt-3">{t.avoid_scams || 'Evita fraudes'}</h4>

          <p className="text-[13px] text-slate-600 mt-1">{t.avoid_scams_desc || 'Nunca pagues por adelantado. Revisa las insignias.'}</p>

                  <button onClick={() => setCurrentTab('safety')} className="btn-sm border border-slate-300 mt-3 hover:bg-slate-50">{t.learn_more || 'Saber más'}</button>

                </div>

                <div className="bg-white border border-slate-200 rounded-2xl p-5 card">

                  <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center"><ShieldCheck className="w-5 h-5 text-blue-600" /></div>

                  <h4 className="font-semibold mt-3">{t.safe_payments || 'Pagos seguros'}</h4>

                  <p className="text-[13px] text-slate-600 mt-1">{t.safe_payments_desc || 'Reúnete en público. Cuenta el dinero antes de irte.'}</p>

                  <button onClick={() => setCurrentTab('safety')} className="btn-sm border border-slate-300 mt-3 hover:bg-slate-50">{t.learn_more || 'Saber más'}</button>

                </div>

                <div className="bg-white border border-slate-200 rounded-2xl p-5 card">

                  <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center"><CheckCircle className="w-5 h-5 text-emerald-600" /></div>

                  <h4 className="font-semibold mt-3">{t.verified_sellers || 'Vendedores verificados'}</h4>

                  <p className="text-[13px] text-slate-600 mt-1">{t.verified_sellers_desc || 'Busca la insignia azul de identidad confirmada (KYC).'}</p>

                  <button onClick={() => setCurrentTab('help')} className="btn-sm border border-slate-300 mt-3 hover:bg-slate-50">{t.learn_more || 'Saber más'}</button>

                </div>

              </div>

            </section>



            {/* 13. POPULAR SEARCHES */}

            <section className="col-span-12">

              <div className="bg-white border border-slate-200 rounded-2xl p-5">

                <div className="flex items-center justify-between">

                  <h3 className="font-bold text-[17px]">{t.popular_searches || 'Búsquedas populares'}</h3>

                  <span className="text-[12px] text-slate-500">{t.updated_hourly || 'Actualizado hace 1h'}</span>

                </div>

                <div className="flex flex-wrap gap-2 mt-3">

                  {['iphone 15', 'samsung s24', 'departamento renta puerto vallarta', 'casa venta guadalajara', 'honda civic', 'toyota corolla', 'trabajo remoto', 'recepcionista', 'nintendo switch', 'ps5', 'macbook', 'trabajo medio tiempo', 'bicicleta', 'escritorio', 'sala', 'refrigerador', 'lavadora', 'golden retriever', 'gatitos', 'terreno', 'local comercial', 'moto italika', 'yamaha', 'abogado', 'contador', 'plomero', 'electricista', 'clases ingles', 'uber carro', 'airbnb amueblado'].map(term => (

                    <a key={term} onClick={() => setSearchQuery(term)} className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-full text-[13px] cursor-pointer">{term}</a>

                  ))}

                </div>

              </div>

            </section>



            {/* 14. CITIES */}

            <section className="col-span-12">

              <div className="flex items-center justify-between mb-3">

                <h3 className="font-bold text-[17px]">{t.explore_city || 'Explorar por ciudad'}</h3>

                <a onClick={() => setSelectedState('')} className="text-[13px] font-medium text-slate-600 hover:text-slate-900 cursor-pointer">{t.view_all_mexico || 'Ver todo México →'}</a>

              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5">

                {[

                  { name: 'Ciudad de México', count: '284,392' },

                  { name: 'Guadalajara', count: '198,445' },

                  { name: 'Monterrey', count: '156,221' },

                  { name: 'Puebla', count: '89,334' },

                  { name: 'Tijuana', count: '76,551' },

                  { name: 'Puerto Vallarta', count: '47,882', highlight: true },

                  { name: 'Cancún', count: '58,992' },

                  { name: 'Mérida', count: '52,110' },

                  { name: 'Querétaro', count: '71,884' },

                  { name: 'León', count: '64,223' },

                  { name: 'Playa del Carmen', count: '39,445' },

                  { name: 'Tulum', count: '28,331' },

                  { name: 'Zapopan', count: '61,223' },

                  { name: 'Tlaquepaque', count: '34,556' },

                  { name: 'Culiacán', count: '41,882' },

                  { name: 'Hermosillo', count: '38,991' },

                  { name: 'Chihuahua', count: '44,221' },

                  { name: 'Aguascalientes', count: '36,774' },

                  { name: 'San Luis Potosí', count: '42,119' },

                  { name: 'Cabo San Lucas', count: '31,882' }

                ].map(city => (

                  <a key={city.name} onClick={() => setSelectedState(city.name)} className={`bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 hover:shadow-sm flex justify-between items-center cursor-pointer ${city.highlight ? 'ring-2 ring-[#84CC16]/40' : ''}`}>

                    <span className={`text-[14px] ${city.highlight ? 'font-medium' : ''}`}>{city.name}</span>

                    <span className={`text-[12px] ${city.highlight ? 'text-[#65A30D] font-semibold' : 'text-slate-500'}`}>{city.count}</span>

                  </a>

                ))}

              </div>

            </section>



            {/* 15. APP DOWNLOAD */}

            <section className="col-span-12 mt-4">

              <div className="bg-[#0F172A] text-white rounded-[28px] overflow-hidden">

                <div className="grid lg:grid-cols-2 gap-0 items-center">

                  <div className="p-8 lg:p-12">

                    <span className="badge bg-[#84CC16] text-white">NEW APP</span>

                    <h3 className="text-[28px] lg:text-[34px] font-bold leading-tight mt-3">{t.app_title || 'Mercasto en tu teléfono. Compra y vende más rápido.'}</h3>

                    <p className="text-white/70 mt-3 text-[15px] max-w-[480px]">{t.app_desc || 'Recibe alertas instantáneas, gestiona todo desde tu móvil y comunícate seguro.'}</p>

                    <ul className="mt-5 space-y-2 text-[14px] text-white/90">

                      <li className="flex gap-2.5"><span className="text-[#84CC16]">✓</span> {t.push_alerts || 'Alertas Push para tus búsquedas'}</li>

                      <li className="flex gap-2.5"><span className="text-[#84CC16]">✓</span> {t.cam_autofill || 'Publicación rápida con cámara IA'}</li>

                      <li className="flex gap-2.5"><span className="text-[#84CC16]">✓</span> {t.safe_qr || 'Contacto seguro con código QR'}</li>

                    </ul>

                    <div className="flex items-center gap-3 mt-6">

                      <a className="h-12"><img src="https://developer.apple.com/assets/elements/badges/download-on-the-app-store.svg" className="h-12" alt="App Store"/></a>

                      <a className="h-12"><img src="https://upload.wikimedia.org/wikipedia/commons/7/78/Google_Play_Store_badge_EN.svg" className="h-12" alt="Google Play"/></a>

                    </div>

                    <div className="flex items-center gap-4 mt-5 text-[12px] text-white/60">

                      <span>4.8 ★ 124k reviews</span>

                      <span>•</span>

                      <span>{t.free_no_ads || 'Gratis • Sin anuncios en PRO'}</span>

                    </div>

                  </div>

                  <div className="relative h-[340px] lg:h-full min-h-[380px] bg-gradient-to-br from-[#84CC16]/20 to-transparent">

                    <img src="https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800" className="absolute bottom-0 right-6 lg:right-12 w-[260px] lg:w-[320px] drop-shadow-2xl rounded-[32px] border-[8px] border-black/80" alt="Phone mockup"/>

                    <div className="absolute top-10 right-[40%] hidden lg:block bg-white text-slate-900 rounded-2xl p-3 shadow-xl w-[200px]">

                      <div className="text-[11px] text-slate-500">Nuevo lead de WhatsApp</div>

                      <div className="text-[13px] font-medium mt-1">¡Alguien está interesado en tu iPhone!</div>

                      <div className="text-[11px] text-[#65A30D] mt-1 font-semibold">Ver estadísticas →</div>

                    </div>

                  </div>

                </div>

              </div>

            </section>



            {/* 16. NEWSLETTER */}

            <section className="col-span-12">

              <div className="bg-white border border-slate-200 rounded-2xl p-5 lg:p-6 flex flex-col md:flex-row items-center gap-4 justify-between">

                <div>

                  <h4 className="font-bold text-[18px]">{t.newsletter_title || 'Recibe las mejores ofertas de México'}</h4>

                  <p className="text-[13px] text-slate-600">{t.newsletter_desc || 'Resumen semanal de ofertas, caída de precios y nuevos empleos.'}</p>

                </div>

                <form className="flex w-full md:w-auto gap-2" onSubmit={e => { e.preventDefault(); alert('¡Gracias por suscribirte!'); e.target.reset(); }}>

                  <input type="email" required placeholder={t.your_email || 'Tu correo electrónico'} className="w-full md:w-[300px] px-3.5 py-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-[#84CC16]/30 focus:border-[#84CC16] text-[14px]"/>

                  <button type="submit" className="btn-md bg-[#84CC16] text-white hover:bg-[#65A30D] whitespace-nowrap">{t.subscribe || 'Suscribirse'}</button>

                </form>

              </div>

            </section>

          </div>

        </main>

      </div>

    );

}
