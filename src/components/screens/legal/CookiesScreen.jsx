import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Cookie, ExternalLink } from 'lucide-react';

const LAST_UPDATED = '17 de mayo de 2026';

const SECTIONS = [
  { id: 'que-son', title: '1. ¿Qué son las Cookies?' },
  { id: 'tipos', title: '2. Tipos de Cookies que Usamos' },
  { id: 'control', title: '3. Cómo Controlarlas' },
  { id: 'terceros', title: '4. Cookies de Terceros' },
  { id: 'cambios', title: '5. Cambios a esta Política' },
  { id: 'contacto', title: '6. Contacto' },
];

function scrollTo(id) {
  const el = document.getElementById(id);
  if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 88, behavior: 'smooth' });
}

const COOKIE_TABLE = [
  {
    type: 'Esenciales / Sesión',
    color: 'bg-blue-50 border-blue-100',
    badge: 'bg-blue-100 text-blue-700',
    desc: 'Necesarias para el funcionamiento básico de la plataforma. Sin estas cookies, la plataforma no funcionaría correctamente.',
    cookies: [
      { name: 'session_token', purpose: 'Mantiene tu sesión activa al iniciar sesión.', duration: 'Sesión', required: true },
      { name: 'auth_state', purpose: 'Recuerda si estás autenticado entre páginas.', duration: '7 días', required: true },
      { name: 'csrf_token', purpose: 'Protege contra ataques de falsificación de solicitudes.', duration: 'Sesión', required: true },
    ],
  },
  {
    type: 'Funcionales',
    color: 'bg-purple-50 border-purple-100',
    badge: 'bg-purple-100 text-purple-700',
    desc: 'Mejoran tu experiencia recordando tus preferencias, como el idioma, la ubicación o los filtros de búsqueda recientes.',
    cookies: [
      { name: 'language_pref', purpose: 'Guarda tu preferencia de idioma.', duration: '1 año', required: false },
      { name: 'location_city', purpose: 'Recuerda tu ciudad seleccionada para mostrar anuncios relevantes.', duration: '30 días', required: false },
      { name: 'cookie_consent', purpose: 'Registra tus preferencias de consentimiento de cookies.', duration: '1 año', required: false },
    ],
  },
  {
    type: 'Analíticas',
    color: 'bg-amber-50 border-amber-100',
    badge: 'bg-amber-100 text-amber-700',
    desc: 'Nos permiten entender cómo los usuarios interactúan con la plataforma para mejorar su funcionamiento y contenido.',
    cookies: [
      { name: '_ga', purpose: 'Google Analytics: identifica usuarios únicos.', duration: '2 años', required: false },
      { name: '_ga_*', purpose: 'Google Analytics: mantiene el estado de la sesión.', duration: '2 años', required: false },
      { name: '_gid', purpose: 'Google Analytics: distingue usuarios.', duration: '24 horas', required: false },
    ],
  },
];

