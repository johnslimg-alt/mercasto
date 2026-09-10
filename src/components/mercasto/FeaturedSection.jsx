import AdCard from "./AdCard";
import { useLang } from "@/lib/i18n";

export default function FeaturedSection({ listings, loading, favs, onFav }) {
  const { t } = useLang();
  const featured = listings.filter((l) => l.featured).slice(0, 4);

  return (
    <section data-source-location="src/components/mercasto/FeaturedSection.jsx:9:4" data-dynamic-content="true" className="border-b border-border">
      <div data-source-location="src/components/mercasto/FeaturedSection.jsx:10:6" data-dynamic-content="true" className="mx-auto max-w-7xl px-4 py-8">
        <div data-source-location="src/components/mercasto/FeaturedSection.jsx:11:8" data-dynamic-content="true" className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <h2 data-source-location="src/components/mercasto/FeaturedSection.jsx:12:10" data-dynamic-content="true" className="text-2xl font-bold tracking-tight flex items-center gap-2">
            {t("featured")}
            <span data-source-location="src/components/mercasto/FeaturedSection.jsx:14:12" data-dynamic-content="false" className="text-[10px] font-bold bg-orange-500 text-white px-1.5 py-0.5 rounded">PRO</span>
          </h2>
          <button data-source-location="src/components/mercasto/FeaturedSection.jsx:16:10" data-dynamic-content="true" className="text-sm border border-yellow-500 text-yellow-600 dark:text-yellow-400 px-3 py-1.5 rounded-md hover:bg-yellow-50 dark:hover:bg-yellow-500/10 transition press">
            {t("promote")}
          </button>
        </div>
        <div data-source-location="src/components/mercasto/FeaturedSection.jsx:20:8" data-dynamic-content="true" className="featured-track" data-collection-id="listings">
          {loading && featured.length === 0 ?
          Array.from({ length: 4 }).map((_, i) => <div data-source-location="src/components/mercasto/FeaturedSection.jsx:22:54" data-dynamic-content="true" key={i} className="aspect-[3/4] rounded-lg bg-muted animate-pulse" />) :
          featured.map((l) =>
          <AdCard data-source-location="src/components/mercasto/FeaturedSection.jsx:24:16" data-dynamic-content="true" key={l.id} listing={l} badge={t("featured_badge")} isFav={favs.has(l.id)} onFav={onFav} data-collection-item-id={l?.id} />
          )}
        </div>
      </div>
    </section>);

}