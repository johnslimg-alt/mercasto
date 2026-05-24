import React from 'react';

const Section = ({ id, title, children }) => (
  <section id={id} className="border-t border-slate-200 first:border-t-0 pt-8 first:pt-0 mt-8 first:mt-0">
    <h2 className="text-2xl font-black tracking-tight text-slate-950 mb-3">{title}</h2>
    <div className="space-y-3 text-slate-700 leading-relaxed text-[15px]">{children}</div>
  </section>
);

const PolicyShell = ({ children }) => (
  <div className="min-h-screen bg-slate-50 text-slate-950">
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <a href="/" className="inline-flex items-center gap-2 font-black text-2xl tracking-tight">
          <span className="w-9 h-9 rounded-2xl bg-[#84CC16] text-white grid place-items-center shadow-lg shadow-lime-500/20">M</span>
          Mercasto
        </a>
        <nav className="flex flex-wrap gap-3 text-sm font-bold text-slate-600">
          <a className="hover:text-[#65A30D]" href="/terminos">Términos</a>
          <a className="hover:text-[#65A30D]" href="/privacidad">Privacidad</a>
          <a className="hover:text-[#65A30D]" href="/cookies">Cookies</a>
          <a className="hover:text-[#65A30D]" href="/contacto">Contacto</a>
        </nav>
      </header>
      {children}
    </div>
  </div>
);

export default function ReembolsosScreen() {
  return (
    <PolicyShell>
      <main>
        <div className="rounded-[2rem] bg-gradient-to-br from-slate-950 to-slate-800 text-white p-7 sm:p-10 shadow-2xl shadow-slate-900/10 mb-8">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-lime-300 mb-3">Pagos, promociones y soporte</p>
          <h1 className="text-4xl sm:text-6xl font-black tracking-[-0.06em] leading-none mb-4">Política de pagos y reembolsos</h1>
          <p className="max-w-3xl text-slate-300 leading-relaxed">Esta página resume cómo funcionan los cargos por servicios de visibilidad, suscripciones y otros productos digitales dentro de Mercasto, así como los casos en los que puede proceder una revisión de reembolso.</p>
          <p className="text-sm text-slate-400 mt-5">Última actualización: 23 de mayo de 2026 · Aplicable a Mercasto México</p>
        </div>

        <div className="grid lg:grid-cols-[260px_1fr] gap-6">
          <aside className="lg:sticky lg:top-24 self-start rounded-3xl bg-white border border-slate-200 p-5 shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500 mb-3">Contenido</p>
            <div className="grid gap-1 text-sm font-bold text-slate-600">
              <a className="rounded-xl px-3 py-2 hover:bg-slate-50 hover:text-[#65A30D]" href="#alcance">1. Alcance</a>
              <a className="rounded-xl px-3 py-2 hover:bg-slate-50 hover:text-[#65A30D]" href="#servicios">2. Servicios de pago</a>
              <a className="rounded-xl px-3 py-2 hover:bg-slate-50 hover:text-[#65A30D]" href="#no-reembolsable">3. Cargos no reembolsables</a>
              <a className="rounded-xl px-3 py-2 hover:bg-slate-50 hover:text-[#65A30D]" href="#revision">4. Casos de revisión</a>
              <a className="rounded-xl px-3 py-2 hover:bg-slate-50 hover:text-[#65A30D]" href="#suscripciones">5. Suscripciones</a>
              <a className="rounded-xl px-3 py-2 hover:bg-slate-50 hover:text-[#65A30D]" href="#disputas">6. Soporte</a>
            </div>
          </aside>

          <article className="rounded-3xl bg-white border border-slate-200 p-6 sm:p-9 shadow-sm">
            <Section id="alcance" title="1. Alcance de esta política">
              <p>Mercasto opera como plataforma tecnológica de clasificados. Los pagos realizados a Mercasto corresponden a servicios digitales de la plataforma, como visibilidad adicional, anuncios destacados, créditos promocionales o planes de cuenta.</p>
              <p>Esta política no cubre pagos o acuerdos realizados directamente entre compradores y vendedores. Mercasto no es parte de esas transacciones y no custodia el dinero de compraventas externas entre usuarios.</p>
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900">Esta página es una política operativa de producto. La versión final debe ser revisada por asesoría legal antes de un lanzamiento comercial amplio.</div>
            </Section>

            <Section id="servicios" title="2. Servicios de pago disponibles">
              <p>Los servicios de pago pueden incluir promoción o destacado temporal de anuncios, paquetes de créditos para funciones de visibilidad, planes Mercasto Plus o Mercasto Pro y herramientas para negocios, tiendas o publicación masiva.</p>
              <p>Antes de confirmar un pago, Mercasto mostrará el precio, la descripción del servicio y, cuando aplique, la duración del beneficio contratado.</p>
            </Section>

            <Section id="no-reembolsable" title="3. Cargos normalmente no reembolsables">
              <p>Por tratarse de servicios digitales que pueden activarse de forma inmediata, los cargos por anuncios destacados, créditos usados, planes de cuenta ya iniciados o errores del usuario normalmente no son reembolsables una vez confirmado y activado el servicio.</p>
            </Section>

            <Section id="revision" title="4. Casos en los que podemos revisar un reembolso">
              <p>Mercasto puede revisar una solicitud de reembolso o compensación cuando exista evidencia razonable de cobro duplicado, falla técnica comprobable, cancelación antes de activación o error de procesamiento confirmado por registros de la plataforma.</p>
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900">Cuando no proceda un reembolso monetario, Mercasto podrá ofrecer créditos, extensión del servicio o reactivación del beneficio si el problema fue causado por la plataforma.</div>
            </Section>

            <Section id="suscripciones" title="5. Suscripciones y cancelaciones">
              <p>Las suscripciones se cobran por adelantado para el periodo indicado al momento de compra. La cancelación evita renovaciones posteriores, pero no devuelve automáticamente el importe del periodo vigente ya iniciado.</p>
            </Section>

            <Section id="disputas" title="6. Disputas, aclaraciones y soporte">
              <p>Para revisar un pago, escribe a <a className="font-bold text-[#65A30D]" href="mailto:soporte@mercasto.com">soporte@mercasto.com</a> con el correo de tu cuenta, fecha del cargo, monto, método de pago y descripción del problema.</p>
              <p>Para temas de privacidad o datos personales, consulta también el <a className="font-bold text-[#65A30D]" href="/privacidad">Aviso de Privacidad</a>.</p>
            </Section>
          </article>
        </div>
      </main>
    </PolicyShell>
  );
}
