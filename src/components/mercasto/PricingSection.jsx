import { Check } from "lucide-react";
import { useLang } from "@/lib/i18n";

export default function PricingSection({ onPost }) {
  const { t } = useLang();
  const plans = [
    { name:t("plan_free"), popular:false, cta:t("post"), action:"post", features:["pf_free_ads","pf_basic_stats","pf_contact"] },
    { name:t("plan_pro"), popular:true, cta:t("plan_contact"), href:"mailto:hola@mercasto.com?subject=Mercasto%20Pro", features:["pf_unlimited","pf_credits","pf_pro_stats","pf_verified"] },
    { name:t("plan_enterprise"), popular:false, cta:t("plan_contact"), href:"mailto:hola@mercasto.com?subject=Mercasto%20Empresas", features:["pf_bulk","pf_support","pf_store"] }
  ];
  return (
    <section id="planes" className="border-b border-border bg-muted/40">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:py-10">
        <div className="section-heading-compact"><h2 className="text-2xl font-bold tracking-tight">{t("cat_rates")}</h2></div>
        <div className="pricing-track">
          {plans.map((p) => <article key={p.name} className={`pricing-card ${p.popular ? "is-popular" : ""}`}>
            {p.popular && <span className="pricing-popular">{t("pricing_popular")}</span>}
            <h3 className="font-bold text-lg">{p.name}</h3>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
              {p.features.map((f) => <li key={f} className="flex items-start gap-2"><Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />{t(f)}</li>)}
            </ul>
            {p.action === "post" ? <button onClick={onPost} className="pricing-button">{p.cta}</button> : <a href={p.href} className={`pricing-button ${p.popular ? "primary" : ""}`}>{p.cta}</a>}
          </article>)}
        </div>
      </div>
    </section>
  );
}
