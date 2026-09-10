import { Search, SlidersHorizontal } from "lucide-react";
import { useLang } from "@/lib/i18n";
import FilterPanel from "./FilterPanel";

export default function HeroSearch({ query, setQuery, onSearch, filters, setFilters, filterOpen, onToggleFilters }) {
  const { t } = useLang();
  return (
    <section className="bg-gradient-to-b from-accent/70 to-background border-b border-border">
      <div className="mx-auto max-w-3xl px-4 py-10 sm:py-14 text-center">
        <h1 className="font-heading text-2xl sm:text-4xl font-extrabold tracking-tight">{t("tagline")}</h1>
        <form onSubmit={(e) => { e.preventDefault(); onSearch(); }} className="mt-6 flex w-full max-w-xl mx-auto rounded-xl border border-border bg-card shadow-sm overflow-hidden focus-within:border-primary transition">
          <div className="flex flex-1 min-w-0 items-center gap-2 px-4 h-12">
            <Search className="w-5 h-5 text-muted-foreground shrink-0" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("search_placeholder")} className="flex-1 bg-transparent outline-none text-base min-w-0" />
          </div>
          <button type="button" onClick={onToggleFilters} aria-label={t("filters")} className={`shrink-0 border-l border-border px-3 sm:px-4 text-sm flex items-center gap-1.5 transition press ${filterOpen ? "text-primary bg-accent" : "text-muted-foreground hover:text-foreground"}`}>
            <SlidersHorizontal className="w-4 h-4" /><span className="hidden sm:inline">{t("filters")}</span>
          </button>
          <button type="submit" className="shrink-0 bg-primary text-primary-foreground px-4 sm:px-8 font-semibold text-sm press hover:opacity-90">{t("search_btn")}</button>
        </form>
        {filterOpen && <div className="mt-3 rounded-xl border border-border bg-card shadow-sm overflow-hidden text-left"><FilterPanel filters={filters} setFilters={setFilters} /></div>}
      </div>
    </section>
  );
}