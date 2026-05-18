import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ShieldCheck, ExternalLink } from 'lucide-react';

const LAST_UPDATED = '17 de mayo de 2026';

const SECTIONS = [
  { id: 'responsable', title: '1. Responsable del Tratamiento' },
  { id: 'datos', title: '2. Datos que Recopilamos' },
  { id: 'finalidad', title: '3. Finalidad del Tratamiento' },
  { id: 'arco', title: '4. Derechos ARCO' },
  { id: 'transferencia', title: '5. Transferencia de Datos' },
  { id: 'cookies', title: '6. Cookies' },
  { id: 'seguridad', title: '7. Seguridad' },
  { id: 'menores', title: '8. Menores de Edad' },
  { id: 'cambios', title: '9. Cambios a este Aviso' },
  { id: 'contacto', title: '10. Contacto' },
];

function scrollTo(id) {
  const el = document.getElementById(id);
  if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 88, behavior: 'smooth' });
}

export default function PrivacidadScreen() {
  const navigate = useNavigate();
  const [active, setActive] = useState('responsable');

  useEffect(() => {
    document.title = 'Política de Privacidad | Mercasto';
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) { meta = document.createElement('meta'); meta.name = 'description'; document.head.appendChild(meta); }
    meta.content = 'Consulta la Política de Privacidad de Mercasto conforme a la LFPDPPP de México.';
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
          <span className="text-slate-700 font-medium">Política de Privacidad</span>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-10">
        <div className="flex gap-8">
          <aside className="hidden md:block w-56 flex-shrink-0">
            <div className="sticky top-20 bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <ShieldCheck className="w-4 h-4 text-lime-600" />
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
                    <ShieldCheck className="w-5 h-5 text-lime-600" />
                  </div>
                  <h1 className="text-2xl font-bold text-slate-900">Política de Privacidad</h1>
                </div>
                <p className="text-slate-500 text-sm mt-1">Última actualización: <strong>{LAST_UPDATED}</strong></p>
                <p className="mt-3 text-slate-600 text-sm leading-relaxed">
                  En Mercasto, la privacidad de nuestros usuarios es una prioridad. Este Aviso de Privacidad describe cómo recopilamos, usamos y protegemos tus datos personales, en cumplimiento de la <strong>Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP)</strong> y su Reglamento.
                </p>
              </div>

              <div className="space-y-8 text-[15px] text-slate-700 leading-relaxed">

                <section id="responsable">
                  <SectionTitle n="1">Responsable del Tratamiento</SectionTitle>
                  <p><strong>Mercasto México S.A. de C.V.</strong>, con domicilio en la Ciudad de México, es el responsable del tratamiento de tus datos personales recopilados a través de la plataforma mercasto.com y sus aplicaciones relacionadas.</p>
                  <p className="mt-3">Para ejercer tus derechos o resolver dudas sobre el tratamiento de tus datos, puedes contactar a nuestro Departamento de Protección de Datos en: <a href="mailto:privacidad@mercasto.com" className="text-lime-600 hover:text-lime-700 font-medium">privacidad@mercasto.com</a></p>
                </section>

                <section id="datos">
                  <SectionTitle n="2">Datos que Recopilamos</SectionTitle>
                  <p>Recopilamos las siguientes categorías de datos personales:</p>
                  <div className="mt-4 grid sm:grid-cols-2 gap-3">
                    {[
                      { label: 'Identificación', items: ['Nombre completo', 'Correo electrónico', 'Número de teléfono', 'Foto de perfil (opcional)'] },
                      { label: 'Ubicación', items: ['Ciudad o municipio', 'Código postal', 'Ubicación aproximada (GPS, opcional)'] },
                      { label: 'Actividad en la plataforma', items: ['Anuncios publicados', 'Búsquedas realizadas', 'Mensajes enviados', 'Favoritos guardados'] },
                      { label: 'Técnicos y de dispositivo', items: ['Dirección IP', 'Tipo de navegador', 'Sistema operativo', 'Cookies e identificadores de sesión'] },
                    ].map((cat) => (
                      <div key={cat.label} className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                        <p className="font-semibold text-slate-800 text-sm mb-2">{cat.label}</p>
                        <ul className="space-y-1">
                          {cat.items.map((item, i) => (
                            <li key={i} className="flex items-start gap-1.5 text-sm text-slate-600">
                              <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-lime-400 flex-shrink-0" />
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                  <p className="mt-4 text-sm text-slate-500">No recopilamos datos sensibles como origen racial, estado de salud, creencias religiosas ni datos biométricos.</p>
                </section>

                <section id="finalidad">
                  <SectionTitle n="3">Finalidad del Tratamiento</SectionTitle>
                  <p>Utilizamos tus datos personales para las siguientes finalidades <strong>primarias</strong> (necesarias para la prestación del servicio):</p>
                  <BulletList items={[
                    'Crear y gestionar tu cuenta de usuario.',
                    'Publicar y gestionar tus anuncios en la plataforma.',
                    'Facilitar la comunicación entre compradores y vendedores.',
                    'Procesar pagos por servicios adicionales (anuncios destacados, cuentas Pro).',
                    'Enviarte notificaciones sobre actividad en tus anuncios o mensajes.',
                    'Cumplir con obligaciones legales y prevenir fraudes.',
                  ]} />
                  <p className="mt-4">Y para las siguientes finalidades <strong>secundarias</strong> (opcionales, puedes negarte):</p>
                  <BulletList items={[
                    'Enviarte comunicaciones de marketing y promociones de Mercasto.',
                    'Realizar encuestas de satisfacción y estudios de mercado.',
                    'Personalizar tu experiencia mostrando anuncios relevantes.',
                  ]} />
                  <p className="mt-3">Para negarte al tratamiento de datos para finalidades secundarias, escríbenos a <a href="mailto:privacidad@mercasto.com" className="text-lime-600 hover:text-lime-700 font-medium">privacidad@mercasto.com</a>.</p>
                </section>

                <section id="arco">
                  <SectionTitle n="4">Derechos ARCO</SectionTitle>
                  <p>Conforme a la LFPDPPP, tienes derecho a <strong>Acceder, Rectificar, Cancelar u Oponerte</strong> al tratamiento de tus datos personales:</p>
                  <div className="mt-4 grid sm:grid-cols-2 gap-3">
                    {[
                      { letra: 'A', right: 'Acceso', desc: 'Conocer qué datos personales tenemos sobre ti y cómo los usamos.' },
                      { letra: 'R', right: 'Rectificación', desc: 'Corregir tus datos cuando sean inexactos o incompletos.' },
                      { letra: 'C', right: 'Cancelación', desc: 'Solicitar la eliminación de tus datos cuando no sean necesarios.' },
                      { letra: 'O', right: 'Oposición', desc: 'Oponerte al tratamiento de tus datos para fines específicos.' },
                    ].map((r) => (
                      <div key={r.letra} className="flex gap-3 items-start bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <span className="w-8 h-8 rounded-full bg-lime-500 text-white text-sm font-bold flex items-center justify-center flex-shrink-0">{r.letra}</span>
                        <div>
                          <p className="font-semibold text-slate-800 text-sm">{r.right}</p>
                          <p className="text-slate-600 text-xs mt-0.5">{r.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="mt-4">Para ejercer tus derechos ARCO, envía una solicitud a <a href="mailto:privacidad@mercasto.com" className="text-lime-600 hover:text-lime-700 font-medium">privacidad@mercasto.com</a> indicando tu nombre, correo registrado y el derecho que deseas ejercer. Responderemos en un plazo máximo de <strong>20 días hábiles</strong>.</p>
                </section>

                <section id="transferencia">
                  <SectionTitle n="5">Transferencia de Datos</SectionTitle>
                  <p>Mercasto <strong>no vende ni comercializa</strong> tus datos personales a terceros. Podemos compartir tus datos únicamente en los siguientes casos:</p>
                  <BulletList items={[
                    'Con proveedores de servicios que nos apoyan en la operación de la plataforma (hospedaje, pagos, análisis), quienes están obligados contractualmente a mantener la confidencialidad.',
                    'Con autoridades competentes cuando así lo exija la ley o una orden judicial.',
                    'En el contexto de una fusión, adquisición o venta de activos, notificándote previamente.',
                  ]} />
                  <p className="mt-3">Cualquier transferencia nacional o internacional de datos se realiza con las medidas de seguridad y protección adecuadas conforme a la LFPDPPP.</p>
                </section>

                <section id="cookies">
                  <SectionTitle n="6">Cookies</SectionTitle>
                  <p>Mercasto utiliza cookies y tecnologías similares para mejorar tu experiencia. Puedes controlar el uso de cookies desde la configuración de tu navegador. Consulta nuestra{' '}
                    <button onClick={() => navigate('/cookies')} className="text-lime-600 hover:text-lime-700 font-medium underline underline-offset-2">Política de Cookies</button>{' '}
                    para más información.
                  </p>
                </section>

                <section id="seguridad">
                  <SectionTitle n="7">Seguridad de los Datos</SectionTitle>
                  <p>Implementamos medidas técnicas, administrativas y físicas para proteger tus datos personales contra acceso no autorizado, pérdida, alteración o divulgación, incluyendo:</p>
                  <BulletList items={[
                    'Cifrado SSL/TLS para todas las comunicaciones entre tu dispositivo y nuestros servidores.',
                    'Almacenamiento de contraseñas con hash seguro (bcrypt).',
                    'Acceso restringido a datos personales solo para empleados autorizados.',
                    'Monitoreo continuo de seguridad y auditorías periódicas.',
                  ]} />
                  <p className="mt-3">En caso de una violación de seguridad que afecte tus datos, te notificaremos de inmediato conforme a lo establecido por la LFPDPPP.</p>
                </section>

                <section id="menores">
                  <SectionTitle n="8">Menores de Edad</SectionTitle>
                  <p>Mercasto no está dirigido a personas menores de 18 años. Si eres menor de edad, no debes registrarte ni usar la plataforma sin el consentimiento y supervisión de tu tutor legal. Si detectamos que hemos recopilado datos de menores sin consentimiento, los eliminaremos de inmediato.</p>
                </section>

                <section id="cambios">
                  <SectionTitle n="9">Cambios a este Aviso</SectionTitle>
                  <p>Mercasto puede actualizar esta Política de Privacidad periódicamente para reflejar cambios en nuestras prácticas o en la legislación aplicable. Te notificaremos sobre cambios importantes mediante un aviso en la plataforma o por correo electrónico. La fecha de "Última actualización" al inicio de este documento indica cuándo fue revisado por última vez.</p>
                </section>

                <section id="contacto">
                  <SectionTitle n="10">Contacto</SectionTitle>
                  <p>Para dudas, solicitudes ARCO u otros asuntos relacionados con tu privacidad:</p>
                  <ContactBox email="privacidad@mercasto.com" label="Departamento de Protección de Datos" />
                </section>

              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-4">
              <button onClick={() => navigate('/terminos')} className="text-sm text-slate-500 hover:text-lime-600 underline underline-offset-2 transition-colors">Términos de Uso</button>
              <button onClick={() => navigate('/cookies')} className="text-sm text-slate-500 hover:text-lime-600 underline underline-offset-2 transition-colors">Política de Cookies</button>
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

function BulletList({ items }) {
  return (
    <ul className="mt-3 space-y-2">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2">
          <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-lime-500 flex-shrink-0" />
          {item}
        </li>
      ))}
    </ul>
  );
}

function ContactBox({ email, label }) {
  return (
    <div className="mt-4 p-4 bg-lime-50 rounded-xl border border-lime-100">
      <p className="font-semibold text-slate-800 mb-0.5">Mercasto México S.A. de C.V.</p>
      {label && <p className="text-slate-600 text-sm">{label}</p>}
      <p className="text-slate-600 text-sm">Ciudad de México, México</p>
      <a href={`mailto:${email}`} className="inline-flex items-center gap-1.5 mt-2 text-lime-600 hover:text-lime-700 text-sm font-medium transition-colors">
        <ExternalLink className="w-3.5 h-3.5" />
        {email}
      </a>
    </div>
  );
}
