import { useState } from "react";
import AdCard from "./AdCard";
import { useLang } from "@/lib/i18n";

const TABS = [
["renta", "rent"],
["venta", "buy"],
["comercial", "commercial"]];


export default function RealEstateSection({ listings, favs, onFav }) {
  const { t } = useLang();
  const [tab, setTab] = useState("renta");

  const re = listings.filter((l) => l.category === "Inmuebles");
  const items = re.
  filter((l) => tab === "comercial" ? (l.sub_category || "").includes("omercial") : l.deal_type === tab).
  slice(0, 3);

  return (
    <section data-source-location="src/components/mercasto/RealEstateSection.jsx:21:4" data-dynamic-content="true" id="inmuebles" className="border-b border-border">
      <div data-source-location="src/components/mercasto/RealEstateSection.jsx:22:6" data-dynamic-content="true" className="mx-auto max-w-7xl px-4 py-8">
        <div data-source-location="src/components/mercasto/RealEstateSection.jsx:23:8" data-dynamic-content="true" className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <h2 data-source-location="src/components/mercasto/RealEstateSection.jsx:24:10" data-dynamic-content="true" className="text-2xl font-bold tracking-tight">{t("re_title")}</h2>
          <div data-source-location="src/components/mercasto/RealEstateSection.jsx:25:10" data-dynamic-content="true" className="flex gap-2">
            {TABS.map(([v, key]) =>
            <button data-source-location="src/components/mercasto/RealEstateSection.jsx:27:14" data-dynamic-content="true" key={v} onClick={() => setTab(v)} className={`text-sm px-3 py-1.5 rounded-md border transition ${tab === v ? "border-primary text-primary" : "border-border text-muted-foreground hover:text-foreground"}`}>
                {t(key)}
              </button>
            )}
          </div>
        </div>
        <div data-source-location="src/components/mercasto/RealEstateSection.jsx:33:8" data-dynamic-content="true" className="realestate-track" data-collection-id="listings">
          {items.map((l) => <AdCard data-source-location="src/components/mercasto/RealEstateSection.jsx:34:28" data-dynamic-content="true" key={l.id} listing={l} isFav={favs.has(l.id)} onFav={onFav} data-collection-item-id={l?.id} />)}
        </div>
      </div>
    </section>);

}