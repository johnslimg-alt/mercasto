import React from 'react';

const Section = ({ id, title, children }) => (
  <section id={id} className="border-t border-slate-200 first:border-t-0 pt-8 first:pt-0 mt-8 first:mt-0">
    <h2 className="text-2xl font-black tracking-tight text-slate-950 mb-3">{title}</h2>
    <div className="space-y-3 text-slate-700 leading-relaxed text-[15px]">{children}</div>
  </section>
);

const MiniCard = ({ title, children }) => (
  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
    <strong className="block text-slate-950 mb-1">{title}</strong>
    <span className="text-slate-600 text-sm leading-relaxed">{children}</span>
  </div>
);

export default function ModeracionScreen() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <a href="/" className="inline-flex items-center gap-2 font-black text-2xl tracking-tight">
            <span className="w-9 h-9 rounded-2xl bg-[#84CC16] text-white grid place-items-center shadow-lg shadow-lime-500/20">M</span>
            Mercasto
          </a>
          <nav className="flex flex-wrap gap-3 text-sm font-bold text-slate-600">
            <a className="hover:text-[#65A30D]" href="/terminos">Términos</a>
            <a className="hover:text-[#65A30D]" href="/safety">Seguridad</a>
            <a className="hover:text-[#65A30D]" href="/privacidad">Privacidad</a>
            <a className="hover:text-[#65A30D]" href="/contacto">Contacto</a>
          </nav>
        </header>

        <main>
          <div className="rounded-[2rem] bg-gradient-to-br from-emerald-950 to-slate-950 text-white p-7 sm:p-10 shadow-2xl shadow-slate-900/10 mb-8">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-lime-300 mb-3">Confianza, seguridad y calidad</p>
            <h1 className="text-4xl sm:text-6xl font-black tracking-[-0.06em] leading-none mb-4">Política de moderación</h1>
            <p className="max-w-3xl text-lime-100/80 leading-relaxed">Mercasto busca mantener un marketplace útil y seguro. Esta política explica qué contenido no está permitido, cómo revisamos reportes, qué medidas podemos tomar y cómo solicitar una revisión.</p>
            <p className="text-sm text-emerald-100/70 mt-5">Última actualización: 23 de mayo de 2026 · Aplicable a Mercasto México</p>
          </div>

          <div className="grid lg:grid-cols-[260px_1fr] gap-6">
            <aside className="lg:sticky lg:top-24 self-start rounded-3xl bg-white border border-slate-200 p-5 shadow-sm">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500 mb-3">Contenido</p>
              <div className="grid gap-1 text-sm font-bold text-slate-600">
                <a className="rounded-xl px-3 py-2 hover:bg-slate-50 hover:text-[#65A30D]" href="#principios">1. Principios</a>
                <a className="rounded-xl px-3 py-2 hover:bg-slate-50 hover:text-[#65A30D]" href="#prohibido">2. Contenido prohibido</a>
                <a className="rounded-xl px-3 py-2 hover:bg-slate-50 hover:text-[#65A30D]" href="#revision">3. Revisión</a>
                <a className="rounded-xl px-3 py-2 hover:bg-slate-50 hover:text-[#65A30D]" href="#medidas">4. Medidas</a>
                <a className="rounded-xl px-3 py-2 hover:bg-slate-50 hover:text-[#65A30D]" href="#reportes">5. Reportes</a>
                <a className="rounded-xl px-3 py-2 hover:bg-slate-50 hover:text-[#65A30D]" href="#apelaciones">6. Apelaciones</a>
              </div>
            </aside>

            <article className="rounded-3xl bg-white border border-slate-200 p-6 sm:p-9 shadow-sm">
              <Section id="principios" title="1. Principios de moderación">
                <p>La moderación de Mercasto se basa en cuatro objetivos: proteger a los usuarios, cumplir la ley aplicable, reducir fraude y mantener anuncios claros, verificables y relevantes.</p>
                <div className="grid sm:grid-cols-2 gap-3">
                  <MiniCard title="Seguridad">Priorizamos señales de fraude, riesgo físico, abuso o contenido ilegal.</MiniCard>
                  <MiniCard title="Claridad">Buscamos anuncios con título, descripción, precio, ubicación e imágenes coherentes.</MiniCard>
                  <MiniCard title="Proporcionalidad">Aplicamos medidas según gravedad, reincidencia y riesgo para la comunidad.</MiniCard>
                  <MiniCard title="Revisión humana">Podemos combinar filtros automáticos con revisión manual para decisiones sensibles.</MiniCard>
                </div>
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900">Esta página es una política operativa de producto. La versión final debe ser revisada por asesoría legal antes de un lanzamiento comercial amplio.</div>
              </Section>

              <Section id="prohibido" title="2. Contenido y conductas prohibidas">
                <p>No se permite publicar, vender, promover o facilitar productos robados, falsificados, ilegales, armas, explosivos, drogas, medicamentos controlados, documentos falsos, explotación, acoso, odio, fraude, spam, manipulación de búsquedas o datos personales de terceros sin consentimiento.</p>
                <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-900">Mercasto puede retirar de inmediato contenido que represente riesgo legal, financiero, físico o de seguridad para los usuarios.</div>
              </Section>

              <Section id="revision" title="3. Cómo revisamos anuncios y cuentas">
                <p>La revisión puede ocurrir antes o después de publicar un anuncio. Algunos anuncios pueden quedar pendientes de aprobación si contienen palabras, imágenes, categorías o patrones asociados a riesgo.</p>
                <p>Podemos revisar señales como historial de cuenta, reportes recibidos, duplicados, inconsistencias de precio, imágenes, ubicación, datos de contacto y comportamiento de mensajería o clics.</p>
              </Section>

              <Section id="medidas" title="4. Medidas que podemos aplicar">
                <p>Según la gravedad y recurrencia, Mercasto puede solicitar edición, reducir visibilidad, desactivar o eliminar anuncios, pausar funciones, suspender cuentas, conservar evidencia y colaborar con autoridades cuando exista obligación legal.</p>
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900">Cuando sea posible, explicaremos el motivo general de la medida y daremos una vía para corregir o apelar.</div>
              </Section>

              <Section id="reportes" title="5. Reportes de usuarios">
                <p>Los usuarios pueden reportar anuncios o cuentas sospechosas desde la plataforma o escribiendo a <a className="font-bold text-[#65A30D]" href="mailto:soporte@mercasto.com">soporte@mercasto.com</a>.</p>
                <p>Para acelerar la revisión, incluye enlace del anuncio, motivo del reporte, capturas si existen y cualquier comunicación relevante. No compartas documentos sensibles por canales no seguros.</p>
              </Section>

              <Section id="apelaciones" title="6. Correcciones y apelaciones">
                <p>Si consideras que un anuncio o cuenta fue moderado por error, puedes solicitar revisión en <a className="font-bold text-[#65A30D]" href="mailto:soporte@mercasto.com">soporte@mercasto.com</a>. Incluye el correo de tu cuenta, ID o enlace del anuncio y una explicación breve.</p>
                <p>Esta política complementa los <a className="font-bold text-[#65A30D]" href="/terminos">Términos de Uso</a>, el <a className="font-bold text-[#65A30D]" href="/privacidad">Aviso de Privacidad</a> y el <a className="font-bold text-[#65A30D]" href="/safety">Centro de Seguridad</a>.</p>
              </Section>
            </article>
          </div>
        </main>
      </div>
    </div>
  );
}
