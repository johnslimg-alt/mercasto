import { useState } from "react";
import { Bookmark, SlidersHorizontal } from "lucide-react";
import AdCard from "./AdCard";
import { useLang } from "@/lib/i18n";
import { useToast } from "@/components/ui/use-toast";

export default function TrendingSection({ listings, loading, query, setQuery, filters, setFilters, onToggleFilters, favs, onFav }) {
  const { t } = useLang();
  const { toast } = useToast();
  const [mobileExpanded, setMobileExpanded] = useState(false);
  const q = (query || "").toLowerCase().trim();
  const min = Number(filters.min) || 0;
  const max = Number(filters.max) || Infinity;
  let items = listings.filter((l) =>
    (!filters.category || l.category === filters.category) &&
    (!filters.favorites || favs.has(l.id)) &&
    (!filters.location || (l.location || "").toLowerCase().includes(filters.location.toLowerCase())) &&
    l.price >= min && l.price <= max &&
    (!q || [l.title, l.location, l.description, l.sub_category, l.company].some((v) => (v || "").toLowerCase().includes(q)))
  );
  if (filters.sort === "asc") items = [...items].sort((a, b) => a.price - b.price);
  if (filters.sort === "desc") items = [...items].sort((a, b) => b.price - a.price);
  items = items.slice(0, 12);
  const active = Boolean(q || filters.category || filters.min || filters.max || filters.location || filters.favorites);
  const expanded = active || mobileExpanded;
  const reset = () => { setFilters({ category: "", min: "", max: "", location: "", sort: "recent", favorites: false }); setQuery(""); setMobileExpanded(false); };

  return (
    <section id="tendencias" className="border-b border-border bg-muted/40">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:py-10">
        <div className="trend-heading">
          <div className="trend-title-row">
            <h2 className="text-2xl font-bold tracking-tight">{t("trending")}</h2>
            <span className="live-badge">LIVE</span><span className="trend-count">{items.length}</span>
          </div>
          <div className="trend-tools">
            <button aria-label={t("save_search")} onClick={() => { localStorage.setItem("mercasto:saved-search", JSON.stringify({ query, filters })); toast({ description: t("search_saved") }); }} className="trend-tool"><Bookmark className="w-4 h-4" /><span>{t("save_search")}</span></button>
            <button aria-label={t("filters")} onClick={onToggleFilters} className={`trend-tool ${filterHighlight(filters) ? "is-active" : ""}`}><SlidersHorizontal className="w-4 h-4" /><span>{t("filters")}</span></button>
            <button onClick={reset} className="trend-reset">{t("see_all")} →</button>
          </div>
        </div>
        {loading && listings.length === 0 ? <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="aspect-[3/4] rounded-lg bg-muted animate-pulse" />)}</div>
        : items.length === 0 ? <p className="text-sm text-muted-foreground py-12 text-center">{t("no_results")}</p>
        : <>
          <div className={`trend-grid grid grid-cols-2 lg:grid-cols-4 gap-4 ${expanded ? "expanded" : ""}`} data-collection-id="listings">
            {items.map((l) => <AdCard key={l.id} listing={l} isFav={favs.has(l.id)} onFav={onFav} onSimilar={() => {}} data-collection-item-id={l.id} />)}
          </div>
          {!active && !mobileExpanded && items.length > 8 && <button className="trend-more" onClick={() => setMobileExpanded(true)}>{t("see_all")} ({items.length})</button>}
        </>}
      </div>
    </section>
  );
}
const filterHighlight = (f) => Boolean(f.category || f.min || f.max || f.location || f.favorites);
