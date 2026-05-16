import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { MapPin, Globe, Phone, Star, ChevronLeft, MessageCircle, Pencil, ShieldCheck, Package } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || '/api';
const STORAGE_URL = import.meta.env.VITE_STORAGE_URL || '/storage';

function getAvatarSrc(url, name) {
  if (!url) return `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'U')}&background=6366f1&color=fff&size=128&bold=true`;
  if (url.startsWith('http') || url.startsWith('data:')) return url;
  return `${STORAGE_URL}/${url}`;
}

function getAdImageSrc(ad) {
  const firstImage = Array.isArray(ad.images) && ad.images.length > 0
    ? ad.images[0]
    : (() => {
        try {
          const parsed = JSON.parse(ad.image_url || '[]');
          return Array.isArray(parsed) ? parsed[0] : ad.image_url;
        } catch {
          return ad.image_url;
        }
      })();

  if (!firstImage) return null;
  return firstImage.startsWith('http') || firstImage.startsWith('data:')
    ? firstImage
    : `${STORAGE_URL}/${firstImage}`;
}

function InstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
    </svg>
  );
}

function StarRating({ avg, count }) {
  return (
    <div className="flex items-center gap-1.5">
      {[1,2,3,4,5].map(s => (
        <Star key={s} size={14} className={s <= Math.round(avg) ? 'text-amber-400 fill-amber-400' : 'text-slate-300 fill-slate-300'} />
      ))}
      <span className="text-sm text-slate-600 ml-0.5">{avg > 0 ? avg.toFixed(1) : '—'}</span>
      {count > 0 && <span className="text-xs text-slate-400">({count} reseña{count !== 1 ? 's' : ''})</span>}
    </div>
  );
}

