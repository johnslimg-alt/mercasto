import { useLang } from "@/lib/i18n";

const SEARCHES = [
"iphone 15", "samsung s24", "departamento renta cdmx", "casa venta guadalajara",
"honda civic", "toyota corolla", "trabajo remoto", "recepcionista", "nintendo switch", "ps5"];


export default function PopularSearches({ onPick }) {
  const { t } = useLang();
  return (
    <section data-source-location="src/components/mercasto/PopularSearches.jsx:11:4" data-dynamic-content="true" id="busquedas" className="border-b border-border">
      <div data-source-location="src/components/mercasto/PopularSearches.jsx:12:6" data-dynamic-content="true" className="mx-auto max-w-7xl px-4 py-8">
        <div data-source-location="src/components/mercasto/PopularSearches.jsx:13:8" data-dynamic-content="true" className="flex flex-wrap items-center gap-3 mb-4">
          <h2 data-source-location="src/components/mercasto/PopularSearches.jsx:14:10" data-dynamic-content="true" className="text-2xl font-bold tracking-tight">{t("popular_title")}</h2>
          <span data-source-location="src/components/mercasto/PopularSearches.jsx:15:10" data-dynamic-content="true" className="text-xs text-muted-foreground">{t("updated_ago")}</span>
        </div>
        <div data-source-location="src/components/mercasto/PopularSearches.jsx:17:8" data-dynamic-content="true" className="flex flex-wrap gap-2">
          {SEARCHES.map((s, __arrIdx__) =>
          <button data-source-location="src/components/mercasto/PopularSearches.jsx:19:12" data-dynamic-content="true" key={s} onClick={() => onPick(s)} className="text-sm border border-border rounded-full px-4 py-1.5 text-muted-foreground hover:border-primary hover:text-primary transition press" data-arr-index={__arrIdx__} data-arr-variable-name="SEARCHES">
              {s}
            </button>
          )}
        </div>
      </div>
    </section>);

}