import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft, ShieldCheck, Eye, Users, Zap,
  MapPin, BarChart3, Star, ArrowRight, Heart
} from 'lucide-react';

const STATS = [
  { value: '10,000+', label: 'Anuncios publicados', icon: BarChart3 },
  { value: '32', label: 'Estados de México', icon: MapPin },
  { value: '100%', label: 'Mexicano', icon: Heart },
];

const VALUES = [
  {
    icon: ShieldCheck,
    title: 'Confianza',
    desc: 'Verificamos perfiles y anuncios para que cada transacción sea segura.',
    color: 'bg-lime-50 text-lime-600',
  },
  {
    icon: Eye,
    title: 'Transparencia',
    desc: 'Precios claros, vendedores reales. Sin sorpresas ni intermediarios ocultos.',
    color: 'bg-sky-50 text-sky-600',
  },
  {
    icon: Users,
    title: 'Comunidad',
    desc: 'Conectamos vecinos, emprendedores y familias de los 32 estados.',
    color: 'bg-violet-50 text-violet-600',
  },
  {
    icon: Zap,
    title: 'Innovación',
    desc: 'Tecnología de punta al servicio del comercio local mexicano.',
    color: 'bg-amber-50 text-amber-600',
  },
];

export default function AcercaDeScreen() {
  const navigate = useNavigate();

  useEffect(() => {
    document.title = 'Acerca de Mercasto | El Portal de Clasificados de Confianza de México';
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) { meta = document.createElement('meta'); meta.name = 'description'; document.head.appendChild(meta); }
    meta.content = 'Conoce la historia, misión y valores de Mercasto — el portal de clasificados 100% mexicano que conecta compradores y vendedores con confianza y seguridad.';
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Sticky breadcrumb */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-2 text-sm">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1 text-slate-500 hover:text-slate-800 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" /> Volver
          </button>
          <span className="text-slate-300 mx-1">|</span>
          <span className="text-slate-400 cursor-pointer hover:text-lime-600" onClick={() => navigate('/')}>Mercasto</span>
          <span className="text-slate-300">›</span>
          <span className="text-slate-600 font-medium">Acerca de</span>
        </div>
      </div>

      {/* Hero */}
      <section
        className="relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #16a34a 0%, #0d9488 60%, #0e7490 100%)' }}
      >
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)', backgroundSize: '40px 40px' }}
        />
        <div className="relative max-w-5xl mx-auto px-4 py-20 md:py-28 text-center text-white">
          <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm border border-white/30 rounded-full px-4 py-1.5 text-sm font-medium mb-6">
            <span>🇲🇽</span> Hecho en México
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold mb-5 leading-tight tracking-tight">
            Somos Mercasto
          </h1>
          <p className="text-lg md:text-2xl text-white/90 max-w-2xl mx-auto leading-relaxed font-light">
            Conectamos a compradores y vendedores en México con{' '}
            <span className="font-semibold text-white">confianza</span>,{' '}
            <span className="font-semibold text-white">seguridad</span> y{' '}
            <span className="font-semibold text-white">facilidad</span>.
          </p>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-white border-b border-slate-100">
        <div className="max-w-5xl mx-auto px-4 py-10 grid grid-cols-3 gap-6 text-center">
          {STATS.map(({ value, label, icon: Icon }) => (
            <div key={label} className="flex flex-col items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-lime-50 flex items-center justify-center mb-1">
                <Icon className="w-5 h-5 text-lime-600" />
              </div>
              <span className="text-3xl md:text-4xl font-extrabold text-slate-900">{value}</span>
              <span className="text-sm text-slate-500">{label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Story */}
      <section className="max-w-5xl mx-auto px-4 py-14 md:py-20">
        <div className="grid md:grid-cols-2 gap-10 items-center">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-lime-600 mb-2 block">Nuestra historia</span>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-5 leading-tight">
              Nacimos para cambiar la forma en que México compra y vende
            </h2>
            <p className="text-slate-600 leading-relaxed mb-4">
              En 2024, un equipo de emprendedores mexicanos notó que las plataformas existentes como OLX y Facebook Marketplace no ofrecían la <strong>confianza</strong> que los usuarios merecían. Los fraudes eran frecuentes, la verificación nula y la experiencia frustrante.
            </p>
            <p className="text-slate-600 leading-relaxed mb-4">
              Fundamos Mercasto con una obsesión: hacer que cada transacción entre mexicanos sea segura. Verificamos perfiles, moderamos anuncios y ofrecemos herramientas de protección al comprador que ninguna otra plataforma ofrece en el país.
            </p>
            <p className="text-slate-600 leading-relaxed">
              Hoy somos una comunidad vibrante que crece día a día, cubriendo los 32 estados y construyendo el portal de clasificados más confiable de México.
            </p>
          </div>
          <div className="bg-gradient-to-br from-lime-50 to-teal-50 rounded-2xl p-8 border border-lime-100">
            <div className="space-y-4">
              {[
                { year: '2024', event: 'Fundación de Mercasto en Ciudad de México' },
                { year: '2024', event: 'Lanzamiento de verificación de usuarios' },
                { year: '2025', event: 'Expansión a los 32 estados' },
                { year: '2025', event: '10,000 anuncios publicados' },
                { year: '2026', event: 'Destacados y Mercasto Pro' },
              ].map(({ year, event }) => (
                <div key={event} className="flex items-start gap-3">
                  <span className="text-xs font-bold text-lime-600 bg-lime-100 rounded-full px-2 py-0.5 mt-0.5 whitespace-nowrap">{year}</span>
                  <span className="text-sm text-slate-700">{event}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="bg-white py-14 md:py-20">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-12">
            <span className="text-xs font-bold uppercase tracking-widest text-lime-600 mb-2 block">Lo que nos define</span>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900">Nuestros valores</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {VALUES.map(({ icon: Icon, title, desc, color }) => (
              <div key={title} className="bg-slate-50 rounded-2xl p-6 border border-slate-100 hover:shadow-md transition-shadow">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-4 ${color.split(' ')[0]}`}>
                  <Icon className={`w-5 h-5 ${color.split(' ')[1]}`} />
                </div>
                <h3 className="font-bold text-slate-900 mb-2">{title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="max-w-5xl mx-auto px-4 py-14 md:py-20 text-center">
        <span className="text-xs font-bold uppercase tracking-widest text-lime-600 mb-2 block">El equipo</span>
        <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
          Construido con <span className="text-red-500">❤️</span> en México
        </h2>
        <p className="text-slate-500 max-w-xl mx-auto mb-8 leading-relaxed">
          Somos un equipo de ingenieros, diseñadores y expertos en clasificados apasionados por hacer que el comercio local funcione mejor para todos los mexicanos.
        </p>
        <div className="flex flex-wrap justify-center gap-3 text-sm text-slate-500">
          {['Ciudad de México 🌆', 'Guadalajara 🌵', 'Monterrey ⛰️', 'Remoto 🇲🇽'].map(loc => (
            <span key={loc} className="bg-slate-100 rounded-full px-4 py-1.5">{loc}</span>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section
        className="py-16"
        style={{ background: 'linear-gradient(135deg, #16a34a 0%, #0d9488 100%)' }}
      >
        <div className="max-w-2xl mx-auto px-4 text-center text-white">
          <Star className="w-8 h-8 mx-auto mb-4 opacity-80" />
          <h2 className="text-2xl md:text-3xl font-bold mb-3">¿Quieres anunciarte?</h2>
          <p className="text-white/80 mb-8 text-lg">Publica tu primer anuncio gratis en menos de 5 minutos.</p>
          <button
            onClick={() => navigate('/publicar')}
            className="inline-flex items-center gap-2 bg-white text-green-700 font-bold px-8 py-3 rounded-full hover:bg-green-50 transition-colors shadow-lg text-base"
          >
            Publica gratis <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </section>

      {/* Bottom links */}
      <div className="bg-white border-t border-slate-100 py-6">
        <div className="max-w-5xl mx-auto px-4 flex flex-wrap gap-x-6 gap-y-2 justify-center text-sm text-slate-400">
          <a href="/contacto" className="hover:text-lime-600 transition-colors">Contacto</a>
          <a href="/ayuda" className="hover:text-lime-600 transition-colors">Centro de Ayuda</a>
          <a href="/terminos" className="hover:text-lime-600 transition-colors">Términos</a>
          <a href="/privacidad" className="hover:text-lime-600 transition-colors">Privacidad</a>
        </div>
      </div>
    </div>
  );
}
