import { Check } from "lucide-react";
import { useLang } from "@/lib/i18n";

export default function PricingSection() {
  const { t } = useLang();

  const PLANS = [
  {
    name: "Gratis",
    popular: false,
    cta: "Ver planes",
    features: ["3 anuncios gratis", "Estadísticas básicas", "Contacto vía WhatsApp/Telegram"]
  },
  {
    name: "Pro",
    popular: true,
    cta: "Ver planes",
    features: ["Anuncios ilimitados", "Créditos mensuales", "Estadísticas PRO", "Insignia Verificada"]
  },
  {
    name: "Empresas",
    popular: false,
    cta: "Contactar ventas",
    features: ["Importación masiva", "Soporte dedicado", "Página de Tienda"]
  }];


  return (
    <section data-source-location="src/components/mercasto/PricingSection.jsx:29:4" data-dynamic-content="true" id="planes" className="border-b border-border bg-muted/40">
      <div data-source-location="src/components/mercasto/PricingSection.jsx:30:6" data-dynamic-content="true" className="mx-auto max-w-7xl px-4 py-10 grid md:grid-cols-3 gap-4">
        {PLANS.map((p) =>
        <div data-source-location="src/components/mercasto/PricingSection.jsx:32:10" data-dynamic-content="true" key={p.name} className={`relative border rounded-xl p-6 bg-card ${p.popular ? "border-primary shadow-lg" : "border-border"}`} data-collection-item-field="popular" data-collection-item-id={p?.id || p?._id}>
            {p.popular &&
          <span data-source-location="src/components/mercasto/PricingSection.jsx:34:14" data-dynamic-content="false" className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">Popular</span>
          }
            <h3 data-source-location="src/components/mercasto/PricingSection.jsx:36:12" data-dynamic-content="true" className="font-bold text-lg" data-collection-item-field="name" data-collection-item-id={p?.id || p?._id}>{p.name}</h3>
            <ul data-source-location="src/components/mercasto/PricingSection.jsx:37:12" data-dynamic-content="true" className="mt-4 space-y-2 text-sm text-muted-foreground" data-collection-item-field="features" data-collection-item-id={p?.id || p?._id}>
              {p.features.map((f) =>
            <li data-source-location="src/components/mercasto/PricingSection.jsx:39:16" data-dynamic-content="true" key={f} className="flex items-start gap-2" data-collection-item-field="f"><Check data-source-location="src/components/mercasto/PricingSection.jsx:39:63" data-dynamic-content="false" className="w-4 h-4 text-primary shrink-0 mt-0.5" />{f}</li>
            )}
            </ul>
            <button data-source-location="src/components/mercasto/PricingSection.jsx:42:12" data-dynamic-content="true" className={`mt-6 w-full h-10 rounded-md text-sm font-medium transition press ${p.popular ? "bg-primary text-primary-foreground" : "border border-border hover:border-primary"}`} data-collection-item-field="cta" data-collection-item-id={p?.id || p?._id}>
              {p.cta}
            </button>
          </div>
        )}
      </div>
    </section>);

}