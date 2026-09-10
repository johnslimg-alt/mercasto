const PROMOS = [
{ title: "Oferta del día", sub: "Hasta 40% OFF", desc: "Electrónica y Celulares", cta: "Comprar ahora →", note: "Termina en 8h", cls: "bg-gradient-to-br from-orange-500 to-amber-500" },
{ title: "Muebles", sub: "Salas de estar", desc: "Desde $4,999 MXN", cta: "Ver ofertas →", cls: "bg-gradient-to-br from-emerald-600 to-teal-500" },
{ title: "Automotriz", sub: "Autos Certificados", desc: "0% comisión esta semana", cta: "Explorar 124k →", cls: "bg-primary" },
{ title: "Para vendedores", sub: "Destaca tu anuncio", desc: "3x más vistas, mejor posición", cta: "Promocionar ahora →", cls: "bg-gradient-to-br from-yellow-500 to-orange-400" }];


export default function PromoBanners() {
  return (
    <section data-source-location="src/components/mercasto/PromoBanners.jsx:10:4" data-dynamic-content="true" className="border-b border-border">
      <div data-source-location="src/components/mercasto/PromoBanners.jsx:11:6" data-dynamic-content="true" className="mx-auto max-w-7xl px-4 py-8 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {PROMOS.map((p, __arrIdx__) =>
        <a data-source-location="src/components/mercasto/PromoBanners.jsx:13:10" data-dynamic-content="true" key={p.title} href="#tendencias" className={`${p.cls} rounded-xl p-5 text-white min-h-[150px] flex flex-col justify-between hover:opacity-95 transition`} data-arr-index={__arrIdx__} data-arr-variable-name="PROMOS">
            <div data-source-location="src/components/mercasto/PromoBanners.jsx:14:12" data-dynamic-content="true" data-arr-index={__arrIdx__} data-arr-variable-name="PROMOS">
              <p data-source-location="src/components/mercasto/PromoBanners.jsx:15:14" data-dynamic-content="true" className="text-xs uppercase tracking-widest opacity-80" data-arr-index={__arrIdx__} data-arr-variable-name="PROMOS" data-arr-field="title">{p.title}</p>
              <p data-source-location="src/components/mercasto/PromoBanners.jsx:16:14" data-dynamic-content="true" className="text-2xl font-bold mt-1" data-arr-index={__arrIdx__} data-arr-variable-name="PROMOS" data-arr-field="sub">{p.sub}</p>
              <p data-source-location="src/components/mercasto/PromoBanners.jsx:17:14" data-dynamic-content="true" className="text-sm mt-1 opacity-90" data-arr-index={__arrIdx__} data-arr-variable-name="PROMOS" data-arr-field="desc">{p.desc}</p>
              {p.note && <span data-source-location="src/components/mercasto/PromoBanners.jsx:18:25" data-dynamic-content="true" className="text-[11px] mt-2 bg-black/20 px-1.5 py-0.5 rounded inline-block" data-arr-index={__arrIdx__} data-arr-variable-name="PROMOS" data-arr-field="note">{p.note}</span>}
            </div>
            <p data-source-location="src/components/mercasto/PromoBanners.jsx:20:12" data-dynamic-content="true" className="text-sm font-semibold mt-3" data-arr-index={__arrIdx__} data-arr-variable-name="PROMOS" data-arr-field="cta">{p.cta}</p>
          </a>
        )}
      </div>
    </section>);

}