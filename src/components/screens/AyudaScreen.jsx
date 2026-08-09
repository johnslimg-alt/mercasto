import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft, ChevronDown, Search, X,
  PlusCircle, ShoppingBag, UserCircle, ShieldCheck, Star
} from 'lucide-react';

const SECTIONS = [
  {
    id: 'publicar',
    title: 'Publicar anuncios',
    icon: PlusCircle,
    color: 'text-lime-600',
    bg: 'bg-lime-50',
    faqs: [
      {
        q: 'Cómo publico un anuncio?',
        a: 'Haz clic en "Publicar", completa categoría, título, descripción, precio, condición, ubicación y fotografías cuando correspondan. El anuncio puede quedar pendiente mientras pasa por moderación.',
      },
      {
        q: 'Cuántos anuncios puedo publicar?',
        a: 'El límite vigente depende de las condiciones mostradas en tu cuenta y del producto contratado. La sección "Mis anuncios" muestra cuántos anuncios puedes gestionar.',
      },
      {
        q: 'Cuánto tiempo dura mi anuncio?',
        a: 'Los anuncios gratuitos están activos durante 7 días. Después puedes renovarlos por $49 MXN por otros 7 días o eliminarlos sin costo desde la sección "Mis anuncios" de tu perfil.',
      },
      {
        q: 'Puedo editar mi anuncio después de publicarlo?',
        a: 'Sí. Ve a tu perfil → "Mis anuncios", selecciona el anuncio que deseas modificar y haz clic en "Editar". Puedes cambiar título, descripción, precio, fotos y ubicación en cualquier momento.',
      },
    ],
  },
  {
    id: 'comprar',
    title: 'Comprar y contactar',
    icon: ShoppingBag,
    color: 'text-sky-600',
    bg: 'bg-sky-50',
    faqs: [
      {
        q: 'Cómo contacto al vendedor?',
        a: 'Puedes contactar al vendedor por los canales públicos que haya habilitado, como WhatsApp, Telegram o correo electrónico.',
      },
      {
        q: 'Puedo hacer una oferta al vendedor?',
        a: 'Sí. Puedes proponer un precio por el canal público del vendedor y coordinar la entrega con seguridad.',
      },
      {
        q: 'Mercasto garantiza las transacciones?',
        a: 'Mercasto es una plataforma intermediaria: conectamos compradores y vendedores pero no participamos directamente en las transacciones. Te recomendamos acordar el lugar de entrega en sitio público, verificar el artículo antes de pagar y nunca realizar transferencias anticipadas a desconocidos.',
      },
    ],
  },
  {
    id: 'cuenta',
    title: 'Mi cuenta',
    icon: UserCircle,
    color: 'text-violet-600',
    bg: 'bg-violet-50',
    faqs: [
      {
        q: 'Cómo verifico mi número de teléfono?',
        a: 'La verificación por SMS se encuentra temporalmente deshabilitada. Puedes usar email, Google o Telegram para acceder a tu cuenta; Mercasto mostrará la opción telefónica cuando el proveedor esté disponible.',
      },
      {
        q: 'Cómo cambio mi contraseña?',
        a: 'Ve a tu Perfil → "Seguridad" → "Cambiar contraseña". También puedes restablecer tu contraseña desde la pantalla de inicio de sesión usando la opción "Olvidaste tu contraseña?".',
      },
      {
        q: 'Puedo iniciar sesión con Google?',
        a: 'Sí. En la pantalla de inicio de sesión o registro encontrarás el botón "Continuar con Google". Esta opción es rápida y segura; no necesitas recordar una contraseña adicional.',
      },
    ],
  },
  {
    id: 'seguridad',
    title: 'Seguridad',
    icon: ShieldCheck,
    color: 'text-red-500',
    bg: 'bg-red-50',
    faqs: [
      {
        q: 'Cómo reporto un anuncio sospechoso?',
        a: 'En cada anuncio puedes usar la opción de reporte y explicar el motivo. Mercasto prioriza los casos según el riesgo y no promete un plazo fijo de resolución.',
      },
      {
        q: 'Cómo evito fraudes al comprar?',
        a: 'Nunca compartas datos bancarios, números de tarjeta ni contraseñas. Desconfía de precios extremadamente bajos. Siempre acuerda la entrega en un lugar público y verifica el producto antes de pagar. Si algo parece demasiado bueno para ser verdad, probablemente lo es.',
      },
      {
        q: 'Mercasto me pedirá mi contraseña alguna vez?',
        a: 'Nunca. Mercasto jamás te solicitará tu contraseña por ningún medio: ni por correo electrónico, ni por WhatsApp, ni por Telegram. Si alguien que dice ser Mercasto te la pide, es un intento de fraude. Repórtalo inmediatamente.',
      },
    ],
  },
  {
    id: 'destacar',
    title: 'Destacar anuncios',
    icon: Star,
    color: 'text-amber-500',
    bg: 'bg-amber-50',
    faqs: [
      {
        q: 'Qué es un anuncio Destacado?',
        a: 'Un producto de promoción puede cambiar la posición o presentación del anuncio durante el periodo indicado. No garantiza impresiones, contactos ni una venta.',
      },
      {
        q: 'Cuánto cuesta destacar un anuncio?',
        a: 'Las opciones vigentes son: Subir 3 días por $49 MXN, Resaltar 7 días por $79 MXN, Destacado 7 días por $149 MXN y Top de categoría 7 días por $399 MXN.',
      },
      {
        q: 'Cómo se realiza el pago para destacar?',
        a: 'El checkout muestra el proveedor, el concepto, el importe y los medios de pago disponibles. Revisa esos datos antes de confirmar y conserva el comprobante del proveedor.',
      },
    ],
  },
];

