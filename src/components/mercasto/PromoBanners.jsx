import { useLang } from "@/lib/i18n";

export default function PromoBanners() {
  const { t } = useLang();
  const promos = [
    { k:"offer", note:true, cls:"bg-gradient-to-br from-orange-500 to-amber-500" },
    { k:"furniture", cls:"bg-gradient-to-br from-emerald-600 to-teal-500" },
    { k:"auto", cls:"bg-primary" },
    { k:"seller", cls:"bg-gradient-to-br from-yellow-500 to-orange-400" }
  ];
  return (
    <section className="border-b border-border">
      <div className="mx-auto max-w-7xl px-4 py-8 promo-track">
        {promos.map((p) => <a key={p.k} href="#tendencias" className={p.cls+" rounded-xl p-5 text-white min-h-[150px] flex flex-col justify-between hover:opacity-95 transition"}>
          <div>
            <p className="text-xs uppercase tracking-widest opacity-80">{t("promo_"+p.k+"_title")}</p>
            <p className="text-2xl font-bold mt-1">{t("promo_"+p.k+"_sub")}</p>
            <p className="text-sm mt-1 opacity-90">{t("promo_"+p.k+"_desc")}</p>
            {p.note && <span className="text-[11px] mt-2 bg-black/20 px-1.5 py-0.5 rounded inline-block">{t("promo_offer_note")}</span>}
          </div>
          <p className="text-sm font-semibold mt-3">{t("promo_"+p.k+"_cta")}</p>
        </a>)}
      </div>
    </section>
  );
}
