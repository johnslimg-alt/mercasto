import { useState } from "react";
import { BadgeCheck, Heart } from "lucide-react";
import { Image } from "@/components/ui/image";
import { useLang } from "@/lib/i18n";

const BRANDS = ["", "Nissan", "VW", "Toyota", "Honda"];
const PRICES = [
[0, ""],
[100000, "≤ $100,000"],
[200000, "≤ $200,000"],
[500000, "≤ $500,000"],
[1000000, "≤ $1,000,000"]];


export default function AutoSection({ listings, favs, onFav }) {
  const { t } = useLang();
  const [brand, setBrand] = useState("");
  const [maxPrice, setMaxPrice] = useState(0);

  const cars = listings.
  filter((l) => l.category === "Motor" && (!brand || (l.title || "").includes(brand)) && (!maxPrice || l.price <= maxPrice)).
  slice(0, 8);

  return (
    <section data-source-location="src/components/mercasto/AutoSection.jsx:25:4" data-dynamic-content="true" id="automotriz" className="border-b border-border">
      <div data-source-location="src/components/mercasto/AutoSection.jsx:26:6" data-dynamic-content="true" className="mx-auto max-w-7xl px-4 py-8">
        <h2 data-source-location="src/components/mercasto/AutoSection.jsx:27:8" data-dynamic-content="true" className="text-2xl font-bold tracking-tight mb-4">{t("auto_title")}</h2>
        <div data-source-location="src/components/mercasto/AutoSection.jsx:28:8" data-dynamic-content="true" className="flex flex-wrap gap-2 mb-5 text-xs">
          {BRANDS.map((b, __arrIdx__) =>
          <button data-source-location="src/components/mercasto/AutoSection.jsx:30:12" data-dynamic-content="true" key={b || "all"} onClick={() => setBrand(b)} className={`px-3 py-1.5 rounded-md border transition ${brand === b ? "border-primary text-primary" : "border-border text-muted-foreground hover:text-foreground"}`} data-arr-index={__arrIdx__} data-arr-variable-name="BRANDS">
              {b || t("cat_all")}
            </button>
          )}
          <span data-source-location="src/components/mercasto/AutoSection.jsx:34:10" data-dynamic-content="false" className="w-px bg-border mx-1" />
          {PRICES.map(([v, label]) =>
          <button data-source-location="src/components/mercasto/AutoSection.jsx:36:12" data-dynamic-content="true" key={label || "any"} onClick={() => setMaxPrice(v)} className={`px-3 py-1.5 rounded-md border transition ${maxPrice === v ? "border-primary text-primary" : "border-border text-muted-foreground hover:text-foreground"}`}>
              {label || t("cat_all")}
            </button>
          )}
        </div>
        <div data-source-location="src/components/mercasto/AutoSection.jsx:41:8" data-dynamic-content="true" className="grid grid-cols-2 lg:grid-cols-4 gap-4" data-collection-id="listings">
          {cars.map((l) =>
          <div data-source-location="src/components/mercasto/AutoSection.jsx:43:12" data-dynamic-content="true" key={l.id} className="border border-border rounded-lg overflow-hidden bg-card hover:shadow-lg transition-shadow" data-collection-item-id={l?.id}>
              <div data-source-location="src/components/mercasto/AutoSection.jsx:44:14" data-dynamic-content="true" className="relative aspect-[4/3] bg-muted" data-collection-item-field="image_url" data-collection-item-id={l?.id}>
                {l.image_url && <Image data-source-location="src/components/mercasto/AutoSection.jsx:45:32" data-dynamic-content="true" src={l.image_url} alt={l.title} fittingType="fill" className="w-full h-full" />}
                <button data-source-location="src/components/mercasto/AutoSection.jsx:46:16" data-dynamic-content="true"
              onClick={() => onFav(l.id)}
              className="absolute top-2 right-2 w-8 h-8 rounded-full bg-background/90 flex items-center justify-center text-muted-foreground hover:text-foreground transition">
                
                  <Heart data-source-location="src/components/mercasto/AutoSection.jsx:50:18" data-dynamic-content="true" className={`w-4 h-4 ${favs.has(l.id) ? "text-red-500 fill-current" : ""}`} />
                </button>
              </div>
              <div data-source-location="src/components/mercasto/AutoSection.jsx:53:14" data-dynamic-content="true" className="p-3" data-collection-item-field="verified" data-collection-item-id={l?.id}>
                <h3 data-source-location="src/components/mercasto/AutoSection.jsx:54:16" data-dynamic-content="true" className="font-medium text-sm line-clamp-2 min-h-[2.5rem]" data-collection-item-field="title" data-collection-item-id={l?.id}>{l.title}</h3>
                <p data-source-location="src/components/mercasto/AutoSection.jsx:55:16" data-dynamic-content="true" className="text-lg font-bold text-orange-600 mt-1">${l.price?.toLocaleString()} MXN</p>
                <p data-source-location="src/components/mercasto/AutoSection.jsx:56:16" data-dynamic-content="true" className="text-xs text-muted-foreground mt-1" data-collection-item-field="location" data-collection-item-id={l?.id}>{l.location}</p>
                {l.verified && <p data-source-location="src/components/mercasto/AutoSection.jsx:57:31" data-dynamic-content="true" className="text-xs text-teal-600 flex items-center gap-1 mt-1"><BadgeCheck data-source-location="src/components/mercasto/AutoSection.jsx:57:97" data-dynamic-content="false" className="w-3.5 h-3.5" />{t("verified_seller")}</p>}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>);

}