function FAQItem({ faq, isOpen, onToggle }) {
  return (
    <div className="border-b border-slate-100 last:border-0">
      <button
        onClick={onToggle}
        className="w-full text-left py-4 px-5 flex items-start justify-between gap-3 hover:bg-slate-50 transition-colors group"
      >
        <span className="text-sm font-medium text-slate-800 group-hover:text-lime-700 transition-colors leading-snug">
          {faq.q}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-slate-400 shrink-0 mt-0.5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>
      <div
        className="overflow-hidden transition-all duration-200 ease-in-out"
        style={{ maxHeight: isOpen ? '400px' : '0px', opacity: isOpen ? 1 : 0 }}
      >
        <div className="px-5 pb-4 text-sm text-slate-500 leading-relaxed">
          {faq.a}
        </div>
      </div>
    </div>
  );
}

export default function AyudaScreen() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [openItems, setOpenItems] = useState({});
  const [openSections, setOpenSections] = useState(() =>
    Object.fromEntries(SECTIONS.map(s => [s.id, true]))
  );

  useEffect(() => {
    document.title = 'Centro de Ayuda | Mercasto';
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) { meta = document.createElement('meta'); meta.name = 'description'; document.head.appendChild(meta); }
    meta.content = 'Encuentra respuestas a las preguntas más frecuentes sobre Mercasto: publicar anuncios, seguridad, pagos, cuenta y más.';
    window.scrollTo(0, 0);
  }, []);

  // When searching, auto-expand all sections
  useEffect(() => {
    if (query.trim()) {
      setOpenSections(Object.fromEntries(SECTIONS.map(s => [s.id, true])));
    }
  }, [query]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return SECTIONS;
    return SECTIONS.map(section => ({
      ...section,
      faqs: section.faqs.filter(
        f => f.q.toLowerCase().includes(q) || f.a.toLowerCase().includes(q)
      ),
    })).filter(s => s.faqs.length > 0);
  }, [query]);

  function toggleItem(sectionId, idx) {
    const key = `${sectionId}-${idx}`;
    setOpenItems(prev => ({ ...prev, [key]: !prev[key] }));
  }

  function toggleSection(id) {
    setOpenSections(prev => ({ ...prev, [id]: !prev[id] }));
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Breadcrumb */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-2 text-sm">
          <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-slate-500 hover:text-slate-800 transition-colors">
            <ChevronLeft className="w-4 h-4" /> Volver
          </button>
          <span className="text-slate-300 mx-1">|</span>
          <button type="button" className="text-slate-400 cursor-pointer hover:text-lime-600" onClick={() => navigate('/')}>Mercasto</button>
          <span className="text-slate-300">›</span>
          <span className="text-slate-600 font-medium">Centro de Ayuda</span>
        </div>
      </div>

      {/* Hero */}
      <div className="bg-white border-b border-slate-100">
        <div className="max-w-3xl mx-auto px-4 py-10 md:py-14">
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2">Cómo podemos ayudarte?</h1>
          <p className="text-slate-500 mb-7">Encuentra respuestas rápidas a las preguntas más frecuentes.</p>
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Buscar en el Centro de Ayuda..."
              className="w-full pl-10 pr-10 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-lime-400 bg-slate-50"
            />
            {query && (
              <button onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* FAQ sections */}
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-4">
        {filtered.length === 0 && (
          <div className="text-center py-16 text-slate-400">
            <Search className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="font-medium">Sin resultados para "{query}"</p>
            <p className="text-sm mt-1">Intenta con otras palabras o <button onClick={() => setQuery('')} className="text-lime-600 underline">borra la búsqueda</button>.</p>
          </div>
        )}

        {filtered.map(section => (
          <div key={section.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Section header */}
            <button
              onClick={() => toggleSection(section.id)}
              className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${section.bg}`}>
                  <section.icon className={`w-4 h-4 ${section.color}`} />
                </div>
                <span className="font-bold text-slate-900">{section.title}</span>
                <span className="text-xs text-slate-400 bg-slate-100 rounded-full px-2 py-0.5">
                  {section.faqs.length}
                </span>
              </div>
              <ChevronDown
                className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${openSections[section.id] ? 'rotate-180' : ''}`}
              />
            </button>

            {/* FAQs */}
            <div
              className="overflow-hidden transition-all duration-300 ease-in-out"
              style={{ maxHeight: openSections[section.id] ? '2000px' : '0px' }}
            >
              <div className="border-t border-slate-100">
                {section.faqs.map((faq, idx) => (
                  <FAQItem
                    key={idx}
                    faq={faq}
                    isOpen={!!openItems[`${section.id}-${idx}`]}
                    onToggle={() => toggleItem(section.id, idx)}
                  />
                ))}
              </div>
            </div>
          </div>
        ))}

        {/* Contact teaser */}
        {!query && (
          <div className="bg-gradient-to-br from-lime-50 to-teal-50 border border-lime-200 rounded-2xl p-6 text-center mt-6">
            <p className="font-semibold text-slate-800 mb-1">No encontraste lo que buscabas?</p>
            <p className="text-sm text-slate-500 mb-4">Nuestro equipo de soporte está listo para ayudarte.</p>
            <button
              onClick={() => navigate('/contacto')}
              className="inline-flex items-center gap-2 bg-lime-500 hover:bg-lime-600 text-white font-semibold rounded-full px-6 py-2.5 text-sm transition-colors"
            >
              Contactar soporte
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
