import { Bookmark, SlidersHorizontal } from "lucide-react";
import AdCard from "./AdCard";
import { useLang } from "@/lib/i18n";
import { useToast } from "@/components/ui/use-toast";

export default function TrendingSection({ listings, loading, query, setQuery, filters, setFilters, onToggleFilters, favs, onFav }) {
  const { t } = useLang();
  const { toast } = useToast();

  const q = (query || "").toLowerCase().trim();
  const min = Number(filters.min) || 0;
  const max = Number(filters.max) || Infinity;

  let items = listings.filter(
    (l) =>
    (!filters.category || l.category === filters.category) &&
    (!filters.favorites || favs.has(l.id)) &&
    (!filters.location || (l.location || "").toLowerCase().includes(filters.location.toLowerCase())) &&
    l.price >= min &&
    l.price <= max && (
    !q || [l.title, l.location, l.description, l.sub_category, l.company].some((v) => (v || "").toLowerCase().includes(q)))
  );
  if (filters.sort === "asc") items = [...items].sort((a, b) => a.price - b.price);
  if (filters.sort === "desc") items = [...items].sort((a, b) => b.price - a.price);
  items = items.slice(0, 12);

  return (
    <section data-source-location="src/components/mercasto/TrendingSection.jsx:26:4" data-dynamic-content="true" id="tendencias" className="border-b border-border bg-muted/40">
      <div data-source-location="src/components/mercasto/TrendingSection.jsx:27:6" data-dynamic-content="true" className="mx-auto max-w-7xl px-4 py-10">
        <div data-source-location="src/components/mercasto/TrendingSection.jsx:28:8" data-dynamic-content="true" className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <h2 data-source-location="src/components/mercasto/TrendingSection.jsx:29:10" data-dynamic-content="true" className="text-2xl font-bold tracking-tight flex items-center gap-2">
            {t("trending")}
            <span data-source-location="src/components/mercasto/TrendingSection.jsx:31:12" data-dynamic-content="false" className="text-[10px] font-bold bg-red-500 text-white px-1.5 py-0.5 rounded animate-pulse">LIVE</span>
          </h2>
          <div data-source-location="src/components/mercasto/TrendingSection.jsx:33:10" data-dynamic-content="true" className="flex items-center gap-2 text-sm">
            <button data-source-location="src/components/mercasto/TrendingSection.jsx:34:12" data-dynamic-content="true" onClick={() => { localStorage.setItem("mercasto:saved-search", JSON.stringify({ query, filters })); toast({ description: t("search_saved") }); }} className="flex items-center gap-1.5 border border-border bg-card px-3 py-1.5 rounded-md hover:border-primary transition press">
              <Bookmark data-source-location="src/components/mercasto/TrendingSection.jsx:35:14" data-dynamic-content="false" className="w-4 h-4" />{t("save_search")}
            </button>
            <button data-source-location="src/components/mercasto/TrendingSection.jsx:37:12" data-dynamic-content="true"
            onClick={onToggleFilters}
            className={`flex items-center gap-1.5 border px-3 py-1.5 rounded-md transition press ${filterHighlight(filters) ? "border-primary text-primary" : "border-border bg-card hover:border-primary"}`}>
              
              <SlidersHorizontal data-source-location="src/components/mercasto/TrendingSection.jsx:41:14" data-dynamic-content="false" className="w-4 h-4" />{t("filters")}
            </button>
            <button data-source-location="src/components/mercasto/TrendingSection.jsx:43:12" data-dynamic-content="true"
            onClick={() => {setFilters({ category: "", min: "", max: "", location: "", sort: "recent", favorites: false });setQuery("");}}
            className="text-primary hover:underline press">
              
              {t("see_all")} →
            </button>
          </div>
        </div>

        {loading && listings.length === 0 ?
        <div data-source-location="src/components/mercasto/TrendingSection.jsx:53:10" data-dynamic-content="true" className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => <div data-source-location="src/components/mercasto/TrendingSection.jsx:54:53" data-dynamic-content="true" key={i} className="aspect-[3/4] rounded-lg bg-muted animate-pulse" />)}
          </div> :
        items.length === 0 ?
        <p data-source-location="src/components/mercasto/TrendingSection.jsx:57:10" data-dynamic-content="true" className="text-sm text-muted-foreground py-12 text-center">{t("no_results")}</p> :

        <div data-source-location="src/components/mercasto/TrendingSection.jsx:59:10" data-dynamic-content="true" className="grid grid-cols-2 lg:grid-cols-4 gap-4" data-collection-id="listings">
            {items.map((l) => <AdCard data-source-location="src/components/mercasto/TrendingSection.jsx:60:30" data-dynamic-content="true" key={l.id} listing={l} isFav={favs.has(l.id)} onFav={onFav} onSimilar={() => {}} data-collection-item-id={l?.id} />)}
          </div>
        }
      </div>
    </section>);

}

const filterHighlight = (f) => Boolean(f.category || f.min || f.max || f.location || f.favorites);