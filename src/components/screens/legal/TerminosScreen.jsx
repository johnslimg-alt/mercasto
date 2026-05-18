import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Scale, FileText, ExternalLink } from 'lucide-react';

const LAST_UPDATED = '17 de mayo de 2026';

const SECTIONS = [
  { id: 'aceptacion', title: '1. Aceptación de Términos' },
  { id: 'descripcion', title: '2. Descripción del Servicio' },
  { id: 'registro', title: '3. Registro y Cuenta' },
  { id: 'publicacion', title: '4. Publicación de Anuncios' },
  { id: 'transacciones', title: '5. Transacciones' },
  { id: 'contenido', title: '6. Contenido Prohibido' },
  { id: 'propiedad', title: '7. Propiedad Intelectual' },
  { id: 'responsabilidad', title: '8. Limitación de Responsabilidad' },
  { id: 'ley', title: '9. Ley Aplicable' },
  { id: 'contacto', title: '10. Contacto' },
];

function scrollTo(id) {
  const el = document.getElementById(id);
  if (el) {
    const y = el.getBoundingClientRect().top + window.scrollY - 88;
    window.scrollTo({ top: y, behavior: 'smooth' });
  }
}

export default function TerminosScreen() {
  const navigate = useNavigate();
  const [active, setActive] = useState('aceptacion');

  useEffect(() => {
    document.title = 'Términos de Uso | Mercasto';
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) { meta = document.createElement('meta'); meta.name = 'description'; document.head.appendChild(meta); }
    meta.content = 'Lee los Términos de Uso de Mercasto, el marketplace de clasificados líder en México.';
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
      {/* Sticky breadcrumb */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-2 text-sm">
          <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-slate-500 hover:text-slate-800 transition-colors">
            <ChevronLeft className="w-4 h-4" /> Volver
          </button>
          <span className="text-slate-300 mx-1">|</span>
          <span className="text-slate-400 cursor-pointer hover:text-lime-600" onClick={() => navigate('/')}>Mercasto</span>
          <ChevronLeft className="w-3 h-3 text-slate-300 rotate-180" />
          <span className="text-slate-700 font-medium">Términos de Uso</span>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-10">
        <div className="flex gap-8">
          {/* Sidebar */}
          <aside className="hidden md:block w-56 flex-shrink-0">
            <div className="sticky top-20 bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <Scale className="w-4 h-4 text-lime-600" />
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
              <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-400">
                Actualizado: {LAST_UPDATED}
              </div>
            </div>
          </aside>

          {/* Content */}
          <main className="flex-1 min-w-0">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 md:p-10">
              <div className="mb-8 pb-6 border-b border-slate-100">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-lime-100 rounded-xl flex items-center justify-center">
                    <FileText className="w-5 h-5 text-lime-600" />
                  </div>
                  <h1 className="text-2xl font-bold text-slate-900">Términos de Uso</h1>
                </div>
                <p className="text-slate-500 text-sm mt-1">Última actualización: <strong>{LAST_UPDATED}</strong></p>
                <p className="mt-3 text-slate-600 text-sm leading-relaxed">
                  Bienvenido a Mercasto. Al acceder o usar nuestra plataforma, aceptas estos Términos de Uso. Por favor léelos detenidamente antes de continuar.
                </p>
              </div>

              <div className="space-y-8 text-[15px] text-slate-700 leading-relaxed">

                <section id="aceptacion">
                  <SectionTitle n="1">Aceptación de Términos</SectionTitle>
                  <p>Al registrarte, acceder o utilizar los servicios de <strong>Mercasto</strong> (en adelante, "la Plataforma"), aceptas estar vinculado por estos Términos de Uso, nuestra Política de Privacidad y la Política de Cookies. Si no estás de acuerdo, debes abstenerte de utilizar la Plataforma.</p>
                  <p className="mt-3">Mercasto se reserva el derecho de modificar estos Términos en cualquier momento. Los cambios entrarán en vigor al publicarse. El uso continuado constituye tu aceptación de los Términos revisados.</p>
                </section>

                <section id="descripcion">
                  <SectionTitle n="2">Descripción del Servicio</SectionTitle>
                  <p>Mercasto es una plataforma de clasificados en línea que conecta compradores y vendedores en México. Los usuarios pueden publicar, buscar y responder anuncios de compraventa, renta, empleo y servicios en categorías como bienes raíces, vehículos, electrónica, moda y servicios profesionales.</p>
                  <p className="mt-3">Mercasto actúa exclusivamente como <strong>intermediario tecnológico</strong>. No somos vendedor, comprador, empleador ni arrendador en ninguna transacción. El acceso básico es gratuito; algunos servicios adicionales (promoción de anuncios, cuentas Pro) tienen costo.</p>
                </section>

                <section id="registro">
                  <SectionTitle n="3">Registro y Cuenta de Usuario</SectionTitle>
                  <p>Para publicar anuncios o acceder a ciertas funciones, es necesario crear una cuenta. Al registrarte, te comprometes a:</p>
                  <BulletList items={[
                    'Proporcionar información veraz, completa y actualizada.',
                    'Mantener la confidencialidad de tu contraseña y no compartirla con terceros.',
                    'Notificar de inmediato a Mercasto cualquier uso no autorizado de tu cuenta.',
                    'Ser mayor de 18 años o contar con el consentimiento de tu tutor legal.',
                    'No crear más de una cuenta sin autorización expresa de Mercasto.',
                  ]} />
                  <p className="mt-3">Mercasto se reserva el derecho de suspender o cancelar cuentas que violen estos Términos, muestren actividad fraudulenta o estén inactivas por más de 24 meses.</p>
                </section>

                <section id="publicacion">
                  <SectionTitle n="4">Publicación de Anuncios</SectionTitle>
                  <p>Al publicar un anuncio en Mercasto, el usuario declara y garantiza que es el legítimo propietario del bien o servicio anunciado (o está autorizado para ofrecerlo), que la información y fotografías son verídicas, y que el bien cumple con las leyes aplicables en México.</p>
                  <div className="mt-4 p-4 bg-red-50 rounded-xl border border-red-100">
                    <p className="font-semibold text-red-700 mb-2">Queda estrictamente prohibido publicar:</p>
                    <BulletList color="red" items={[
                      'Productos o sustancias ilegales, drogas o estupefacientes.',
                      'Armas de fuego, municiones o explosivos sin autorización legal.',
                      'Animales en riesgo de extinción o cuya comercialización esté prohibida.',
                      'Productos falsificados, robados o que violen derechos de propiedad intelectual.',
                      'Material pornográfico o de contenido sexual explícito.',
                      'Medicamentos controlados sin prescripción médica válida.',
                      'Servicios de escolta, prostitución o actividades ilícitas.',
                    ]} />
                  </div>
                  <p className="mt-3">Mercasto puede eliminar anuncios sin previo aviso si considera que violan estos Términos, y puede suspender la cuenta del infractor.</p>
                </section>

                <section id="transacciones">
                  <SectionTitle n="5">Transacciones</SectionTitle>
                  <p>Mercasto es una plataforma intermediaria y <strong>no es parte de ninguna transacción</strong> entre compradores y vendedores. Por lo tanto:</p>
                  <BulletList items={[
                    'Mercasto no garantiza la calidad, seguridad ni legalidad de los artículos anunciados.',
                    'Mercasto no garantiza la veracidad de las descripciones publicadas.',
                    'Los usuarios deben verificar la identidad de su contraparte y la autenticidad de los bienes antes de concretar cualquier transacción.',
                  ]} />
                  <p className="mt-3">Recomendamos realizar transacciones en persona, en lugares públicos y seguros, y evitar pagos por adelantado sin verificar el bien o servicio.</p>
                </section>

                <section id="contenido">
                  <SectionTitle n="6">Contenido Prohibido</SectionTitle>
                  <p>Además de las restricciones de anuncios, está prohibido en toda la Plataforma:</p>
                  <BulletList items={[
                    'Publicar contenido difamatorio, acosador, amenazante u obsceno.',
                    'Usar la Plataforma para spam, phishing o cualquier tipo de fraude.',
                    'Interferir con el funcionamiento técnico de la Plataforma.',
                    'Usar bots, scrapers u otros medios automatizados sin autorización previa.',
                    'Hacerse pasar por otra persona o entidad.',
                    'Publicar información personal de terceros sin su consentimiento.',
                    'Discriminar a usuarios por razón de origen étnico, género, religión, orientación sexual u otra condición.',
                  ]} />
                </section>

                <section id="propiedad">
                  <SectionTitle n="7">Propiedad Intelectual</SectionTitle>
                  <p>Todos los derechos de propiedad intelectual sobre la Plataforma, su diseño, código, marcas, logotipos y contenido desarrollado por Mercasto son propiedad exclusiva de <strong>Mercasto México S.A. de C.V.</strong>, protegidos por la Ley Federal del Derecho de Autor y otras leyes aplicables.</p>
                  <p className="mt-3">Al publicar contenido (textos, imágenes, etc.), el usuario otorga a Mercasto una licencia no exclusiva, gratuita, sublicenciable y mundial para usar, reproducir y distribuir dicho contenido con fines de operación y promoción de la Plataforma.</p>
                </section>

                <section id="responsabilidad">
                  <SectionTitle n="8">Limitación de Responsabilidad</SectionTitle>
                  <p>En la máxima medida permitida por la ley, Mercasto no será responsable por:</p>
                  <BulletList items={[
                    'Daños directos, indirectos, incidentales o consecuentes derivados del uso de la Plataforma.',
                    'Pérdida de datos, ingresos, utilidades o reputación.',
                    'Errores u omisiones en los anuncios publicados por los usuarios.',
                    'Conducta fraudulenta o ilegal de terceros usuarios.',
                    'Interrupciones del servicio por mantenimiento, fallas técnicas o causas de fuerza mayor.',
                  ]} />
                  <p className="mt-3">La responsabilidad máxima de Mercasto ante cualquier usuario se limita a la cantidad pagada a Mercasto en los 12 meses anteriores al evento que origina la reclamación.</p>
                </section>

                <section id="ley">
                  <SectionTitle n="9">Ley Aplicable y Jurisdicción</SectionTitle>
                  <p>Estos Términos se rigen conforme a las leyes de los <strong>Estados Unidos Mexicanos</strong> y, específicamente, de la <strong>Ciudad de México</strong>. Cualquier controversia se someterá a la jurisdicción de los tribunales competentes de la Ciudad de México, renunciando las partes a cualquier otro fuero.</p>
                  <p className="mt-3">Antes de iniciar cualquier procedimiento legal, las partes intentarán resolver disputas de buena fe mediante negociación directa durante 30 días calendario.</p>
                </section>

                <section id="contacto">
                  <SectionTitle n="10">Contacto</SectionTitle>
                  <p>Si tienes preguntas sobre estos Términos de Uso, contáctanos:</p>
                  <ContactBox email="soporte@mercasto.com" />
                </section>

              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-4">
              <button onClick={() => navigate('/privacidad')} className="text-sm text-slate-500 hover:text-lime-600 underline underline-offset-2 transition-colors">Política de Privacidad</button>
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

function BulletList({ items, color = 'lime' }) {
  const dot = color === 'red' ? 'bg-red-400' : 'bg-lime-500';
  const text = color === 'red' ? 'text-red-700 text-sm' : '';
  return (
    <ul className="mt-3 space-y-2">
      {items.map((item, i) => (
        <li key={i} className={`flex items-start gap-2 ${text}`}>
          <span className={`mt-1.5 w-1.5 h-1.5 rounded-full ${dot} flex-shrink-0`} />
          {item}
        </li>
      ))}
    </ul>
  );
}

function ContactBox({ email }) {
  return (
    <div className="mt-4 p-4 bg-lime-50 rounded-xl border border-lime-100">
      <p className="font-semibold text-slate-800 mb-1">Mercasto México S.A. de C.V.</p>
      <p className="text-slate-600 text-sm">Ciudad de México, México</p>
      <a href={`mailto:${email}`} className="inline-flex items-center gap-1.5 mt-2 text-lime-600 hover:text-lime-700 text-sm font-medium transition-colors">
        <ExternalLink className="w-3.5 h-3.5" />
        {email}
      </a>
    </div>
  );
}