export default function SellerProfileScreen({ currentUser }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [seller, setSeller] = useState(null);
  const [ads, setAds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([
      fetch(`${API_URL}/users/${id}/profile`).then(r => r.ok ? r.json() : Promise.reject(r.status)),
      fetch(`${API_URL}/ads?user_id=${id}&status=active&per_page=12`).then(r => r.ok ? r.json() : { data: [] }),
    ])
      .then(([profile, adsResp]) => {
        setSeller(profile);
        setAds(adsResp.data || []);
      })
      .catch(err => {
        if (err === 404) setError('Este vendedor no existe.');
        else setError('Error al cargar el perfil.');
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-4 border-lime-500 border-t-transparent animate-spin" />
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4 p-10 text-center">
      <p className="text-slate-500 text-lg">{error}</p>
      <button onClick={() => navigate(-1)} className="text-sm text-lime-600 hover:underline">Volver</button>
    </div>
  );

  const isOwner = currentUser?.id === parseInt(id);
  const memberYear = seller?.member_since ? new Date(seller.member_since).getFullYear() : null;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Back nav */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-600">
            <ChevronLeft size={20} />
          </button>
          <span className="font-semibold text-slate-900 truncate">{seller?.name}</span>
          {isOwner && (
            <Link to="/perfil/editar" className="ml-auto flex items-center gap-1.5 text-sm text-lime-600 hover:underline font-medium">
              <Pencil size={14} /> Editar perfil
            </Link>
          )}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

          {/* Sidebar */}
          <div className="md:col-span-1 space-y-4">
            {/* Profile card */}
            <div className="bg-white rounded-2xl p-6 shadow-sm text-center space-y-3">
              <div className="mx-auto w-24 h-24 rounded-full overflow-hidden ring-4 ring-slate-100 shadow">
                <img
                  src={getAvatarSrc(seller?.avatar_url, seller?.name)}
                  alt={seller?.name}
                  className="w-full h-full object-cover"
                />
              </div>

              <div>
                <div className="flex items-center justify-center gap-1.5">
                  <h1 className="text-lg font-bold text-slate-900">{seller?.name}</h1>
                  {seller?.is_verified && (
                    <ShieldCheck size={16} className="text-blue-500 flex-shrink-0" title="Verificado" />
                  )}
                </div>
                {seller?.city && (
                  <p className="text-sm text-slate-500 flex items-center justify-center gap-1 mt-0.5">
                    <MapPin size={12} /> {seller.city}
                  </p>
                )}
                {memberYear && (
                  <p className="text-xs text-slate-400 mt-1">Miembro desde {memberYear}</p>
                )}
              </div>

              <StarRating avg={seller?.rating_avg || 0} count={seller?.rating_count || 0} />

              <div className="flex justify-center gap-6 pt-1 border-t border-slate-100">
                <div className="text-center">
                  <p className="text-lg font-bold text-slate-900">{seller?.active_ads ?? 0}</p>
                  <p className="text-xs text-slate-500">Anuncios</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-slate-900">{seller?.rating_count ?? 0}</p>
                  <p className="text-xs text-slate-500">Reseñas</p>
                </div>
              </div>
            </div>

            {/* Bio */}
            {seller?.bio && (
              <div className="bg-white rounded-2xl p-5 shadow-sm">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Sobre mí</h3>
                <p className="text-sm text-slate-700 leading-relaxed">{seller.bio}</p>
              </div>
            )}

            {/* Links & contact */}
            {(seller?.website || seller?.social_instagram || seller?.phone_number || seller?.whatsapp) && (
              <div className="bg-white rounded-2xl p-5 shadow-sm space-y-3">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Contacto</h3>
                {seller?.website && (
                  <a href={seller.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-slate-700 hover:text-lime-600 truncate">
                    <Globe size={14} className="text-slate-400 flex-shrink-0" />
                    <span className="truncate">{seller.website.replace(/^https?:\/\//, '')}</span>
                  </a>
                )}
                {seller?.social_instagram && (
                  <a href={`https://instagram.com/${seller.social_instagram}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-slate-700 hover:text-pink-500">
                    <span className="text-slate-400 flex-shrink-0"><InstagramIcon /></span>
                    @{seller.social_instagram}
                  </a>
                )}
                {seller?.whatsapp && (
                  <a href={`https://wa.me/${seller.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-slate-700 hover:text-green-600">
                    <MessageCircle size={14} className="text-slate-400 flex-shrink-0" />
                    WhatsApp
                  </a>
                )}
                {seller?.phone_number && (
                  <a href={`tel:${seller.phone_number}`} className="flex items-center gap-2 text-sm text-slate-700 hover:text-lime-600">
                    <Phone size={14} className="text-slate-400 flex-shrink-0" />
                    {seller.phone_number}
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Ads grid */}
          <div className="md:col-span-2">
            <h2 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <Package size={16} className="text-lime-500" />
              Anuncios activos
              {ads.length > 0 && <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{ads.length}</span>}
            </h2>

            {ads.length === 0 ? (
              <div className="bg-white rounded-2xl p-10 shadow-sm text-center">
                <Package size={40} className="mx-auto text-slate-300 mb-3" />
                <p className="text-slate-500 text-sm">Este vendedor no tiene anuncios activos.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {ads.map(ad => {
                  const imageSrc = getAdImageSrc(ad);
                  return (
                    <div
                      key={ad.id}
                      onClick={() => navigate(`/?ad=${ad.id}`)}
                      className="bg-white rounded-xl overflow-hidden shadow-sm cursor-pointer hover:shadow-md transition-shadow group"
                    >
                      <div className="aspect-square bg-slate-100 overflow-hidden">
                        {imageSrc ? (
                          <img
                            src={imageSrc}
                            alt={ad.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-300">
                            <Package size={32} />
                          </div>
                        )}
                      </div>
                      <div className="p-2.5">
                        <p className="text-xs font-semibold text-slate-900 line-clamp-1">{ad.title}</p>
                        <p className="text-xs text-lime-600 font-bold mt-0.5">
                          {ad.price ? `$${Number(ad.price).toLocaleString('es-MX')}` : 'Precio a tratar'}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