export default function CookiesScreen() {
  const navigate = useNavigate();
  const [active, setActive] = useState('que-son');

  useEffect(() => {
    document.title = 'Política de Cookies | Mercasto';
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) { meta = document.createElement('meta'); meta.name = 'description'; document.head.appendChild(meta); }
    meta.content = 'Conoce la Política de Cookies de Mercasto: qué cookies usamos, cómo y para qué.';
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    const onScroll = () => {
      for (const s of [...SECTIONS].reverse()) {
        const el = document.getElementById(s.id);
        if (el && el.getBoundingClientRect().top <= 120) { setActive(s.id); break; }
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-2 text-sm">
          <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-slate-500 hover:text-slate-800 transition-colors">
            <ChevronLeft className="w-4 h-4" /> Volver
          </button>
          <span className="text-slate-300 mx-1">|</span>
          <span className="text-slate-400 cursor-pointer hover:text-lime-600" onClick={() => navigate('/')}>Mercasto</span>
          <ChevronLeft className="w-3 h-3 text-slate-300 rotate-180" />
          <span className="text-slate-700 font-medium">Política de Cookies</span>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-10">
        <div className="flex gap-8">
          <aside className="hidden md:block w-56 flex-shrink-0">
            <div className="sticky top-20 bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <Cookie className="w-4 h-4 text-lime-600" />
                <span className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Contenido</span>
              </div>
              <ul className="space-y-0.5">
                {SECTIONS.map(s => (
                  <li key={s.id}>
                    <button onClick={() => scrollTo(s.id)}
                      className={`w-full text-left text-xs py-1.5 px-2 rounded-lg transition-colors ${active === s.id ? 'bg-lime-50 text-lime-700 font-semibold' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}>
                      {s.title}
                    </button>
                  </li>
                ))}
              </ul>
              <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-400">Actualizado: {LAST_UPDATED}</div>
            </div>
          </aside>

          <main className="flex-1 min-w-0">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 md:p-10">
              <div className="mb-8 pb-6 border-b border-slate-100">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-lime-100 rounded-xl flex items-center justify-center">
                    <Cookie className="w-5 h-5 text-lime-600" />
                  </div>
                  <h1 className="text-2xl font-bold text-slate-900">Política de Cookies</h1>
                </div>
                <p className="text-slate-500 text-sm mt-1">Última actualización: <strong>{LAST_UPDATED}</strong></p>
                <p className="mt-3 text-slate-600 text-sm leading-relaxed">
                  Esta política explica qué son las cookies, cuáles utilizamos en Mercasto y cómo puedes gestionar tus preferencias.
                </p>
              </div>

              <div className="space-y-8 text-[15px] text-slate-700 leading-relaxed">

                <section id="que-son">
                  <SectionTitle n="1">¿Qué son las Cookies?</SectionTitle>
                  <p>Las cookies son pequeños archivos de texto que los sitios web almacenan en tu dispositivo (computadora, teléfono o tableta) cuando los visitas. Se utilizan ampliamente para hacer que los sitios web funcionen correctamente, de forma más eficiente, y para proporcionar información a los propietarios del sitio.</p>
                  <p className="mt-3">Las cookies pueden ser de <strong>sesión</strong> (se eliminan al cerrar el navegador) o <strong>persistentes</strong> (permanecen en tu dispositivo por un período determinado). También pueden ser <strong>propias</strong> (establecidas por Mercasto) o de <strong>terceros</strong> (establecidas por otros servicios).</p>
                </section>

                <section id="tipos">
                  <SectionTitle n="2">Tipos de Cookies que Usamos</SectionTitle>
                  <p>A continuación detallamos los tipos de cookies que utilizamos y su propósito:</p>
                  <div className="mt-4 space-y-6">
                    {COOKIE_TABLE.map((cat) => (
                      <div key={cat.type} className={`rounded-xl border p-5 ${cat.color}`}>
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="font-semibold text-slate-800">{cat.type}</h3>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cat.badge}`}>
                            {cat.cookies[0].required ? 'Siempre activas' : 'Opcionales'}
                          </span>
                        </div>
                        <p className="text-sm text-slate-600 mb-3">{cat.desc}</p>
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="text-slate-500 border-b border-slate-200">
                                <th className="text-left py-1.5 pr-3 font-semibold">Cookie</th>
                                <th className="text-left py-1.5 pr-3 font-semibold">Propósito</th>
                                <th className="text-left py-1.5 font-semibold">Duración</th>
                              </tr>
                            </thead>
                            <tbody>
                              {cat.cookies.map((c, i) => (
                                <tr key={i} className="border-b border-slate-100 last:border-0">
                                  <td className="py-2 pr-3 font-mono text-slate-700">{c.name}</td>
                                  <td className="py-2 pr-3 text-slate-600">{c.purpose}</td>
                                  <td className="py-2 text-slate-500 whitespace-nowrap">{c.duration}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                <section id="control">
                  <SectionTitle n="3">Cómo Controlar las Cookies</SectionTitle>
                  <p>Tienes varias opciones para controlar o eliminar las cookies:</p>
                  <div className="mt-4 space-y-3">
                    {[
                      {
                        title: 'Banner de consentimiento',
                        desc: 'Al ingresar por primera vez a Mercasto, verás un banner que te permite elegir qué cookies aceptar. Puedes modificar tu preferencia en cualquier momento escribiéndonos a privacidad@mercasto.com.',
                      },
                      {
                        title: 'Configuración del navegador',
                        desc: 'La mayoría de los navegadores te permiten ver, eliminar y bloquear cookies desde su configuración. Ten en cuenta que bloquear todas las cookies puede afectar la funcionalidad de la plataforma.',
                      },
                      {
                        title: 'Herramientas de opt-out de terceros',
                        desc: 'Para cookies de análisis de Google, puedes instalar el complemento de inhabilitación para navegadores de Google Analytics en: https://tools.google.com/dlpage/gaoptout',
                      },
                    ].map((item, i) => (
                      <div key={i} className="flex gap-3 items-start bg-slate-50 p-4 rounded-xl border border-slate-100">
                        <span className="w-6 h-6 rounded-full bg-lime-100 text-lime-700 text-xs flex items-center justify-center font-bold flex-shrink-0 mt-0.5">{i + 1}</span>
                        <div>
                          <p className="font-semibold text-slate-800 text-sm">{item.title}</p>
                          <p className="text-slate-600 text-sm mt-0.5">{item.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="mt-4 text-sm text-slate-500">Las cookies marcadas como "Siempre activas" no pueden desactivarse ya que son estrictamente necesarias para el funcionamiento de la plataforma.</p>
                </section>

                <section id="terceros">
                  <SectionTitle n="4">Cookies de Terceros</SectionTitle>
                  <p>Algunos servicios de terceros que integramos en Mercasto pueden establecer sus propias cookies:</p>
                  <div className="mt-4 space-y-3">
                    {[
                      {
                        name: 'Google Analytics',
                        logo: '📊',
                        desc: 'Usamos Google Analytics para entender cómo los usuarios interactúan con nuestra plataforma. Los datos son anónimos y agregados. Google puede usar estos datos conforme a su propia política de privacidad.',
                        link: 'https://policies.google.com/privacy',
                        linkText: 'Política de Google',
                      },
                      {
                        name: 'Proveedores de pago',
                        logo: '💳',
                        desc: 'Al procesar pagos (anuncios destacados, suscripciones Pro), nuestros proveedores de pago pueden establecer cookies necesarias para completar la transacción de forma segura.',
                        link: null,
                      },
                    ].map((item, i) => (
                      <div key={i} className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xl">{item.logo}</span>
                          <p className="font-semibold text-slate-800 text-sm">{item.name}</p>
                        </div>
                        <p className="text-slate-600 text-sm">{item.desc}</p>
                        {item.link && (
                          <a href={item.link} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 mt-2 text-lime-600 hover:text-lime-700 text-xs font-medium">
                            <ExternalLink className="w-3 h-3" /> {item.linkText}
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </section>

                <section id="cambios">
                  <SectionTitle n="5">Cambios a esta Política</SectionTitle>
                  <p>Podemos actualizar esta Política de Cookies periódicamente para reflejar cambios tecnológicos, legales o en nuestras prácticas. Te notificaremos sobre cambios importantes mediante un aviso en la plataforma. La fecha de "Última actualización" indica cuándo fue revisada por última vez.</p>
                </section>

                <section id="contacto">
                  <SectionTitle n="6">Contacto</SectionTitle>
                  <p>Si tienes preguntas sobre el uso de cookies en Mercasto:</p>
                  <div className="mt-4 p-4 bg-lime-50 rounded-xl border border-lime-100">
                    <p className="font-semibold text-slate-800 mb-0.5">Mercasto México S.A. de C.V.</p>
                    <p className="text-slate-600 text-sm">Departamento de Privacidad</p>
                    <p className="text-slate-600 text-sm">Ciudad de México, México</p>
                    <a href="mailto:privacidad@mercasto.com" className="inline-flex items-center gap-1.5 mt-2 text-lime-600 hover:text-lime-700 text-sm font-medium transition-colors">
                      <ExternalLink className="w-3.5 h-3.5" />
                      privacidad@mercasto.com
                    </a>
                  </div>
                </section>

              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-4">
              <button onClick={() => navigate('/terminos')} className="text-sm text-slate-500 hover:text-lime-600 underline underline-offset-2 transition-colors">Términos de Uso</button>
              <button onClick={() => navigate('/privacidad')} className="text-sm text-slate-500 hover:text-lime-600 underline underline-offset-2 transition-colors">Política de Privacidad</button>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

function SectionTitle({ n, children }) {
  return (
    <h2 className="text-lg font-semibold text-slate-900 mb-3 flex items-center gap-2">
      <span className="w-6 h-6 rounded-full bg-lime-100 text-lime-700 text-xs flex items-center justify-center font-bold flex-shrink-0">{n}</span>
      {children}
    </h2>
  );
}
