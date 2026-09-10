import { Image } from "@/components/ui/image";
import { useLang } from "@/lib/i18n";
import { useToast } from "@/components/ui/use-toast";

export default function ServicesSection({ listings }) {
  const { t } = useLang();
  const { toast } = useToast();
  const items = listings.filter((l) => l.category === "Servicios").slice(0, 3);

  return (
    <section data-source-location="src/components/mercasto/ServicesSection.jsx:11:4" data-dynamic-content="true" id="servicios" className="border-b border-border bg-muted/40">
      <div data-source-location="src/components/mercasto/ServicesSection.jsx:12:6" data-dynamic-content="true" className="mx-auto max-w-7xl px-4 py-8">
        <h2 data-source-location="src/components/mercasto/ServicesSection.jsx:13:8" data-dynamic-content="true" className="text-2xl font-bold tracking-tight mb-5">{t("services_title")}</h2>
        <div data-source-location="src/components/mercasto/ServicesSection.jsx:14:8" data-dynamic-content="true" className="grid md:grid-cols-3 gap-4" data-collection-id="listings">
          {items.map((l) =>
          <div data-source-location="src/components/mercasto/ServicesSection.jsx:16:12" data-dynamic-content="true" key={l.id} className="flex gap-4 border border-border rounded-lg bg-card p-4" data-collection-item-id={l?.id}>
              <div data-source-location="src/components/mercasto/ServicesSection.jsx:17:14" data-dynamic-content="true" className="w-28 h-28 shrink-0 rounded-md overflow-hidden bg-muted" data-collection-item-field="image_url" data-collection-item-id={l?.id}>
                {l.image_url && <Image data-source-location="src/components/mercasto/ServicesSection.jsx:18:32" data-dynamic-content="true" src={l.image_url} alt={l.title} fittingType="fill" className="w-full h-full" />}
              </div>
              <div data-source-location="src/components/mercasto/ServicesSection.jsx:20:14" data-dynamic-content="true" className="min-w-0">
                <h3 data-source-location="src/components/mercasto/ServicesSection.jsx:21:16" data-dynamic-content="true" className="font-medium text-sm line-clamp-1" data-collection-item-field="title" data-collection-item-id={l?.id}>{l.title}</h3>
                <p data-source-location="src/components/mercasto/ServicesSection.jsx:22:16" data-dynamic-content="true" className="text-xs text-muted-foreground mt-1 line-clamp-2" data-collection-item-field="description" data-collection-item-id={l?.id}>{l.description}</p>
                <p data-source-location="src/components/mercasto/ServicesSection.jsx:23:16" data-dynamic-content="true" className="text-sm font-bold text-orange-600 mt-2">{t("from")} ${l.price?.toLocaleString()} MXN</p>
                <button data-source-location="src/components/mercasto/ServicesSection.jsx:24:16" data-dynamic-content="true" onClick={() => toast({ title: l.title, description: l.description })} className="text-xs text-primary hover:underline mt-1 press">{t("view")}</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>);

}